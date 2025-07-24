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
  
  // Basic information
  { id: 'gender', route: '/gender', title: 'Gender' },
  { id: 'training-frequency', route: '/training-frequency', title: 'Training Frequency' },
  { id: 'where-did-you-find-us', route: '/where-did-you-find-us', title: 'Discovery Source' },
  { id: 'tried-other-apps', route: '/tried-other-apps', title: 'Previous Apps' },
  { id: 'analyzing', route: '/analyzing', title: 'Analyzing' },
  { id: 'measurements', route: '/measurements', title: 'Measurements' },
  { id: 'age', route: '/age', title: 'Age' },
  { id: 'username', route: '/username', title: 'Username' },
  { id: 'encouragement', route: '/encouragement', title: 'Encouragement' },
  
  // Goals and preferences
  { id: 'improvement-focus', route: '/improvement-focus', title: 'Improvement Focus' },
  { id: 'goal-timeline', route: '/goal-timeline', title: 'Goal Timeline' },
  { id: 'motivation-confirmation', route: '/motivation-confirmation', title: 'Motivation Confirmation' },
  { id: 'development-transition', route: '/development-transition', title: 'Development Transition' },
  { id: 'injury-history', route: '/injury-history', title: 'Injury History' },
  { id: 'sleep-hours', route: '/sleep-hours', title: 'Sleep Hours' },
  { id: 'nutrition', route: '/nutrition', title: 'Nutrition' },
  
  // Team and position
  { id: 'team-status', route: '/team-status', title: 'Team Status' },
  { id: 'position', route: '/position', title: 'Position' },
  { id: 'fitness-level', route: '/fitness-level', title: 'Fitness Level' },
  
  // Lifestyle
  { id: 'activity-level', route: '/activity-level', title: 'Activity Level' },
  { id: 'training-accomplishment', route: '/training-accomplishment', title: 'Training Goals' },
  { id: 'holding-back', route: '/holding-back', title: 'Current Challenges' },
  { id: 'why-ballerai', route: '/why-ballerai', title: 'BallerAI Solution' },
  { id: 'development-comparison', route: '/development-comparison', title: 'Development Comparison' },
  { id: 'referral-code', route: '/referral-code', title: 'Referral Code', optional: true },
  
  // Social proof and motivation
  { id: 'social-proof', route: '/social-proof', title: 'Social Proof' },
  { id: 'motivation-reason', route: '/motivation-reason', title: 'Motivation' },
  { id: 'app-review', route: '/app-review', title: 'App Review' },
  
  // Final steps
  { id: 'profile-generation', route: '/profile-generation', title: 'Profile Generation' },
  { id: 'generating-profile', route: '/generating-profile', title: 'Generating Profile', skipOnBack: true },
  { id: 'profile-complete', route: '/profile-complete', title: 'Profile Complete' },
  
  // New post-paywall screens (not part of normal onboarding flow)
  // { id: 'paywall-upsell', route: '/paywall-upsell', title: 'Unlock Full Potential', skipOnBack: true }, // REMOVED: No longer used in new flow
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