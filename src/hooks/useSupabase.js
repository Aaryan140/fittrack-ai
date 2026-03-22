// src/hooks/useSupabase.js
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function getTodayKey() {
  return new Date().toISOString().split("T")[0];
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

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        // Use maybeSingle() instead of single() — doesn't throw on 0 rows
        const { data, error } = await supabase
          .from("days")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", dateKey)
          .maybeSingle();

        if (error) console.error("useDay error:", error);
        setDayData(data?.payload || emptyDay);
      } catch (e) {
        console.error("useDay exception:", e);
        setDayData(emptyDay);
      }
      setLoading(false);
    };
    load();
  }, [user?.id, dateKey]);

  const updateDay = useCallback(async (updater) => {
    if (!user) return;
    const current = dayData || emptyDay;
    const updated = updater(current);
    try {
      const { error } = await supabase.from("days").upsert({
        user_id:    user.id,
        date:       dateKey,
        payload:    updated,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,date" });
      if (error) console.error("updateDay error:", error);
    } catch (e) {
      console.error("updateDay exception:", e);
    }
    setDayData(updated);
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