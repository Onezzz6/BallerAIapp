import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{
      headerShown: false,
      animation: 'fade',
    }}>
      <Stack.Screen name="analyzing" />
      <Stack.Screen name="analysis-complete" />
    </Stack>
  );
} 