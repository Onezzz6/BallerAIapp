import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';
import analytics from '@react-native-firebase/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';

const GOALS = [
  {
    id: 'fun',
    title: 'Have fun',
  },
  {
    id: 'friends',
    title: 'Competitive amateur',
  },
  {
    id: 'semi-pro',
    title: 'Semi-professional',
  },
  {
    id: 'pro',
    title: 'Professional',
  },
];

export default function FootballGoalScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.footballGoal);

  const handleContinue = async () => {
    if (selected) {
      haptics.light();
      await analytics().logEvent('onboarding_football_goal_continue');
      await updateOnboardingData({ footballGoal: selected });
      router.push('/injury-history');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <OnboardingHeader 
        currentStep={10}
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
            What's your goal in football?
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
            gap: 12,
          }}>
            {GOALS.map((goal) => (
              <Pressable
                key={goal.id}
                onPress={() => {
                  haptics.light();
                  setSelected(goal.id);
                }}
                style={({ pressed }) => ({
                  width: '100%',
                  padding: 20,
                  backgroundColor: selected === goal.id ? '#99E86C' : '#FFFFFF',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selected === goal.id ? '#99E86C' : '#E5E5E5',
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{
                  fontSize: 18,
                  color: '#000000',
                  fontWeight: '600',
                }}>
                  {goal.title}
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
          onPress={handleContinue}
          disabled={!selected}
        />
      </View>
    </SafeAreaView>
  );
} 