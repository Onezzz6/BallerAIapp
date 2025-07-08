import { View, Text, SafeAreaView } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import analytics from '@react-native-firebase/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import analyticsService from '../services/analytics';

export default function SleepHoursScreen() {
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.sleepHours || '8');
  
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('sleep-hours');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="sleep-hours" />

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
            Sleep duration on average?
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
            height: 200,
            backgroundColor: '#F8F8F8',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            <Picker
              selectedValue={selected}
              onValueChange={(itemValue) => {
                haptics.light();
                setSelected(itemValue);
              }}
              style={{
                width: '100%',
                height: '100%',
              }}
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((hours) => (
                <Picker.Item 
                  key={hours} 
                  label={`${hours} ${hours === 1 ? 'hour' : 'hours'}`} 
                  value={hours.toString()} 
                />
              ))}
            </Picker>
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
              await analyticsService.logEvent('AA_21_sleep_hours_continue');
              await updateOnboardingData({ sleepHours: selected });
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