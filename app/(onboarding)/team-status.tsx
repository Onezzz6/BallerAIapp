import { View, Text, Pressable, SafeAreaView } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';
import analyticsService from '../services/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';

export default function TeamStatusScreen() {
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<boolean | null>(onboardingData.teamStatus === 'true' ? true : onboardingData.teamStatus === 'false' ? false : null);
  const headerHeight = useOnboardingHeaderHeight();
  
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('team-status');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="team-status" />

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
            Do you train with a team?
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
            flexDirection: 'row',
            gap: 16,
          }}>
            {[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ].map((option) => (
              <Pressable
                key={option.label}
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
                  opacity: pressed ? 0.8 : 1,
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
            if (selected !== null) {
              haptics.light();
              await analyticsService.logEvent('AA__18_team_status_continue');
              await updateOnboardingData({ teamStatus: selected.toString() });
              // NEW: Use automatic navigation instead of hardcoded route
              goToNext();
            }
          }}
          disabled={selected === null}
        />
      </View>
    </SafeAreaView>
  );
} 