// src/pages/DashboardPage.js
import { useAuth } from "../context/AuthContext";
import { useDay, getTodayKey } from "../hooks/useFirestore";
import { calcTargets } from "../lib/nutrition";
import { MacroBar, Card, CalorieRing, TagBadge } from "../components/UI";

export default function DashboardPage() {
  const { profile } = useAuth();
  const { dayData, loading } = useDay(getTodayKey());
  const targets = calcTargets(profile || {});
  const m = dayData.macros;
  const remaining = targets.calories - (m.calories || 0);

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>
          Good {greeting()}, {profile?.displayName?.split(" ")[0] || "there"} 👋
        </h1>
        <p style={{ margin: "4px 0 0", color: "#475569", fontSize: 14 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Calorie card */}
      <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #0f172a, #1e1b4b)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: "#475569" }}>Calories Today</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: "#f1f5f9", lineHeight: 1.1 }}>
              {m.calories || 0}
              <span style={{ fontSize: 16, fontWeight: 400, color: "#475569" }}> / {targets.calories}</span>
            </div>
            <div style={{ fontSize: 13, marginTop: 4, color: remaining >= 0 ? "#4ade80" : "#f87171", fontWeight: 500 }}>
              {remaining >= 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal over`}
            </div>
          </div>
          <CalorieRing value={m.calories || 0} max={targets.calories} />
        </div>

        <MacroBar label="Protein"  value={m.protein || 0} max={targets.protein} color="#818cf8" />
        <MacroBar label="Carbs"    value={m.carbs   || 0} max={targets.carbs}   color="#4ade80" />
        <MacroBar label="Fat"      value={m.fat     || 0} max={targets.fat}     color="#fb923c" />
        <MacroBar label="Fiber"    value={m.fiber   || 0} max={targets.fiber}   color="#38bdf8" />
      </Card>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Card style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#818cf8" }}>{dayData.meals?.length || 0}</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Meals logged</div>
        </Card>
        <Card style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#4ade80" }}>
            {dayData.workouts?.reduce((s, w) => s + (w.calories_burned || 0), 0) || 0}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Kcal burned</div>
        </Card>
      </div>

      {/* Today's meals */}
      {dayData.meals?.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 13, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Today's Meals</h3>
          {dayData.meals.map((meal, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: i < dayData.meals.length - 1 ? "1px solid #1e293b" : "none" }}>
              {meal.image && <img src={meal.image} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meal.meal_name}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                  {meal.time} · {meal.macros?.calories} kcal · {meal.macros?.protein}g P
                </div>
              </div>
              <TagBadge label={`${meal.health_score}/10`} color={meal.health_score >= 7 ? "#4ade80" : meal.health_score >= 5 ? "#fb923c" : "#f87171"} />
            </div>
          ))}
        </Card>
      )}

      {/* Today's workouts */}
      {dayData.workouts?.length > 0 && (
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 13, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Today's Workouts</h3>
          {dayData.workouts.map((w, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: i < dayData.workouts.length - 1 ? "1px solid #1e293b" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>{w.workout_name}</span>
                <TagBadge label={w.intensity} color={w.intensity === "High" ? "#f87171" : w.intensity === "Medium" ? "#fb923c" : "#4ade80"} />
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                {w.time} · {w.duration_min} min · {w.calories_burned} kcal · {w.muscle_groups?.join(", ")}
              </div>
            </div>
          ))}
        </Card>
      )}

      {dayData.meals?.length === 0 && dayData.workouts?.length === 0 && !loading && (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🌅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#94a3b8" }}>Your day is empty</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>Log a meal or workout to get started</div>
        </Card>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
