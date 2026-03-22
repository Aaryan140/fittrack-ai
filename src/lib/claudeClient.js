// src/lib/claudeClient.js
// All calls go through /api/claude (Vercel serverless) so the API key
// is never exposed in the browser bundle.

async function callClaude({ system, messages, max_tokens = 1000 }) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, max_tokens }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  const text = data.content?.map((b) => b.text || "").join("") || "{}";
  return text.replace(/```json|```/g, "").trim();
}

// ── Analyze a food photo ───────────────────────────────────────
export async function analyzeFood({ base64, mimeType, goal, targets }) {
  const system = `You are a professional nutritionist AI. Analyze food images and return ONLY a JSON object, no markdown:
{
  "meal_name": "string",
  "description": "brief description",
  "macros": { "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number },
  "ingredients": ["string"],
  "health_score": number (1-10),
  "notes": "string",
  "goal_alignment": "how this fits or doesn't fit the user's goal"
}`;

  const text = await callClaude({
    system,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
        { type: "text", text: `Analyze this meal. My goal: ${goal}. Daily targets: ${targets.calories} kcal, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fat}g fat.` },
      ],
    }],
    max_tokens: 800,
  });
  return JSON.parse(text);
}

// ── Parse a free-text workout description ─────────────────────
export async function parseWorkout({ description, goal, weight }) {
  const system = `You are a fitness coach AI. Parse workout descriptions and return ONLY JSON, no markdown:
{ "workout_name": "string", "duration_min": number, "calories_burned": number, "muscle_groups": ["string"], "intensity": "Low|Medium|High", "summary": "string" }`;

  const text = await callClaude({
    system,
    messages: [{ role: "user", content: `Parse this workout for someone with goal "${goal}", weight ${weight}kg: ${description}` }],
    max_tokens: 600,
  });
  return JSON.parse(text);
}

// ── Generate personalised tomorrow plan ───────────────────────
export async function generateInsights({ profile, todayData, history, targets }) {
  const system = `You are an expert nutritionist and fitness coach. Return ONLY JSON, no markdown:
{
  "tomorrow_meals": [{ "meal": "string", "reason": "string", "approx_macros": "string" }],
  "tomorrow_workout": { "type": "string", "duration": "string", "details": "string" },
  "nutrition_gaps": ["string"],
  "positive_habits": ["string"],
  "weekly_insight": "string",
  "macro_summary": "string"
}`;

  const text = await callClaude({
    system,
    messages: [{
      role: "user",
      content: `Profile: ${JSON.stringify({ goal: profile.goal, activityLevel: profile.activityLevel, weight: profile.weight, targets })}.
Today: ${JSON.stringify({ macros: todayData.macros, meals: todayData.meals?.map((m) => m.meal_name), workouts: todayData.workouts?.map((w) => w.workout_name) })}.
7-day history: ${JSON.stringify(history.slice(0, 7).map((d) => ({ date: d.date, macros: d.macros, meals: d.meals?.length, workouts: d.workouts?.length })))}.
Give specific, personalised suggestions for tomorrow.`,
    }],
    max_tokens: 1200,
  });
  return JSON.parse(text);
}
