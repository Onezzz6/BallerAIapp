export type OnboardingStep = {
  id: string;
  route: string;
  title?: string;
  optional?: boolean;
  skipOnBack?: boolean; // Step exists but is skipped when going backward
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
  { id: 'welcome', route: '/welcome', title: 'Welcome' },
  { id: 'referral-code', route: '/referral-code', title: 'Team Code' },
  
  // Basic information
  { id: 'gender', route: '/gender', title: 'Gender' },
  { id: 'measurements', route: '/measurements', title: 'Measurements' },
  { id: 'age', route: '/age', title: 'Age' },
  { id: 'username', route: '/username', title: 'Username' },
  
  // Final steps
  { id: 'profile-complete', route: '/profile-complete', title: 'Profile Complete' },
  { id: 'sign-up', route: '/sign-up', title: 'Create Account', skipOnBack: true },
];

/**
 * Get the current step number (1-indexed) for a given screen ID (excludes skipOnBack steps)
 */
export function getCurrentStep(screenId: string): number {
  const index = ONBOARDING_FLOW.findIndex(step => step.id === screenId);
  if (index === -1) return 1;
  
  // Count only steps that aren't skipped on back navigation up to this point
  let navigatableSteps = 0;
  for (let i = 0; i <= index; i++) {
    if (!ONBOARDING_FLOW[i].skipOnBack) {
      navigatableSteps++;
    }
  }
  
  return navigatableSteps || 1;
}

/**
 * Get the total number of steps in the onboarding flow (excludes skipOnBack steps)
 */
export function getTotalSteps(): number {
  return ONBOARDING_FLOW.filter(step => !step.skipOnBack).length;
}

/**
 * Get the next screen in the flow (normal forward navigation)
 */
export function getNextStep(currentScreenId: string): OnboardingStep | null {
  const currentIndex = ONBOARDING_FLOW.findIndex(step => step.id === currentScreenId);
  if (currentIndex === -1 || currentIndex >= ONBOARDING_FLOW.length - 1) {
    return null;
  }
  
  // Forward navigation includes all steps (including skipOnBack steps)
  return ONBOARDING_FLOW[currentIndex + 1];
}

/**
 * Get the previous screen in the flow (skips steps marked as skipOnBack)
 */
export function getPreviousStep(currentScreenId: string): OnboardingStep | null {
  const currentIndex = ONBOARDING_FLOW.findIndex(step => step.id === currentScreenId);
  if (currentIndex <= 0) {
    return null;
  }
  
  // Start from the step immediately before current
  let searchIndex = currentIndex - 1;
  
  // If the immediate previous step should be skipped on back, keep going back
  while (searchIndex >= 0) {
    const step = ONBOARDING_FLOW[searchIndex];
    if (!step.skipOnBack) {
      return step;
    }
    searchIndex--;
  }
  
  return null;
}

/**
 * Get step information for a specific screen
 */
export function getStepInfo(screenId: string) {
  const stepData = ONBOARDING_FLOW.find(step => step.id === screenId);
  
  return {
    currentStep: getCurrentStep(screenId),
    totalSteps: getTotalSteps(),
    nextStep: getNextStep(screenId),
    previousStep: getPreviousStep(screenId),
    stepData: stepData,
  };
} 