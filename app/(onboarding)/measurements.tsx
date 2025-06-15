import { View, Text, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import analytics from '@react-native-firebase/analytics';
import { colors, typography, spacing } from '../utils/theme';
import { useHaptics } from '../utils/haptics';

export default function MeasurementsScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [height, setHeight] = useState(parseInt(onboardingData.height || '') || 170);
  const [weight, setWeight] = useState(parseInt(onboardingData.weight || '') || 70);

  const handleContinue = async () => {
    if (height && weight) {
      haptics.light();
      await analytics().logEvent('onboarding_measurements_continue');
      await updateOnboardingData({ height: height.toString(), weight: weight.toString() });
      router.push('/dominant-foot');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <OnboardingHeader 
        currentStep={5}
        totalSteps={26}
      />

      {/* Animated Content Area - Slides in */}
      <Animated.View 
        entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{
          backgroundColor: colors.backgroundColor,
          flex: 1,
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
            Your measurements?
          </Text>
          <Text style={[
            typography.subtitle,
            {
              fontSize: 16,
              color: colors.mediumGray,
            }
          ]}>
            This will be used to calibrate your custom plans.
          </Text>
        </View>

        {/* Centered Content Section */}
        <View style={{
          paddingHorizontal: 0,
          paddingBottom: 64,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Measurement Pickers */}
          <View style={{
            paddingHorizontal: 24,
            flexDirection: 'row',
          }}>
            {/* Height Picker */}
            <View style={{
              flex: 1,
              marginHorizontal: -3,
            }}>
              <Text style={{
                fontSize: 18,
                color: colors.mediumGray,
                marginBottom: 8,
                textAlign: 'center',
              }}>
                Height
              </Text>
              <Picker
                selectedValue={height}
                onValueChange={(itemValue) => {
                  haptics.light();
                  setHeight(itemValue);
                }}
                itemStyle={{
                  fontSize: 16,
                  color: colors.black,
                }}
              >
                {Array.from({ length: 81 }, (_, i) => i + 150).map((cm) => (
                  <Picker.Item
                    key={cm}
                    label={`${cm} cm`}
                    value={cm}
                  />
                ))}
              </Picker>
            </View>

            {/* Weight Picker */}
            <View style={{
              flex: 1,
              marginHorizontal: -3,
            }}>
              <Text style={{
                fontSize: 18,
                color: colors.mediumGray,
                marginBottom: 8,
                textAlign: 'center',
              }}>
                Weight
              </Text>
              <Picker
                selectedValue={weight}
                onValueChange={(itemValue) => {
                  haptics.light();
                  setWeight(itemValue);
                }}
                itemStyle={{
                  fontSize: 16,
                  color: colors.black,
                }}
              >
                {Array.from({ length: 101 }, (_, i) => i + 40).map((kg) => (
                  <Picker.Item
                    key={kg}
                    label={`${kg} kg`}
                    value={kg}
                  />
                ))}
              </Picker>
            </View>
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
        />
      </View>
    </SafeAreaView>
  );
} 