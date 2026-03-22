// src/pages/SetupPage.js
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { GOAL_LABELS, ACTIVITY_LABELS } from "../lib/nutrition";
import { Btn, Input } from "../components/UI";

const STEPS = [
  { key: "age",           label: "How old are you?",         type: "number", placeholder: "e.g. 28" },
  { key: "sex",           label: "Biological sex",            type: "select", options: { male: "Male", female: "Female" } },
  { key: "weight",        label: "Weight (kg)",               type: "number", placeholder: "e.g. 72" },
  { key: "height",        label: "Height (cm)",               type: "number", placeholder: "e.g. 175" },
  { key: "goal",          label: "Primary fitness goal",      type: "select", options: GOAL_LABELS },
  { key: "activityLevel", label: "Activity level",            type: "select", options: ACTIVITY_LABELS },
];

export default function SetupPage() {
  const { saveProfile, user } = useAuth();
  const [step, setStep]     = useState(0);
  const [data, setData]     = useState({ sex: "male", goal: "lose_weight", activityLevel: "moderate" });
  const [saving, setSaving] = useState(false);

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = async () => {
    if (!isLast) { setStep(s => s + 1); return; }
    setSaving(true);
    await saveProfile({ ...data, setupDone: true });
    setSaving(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", padding: 20,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        input:focus { border-color: #6366f1 !important; outline: none; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 440, animation: "fadeUp 0.4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>⚡</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>
            Let's set up your profile
          </h1>
          <p style={{ color: "#475569", fontSize: 13, marginTop: 6 }}>
            Hi {user?.displayName?.split(" ")[0] || "there"}! Just a few questions to personalise your experience.
          </p>
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 24, padding: 32 }}>
          {/* Progress bar */}
          <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? "#6366f1" : "#1e293b", transition: "background 0.3s" }} />
            ))}
          </div>

          <div style={{ fontSize: 12, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
            Step {step + 1} of {STEPS.length}
          </div>
          <h2 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 600, margin: "0 0 20px" }}>{s.label}</h2>

          {s.type === "select" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(s.options).map(([val, label]) => (
                <button key={val} onClick={() => setData(d => ({ ...d, [s.key]: val }))}
                  style={{
                    background: data[s.key] === val ? "#6366f122" : "#1e293b",
                    border: data[s.key] === val ? "1px solid #6366f1" : "1px solid #334155",
                    borderRadius: 12, padding: "12px 16px",
                    color: data[s.key] === val ? "#a5b4fc" : "#94a3b8",
                    cursor: "pointer", textAlign: "left", fontSize: 14,
                    fontFamily: "inherit", transition: "all 0.2s",
                  }}>
                  {data[s.key] === val ? "● " : "○ "}{label}
                </button>
              ))}
            </div>
          ) : (
            <Input
              type={s.type}
              placeholder={s.placeholder}
              value={data[s.key] || ""}
              onChange={e => setData(d => ({ ...d, [s.key]: e.target.value }))}
            />
          )}

          <div style={{ marginTop: 24 }}>
            <Btn onClick={next} disabled={saving} fullWidth>
              {saving ? "Saving..." : isLast ? "Start Tracking ⚡" : "Continue →"}
            </Btn>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: "#475569", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                ← Back
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
