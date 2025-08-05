import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { XpData } from '../types/xp';
import { getDeviceTimezone } from '../utils/xpCalculations';

type OnboardingData = {
  username: string | null;
  gender: string | null;
  age: string | null;
  birthYear: string | null;
  birthMonth: string | null;
  birthDay: string | null;
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
  referralPaywallType: string | null;
  motivation: string | null;
  fitnessLevel: string | null;
  activityLevel: string | null;
  sleepHours: string | null;
  nutrition: string | null;
  teamStatus: string | null;
  dominantFoot: string | null;
  hasGymAccess: boolean | null;
  preferMetricUnits: boolean | null;
  // XP System fields - initialized during user creation
  totalXp?: number;
  xpToday?: number;
  lastXpReset?: number;
  level?: number;
  timezone?: string;
  xpFeatureStart?: number;
};

type OnboardingContextType = {
  onboardingData: OnboardingData;
  updateOnboardingData: (data: Partial<OnboardingData>) => Promise<void>;
  clearOnboardingData: () => Promise<void>;
  getInitialXpData: () => XpData;
};

const defaultOnboardingData: OnboardingData = {
  username: null,
  gender: null,
  age: null,
  birthYear: null,
  birthMonth: null,
  birthDay: null,
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
  referralPaywallType: null,
  motivation: null,
  fitnessLevel: null,
  activityLevel: null,
  sleepHours: null,
  nutrition: null,
  teamStatus: null,
  dominantFoot: null,
  hasGymAccess: null,
  preferMetricUnits: null,
  // XP fields will be initialized during user creation, not stored in AsyncStorage
  totalXp: undefined,
  xpToday: undefined,
  lastXpReset: undefined,
  level: undefined,
  timezone: undefined,
  xpFeatureStart: undefined,
};

const OnboardingContext = createContext<OnboardingContextType>({
  onboardingData: defaultOnboardingData,
  updateOnboardingData: async () => {},
  clearOnboardingData: async () => {},
  getInitialXpData: () => ({
    totalXp: 0,
    xpToday: 0,
    lastXpReset: Date.now(),
    level: 1,
    timezone: getDeviceTimezone(),
    xpFeatureStart: Date.now(),
  }),
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

  const getInitialXpData = (): XpData => ({
    totalXp: 0,
    xpToday: 0,
    lastXpReset: Date.now(),
    level: 1,
    timezone: getDeviceTimezone(),
    xpFeatureStart: Date.now(),
  });

  return (
    <OnboardingContext.Provider value={{ onboardingData, updateOnboardingData, clearOnboardingData, getInitialXpData }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => useContext(OnboardingContext);

export default OnboardingProvider; 