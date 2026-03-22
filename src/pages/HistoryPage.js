// src/pages/HistoryPage.js
import { useHistory, getTodayKey } from "../hooks/useFirestore";
import { useAuth } from "../context/AuthContext";
import { calcTargets } from "../lib/nutrition";
import { Card, CalorieRing } from "../components/UI";

export default function HistoryPage() {
  const { history, loading } = useHistory(30);
  const { profile } = useAuth();
  const targets = calcTargets(profile || {});
  const todayKey = getTodayKey();

  const past = history.filter(d => d.date !== todayKey);

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>📅 History</h1>
      <p style={{ margin: "0 0 20px", color: "#475569", fontSize: 14 }}>Last 30 days of data</p>

      {loading && <div style={{ color: "#475569", fontSize: 14 }}>Loading...</div>}

      {!loading && past.length === 0 && (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ color: "#475569" }}>No history yet — keep logging!</div>
        </Card>
      )}

      {past.map(day => (
        <Card key={day.date} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>
                {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                {day.meals?.length || 0} meals · {day.workouts?.length || 0} workouts
              </div>
            </div>
            <CalorieRing value={day.macros?.calories || 0} max={targets.calories} size={64} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[
              ["Protein", day.macros?.protein || 0, "g", "#818cf8"],
              ["Carbs",   day.macros?.carbs   || 0, "g", "#4ade80"],
              ["Fat",     day.macros?.fat     || 0, "g", "#fb923c"],
              ["Fiber",   day.macros?.fiber   || 0, "g", "#38bdf8"],
            ].map(([lbl, val, unit, color]) => (
              <div key={lbl} style={{ background: "#1e293b", borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color }}>{val}<span style={{ fontSize: 10, color: "#475569" }}>{unit}</span></div>
                <div style={{ fontSize: 10, color: "#475569" }}>{lbl}</div>
              </div>
            ))}
          </div>

          {/* Meal thumbnails */}
          {day.meals?.some(m => m.image) && (
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {day.meals.filter(m => m.image).map((m, i) => (
                <img key={i} src={m.image} alt={m.meal_name} title={m.meal_name}
                  style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
