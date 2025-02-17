import { createContext, useContext, useState } from 'react';

type OnboardingData = {
  hasSmartwatch: boolean | null;
  footballGoal: string | null;
  improvementFocus: string | null;
  trainingFrequency: string | null;
  hasGymAccess: boolean | null;
  motivation: string | null;
};

type OnboardingContextType = {
  onboardingData: OnboardingData;
  updateOnboardingData: (data: Partial<OnboardingData>) => void;
};

const defaultOnboardingData: OnboardingData = {
  hasSmartwatch: null,
  footballGoal: null,
  improvementFocus: null,
  trainingFrequency: null,
  hasGymAccess: null,
  motivation: null,
};

const OnboardingContext = createContext<OnboardingContextType>({
  onboardingData: defaultOnboardingData,
  updateOnboardingData: () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(defaultOnboardingData);

  const updateOnboardingData = (data: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
  };

  return (
    <OnboardingContext.Provider value={{ onboardingData, updateOnboardingData }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => useContext(OnboardingContext);

export default OnboardingProvider; 