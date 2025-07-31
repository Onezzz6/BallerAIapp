import { View, Text, Pressable, SafeAreaView } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import { useOnboarding } from '../../context/OnboardingContext';
import { useState } from 'react';
import analytics from '@react-native-firebase/analytics';
import { colors, typography } from '../../utils/theme';
import { useHaptics } from '../../utils/haptics';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import analyticsService from '../../services/analytics';

const SKILL_LEVELS = [
  {
    id: 'beginner',
    title: 'Starting out',
    description: 'New to football',
  },
  {
    id: 'average',
    title: 'Average',
    description: 'Average for your age group',
  },
  {
    id: 'elite',
    title: 'Elite',
    description: 'Elite for your age group',
  },
];

export default function SkillLevelScreen() {
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.skillLevel);
  const headerHeight = useOnboardingHeaderHeight();
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('skill-level');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="skill-level" />

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
          paddingTop: headerHeight,
        }}>
          <Text style={[
            typography.title,
            {
              textAlign: 'left',
              marginBottom: 8,
            }
          ]} allowFontScaling={false}>
            What's your current level?
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
            {SKILL_LEVELS.map((level) => (
              <Pressable
                key={level.id}
                onPress={() => {
                  haptics.light();
                  setSelected(level.id);
                }}
                style={({ pressed }) => ({
                  width: '100%',
                  padding: 20,
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
                }}>
                  {level.title}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#666666',
                }}>
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
              await await analyticsService.logEvent('onboarding_skill_level_continue');
              await updateOnboardingData({ skillLevel: selected });
              // NEW: Use automatic navigation instead of hardcoded route
              goToNext();
            }
          }}
          disabled={!selected}
        />
      </View>
    </SafeAreaView>
  );
} 