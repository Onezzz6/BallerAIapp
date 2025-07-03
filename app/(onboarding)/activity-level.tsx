import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState, useEffect } from 'react';
import analytics from '@react-native-firebase/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';

const ACTIVITY_LEVELS = [
  {
    id: 'sedentary',
    title: 'Sedentary',
    description: 'No exercise, desk job',
  },
  {
    id: 'light',
    title: 'Lightly Active',
    description: 'Exercise 1-2 days/week',
  },
  {
    id: 'moderate',
    title: 'Moderately Active',
    description: 'Exercise 3-4 days/week',
  },
  {
    id: 'very',
    title: 'Very Active',
    description: 'Exercise 5-7 days/week',
  },
  {
    id: 'extra',
    title: 'Extra Active',
    description: 'Exercise 2x per day',
  },
];

export default function ActivityLevelScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.activityLevel);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <OnboardingHeader 
        currentStep={20}
        totalSteps={29}
      />

      <Animated.View 
        entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{
          flex: 1,
          backgroundColor: colors.backgroundColor,
        }}
      >

        {/* Fixed Title Section - Locked at top like reference */}
        <View style={{
          paddingHorizontal: 24,
          paddingTop: 20,
        }}>
          <Text style={[
            typography.title,
            {
              textAlign: 'left',
              marginBottom: 8,
            }
          ]} allowFontScaling={false}>
            What's your activity level?
          </Text>
        </View>

        <View style={{
          paddingHorizontal: 24,
          paddingBottom: 64,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            width: '100%',
            gap: 8,
          }}>
            {ACTIVITY_LEVELS.map((level) => (
              <Pressable
                key={level.id}
                onPress={() => {
                  haptics.light();
                  setSelected(level.id);
                }}
                style={({ pressed }) => ({
                  width: '100%',
                  padding: 12,
                  backgroundColor: selected === level.id ? '#99E86C' : '#FFFFFF',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selected === level.id ? '#99E86C' : '#E5E5E5',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{
                  fontSize: 18,
                  color: '#000000',
                  fontWeight: '600',
                  marginBottom: 4,
                }} allowFontScaling={false}>
                  {level.title}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#666666',
                }} allowFontScaling={false}>
                  {level.description}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Static Continue Button - No animation, always in same position */}
      <View style={{
        position: 'absolute',
        bottom: 32,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingTop: 14,
        paddingBottom: 14,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.veryLightGray,
      }}>
        <Button 
          title="Continue" 
          onPress={async () => {
            if (selected) {
              haptics.light();
              await analytics().logEvent('AA_20_activity_level_continue');
              await updateOnboardingData({ activityLevel: selected });
              router.push('/sleep-hours');
            }
          }}
          disabled={!selected}
        />
      </View>
    </SafeAreaView>
  );
} 