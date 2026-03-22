// src/hooks/useFirestore.js
import { useState, useEffect } from "react";
import {
  collection, doc, addDoc, setDoc, getDocs,
  query, orderBy, limit, serverTimestamp, getDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

// ── helpers ────────────────────────────────────────────────────
export function getTodayKey() {
  return new Date().toISOString().split("T")[0]; // "2025-03-21"
}

function dayRef(uid, dateKey) {
  return doc(db, "users", uid, "days", dateKey);
}

// ── useDay : read + write a single day document ────────────────
export function useDay(dateKey) {
  const { user } = useAuth();
  const [dayData, setDayData] = useState(null);
  const [loading, setLoading] = useState(true);

  const emptyDay = {
    meals:    [],
    workouts: [],
    macros:   { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  };

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const snap = await getDoc(dayRef(user.uid, dateKey));
      setDayData(snap.exists() ? snap.data() : emptyDay);
      setLoading(false);
    };
    fetch();
  }, [user, dateKey]);

  // Merge updates and write to Firestore
  const updateDay = async (updater) => {
    if (!user) return;
    const current = dayData || emptyDay;
    const updated = updater(current);
    await setDoc(dayRef(user.uid, dateKey), {
      ...updated,
      updatedAt: serverTimestamp(),
    }, { merge: false });
    setDayData(updated);
  };

  return { dayData: dayData || emptyDay, loading, updateDay };
}

// ── useHistory : last N days ───────────────────────────────────
export function useHistory(days = 14) {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, "users", user.uid, "days"), orderBy("updatedAt", "desc"), limit(days))
      );
      const entries = snap.docs.map((d) => ({ date: d.id, ...d.data() }));
      setHistory(entries);
      setLoading(false);
    };
    fetch();
  }, [user, days]);

  return { history, loading };
}
