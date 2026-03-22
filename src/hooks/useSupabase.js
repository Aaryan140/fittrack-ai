// src/hooks/useSupabase.js  — replaces useFirestore.js
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
  const [dayData, setDayData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("days")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", dateKey)
        .single();
      setDayData(data ? data.payload : emptyDay);
      setLoading(false);
    };
    load();
  }, [user, dateKey]);

  const updateDay = useCallback(async (updater) => {
    if (!user) return;
    const current = dayData || emptyDay;
    const updated = updater(current);
    await supabase.from("days").upsert({
      user_id:    user.id,
      date:       dateKey,
      payload:    updated,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,date" });
    setDayData(updated);
  }, [user, dateKey, dayData]);

  return { dayData: dayData || emptyDay, loading, updateDay };
}

// ── useHistory: last N days ────────────────────────────────────
export function useHistory(days = 14) {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("days")
        .select("date, payload")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(days);
      setHistory((data || []).map(r => ({ date: r.date, ...r.payload })));
      setLoading(false);
    };
    load();
  }, [user, days]);

  return { history, loading };
}
