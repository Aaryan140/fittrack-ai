// src/pages/InsightsPage.js
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useDay, useHistory, getTodayKey } from "../hooks/useFirestore";
import { generateInsights } from "../lib/claudeClient";
import { calcTargets, GOAL_LABELS } from "../lib/nutrition";
import { Card, Btn, Spinner } from "../components/UI";

export default function InsightsPage() {
  const { profile } = useAuth();
  const { dayData } = useDay(getTodayKey());
  const { history } = useHistory(7);
  const targets = calcTargets(profile || {});

  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState(null);
  const [error, setError]     = useState("");

  const generate = async () => {
    setLoading(true); setError(""); setData(null);
    try {
      const res = await generateInsights({ profile: { ...profile, goal: GOAL_LABELS[profile?.goal] }, todayData: dayData, history, targets });
      setData(res);
    } catch {
      setError("Could not generate insights. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>🧠 AI Insights</h1>
      <p style={{ margin: "0 0 20px", color: "#475569", fontSize: 14 }}>Personalised plan based on your data and goals</p>

      <Card style={{ marginBottom: 20, background: "linear-gradient(135deg, #0f172a, #1e1b4b)" }}>
        <div style={{ fontSize: 13, color: "#818cf8", fontWeight: 500, marginBottom: 6 }}>
          Goal: {GOAL_LABELS[profile?.goal] || "–"}
        </div>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 16px" }}>
          Claude will analyse your today's intake, workout, and the past 7 days to suggest tomorrow's meals, workout, and flag any patterns.
        </p>
        <Btn onClick={generate} disabled={loading} fullWidth>
          {loading ? "Generating..." : "✨ Generate Tomorrow's Plan"}
        </Btn>
        {loading && <div style={{ marginTop: 14 }}><Spinner label="Analysing your data..." /></div>}
        {error && <div style={{ marginTop: 10, color: "#f87171", fontSize: 13 }}>{error}</div>}
      </Card>

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp 0.4s ease" }}>

          {/* Tomorrow meals */}
          <Card>
            <h3 style={{ margin: "0 0 14px", fontSize: 13, color: "#818cf8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>🥗 Recommended Meals Tomorrow</h3>
            {data.tomorrow_meals?.map((m, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < data.tomorrow_meals.length - 1 ? "1px solid #1e293b" : "none" }}>
                <div style={{ fontWeight: 600, color: "#f1f5f9", marginBottom: 3 }}>{m.meal}</div>
                {m.approx_macros && <div style={{ fontSize: 11, color: "#818cf8", marginBottom: 3 }}>{m.approx_macros}</div>}
                <div style={{ fontSize: 12, color: "#475569" }}>{m.reason}</div>
              </div>
            ))}
          </Card>

          {/* Tomorrow workout */}
          <Card>
            <h3 style={{ margin: "0 0 14px", fontSize: 13, color: "#4ade80", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>🏃 Recommended Workout</h3>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#f1f5f9", marginBottom: 4 }}>{data.tomorrow_workout?.type}</div>
            <div style={{ fontSize: 13, color: "#fb923c", marginBottom: 8 }}>⏱ {data.tomorrow_workout?.duration}</div>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{data.tomorrow_workout?.details}</div>
          </Card>

          {/* Nutrition gaps */}
          {data.nutrition_gaps?.length > 0 && (
            <Card accent="#f8717133">
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#f87171", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>⚠️ Nutrition Gaps</h3>
              {data.nutrition_gaps.map((g, i) => (
                <div key={i} style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8, paddingLeft: 12, borderLeft: "2px solid #f87171" }}>{g}</div>
              ))}
            </Card>
          )}

          {/* Positive habits */}
          {data.positive_habits?.length > 0 && (
            <Card accent="#4ade8033">
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#4ade80", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>✅ Great Habits</h3>
              {data.positive_habits.map((h, i) => (
                <div key={i} style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8, paddingLeft: 12, borderLeft: "2px solid #4ade80" }}>{h}</div>
              ))}
            </Card>
          )}

          {/* Weekly insight */}
          {data.weekly_insight && (
            <Card style={{ background: "linear-gradient(135deg, #6366f111, #818cf811)" }} accent="#6366f133">
              <h3 style={{ margin: "0 0 10px", fontSize: 13, color: "#a5b4fc", fontWeight: 600 }}>📈 Weekly Insight</h3>
              <p style={{ color: "#94a3b8", fontSize: 13, margin: 0, lineHeight: 1.7 }}>{data.weekly_insight}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
