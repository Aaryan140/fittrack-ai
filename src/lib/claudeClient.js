// src/lib/claudeClient.js
// All AI calls go through /api/claude (Vercel serverless)

async function callClaude({ system, messages, max_tokens = 1000 }) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, max_tokens }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 413) {
      throw new Error("That photo is too large. Please try a smaller image.");
    }
    throw new Error(err.error || `API error: ${res.status}`);
  }
  const data = await res.json();
  const raw = data.content?.map((b) => b.text || "").join("") || "";
  
  // Extract JSON — handle markdown blocks, prefixes, or raw JSON
  let cleaned = raw.trim();
  
  // Remove ```json ... ``` or ``` ... ``` wrappers
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else {
    // Find the first { and last } to extract pure JSON
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }
  }
  return cleaned.trim();
}

// ── Analyze a food photo ───────────────────────────────────────
export async function analyzeFood({ base64, mimeType, goal, targets }) {
  const system = `You are a professional nutritionist AI. Analyze food images and return ONLY a valid JSON object with no extra text, no markdown, no backticks:
{
  "meal_name": "string",
  "description": "brief description",
  "macros": { "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number },
  "ingredients": ["string"],
  "health_score": number between 1 and 10,
  "notes": "string",
  "goal_alignment": "how this fits the user goal"
}`;

  const text = await callClaude({
    system,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
        { type: "text", text: `Analyze this meal. My goal: ${goal}. Daily targets: ${targets.calories} kcal, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fat}g fat. Return ONLY JSON.` },
      ],
    }],
    max_tokens: 800,
  });
  return JSON.parse(text);
}

// ── Parse a free-text workout description ─────────────────────
export async function parseWorkout({ description, goal, weight }) {
  const system = `You are a fitness coach AI. Parse workout descriptions and return ONLY a valid JSON object with no extra text, no markdown, no backticks:
{ "workout_name": "string", "duration_min": number, "calories_burned": number, "muscle_groups": ["string"], "intensity": "Low or Medium or High", "summary": "string" }`;

  const text = await callClaude({
    system,
    messages: [{ role: "user", content: `Parse this workout. Goal: "${goal}", weight: ${weight}kg. Workout: "${description}". Return ONLY JSON.` }],
    max_tokens: 600,
  });
  try {
    return JSON.parse(text);
  } catch(e) {
    console.error("parseWorkout JSON.parse failed. Raw text:", text);
    throw new Error("Could not parse AI response: " + e.message);
  }
}

// ── Generate personalised tomorrow plan ───────────────────────
export async function generateInsights({ profile, todayData, history, targets }) {
  const system = `You are an expert nutritionist and fitness coach. Return ONLY a valid JSON object with no extra text, no markdown, no backticks:
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
Return ONLY JSON with personalised suggestions for tomorrow.`,
    }],
    max_tokens: 1200,
  });
  try {
    return JSON.parse(text);
  } catch(e) {
    console.error("generateInsights JSON.parse failed. Raw text:", text.substring(0, 500));
    throw new Error("Could not parse AI response: " + e.message);
  }
}
