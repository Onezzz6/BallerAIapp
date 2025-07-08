export type OnboardingStep = {
  id: string;
  route: string;
  title?: string;
  optional?: boolean;
};

/**
 * Central configuration for the entire onboarding flow
 * 
 * To add a new screen:
 * 1. Add an entry to this array
 * 2. Create the screen file
 * 3. Done! Step numbers and navigation will be handled automatically
 * 
 * To remove a screen:
 * 1. Remove the entry from this array
 * 2. Delete the screen file (optional)
 * 3. Done! All step numbers will adjust automatically
 * 
 * To reorder screens:
 * 1. Rearrange entries in this array
 * 2. Done! Everything else is handled automatically
 */
export const ONBOARDING_FLOW: OnboardingStep[] = [
  // Welcome flow
  { id: 'index', route: '/(onboarding)/index', title: 'Welcome' },
  
  // Basic information
  { id: 'gender', route: '/gender', title: 'Gender' },
  { id: 'training-frequency', route: '/training-frequency', title: 'Training Frequency' },
  { id: 'where-did-you-find-us', route: '/where-did-you-find-us', title: 'Discovery Source' },
  { id: 'tried-other-apps', route: '/tried-other-apps', title: 'Previous Apps' },
  { id: 'analyzing', route: '/analyzing', title: 'Analyzing' },
  { id: 'measurements', route: '/measurements', title: 'Measurements' },
  { id: 'age', route: '/age', title: 'Age' },
  { id: 'username', route: '/username', title: 'Username' },
  
  // Goals and preferences
  { id: 'improvement-focus', route: '/improvement-focus', title: 'Improvement Focus' },
  { id: 'goal-timeline', route: '/goal-timeline', title: 'Goal Timeline' },
  { id: 'motivation-confirmation', route: '/motivation-confirmation', title: 'Motivation Confirmation' },
  { id: 'development-transition', route: '/development-transition', title: 'Development Transition' },
  { id: 'sleep-hours', route: '/sleep-hours', title: 'Sleep Hours' },
  { id: 'nutrition', route: '/nutrition', title: 'Nutrition' },
  { id: 'skill-level', route: '/skill-level', title: 'Skill Level' },
  
  // Team and position
  { id: 'position', route: '/position', title: 'Position' },
  { id: 'fitness-level', route: '/fitness-level', title: 'Fitness Level' },
  
  // Lifestyle
  { id: 'activity-level', route: '/activity-level', title: 'Activity Level' },
  { id: 'holding-back', route: '/holding-back', title: 'Current Challenges' },
  { id: 'why-ballerai', route: '/why-ballerai', title: 'BallerAI Solution' },
  { id: 'development-comparison', route: '/development-comparison', title: 'Development Comparison' },
  { id: 'referral-code', route: '/referral-code', title: 'Referral Code', optional: true },
  
  // Social proof and motivation
  { id: 'social-proof', route: '/social-proof', title: 'Social Proof' },
  { id: 'motivation-reason', route: '/motivation-reason', title: 'Motivation' },
  
  // Final steps
  { id: 'profile-generation', route: '/profile-generation', title: 'Profile Generation' },
  { id: 'generating-profile', route: '/generating-profile', title: 'Generating Profile' },
  { id: 'profile-complete', route: '/profile-complete', title: 'Profile Complete' },
];

/**
 * Get the current step number (1-indexed) for a given screen ID
 */
export function getCurrentStep(screenId: string): number {
  const index = ONBOARDING_FLOW.findIndex(step => step.id === screenId);
  return index === -1 ? 1 : index + 1;
}

/**
 * Get the total number of steps in the onboarding flow
 */
export function getTotalSteps(): number {
  return ONBOARDING_FLOW.length;
}

/**
 * Get the next screen in the flow
 */
export function getNextStep(currentScreenId: string): OnboardingStep | null {
  const currentIndex = ONBOARDING_FLOW.findIndex(step => step.id === currentScreenId);
  if (currentIndex === -1 || currentIndex >= ONBOARDING_FLOW.length - 1) {
    return null;
  }
  return ONBOARDING_FLOW[currentIndex + 1];
}

/**
 * Get the previous screen in the flow
 */
export function getPreviousStep(currentScreenId: string): OnboardingStep | null {
  const currentIndex = ONBOARDING_FLOW.findIndex(step => step.id === currentScreenId);
  if (currentIndex <= 0) {
    return null;
  }
  return ONBOARDING_FLOW[currentIndex - 1];
}

/**
 * Get step information for a specific screen
 */
export function getStepInfo(screenId: string) {
  return {
    currentStep: getCurrentStep(screenId),
    totalSteps: getTotalSteps(),
    nextStep: getNextStep(screenId),
    previousStep: getPreviousStep(screenId),
    stepData: ONBOARDING_FLOW.find(step => step.id === screenId),
  };
} 