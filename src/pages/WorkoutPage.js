// src/pages/WorkoutPage.js
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useDay, getTodayKey } from "../hooks/useSupabase";
import { parseWorkout } from "../lib/claudeClient";
import { GOAL_LABELS } from "../lib/nutrition";
import { Card, Btn, Spinner, TagBadge } from "../components/UI";

export default function WorkoutPage() {
  const { profile } = useAuth();
  const { updateDay } = useDay(getTodayKey());

  const [input, setInput]   = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError]   = useState("");
  const [saved, setSaved]   = useState(false);

  const parse = async () => {
    if (!input.trim()) return;
    setParsing(true); setError(""); setResult(null);
    try {
      const res = await parseWorkout({
        description: input,
        goal: GOAL_LABELS[profile?.goal] || "Maintain Weight",
        weight: profile?.weight || 70,
      });
      setResult(res);
    } catch {
      setError("Could not parse workout. Please try again.");
    }
    setParsing(false);
  };

  const save = async () => {
    if (!result) return;
    await updateDay(day => ({
      ...day,
      workouts: [...(day.workouts || []), {
        ...result,
        raw: input,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }],
    }));
    setSaved(true);
    setInput(""); setResult(null);
  };

  const EXAMPLES = [
    "30 min run at easy pace",
    "Upper body: bench press 4x8 80kg, rows 3x10, shoulder press 3x12",
    "1 hour yoga session",
    "Cycling 45 min moderate intensity + 20 min core work",
  ];

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>🏋️ Log Workout</h1>
      <p style={{ margin: "0 0 20px", color: "#475569", fontSize: 14 }}>Describe what you did — AI parses the details</p>

      <Card style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 8, fontWeight: 500 }}>
          Describe your workout
        </label>
        <textarea
          value={input}
          onChange={e => { setInput(e.target.value); setSaved(false); setResult(null); }}
          placeholder="e.g. 45 min jog + 3 sets of 10 squats at 80kg, bench press 3x8..."
          style={{
            width: "100%", minHeight: 110,
            background: "#1e293b", border: "1px solid #334155",
            borderRadius: 12, padding: "12px 14px",
            color: "#f1f5f9", fontSize: 14,
            fontFamily: "inherit", resize: "vertical",
            outline: "none", boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderColor = "#6366f1"}
          onBlur={e => e.target.style.borderColor = "#334155"}
        />

        {/* Example chips */}
        <div style={{ marginTop: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>Try an example:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setInput(ex)}
                style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 99, padding: "4px 10px", fontSize: 12, color: "#94a3b8", cursor: "pointer", fontFamily: "inherit" }}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        <Btn onClick={parse} disabled={parsing || !input.trim()} fullWidth>
          {parsing ? "Parsing..." : "🤖 Parse with AI"}
        </Btn>
        {parsing && <div style={{ marginTop: 12 }}><Spinner label="Calculating your effort..." /></div>}
        {error && <div style={{ marginTop: 12, color: "#f87171", fontSize: 13 }}>{error}</div>}
      </Card>

      {/* Result */}
      {result && (
        <Card accent="#6366f133" style={{ animation: "fadeUp 0.4s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: "#f1f5f9" }}>{result.workout_name}</h2>
            <TagBadge
              label={result.intensity}
              color={result.intensity === "High" ? "#f87171" : result.intensity === "Medium" ? "#fb923c" : "#4ade80"}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              ["Duration", result.duration_min, "min",  "#818cf8"],
              ["Burned",   result.calories_burned, "kcal", "#fb923c"],
              ["Intensity", result.intensity, "",       "#4ade80"],
            ].map(([lbl, val, unit, color]) => (
              <div key={lbl} style={{ background: "#1e293b", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}<span style={{ fontSize: 12, color: "#475569" }}>{unit && ` ${unit}`}</span></div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>

          <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 12px" }}>{result.summary}</p>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {result.muscle_groups?.map(m => <TagBadge key={m} label={m} color="#6366f1" />)}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={save} variant="success" fullWidth>✓ Save Workout</Btn>
            <Btn onClick={() => setResult(null)} variant="ghost">Discard</Btn>
          </div>
        </Card>
      )}

      {saved && (
        <div style={{ background: "#4ade8022", border: "1px solid #4ade80", borderRadius: 12, padding: 14, marginTop: 12, color: "#4ade80", fontSize: 14, fontWeight: 500 }}>
          ✓ Workout saved to today's log!
        </div>
      )}
    </div>
  );
}
