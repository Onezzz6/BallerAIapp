import { View, Text, SafeAreaView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import analytics from '@react-native-firebase/analytics';
import { colors, typography, spacing } from '../utils/theme';
import { useHaptics } from '../utils/haptics';

export default function MeasurementsScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [isMetric, setIsMetric] = useState(true);

  const [height, setHeight] = useState(parseInt(onboardingData.height || '') || 170);
  const [weight, setWeight] = useState(parseInt(onboardingData.weight || '') || 70);
  const [feet, setFeet] = useState(5);
  const [inches, setInches] = useState(7);
  const [pounds, setPounds] = useState(154);

  // Convert cm to feet/inches
  const cmToFeetInches = (cm: number) => {
    const totalInches = cm / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inch = Math.round(totalInches % 12);
    return { feet: ft, inches: inch };
  };

  // Convert feet/inches to cm
  const feetInchesToCm = (ft: number, inch: number) => {
    return Math.round((ft * 12 + inch) * 2.54);
  };

  // Convert kg to lbs
  const kgToLbs = (kg: number) => {
    return Math.round(kg * 2.20462);
  };

  // Convert lbs to kg
  const lbsToKg = (lbs: number) => {
    return Math.round(lbs / 2.20462);
  };

  const handleUnitToggle = (value: boolean) => {
    haptics.light();
    setIsMetric(value);
    
    if (value) {
      // Switching to metric
      setHeight(feetInchesToCm(feet, inches));
      setWeight(lbsToKg(pounds));
    } else {
      // Switching to imperial
      const { feet: ft, inches: inch } = cmToFeetInches(height);
      setFeet(ft);
      setInches(inch);
      setPounds(kgToLbs(weight));
    }
  };

  const handleContinue = async () => {
    let finalHeight, finalWeight;
    
    if (isMetric) {
      finalHeight = height;
      finalWeight = weight;
    } else {
      finalHeight = feetInchesToCm(feet, inches);
      finalWeight = lbsToKg(pounds);
    }

    if (finalHeight && finalWeight) {
      haptics.light();
      await analytics().logEvent('07_measurements_continue');
      await updateOnboardingData({ 
        height: finalHeight.toString(), 
        weight: finalWeight.toString() 
      });
      router.push('/age');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <OnboardingHeader 
        currentStep={7}
        totalSteps={29}
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
            Height & weight
          </Text>
          <Text style={[
            typography.subtitle,
            {
              fontSize: 16,
              color: colors.mediumGray,
            }
          ]}>
            This will be used to calibrate your custom plan.
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
          {/* Unit Toggle */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 24,
            paddingHorizontal: 24,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: !isMetric ? colors.black : colors.mediumGray,
            }} allowFontScaling={false}>
              Imperial
            </Text>
            <Switch
              trackColor={{ false: colors.veryLightGray, true: '#99E86C' }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.veryLightGray}
              onValueChange={handleUnitToggle}
              value={isMetric}
              style={{ marginHorizontal: 12 }}
            />
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: isMetric ? colors.black : colors.mediumGray,
            }} allowFontScaling={false}>
              Metric
            </Text>
          </View>

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
                fontWeight: '600',
                color: colors.black,
                marginBottom: 8,
                textAlign: 'center',
              }}>
                Height
              </Text>
              
              {isMetric ? (
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
              ) : (
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1 }}>
                    <Picker
                      selectedValue={feet}
                      onValueChange={(itemValue) => {
                        haptics.light();
                        setFeet(itemValue);
                      }}
                      itemStyle={{
                        fontSize: 16,
                        color: colors.black,
                      }}
                    >
                      {Array.from({ length: 6 }, (_, i) => i + 3).map((ft) => (
                        <Picker.Item
                          key={ft}
                          label={`${ft} ft`}
                          value={ft}
                        />
                      ))}
                    </Picker>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Picker
                      selectedValue={inches}
                      onValueChange={(itemValue) => {
                        haptics.light();
                        setInches(itemValue);
                      }}
                      itemStyle={{
                        fontSize: 16,
                        color: colors.black,
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => i).map((inch) => (
                        <Picker.Item
                          key={inch}
                          label={`${inch} in`}
                          value={inch}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}
            </View>

            {/* Weight Picker */}
            <View style={{
              flex: 1,
              marginHorizontal: -3,
              maxWidth: '40%',
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.black,
                marginBottom: 8,
                textAlign: 'center',
              }}>
                Weight
              </Text>
              
              {isMetric ? (
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
              ) : (
                <Picker
                  selectedValue={pounds}
                  onValueChange={(itemValue) => {
                    haptics.light();
                    setPounds(itemValue);
                  }}
                  itemStyle={{
                    fontSize: 16,
                    color: colors.black,
                  }}
                >
                  {Array.from({ length: 151 }, (_, i) => i + 100).map((lbs) => (
                    <Picker.Item
                      key={lbs}
                      label={`${lbs} lb`}
                      value={lbs}
                    />
                  ))}
                </Picker>
              )}
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