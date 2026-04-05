// src/App.js
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useEffect, useState } from "react";
import LoginPage      from "./pages/LoginPage";
import SetupPage      from "./pages/SetupPage";
import DashboardPage  from "./pages/DashboardPage";
import LogMealPage    from "./pages/LogMealPage";
import WorkoutPage    from "./pages/WorkoutPage";
import ActivityPage   from "./pages/ActivityPage";
import InsightsPage   from "./pages/InsightsPage";
import HistoryPage    from "./pages/HistoryPage";
import ProfilePage    from "./pages/ProfilePage";

const NAV = [
  { to: "/",         icon: "📊", label: "Today"    },
  { to: "/meal",     icon: "📸", label: "Meal"     },
  { to: "/workout",  icon: "🏋️", label: "Workout"  },
  { to: "/activity", icon: "📡", label: "Activity" },
  { to: "/insights", icon: "🧠", label: "Insights" },
  { to: "/history",  icon: "📅", label: "History"  },
  { to: "/profile",  icon: "👤", label: "Profile"  },
];

const STAY_KEY = "fittrack_stay_logged_in";

function Spinner() {
  return (
    <div style={{ minHeight: "100vh", background: "#020617", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #1e293b", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>Loading...</p>
    </div>
  );
}

function StayLoggedInPrompt({ onYes, onNo }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#020617",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", padding: 20,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <div style={{ width: "100%", maxWidth: 380, animation: "fadeUp 0.4s ease", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <h2 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>Stay logged in?</h2>
        <p style={{ color: "#475569", fontSize: 14, margin: "0 0 28px" }}>
          You were logged in previously. Would you like to continue where you left off?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onYes} style={{
            width: "100%", padding: "14px 20px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff",
            fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>Yes, keep me logged in</button>
          <button onClick={onNo} style={{
            width: "100%", padding: "14px 20px", borderRadius: 12,
            border: "1px solid #334155", background: "transparent", color: "#94a3b8",
            fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>No, sign me out</button>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const { user, profile, loading, logout } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const [askStay, setAskStay]   = useState(false);
  const [ready, setReady]       = useState(false);

  // Safety valve — max 8 seconds spinner
  useEffect(() => {
    if (!loading) { setTimedOut(false); return; }
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [loading]);

  // Once auth resolves, decide what to show
  useEffect(() => {
    if (loading && !timedOut) return; // still loading, wait
    if (!user) { setReady(true); return; } // no user, show login
    const choice = localStorage.getItem(STAY_KEY);
    if (choice === null) {
      setAskStay(true); // never asked before, show prompt
    } else if (choice === "no") {
      logout(); // they said no previously, sign out
    }
    setReady(true);
  }, [loading, timedOut, user]);

  // Still initialising
  if (!ready) return <Spinner />;

  // No user → login
  if (!user) return <LoginPage />;

  // Ask stay logged in
  if (askStay) {
    return (
      <StayLoggedInPrompt
        onYes={() => { localStorage.setItem(STAY_KEY, "yes"); setAskStay(false); }}
        onNo={() => { localStorage.setItem(STAY_KEY, "no"); setAskStay(false); logout(); }}
      />
    );
  }

  // Profile still fetching
  if (!profile && !timedOut) return <Spinner />;

  // Setup not complete
  if (profile && !profile.setupDone) return <SetupPage />;

  // All good — show app
  return (
    <div style={{ minHeight: "100vh", background: "#020617", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", paddingBottom: 72 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
        input, textarea, select { font-family: inherit !important; }
        input:focus, textarea:focus, select:focus { border-color: #6366f1 !important; outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #020617; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 99px; }
      `}</style>

      <div style={{ background: "#0a0f1e", borderBottom: "1px solid #0f172a", padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, background: "linear-gradient(135deg, #818cf8, #a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FitTrack AI</span>
        </div>
        <span style={{ fontSize: 12, color: "#475569" }}>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "18px 16px" }}>
        <Routes>
          <Route path="/"          element={<DashboardPage />} />
          <Route path="/meal"      element={<LogMealPage />}   />
          <Route path="/workout"   element={<WorkoutPage />}   />
          <Route path="/activity"  element={<ActivityPage />}  />
          <Route path="/insights"  element={<InsightsPage />}  />
          <Route path="/history"   element={<HistoryPage />}   />
          <Route path="/profile"   element={<ProfilePage />}   />
          <Route path="*"          element={<Navigate to="/" />} />
        </Routes>
      </div>

      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0a0f1e", borderTop: "1px solid #0f172a", display: "flex", zIndex: 100, overflowX: "auto" }}>
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === "/"}
            style={({ isActive }) => ({
              flex: 1, minWidth: 52, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "7px 2px 9px", textDecoration: "none",
              color: isActive ? "#818cf8" : "#334155", fontSize: 9, fontWeight: 500, gap: 2,
              borderTop: isActive ? "2px solid #6366f1" : "2px solid transparent",
              transition: "color 0.2s", whiteSpace: "nowrap",
            })}>
            <span style={{ fontSize: 15 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}