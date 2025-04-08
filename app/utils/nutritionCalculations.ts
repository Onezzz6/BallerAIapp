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
 * Calculate macronutrient goals based on total daily calories, goal, and body weight
 * @param dailyCalories Total daily calorie needs
 * @param goal Fitness/nutrition goal (maintain, lose, gain, pro, etc.)
 * @param weight Body weight in kg for protein calculation
 * @returns Object containing calorie goal and macro goals in grams
 */
export function calculateMacroGoals(dailyCalories: number, goal: string, weight: number = 70) {
  // Standardized macro ratios based on goals (these will be used for carbs and fats)
  const macroRatios = {
    'maintain': {
      fats: 0.20,    // 20% of calories from fat (decreased from 25%)
      carbs: 0.55    // 55% of calories from carbs (increased from 50%)
    },
    'lose': {
      fats: 0.20,    // 20% of calories from fat (decreased from 25%)
      carbs: 0.50    // 50% of calories from carbs (increased from 45%)
    },
    'gain': {
      fats: 0.15,    // 15% of calories from fat (decreased from 20%)
      carbs: 0.60    // 60% of calories from carbs (increased from 55%)
    },
    'build': {
      fats: 0.15,    // 15% of calories from fat (decreased from 20%)
      carbs: 0.55    // 55% of calories from carbs (increased from 50%)
    },
    'pro': {         // Pro football-specific ratios
      fats: 0.20,    // 20% of calories from fat (decreased from 25%)
      carbs: 0.50    // 50% of calories from carbs (increased from 45%)
    },
    'semi-pro': {    // Semi-pro football-specific ratios
      fats: 0.20,    // 20% of calories from fat (decreased from 25%)
      carbs: 0.55    // 55% of calories from carbs (increased from 50%)
    },
    'amateur': {     // Amateur football-specific ratios
      fats: 0.25,    // 25% of calories from fat (decreased from 30%)
      carbs: 0.50    // 50% of calories from carbs (increased from 45%)
    }
  };

  // Normalize the goal to lowercase and get the appropriate ratios
  const normalizedGoal = goal.toLowerCase();
  const ratios = macroRatios[normalizedGoal as keyof typeof macroRatios] || macroRatios.maintain;

  // Calculate protein based on weight (1.8g per kg of body weight for optimal football recovery)
  const proteinGrams = Math.round(weight * 1.8);
  
  // Calculate calories from protein
  const proteinCalories = proteinGrams * 4;
  
  // Calculate remaining calories for fats and carbs
  const remainingCalories = dailyCalories - proteinCalories;
  
  // Calculate fats and carbs based on the remaining calories and ratios
  const totalRatio = ratios.fats + ratios.carbs;
  const fatRatio = ratios.fats / totalRatio;
  const carbRatio = ratios.carbs / totalRatio;
  
  // Calculate grams of each macronutrient
  return {
    calories: Math.round(dailyCalories),
    protein: proteinGrams,
    carbs: Math.round((remainingCalories * carbRatio) / 4),
    fat: Math.round((remainingCalories * fatRatio) / 9)
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

  // Calculate macro goals with weight-based protein calculation
  const macros = calculateMacroGoals(dailyCalories, goal, weight);
  
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