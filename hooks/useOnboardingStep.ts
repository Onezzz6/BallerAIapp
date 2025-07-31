import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { getStepInfo } from '../app/(onboarding)/_onboarding-flow';

/**
 * Custom hook for onboarding screens
 * 
 * Usage in any onboarding screen:
 * ```typescript
 * const { currentStep, totalSteps, goToNext, goToPrevious } = useOnboardingStep('screen-id');
 * ```
 * 
 * @param screenId - The unique identifier for this screen (must match the ID in onboarding-flow.ts)
 * @returns Object with step info and navigation functions
 */
export function useOnboardingStep(screenId: string) {
  const router = useRouter();
  const stepInfo = getStepInfo(screenId);

  /**
   * Navigate to the next screen in the onboarding flow
   */
  const goToNext = useCallback(() => {
    if (stepInfo.nextStep) {
      router.push(stepInfo.nextStep.route as any);
    } else {
      console.warn(`No next step found for screen: ${screenId}`);
    }
  }, [router, stepInfo.nextStep, screenId]);

  /**
   * Navigate to the previous screen in the onboarding flow
   */
  const goToPrevious = useCallback(() => {
    if (stepInfo.previousStep) {
      router.push(stepInfo.previousStep.route as any);
    } else {
      console.warn(`No previous step found for screen: ${screenId}`);
    }
  }, [router, stepInfo.previousStep, screenId]);

  /**
   * Navigate to a specific screen by ID
   */
  const goToStep = useCallback((targetScreenId: string) => {
    const targetStepInfo = getStepInfo(targetScreenId);
    if (targetStepInfo.stepData) {
      router.push(targetStepInfo.stepData.route as any);
    } else {
      console.warn(`Screen not found: ${targetScreenId}`);
    }
  }, [router]);

  return {
    // Step information
    currentStep: stepInfo.currentStep,
    totalSteps: stepInfo.totalSteps,
    stepData: stepInfo.stepData,
    nextStep: stepInfo.nextStep,
    previousStep: stepInfo.previousStep,
    
    // Navigation functions
    goToNext,
    goToPrevious,
    goToStep,
    
    // Helper functions
    isFirstStep: stepInfo.currentStep === 1,
    isLastStep: stepInfo.currentStep === stepInfo.totalSteps,
    progressPercentage: Math.round((stepInfo.currentStep / stepInfo.totalSteps) * 100),
  };
} 