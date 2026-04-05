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

function Spinner() {
  return (
    <div style={{ minHeight: "100vh", background: "#020617", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #1e293b", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>Loading...</p>
    </div>
  );
}

function AppShell() {
  const { user, profile, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  // Safety valve: never spin more than 8 seconds
  useEffect(() => {
    if (!loading) { setTimedOut(false); return; }
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [loading]);

  // 1. Still waiting for Supabase AND haven't timed out yet → spinner
  if (loading && !timedOut) return <Spinner />;

  // 2. No user (not logged in, or timed out before session loaded) → login
  if (!user) return <LoginPage />;

// 3. Profile not yet fetched → keep spinning
if (!profile && !timedOut) return <Spinner />;

// 4. User exists but hasn't completed setup → setup wizard
if (profile && !profile.setupDone) return <SetupPage />;

  // 5. Fully authenticated → main app
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

      {/* Header */}
      <div style={{ background: "#0a0f1e", borderBottom: "1px solid #0f172a", padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, background: "linear-gradient(135deg, #818cf8, #a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FitTrack AI</span>
        </div>
        <span style={{ fontSize: 12, color: "#475569" }}>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>

      {/* Pages */}
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

      {/* Bottom nav */}
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