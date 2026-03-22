// src/pages/LoginPage.js
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Btn, Input } from "../components/UI";

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode]       = useState("login"); // "login" | "signup"
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]       = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmail = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "signup") await signUpWithEmail(email, password, name);
      else                   await signInWithEmail(email, password);
    } catch (e) {
      setError(e.message.replace("Firebase: ", "").replace(/\(auth.*\)/, "").trim());
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try { await signInWithGoogle(); }
    catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      padding: 20,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        input { transition: border-color 0.2s; }
        input:focus { border-color: #6366f1 !important; outline: none; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp 0.5s ease" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>⚡</div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800,
            background: "linear-gradient(135deg, #818cf8, #a5b4fc)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            margin: 0,
          }}>FitTrack AI</h1>
          <p style={{ color: "#475569", fontSize: 14, marginTop: 8 }}>Your personal AI nutrition & fitness coach</p>
        </div>

        {/* Card */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 24, padding: 32 }}>
          <h2 style={{ margin: "0 0 24px", color: "#f1f5f9", fontSize: 20, fontWeight: 600 }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>

          {mode === "signup" && (
            <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
          )}
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />

          {error && (
            <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#f87171", marginBottom: 16 }}>
              {error}
            </div>
          )}

          <Btn onClick={handleEmail} disabled={loading} fullWidth>
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </Btn>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
            <span style={{ fontSize: 12, color: "#475569" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
          </div>

          <button onClick={handleGoogle} disabled={loading} style={{
            width: "100%", background: "#1e293b", border: "1px solid #334155",
            borderRadius: 12, padding: "12px 20px", color: "#f1f5f9",
            fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#475569" }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              style={{ background: "none", border: "none", color: "#818cf8", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
