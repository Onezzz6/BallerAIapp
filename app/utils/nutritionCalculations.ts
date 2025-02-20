export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';

export function calculateDailyCalories(
  weight: number,  // in kg
  height: number,  // in cm
  age: number,
  gender: string,
  activityLevel: ActivityLevel
): number {
  // Harris-Benedict BMR Formula
  let bmr;
  if (gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }

  // Activity Multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
    extra: 1.9
  };

  return Math.round(bmr * activityMultipliers[activityLevel]);
}

export function calculateMacroGoals(dailyCalories: number, goal: string) {
  const macroRatios = {
    'maintain': {
      protein: 0.25,
      fats: 0.25,
      carbs: 0.50
    },
    'lose': {
      protein: 0.30,
      fats: 0.25,
      carbs: 0.45
    },
    'gain': {
      protein: 0.25,
      fats: 0.20,
      carbs: 0.55
    },
    'pro': { // Added for footballGoal = 'pro'
      protein: 0.30,
      fats: 0.25,
      carbs: 0.45
    }
  };

  const ratios = macroRatios[goal.toLowerCase() as keyof typeof macroRatios] || macroRatios.maintain;

  return {
    calories: Math.round(dailyCalories),
    protein: Math.round((dailyCalories * ratios.protein) / 4), // 4 calories per gram
    fats: Math.round((dailyCalories * ratios.fats) / 9),      // 9 calories per gram
    carbs: Math.round((dailyCalories * ratios.carbs) / 4)     // 4 calories per gram
  };
}

export default { calculateDailyCalories, calculateMacroGoals }; 