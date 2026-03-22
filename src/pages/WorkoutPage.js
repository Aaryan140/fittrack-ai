// src/pages/WorkoutPage.js
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useDay, getTodayKey } from "../hooks/useSupabase";
import { parseWorkout } from "../lib/claudeClient";
import { GOAL_LABELS } from "../lib/nutrition";
import { Card, Btn, Spinner, TagBadge } from "../components/UI";

export default function WorkoutPage() {
  const { profile } = useAuth();
  const { updateDay } = useDay(getTodayKey());

  const [mode, setMode]       = useState("voice"); // "voice" | "type"
  const [input, setInput]     = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");
  const [saved, setSaved]     = useState(false);

  // ── Voice state ───────────────────────────────────────────
  const [voiceState, setVoiceState] = useState("idle"); // idle | listening | processing | done
  const [transcript, setTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Voice recognition not supported. Use Chrome on Android/desktop.");
      return;
    }
    setVoiceError("");
    setTranscript("");
    setResult(null);
    setError("");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setVoiceState("listening");

    recognition.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join(" ");
      setTranscript(text);
    };

    recognition.onend = () => {
      setVoiceState("done");
    };

    recognition.onerror = (e) => {
      setVoiceError("Could not hear you. Please try again.");
      setVoiceState("idle");
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setVoiceState("processing");
    setTimeout(() => setVoiceState("done"), 500);
  };

  const useTranscript = () => {
    setInput(transcript);
    setMode("type");
  };

  // ── Parse workout ─────────────────────────────────────────
  const parse = async () => {
    const text = input.trim();
    if (!text) return;
    setParsing(true); setError(""); setResult(null);
    try {
      const res = await parseWorkout({
        description: text,
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
    setInput(""); setResult(null); setTranscript(""); setVoiceState("idle");
  };

  const EXAMPLES = [
    "30 min run at easy pace",
    "Bench press 4x8 at 80kg, rows 3x10",
    "1 hour yoga session",
    "Leg day — squats, lunges, deadlifts",
  ];

  const micColor = voiceState === "listening" ? "#ef4444" : voiceState === "processing" ? "#f97316" : "#6366f1";

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <style>{`
        @keyframes pulsering { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.35)} 50%{box-shadow:0 0 0 14px rgba(239,68,68,0)} }
        @keyframes wavebar { 0%,100%{height:6px} 50%{height:28px} }
        .wbar { width:4px; border-radius:99px; background:#ef4444; animation:wavebar 0.8s ease infinite; }
        .wbar:nth-child(1){animation-delay:0s} .wbar:nth-child(2){animation-delay:.1s}
        .wbar:nth-child(3){animation-delay:.2s} .wbar:nth-child(4){animation-delay:.3s}
        .wbar:nth-child(5){animation-delay:.2s} .wbar:nth-child(6){animation-delay:.1s}
        .wbar:nth-child(7){animation-delay:0s}
      `}</style>

      <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>🏋️ Log Workout</h1>
      <p style={{ margin: "0 0 16px", color: "#475569", fontSize: 14 }}>Speak or type — AI parses duration, calories, muscle groups</p>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["voice", "type"].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "6px 16px", borderRadius: 99, fontSize: 12, cursor: "pointer",
            border: mode === m ? "1px solid #6366f1" : "1px solid #1e293b",
            background: mode === m ? "#6366f133" : "transparent",
            color: mode === m ? "#a5b4fc" : "#475569",
            fontFamily: "inherit", transition: "all 0.15s",
          }}>
            {m === "voice" ? "🎙️ Voice" : "⌨️ Type"}
          </button>
        ))}
      </div>

      {/* VOICE MODE */}
      {mode === "voice" && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ textAlign: "center", padding: "12px 0 16px" }}>
            <button
              onClick={voiceState === "listening" ? stopListening : startListening}
              style={{
                width: 72, height: 72, borderRadius: "50%", border: "none",
                background: micColor, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", margin: "0 auto",
                animation: voiceState === "listening" ? "pulsering 1s ease infinite" : "none",
                transition: "background 0.2s",
              }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="9" y="2" width="10" height="14" rx="5" fill="white"/>
                <path d="M4 14c0 5.5 4 9 10 9s10-3.5 10-9" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <line x1="14" y1="23" x2="14" y2="26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="10" y1="26" x2="18" y2="26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <div style={{ fontSize: 12, color: "#475569", marginTop: 10 }}>
              {voiceState === "idle" && "Tap mic to start speaking"}
              {voiceState === "listening" && "Listening... tap again to stop"}
              {voiceState === "processing" && "Processing..."}
              {voiceState === "done" && "Got it!"}
            </div>

            {voiceState === "listening" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height: 36, margin: "10px 0" }}>
                {[...Array(7)].map((_, i) => <div key={i} className="wbar" style={{ animationDelay: `${[0,.1,.2,.3,.2,.1,0][i]}s` }} />)}
              </div>
            )}
          </div>

          {voiceError && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 10, textAlign: "center" }}>{voiceError}</div>}

          {transcript && (
            <div style={{ background: "#1e293b", borderRadius: 12, padding: "12px 14px", marginBottom: 12, fontSize: 14, color: "#f1f5f9", lineHeight: 1.5 }}>
              "{transcript}"
            </div>
          )}

          {voiceState === "done" && transcript && (
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => { setInput(transcript); parse(); }} fullWidth>
                🤖 Parse this workout
              </Btn>
              <Btn onClick={() => { setTranscript(""); setVoiceState("idle"); }} variant="ghost">
                Retry
              </Btn>
            </div>
          )}

          {voiceState === "idle" && !transcript && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>Try saying:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["I ran 5k in 28 minutes", "Bench press 4 sets of 8 at 80kg", "Leg day — squats and deadlifts", "45 minute yoga session"].map(ex => (
                  <button key={ex} onClick={() => { setTranscript(ex); setVoiceState("done"); }}
                    style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 99, padding: "4px 10px", fontSize: 11, color: "#94a3b8", cursor: "pointer", fontFamily: "inherit" }}>
                    "{ex}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TYPE MODE */}
      {mode === "type" && (
        <Card style={{ marginBottom: 14 }}>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setSaved(false); setResult(null); }}
            placeholder="e.g. 45 min jog + 3 sets of 10 squats at 80kg..."
            style={{
              width: "100%", minHeight: 100,
              background: "#1e293b", border: "1px solid #334155",
              borderRadius: 12, padding: "12px 14px",
              color: "#f1f5f9", fontSize: 14,
              fontFamily: "inherit", resize: "vertical",
              outline: "none", boxSizing: "border-box",
            }}
          />
          <div style={{ marginTop: 10, marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setInput(ex)}
                style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 99, padding: "4px 10px", fontSize: 12, color: "#94a3b8", cursor: "pointer", fontFamily: "inherit" }}>
                {ex}
              </button>
            ))}
          </div>
          <Btn onClick={parse} disabled={parsing || !input.trim()} fullWidth>
            {parsing ? "Parsing..." : "🤖 Parse with AI"}
          </Btn>
        </Card>
      )}

      {parsing && <div style={{ marginBottom: 14 }}><Spinner label="Calculating your effort..." /></div>}
      {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 14 }}>{error}</div>}

      {/* Result */}
      {result && (
        <Card style={{ animation: "fadeUp 0.4s ease", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: "#f1f5f9" }}>{result.workout_name}</h2>
            <TagBadge label={result.intensity} color={result.intensity === "High" ? "#f87171" : result.intensity === "Medium" ? "#fb923c" : "#4ade80"} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[["Duration", `${result.duration_min} min`, "#818cf8"], ["Calories", `${result.calories_burned} kcal`, "#fb923c"]].map(([l, v, c]) => (
              <div key={l} style={{ background: "#1e293b", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{l}</div>
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
        <div style={{ background: "#4ade8022", border: "1px solid #4ade80", borderRadius: 12, padding: 14, color: "#4ade80", fontSize: 14, fontWeight: 500 }}>
          ✓ Workout saved to today's log!
        </div>
      )}
    </div>
  );
}