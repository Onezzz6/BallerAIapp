/**
 * Utility functions for calculating nutrition goals based on user data
 */

/**
 * Calculate nutrition goals based on user's profile data
 * @param {Object} userData - User profile data from onboarding
 * @returns {Object} Object containing calorieGoal and macros
 */
export const calculateNutritionGoals = (userData) => {
  if (!userData) return { calorieGoal: 2000, macros: { protein: 100, carbs: 200, fat: 67 } };

  const {
    gender,
    age,
    weight, // in kg
    height, // in cm
    activityLevel,
    goal,
  } = userData;

  // Default values if user data is incomplete
  const userGender = gender || 'male';
  const userAge = age || 30;
  const userWeight = weight || 70;
  const userHeight = height || 175;
  const userActivityLevel = activityLevel || 'moderate';
  const userGoal = goal || 'maintain';

  // Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
  let bmr;
  if (userGender.toLowerCase() === 'male') {
    bmr = 10 * userWeight + 6.25 * userHeight - 5 * userAge + 5;
  } else {
    bmr = 10 * userWeight + 6.25 * userHeight - 5 * userAge - 161;
  }

  // Activity level multipliers
  const activityMultipliers = {
    sedentary: 1.2,      // Little to no exercise
    light: 1.375,         // Light exercise 1-3 days/week
    moderate: 1.55,       // Moderate exercise 3-5 days/week
    active: 1.725,        // Hard exercise 6-7 days/week
    veryActive: 1.9       // Very hard exercise & physical job
  };

  // Calculate Total Daily Energy Expenditure (TDEE)
  const activityMultiplier = activityMultipliers[userActivityLevel] || activityMultipliers.moderate;
  const tdee = Math.round(bmr * activityMultiplier);

  // Adjust calories based on goal
  let calorieGoal;
  switch (userGoal.toLowerCase()) {
    case 'lose':
      calorieGoal = Math.round(tdee * 0.8); // 20% deficit for weight loss
      break;
    case 'gain':
      calorieGoal = Math.round(tdee * 1.15); // 15% surplus for weight gain
      break;
    case 'maintain':
    default:
      calorieGoal = tdee;
      break;
  }

  // Calculate macronutrient distribution
  // Protein: 30%, Carbs: 40%, Fat: 30%
  const proteinPercentage = userGoal === 'gain' ? 0.35 : 0.3;
  const carbPercentage = 0.4;
  const fatPercentage = userGoal === 'gain' ? 0.25 : 0.3;

  // Calculate grams of each macronutrient
  // Protein and carbs are 4 calories per gram, fat is 9 calories per gram
  const proteinGrams = Math.round((calorieGoal * proteinPercentage) / 4);
  const carbGrams = Math.round((calorieGoal * carbPercentage) / 4);
  const fatGrams = Math.round((calorieGoal * fatPercentage) / 9);

  return {
    calorieGoal,
    macros: {
      protein: proteinGrams,
      carbs: carbGrams,
      fat: fatGrams
    }
  };
};

/**
 * Calculate daily water intake goal in milliliters
 * @param {Object} userData - User profile data from onboarding
 * @returns {number} Water intake goal in milliliters
 */
export const calculateWaterGoal = (userData) => {
  if (!userData) return 2000; // Default 2 liters
  
  const { weight, activityLevel } = userData;
  const userWeight = weight || 70;
  const userActivityLevel = activityLevel || 'moderate';
  
  // Base calculation: 30ml per kg of body weight
  let waterGoalML = userWeight * 30;
  
  // Adjust based on activity level
  switch (userActivityLevel) {
    case 'sedentary':
      // No adjustment needed
      break;
    case 'light':
      waterGoalML *= 1.1;
      break;
    case 'moderate':
      waterGoalML *= 1.2;
      break;
    case 'active':
      waterGoalML *= 1.3;
      break;
    case 'veryActive':
      waterGoalML *= 1.4;
      break;
    default:
      // No adjustment needed
  }
  
  return Math.round(waterGoalML);
};

// Create a default export with all utility functions
const nutritionUtils = {
  calculateNutritionGoals,
  calculateWaterGoal
};

export default nutritionUtils; 