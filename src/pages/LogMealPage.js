// src/pages/LogMealPage.js
import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useDay, getTodayKey } from "../hooks/useSupabase";
import { analyzeFood } from "../lib/claudeClient";
import { calcTargets, GOAL_LABELS } from "../lib/nutrition";
import { Card, Btn, Spinner, TagBadge } from "../components/UI";

export default function LogMealPage() {
  const { profile } = useAuth();
  const { updateDay } = useDay(getTodayKey());
  const targets = calcTargets(profile || {});

  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [base64, setBase64]             = useState(null);
  const [analyzing, setAnalyzing]       = useState(false);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState("");
  const [saved, setSaved]               = useState(false);
  const [saving, setSaving]             = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file); setResult(null); setError(""); setSaved(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target.result);
      setBase64(ev.target.result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    setAnalyzing(true); setError(""); setResult(null);
    try {
      const res = await analyzeFood({
        base64, mimeType: imageFile.type || "image/jpeg",
        goal: GOAL_LABELS[profile?.goal] || "Maintain Weight", targets,
      });
      setResult(res);
    } catch (e) {
      setError("Could not analyze image. Please try again.");
    }
    setAnalyzing(false);
  };

  const save = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      await updateDay(day => ({
        ...day,
        meals: [...(day.meals || []), {
          ...result,
          // image NOT saved — base64 too large, causes mobile save failures
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }],
        macros: {
          calories: (day.macros?.calories || 0) + (result.macros?.calories || 0),
          protein:  (day.macros?.protein  || 0) + (result.macros?.protein  || 0),
          carbs:    (day.macros?.carbs    || 0) + (result.macros?.carbs    || 0),
          fat:      (day.macros?.fat      || 0) + (result.macros?.fat      || 0),
          fiber:    (day.macros?.fiber    || 0) + (result.macros?.fiber    || 0),
        },
      }));
      setSaved(true);
      setImageFile(null); setImagePreview(null); setBase64(null); setResult(null);
    } catch (e) {
      console.error("Save failed:", e);
      setError("Could not save meal. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>📸 Log a Meal</h1>
      <p style={{ margin: "0 0 20px", color: "#475569", fontSize: 14 }}>Take or upload a photo — AI does the rest</p>

      <Card style={{ marginBottom: 16 }}>
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile({ target: { files: [f] } }); }}
          onDragOver={e => e.preventDefault()}
          style={{ border: "2px dashed #334155", borderRadius: 16, padding: imagePreview ? 12 : 48, textAlign: "center", cursor: "pointer", transition: "border-color 0.2s", marginBottom: 16 }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#6366f1"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#334155"}
        >
          {imagePreview ? (
            <img src={imagePreview} alt="food" style={{ maxHeight: 260, maxWidth: "100%", borderRadius: 12, objectFit: "contain" }} />
          ) : (
            <>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📷</div>
              <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: 4 }}>Tap to upload or drag & drop</div>
              <div style={{ fontSize: 13, color: "#475569" }}>JPG, PNG, WEBP supported</div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} capture="environment" />
        {imagePreview && !result && (
          <Btn onClick={analyze} disabled={analyzing} fullWidth>
            {analyzing ? "Analyzing..." : "🔍 Analyze with AI"}
          </Btn>
        )}
        {analyzing && <div style={{ marginTop: 12 }}><Spinner label="Reading your meal..." /></div>}
        {error && <div style={{ marginTop: 12, color: "#f87171", fontSize: 13 }}>{error}</div>}
      </Card>

      {result && (
        <Card accent="#6366f133" style={{ animation: "fadeUp 0.4s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 20, color: "#f1f5f9" }}>{result.meal_name}</h2>
            <TagBadge label={`${result.health_score}/10`} color={result.health_score >= 7 ? "#4ade80" : result.health_score >= 5 ? "#fb923c" : "#f87171"} />
          </div>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 16px" }}>{result.description}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
            {[
              ["Calories", result.macros?.calories, "kcal", "#818cf8"],
              ["Protein",  result.macros?.protein,  "g",    "#a5b4fc"],
              ["Carbs",    result.macros?.carbs,     "g",    "#4ade80"],
              ["Fat",      result.macros?.fat,       "g",    "#fb923c"],
              ["Fiber",    result.macros?.fiber,     "g",    "#38bdf8"],
            ].map(([lbl, val, unit, color]) => (
              <div key={lbl} style={{ background: "#1e293b", borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
                <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase" }}>{unit}</div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 13, color: "#94a3b8" }}>
            💡 <span style={{ color: "#a5b4fc", fontWeight: 500 }}>Goal fit: </span>{result.goal_alignment}
          </div>
          {result.notes && <div style={{ fontSize: 13, color: "#475569", marginBottom: 14 }}>📝 {result.notes}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={save} disabled={saving} variant="success" fullWidth>
              {saving ? "Saving..." : "✓ Add to Today's Log"}
            </Btn>
            <Btn onClick={() => { setResult(null); setImagePreview(null); setImageFile(null); }} variant="ghost">Discard</Btn>
          </div>
        </Card>
      )}

      {saved && (
        <div style={{ background: "#4ade8022", border: "1px solid #4ade80", borderRadius: 12, padding: 14, marginTop: 12, color: "#4ade80", fontSize: 14, fontWeight: 500 }}>
          ✓ Meal saved to today's log!
        </div>
      )}
    </div>
  );
}