import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type OnboardingData = {
  username: string | null;
  gender: string | null;
  age: string | null;
  height: string | null;
  weight: string | null;
  injuryHistory: string | null;
  skillLevel: string | null;
  position: string | null;
  trainingSurface: string | null;
  footballGoal: string | null;
  improvementFocus: string | null;
  goalTimeline: string | null;
  holdingBack: string | null;
  trainingAccomplishment: string | null;
  trainingFrequency: string | null;
  discoverySource: string | null;
  triedOtherApps: string | null;
  referralCode: string | null;
  referralDiscount: number | null;
  referralInfluencer: string | null;
  motivation: string | null;
  fitnessLevel: string | null;
  activityLevel: string | null;
  sleepHours: string | null;
  nutrition: string | null;
  teamStatus: string | null;
  dominantFoot: string | null;
  hasGymAccess: boolean | null;
};

type OnboardingContextType = {
  onboardingData: OnboardingData;
  updateOnboardingData: (data: Partial<OnboardingData>) => Promise<void>;
  clearOnboardingData: () => Promise<void>;
};

const defaultOnboardingData: OnboardingData = {
  username: null,
  gender: null,
  age: null,
  height: null,
  weight: null,
  injuryHistory: null,
  skillLevel: null,
  position: null,
  trainingSurface: null,
  footballGoal: null,
  improvementFocus: null,
  goalTimeline: null,
  holdingBack: null,
  trainingAccomplishment: null,
  trainingFrequency: null,
  discoverySource: null,
  triedOtherApps: null,
  referralCode: null,
  referralDiscount: null,
  referralInfluencer: null,
  motivation: null,
  fitnessLevel: null,
  activityLevel: null,
  sleepHours: null,
  nutrition: null,
  teamStatus: null,
  dominantFoot: null,
  hasGymAccess: null,
};

const OnboardingContext = createContext<OnboardingContextType>({
  onboardingData: defaultOnboardingData,
  updateOnboardingData: async () => {},
  clearOnboardingData: async () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(defaultOnboardingData);

  // Load saved data when app starts
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('onboardingData');
      if (savedData) {
        setOnboardingData(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    }
  };

  const updateOnboardingData = async (data: Partial<OnboardingData>) => {
    try {
      const newData = { ...onboardingData, ...data };
      setOnboardingData(newData);
      await AsyncStorage.setItem('onboardingData', JSON.stringify(newData));
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  const clearOnboardingData = async () => {
    try {
      await AsyncStorage.removeItem('onboardingData');
      setOnboardingData(defaultOnboardingData);
    } catch (error) {
      console.error('Error clearing onboarding data:', error);
    }
  };

  return (
    <OnboardingContext.Provider value={{ onboardingData, updateOnboardingData, clearOnboardingData }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => useContext(OnboardingContext);

export default OnboardingProvider; 