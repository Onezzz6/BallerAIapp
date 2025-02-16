import { Stack } from 'expo-router';
import { View } from 'react-native';
import OnboardingHeader from '../components/OnboardingHeader';
import { usePathname } from 'expo-router';

type PathMap = {
  [key: string]: number;
};

const STEP_MAP: PathMap = {
  'username': 1,
  'gender': 2,
  'age': 3,
  'measurements': 4,
  'dominant-foot': 5,
  'injury-history': 6,
  'skill-level': 7,
  'position': 8,
  'team-status': 9,
  'training-surface': 10,
  'analyzing': 11,
  'analysis-complete': 12,
  'fitness-level': 13,
  'activity-level': 14,
  'sleep-hours': 15,
  'nutrition': 16,
  'smartwatch': 17,
};

const TOTAL_STEPS = 17;

export default function OnboardingLayout() {
  const pathname = usePathname();
  // Remove leading slash and get the last part of the path
  const currentScreen = pathname?.split('/').pop() || '';
  const currentStep = STEP_MAP[currentScreen] || 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <Stack 
        screenOptions={{
          headerShown: false,
          header: () => (
            <OnboardingHeader 
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
            />
          ),
        }}
      >
        <Stack.Screen 
          name="index"
          options={{
            animation: 'none',
            header: () => null, // No header for index
          }}
        />
        <Stack.Screen name="username" />
        <Stack.Screen name="gender" />
        <Stack.Screen name="age" />
        <Stack.Screen name="measurements" />
        <Stack.Screen name="dominant-foot" />
        <Stack.Screen name="injury-history" />
        <Stack.Screen name="skill-level" />
        <Stack.Screen name="position" />
        <Stack.Screen name="team-status" />
        <Stack.Screen name="training-surface" />
        <Stack.Screen name="analyzing" />
        <Stack.Screen name="analysis-complete" />
        <Stack.Screen name="fitness-level" />
        <Stack.Screen name="activity-level" />
        <Stack.Screen name="sleep-hours" />
        <Stack.Screen name="nutrition" />
        <Stack.Screen name="smartwatch" />
      </Stack>
    </View>
  );
} 