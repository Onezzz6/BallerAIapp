import { View, Text, Pressable, SafeAreaView } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState, useEffect } from 'react';
import analytics from '@react-native-firebase/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import analyticsService from '../services/analytics';

const SURFACES = [
  {
    id: 'grass',
    title: 'Natural grass',
  },
  {
    id: 'artificial',
    title: 'Artificial grass',
  },
  {
    id: 'indoor',
    title: 'Indoor',
  },
  {
    id: 'mixed',
    title: 'Mixed surfaces',
  },
];

export default function TrainingSurfaceScreen() {
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.trainingSurface);
  
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('training-surface');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="training-surface" />

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
            What surface do you usually train on?
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
            {SURFACES.map((surface) => (
              <Pressable
                key={surface.id}
                onPress={() => {
                  haptics.light();
                  setSelected(surface.id);
                }}
                style={({ pressed }) => ({
                  width: '100%',
                  padding: 20,
                  backgroundColor: selected === surface.id ? '#99E86C' : '#FFFFFF',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selected === surface.id ? '#99E86C' : '#E5E5E5',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{
                  fontSize: 18,
                  color: '#000000',
                  fontWeight: '600',
                }}>
                  {surface.title}
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
              await analyticsService.logEvent('onboarding_training_surface');
              await updateOnboardingData({ trainingSurface: selected });
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