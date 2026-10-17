export interface TDEEInputs {
  gender: 'male' | 'female';
  age: number;
  weight_kg: number;
  height_cm: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'heavy' | 'athlete';
  goal: 'lose' | 'maintain' | 'gain';
  macro_preset?: 'balanced' | 'high_protein' | 'low_carb';
}

export interface MacroCalculationResult {
  bmr: number;
  tdee: number;
  target_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  protein_calories: number;
  carbs_calories: number;
  fat_calories: number;
}

export function calculateTDEE(inputs: TDEEInputs): MacroCalculationResult {
  const { gender, age, weight_kg, height_cm, activity_level, goal, macro_preset = 'high_protein' } = inputs;

  // Mifflin-St Jeor formula
  let bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  // Activity multipliers
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    heavy: 1.725,
    athlete: 1.9,
  };

  const multiplier = activityMultipliers[activity_level] || 1.55;
  const tdee = Math.round(bmr * multiplier);

  // Goal adjustment
  let target_calories = tdee;
  if (goal === 'lose') {
    target_calories = Math.max(1200, Math.round(tdee * 0.8)); // 20% deficit
  } else if (goal === 'gain') {
    target_calories = Math.round(tdee * 1.15); // 15% surplus
  }

  // Macro distribution
  // 1g protein = 4 kcal, 1g carb = 4 kcal, 1g fat = 9 kcal
  let pRatio = 0.30;
  let cRatio = 0.45;
  let fRatio = 0.25;

  if (macro_preset === 'high_protein') {
    pRatio = 0.35;
    cRatio = 0.40;
    fRatio = 0.25;
  } else if (macro_preset === 'low_carb') {
    pRatio = 0.35;
    cRatio = 0.20;
    fRatio = 0.45;
  }

  const protein_calories = Math.round(target_calories * pRatio);
  const carbs_calories = Math.round(target_calories * cRatio);
  const fat_calories = Math.round(target_calories * fRatio);

  const protein_g = Math.round(protein_calories / 4);
  const carbs_g = Math.round(carbs_calories / 4);
  const fat_g = Math.round(fat_calories / 9);

  return {
    bmr: Math.round(bmr),
    tdee,
    target_calories,
    protein_g,
    carbs_g,
    fat_g,
    protein_calories,
    carbs_calories,
    fat_calories,
  };
}
