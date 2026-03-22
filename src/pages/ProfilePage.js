// src/pages/ProfilePage.js
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { calcTargets, GOAL_LABELS, ACTIVITY_LABELS } from "../lib/nutrition";
import { Card, Btn, Input } from "../components/UI";

export default function ProfilePage() {
  const { profile, saveProfile, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);

  const targets = calcTargets(profile || {});

  const startEdit = () => {
    setForm({
      age: profile?.age || "",
      weight: profile?.weight || "",
      height: profile?.height || "",
      goal: profile?.goal || "maintain",
      activityLevel: profile?.activityLevel || "moderate",
      sex: profile?.sex || "male",
    });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    await saveProfile(form);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <h1 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>👤 Profile</h1>

      {/* User info */}
      <Card style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
          {profile?.displayName?.[0] || profile?.email?.[0] || "?"}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>{profile?.displayName || "User"}</div>
          <div style={{ fontSize: 13, color: "#475569" }}>{profile?.email}</div>
        </div>
      </Card>

      {/* Daily targets */}
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 13, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Daily Targets</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {[
            ["🔥 Calories", targets.calories, "kcal"],
            ["💪 Protein",  targets.protein,  "g"],
            ["🌾 Carbs",    targets.carbs,    "g"],
            ["🥑 Fat",      targets.fat,      "g"],
          ].map(([lbl, val, unit]) => (
            <div key={lbl} style={{ background: "#1e293b", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: "#475569" }}>{lbl}</div>
              <div style={{ fontWeight: 700, fontSize: 20, color: "#f1f5f9", marginTop: 2 }}>{val}<span style={{ fontSize: 12, color: "#475569" }}> {unit}</span></div>
            </div>
          ))}
        </div>
      </Card>

      {/* Fitness info */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 13, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Fitness Info</h3>
          <button onClick={startEdit} style={{ background: "none", border: "1px solid #334155", borderRadius: 8, padding: "4px 12px", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
        </div>

        {!editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Goal",           GOAL_LABELS[profile?.goal]     || "–"],
              ["Activity Level", ACTIVITY_LABELS[profile?.activityLevel] || "–"],
              ["Age",            profile?.age    ? `${profile.age} years`  : "–"],
              ["Weight",         profile?.weight ? `${profile.weight} kg`  : "–"],
              ["Height",         profile?.height ? `${profile.height} cm`  : "–"],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                <span style={{ fontSize: 13, color: "#475569" }}>{lbl}</span>
                <span style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <Input label="Age" type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="28" />
            <Input label="Weight (kg)" type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="70" />
            <Input label="Height (cm)" type="number" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} placeholder="175" />

            <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Goal</label>
            <select value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "12px 14px", color: "#f1f5f9", fontSize: 14, fontFamily: "inherit", marginBottom: 14 }}>
              {Object.entries(GOAL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Activity Level</label>
            <select value={form.activityLevel} onChange={e => setForm(f => ({ ...f, activityLevel: e.target.value }))}
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "12px 14px", color: "#f1f5f9", fontSize: 14, fontFamily: "inherit", marginBottom: 16 }}>
              {Object.entries(ACTIVITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={save} disabled={saving} variant="success" fullWidth>{saving ? "Saving..." : "Save Changes"}</Btn>
              <Btn onClick={() => setEditing(false)} variant="ghost">Cancel</Btn>
            </div>
          </div>
        )}
      </Card>

      <Btn onClick={logout} variant="danger" fullWidth>Sign Out</Btn>
    </div>
  );
}
