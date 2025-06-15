import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';
import ScrollIfNeeded from '../components/ScrollIfNeeded';
import analytics from '@react-native-firebase/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';

export default function DominantFootScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.dominantFoot);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <OnboardingHeader 
        currentStep={6}
        totalSteps={26}
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
            Which foot is your dominant one?
          </Text>
        </View>

        {/* Centered Content Section */}
        <View style={{
          paddingHorizontal: 24,
          paddingBottom: 64,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            flexDirection: 'row',
            gap: 12,
          }}>
            {[
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ].map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  haptics.light();
                  setSelected(option.value);
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 60,
                  backgroundColor: selected === option.value ? '#99E86C' : '#FFFFFF',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selected === option.value ? '#99E86C' : '#E5E5E5',
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{
                  fontSize: 18,
                  color: '#000000',
                  fontWeight: '500',
                }}>
                  {option.label}
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
              await analytics().logEvent('onboarding_dominant_foot_continue');
              await updateOnboardingData({ dominantFoot: selected });
              router.push('/injury-history');
            }
          }}
          disabled={!selected}
        />
      </View>
    </SafeAreaView>
  );
} 