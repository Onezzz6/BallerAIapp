export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
export type Goal = 'maintain' | 'lose' | 'gain' | 'build' | 'pro' | 'semi-pro' | 'amateur';

/**
 * Calculate daily calorie needs using the Harris-Benedict BMR formula
 * @param weight Weight in kg
 * @param height Height in cm
 * @param age Age in years
 * @param gender 'male' or 'female'
 * @param activityLevel Activity level from sedentary to extra active
 * @returns Daily calorie needs (TDEE)
 */
export function calculateDailyCalories(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityLevel: ActivityLevel
): number {
  // Harris-Benedict BMR Formula
  let bmr;
  if (gender.toLowerCase() === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }

  // Activity Multipliers
  const activityMultipliers = {
    sedentary: 1.2,   // Little or no exercise
    light: 1.375,     // Light exercise 1-3 days/week
    moderate: 1.55,   // Moderate exercise 3-5 days/week
    very: 1.725,      // Hard exercise 6-7 days/week
    extra: 1.9        // Very hard exercise & physical job
  };

  return Math.round(bmr * activityMultipliers[activityLevel]);
}

/**
 * Calculate macronutrient goals based on total daily calories and goal
 * @param dailyCalories Total daily calorie needs
 * @param goal Fitness/nutrition goal (maintain, lose, gain, pro, etc.)
 * @returns Object containing calorie goal and macro goals in grams
 */
export function calculateMacroGoals(dailyCalories: number, goal: string) {
  // Standardized macro ratios based on goals
  const macroRatios = {
    'maintain': {
      protein: 0.25, // 25% of calories from protein
      fats: 0.25,    // 25% of calories from fat
      carbs: 0.50    // 50% of calories from carbs
    },
    'lose': {
      protein: 0.30, // Higher protein for muscle preservation
      fats: 0.25,
      carbs: 0.45
    },
    'gain': {
      protein: 0.25,
      fats: 0.20,
      carbs: 0.55    // Higher carbs for muscle gain
    },
    'build': {
      protein: 0.30,
      fats: 0.20,
      carbs: 0.50
    },
    'pro': {         // Pro football-specific ratios
      protein: 0.30,
      fats: 0.25,
      carbs: 0.45
    },
    'semi-pro': {    // Semi-pro football-specific ratios
      protein: 0.25,
      fats: 0.25,
      carbs: 0.50
    },
    'amateur': {     // Amateur football-specific ratios
      protein: 0.25,
      fats: 0.30,
      carbs: 0.45
    }
  };

  // Normalize the goal to lowercase and get the appropriate ratios
  const normalizedGoal = goal.toLowerCase();
  const ratios = macroRatios[normalizedGoal as keyof typeof macroRatios] || macroRatios.maintain;

  // Calculate grams of each macronutrient
  // Protein and carbs are 4 calories per gram, fat is 9 calories per gram
  return {
    calories: Math.round(dailyCalories),
    protein: Math.round((dailyCalories * ratios.protein) / 4),
    carbs: Math.round((dailyCalories * ratios.carbs) / 4),
    fat: Math.round((dailyCalories * ratios.fats) / 9)
  };
}

/**
 * Calculate complete nutrition goals based on user profile data
 * @param userData User profile data
 * @returns Object containing calorieGoal and macroGoals
 */
export function calculateNutritionGoals(userData: any) {
  if (!userData) {
    return { 
      calorieGoal: 2000, 
      macroGoals: { protein: 150, carbs: 200, fat: 55 } 
    };
  }

  // Extract user data with defaults for missing values
  const weight = parseFloat(userData.weight) || 70;
  const height = parseFloat(userData.height) || 175;
  const age = parseInt(userData.age) || 30;
  const gender = userData.gender || 'male';
  
  // Map footballGoal to nutrition goal
  let goal = 'maintain';
  if (userData.footballGoal) {
    if (['pro', 'semi-pro', 'amateur'].includes(userData.footballGoal.toLowerCase())) {
      goal = userData.footballGoal.toLowerCase();
    }
  } else if (userData.goal) {
    goal = userData.goal.toLowerCase();
  }
  
  // Map activityLevel
  let activityLevel: ActivityLevel = 'moderate';
  if (userData.activityLevel && 
      ['sedentary', 'light', 'moderate', 'very', 'extra'].includes(userData.activityLevel)) {
    activityLevel = userData.activityLevel as ActivityLevel;
  }

  // Calculate daily calories
  const dailyCalories = calculateDailyCalories(
    weight, 
    height, 
    age, 
    gender,
    activityLevel
  );

  // Calculate macro goals
  const macros = calculateMacroGoals(dailyCalories, goal);
  
  return {
    calorieGoal: macros.calories,
    macroGoals: {
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat
    }
  };
}

// Export all functions
export default { 
  calculateDailyCalories, 
  calculateMacroGoals,
  calculateNutritionGoals
}; 