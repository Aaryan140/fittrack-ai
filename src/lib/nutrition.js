// src/lib/nutrition.js

export const GOAL_LABELS = {
  lose_weight:    "Lose Weight",
  build_muscle:   "Build Muscle",
  maintain:       "Maintain Weight",
  endurance:      "Improve Endurance",
  recomp:         "Body Recomposition",
};

export const ACTIVITY_LABELS = {
  sedentary: "Sedentary (desk job)",
  light:     "Lightly Active (1-3x/week)",
  moderate:  "Moderately Active (3-5x/week)",
  active:    "Very Active (6-7x/week)",
  athlete:   "Athlete (2x/day)",
};

const ACTIVITY_MULT = {
  sedentary: 1.2,
  light:     1.375,
  moderate:  1.55,
  active:    1.725,
  athlete:   1.9,
};

export function calcTargets(profile) {
  const w = parseFloat(profile.weight)  || 70;
  const h = parseFloat(profile.height)  || 170;
  const a = parseFloat(profile.age)     || 25;
  const isMale = (profile.sex || "male") === "male";

  // Mifflin-St Jeor
  const bmr  = 10 * w + 6.25 * h - 5 * a + (isMale ? 5 : -161);
  const tdee = bmr * (ACTIVITY_MULT[profile.activityLevel] || 1.55);

  let calories;
  if      (profile.goal === "lose_weight")  calories = Math.round(tdee - 400);
  else if (profile.goal === "build_muscle") calories = Math.round(tdee + 300);
  else                                       calories = Math.round(tdee);

  const protein = Math.round(w * (profile.goal === "build_muscle" ? 2.2 : 1.8));
  const fat     = Math.round((calories * 0.25) / 9);
  const carbs   = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { calories, protein, carbs, fat, fiber: 30 };
}
