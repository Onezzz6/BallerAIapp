import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for storing instruction state in AsyncStorage
export const INSTRUCTION_KEYS = {
  HOME: 'home_instructions_shown',
  RECOVERY: 'recovery_instructions_shown',
  NUTRITION: 'nutrition_instructions_shown',
  TRAINING: 'training_instructions_shown',
  PROFILE: 'profile_instructions_shown',
};

/**
 * Check if the instructions for a specific tab have been shown
 */
export const hasShownInstructions = async (key: string): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value === 'true';
  } catch (error) {
    console.error('Error checking instruction state:', error);
    return false;
  }
};

/**
 * Mark instructions for a specific tab as shown
 */
export const markInstructionsAsShown = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.error('Error saving instruction state:', error);
  }
}; 