// src/hooks/useSupabase.js
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const DB_TIMEOUT_MS = 20000;
const PENDING_DAY_PREFIX = "fittrack_pending_day:";

export function getTodayKey() {
  return formatLocalDateKey(new Date());
}

const emptyDay = {
  meals:    [],
  workouts: [],
  macros:   { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
};

// ── useDay: read + write a single day row ──────────────────────
export function useDay(dateKey) {
  const { user } = useAuth();
  const [dayData, setDayData] = useState(emptyDay);
  const [loading, setLoading] = useState(true);

  const flushPendingDay = useCallback(async () => {
    if (!user) return false;

    const pendingPayload = readPendingDay(user.id, dateKey);
    if (!pendingPayload) return false;

    try {
      await writeDayRow(user.id, dateKey, pendingPayload);
      clearPendingDay(user.id, dateKey);
      setDayData(pendingPayload);
      return true;
    } catch (error) {
      if (!isTransientSaveError(error)) {
        console.error("flushPendingDay error:", error);
      }
      return false;
    }
  }, [user?.id, dateKey]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("days")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", dateKey)
          .maybeSingle();

        if (error) console.error("useDay load error:", error);
        const pendingPayload = readPendingDay(user.id, dateKey);
        setDayData(pendingPayload || data?.payload || emptyDay);
      } catch (e) {
        console.error("useDay exception:", e);
        const pendingPayload = readPendingDay(user.id, dateKey);
        setDayData(pendingPayload || emptyDay);
      }
      setLoading(false);
    };
    load();
  }, [user?.id, dateKey]);

  useEffect(() => {
    flushPendingDay().catch(() => {});
  }, [flushPendingDay]);

  useEffect(() => {
    if (!user) return undefined;

    const handleOnline = () => {
      flushPendingDay().catch(() => {});
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user?.id, flushPendingDay]);

  const updateDay = useCallback(async (updater) => {
    if (!user) throw new Error("Not logged in");

    const current = dayData || emptyDay;
    const updated = updater(current);

    // Optimistically update local state immediately so UI feels fast
    setDayData(updated);

    try {
      await writeDayRow(user.id, dateKey, updated);
      clearPendingDay(user.id, dateKey);
      return { pending: false };
    } catch (e) {
      if (isTransientSaveError(e)) {
        savePendingDay(user.id, dateKey, updated);
        return { pending: true };
      }

      setDayData(current);
      throw e;
    }
  }, [user?.id, dateKey, dayData]);

  return { dayData, loading, updateDay };
}

// ── useHistory: last N days ────────────────────────────────────
export function useHistory(days = 14) {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("days")
          .select("date, payload")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(days);
        if (error) console.error("useHistory error:", error);
        setHistory((data || []).map(r => ({ date: r.date, ...(r.payload || {}) })));
      } catch (e) {
        console.error("useHistory exception:", e);
        setHistory([]);
      }
      setLoading(false);
    };
    load();
  }, [user?.id, days]);

  return { history, loading };
}

function withTimeout(promise, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), DB_TIMEOUT_MS);
    }),
  ]);
}

async function writeDayRow(userId, dateKey, payload) {
  const row = {
    user_id: userId,
    date: dateKey,
    payload,
    updated_at: new Date().toISOString(),
  };

  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { error } = await withTimeout(
        supabase.from("days").upsert(row, { onConflict: "user_id,date" }),
        "Saving data took too long. Please try again."
      );

      if (!error) return;

      console.warn("upsert failed, trying insert/update fallback:", error.message);

      const { error: insertError } = await withTimeout(
        supabase.from("days").insert(row),
        "Creating the daily log took too long. Please try again."
      );

      if (!insertError) return;

      const { error: updateError } = await withTimeout(
        supabase
          .from("days")
          .update({ payload, updated_at: row.updated_at })
          .eq("user_id", userId)
          .eq("date", dateKey),
        "Updating the daily log took too long. Please try again."
      );

      if (!updateError) return;

      lastError = new Error(updateError.message);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Could not save your data right now.");
}

function isTransientSaveError(error) {
  const message = String(error?.message || "").toLowerCase();
  return !navigator.onLine
    || message.includes("too long")
    || message.includes("failed to fetch")
    || message.includes("networkerror")
    || message.includes("network request failed");
}

function pendingDayKey(userId, dateKey) {
  return `${PENDING_DAY_PREFIX}${userId}:${dateKey}`;
}

function readPendingDay(userId, dateKey) {
  if (!userId) return null;

  try {
    const raw = localStorage.getItem(pendingDayKey(userId, dateKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.payload || null;
  } catch {
    return null;
  }
}

function savePendingDay(userId, dateKey, payload) {
  try {
    localStorage.setItem(
      pendingDayKey(userId, dateKey),
      JSON.stringify({ payload, savedAt: new Date().toISOString() })
    );
  } catch (error) {
    console.warn("savePendingDay error:", error);
  }
}

function clearPendingDay(userId, dateKey) {
  try {
    localStorage.removeItem(pendingDayKey(userId, dateKey));
  } catch (error) {
    console.warn("clearPendingDay error:", error);
  }
}

function formatLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
