import { View, Text, SafeAreaView, Switch } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import analyticsService from '../services/analytics';
import { colors, typography, spacing } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';

export default function MeasurementsScreen() {
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [isMetric, setIsMetric] = useState(true);
  const headerHeight = useOnboardingHeaderHeight();
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('measurements');

  const [height, setHeight] = useState(parseFloat(onboardingData.height || '') || 170);
  const [weight, setWeight] = useState(parseFloat(onboardingData.weight || '') || 70);
  const [feet, setFeet] = useState(5);
  const [inches, setInches] = useState(7);
  const [pounds, setPounds] = useState(154);
  
  // Force picker updates when unit system changes
  const [pickerKey, setPickerKey] = useState(0);
  
  // Debug imperial weight picker state
  useEffect(() => {
    if (!isMetric) {
      console.log('🔍 Imperial weight picker state changed - pounds:', pounds, 'type:', typeof pounds);
    }
  }, [pounds, isMetric]);

  // Convert cm to feet/inches
  const cmToFeetInches = (cm: number) => {
    const totalInches = Math.round(cm / 2.54);
    const ft = Math.floor(totalInches / 12);
    const inch = totalInches % 12;
    return { feet: ft, inches: inch };
  };

  // Convert feet/inches to cm
  const feetInchesToCm = (ft: number, inch: number) => {
    const cm = Math.round(((ft * 12) + inch) * 2.54);
    return cm;
  };

  // Convert kg to lbs
  const kgToLbs = (kg: number) => {
    const lbs = Math.round(kg * 2.20462);
    return lbs;
  };

  // Convert lbs to kg
  const lbsToKg = (lbs: number) => {
    const kg = Math.round(lbs / 2.20462);
    return kg;
  };

  const handleUnitToggle = (value: boolean) => {
    haptics.light();
    setIsMetric(value);
    
    console.log('=== UNIT TOGGLE DEBUG ===');
    console.log('Switching to:', value ? 'metric' : 'imperial');
    console.log('Current state - height:', height, 'weight:', weight, 'feet:', feet, 'inches:', inches, 'pounds:', pounds);
    
    // Use setTimeout to ensure picker has time to process the unit change
    setTimeout(() => {
      if (value) {
        // Switching to metric
        const newHeight = feetInchesToCm(feet, inches);
        const newWeight = lbsToKg(pounds);
        console.log('Converting to metric - newHeight:', newHeight, 'newWeight:', newWeight);
        setHeight(newHeight);
        setWeight(newWeight);
      } else {
        // Switching to imperial
        const { feet: ft, inches: inch } = cmToFeetInches(height);
        const convertedPounds = kgToLbs(weight);
        
        // Validate pounds is within picker range (88-309)
        const validPounds = Math.max(88, Math.min(309, convertedPounds));
        
        console.log('Converting to imperial - feet:', ft, 'inches:', inch, 'pounds:', convertedPounds);
        if (convertedPounds !== validPounds) {
          console.warn('⚠️  Pounds value', convertedPounds, 'clamped to', validPounds);
        }
        
        setFeet(ft);
        setInches(inch);
        setPounds(validPounds);
      }
      
      // Force picker updates when unit system changes
      setPickerKey(prevKey => prevKey + 1);
    }, 50); // Small delay to let React process the isMetric change first
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
      await analyticsService.logEvent('AA__07_measurements_continue');
      await updateOnboardingData({ 
        height: finalHeight.toString(), 
        weight: finalWeight.toString(),
        preferMetricUnits: isMetric
      });
      // NEW: Use automatic navigation instead of hardcoded route
      goToNext();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="measurements" />

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
          paddingTop: headerHeight,
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
                  key={`metric-height-${pickerKey}`}
                  selectedValue={height}
                  onValueChange={(itemValue) => {
                    haptics.light();
                    setHeight(Number(itemValue));
                  }}
                  itemStyle={{
                    fontSize: 16,
                    color: colors.black,
                  }}
                >
                  {Array.from({ length: 117 }, (_, i) => i + 125).map((cm) => (
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
                      key={`imperial-feet-${pickerKey}`}
                      selectedValue={feet}
                      onValueChange={(itemValue) => {
                        haptics.light();
                        setFeet(Number(itemValue));
                      }}
                      itemStyle={{
                        fontSize: 16,
                        color: colors.black,
                      }}
                    >
                      {Array.from({ length: 4 }, (_, i) => i + 4).map((ft) => (
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
                      key={`imperial-inches-${pickerKey}`}
                      selectedValue={inches}
                      onValueChange={(itemValue) => {
                        haptics.light();
                        setInches(Number(itemValue));
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
                  key={`metric-weight-${pickerKey}`}
                  selectedValue={weight}
                  onValueChange={(itemValue) => {
                    haptics.light();
                    setWeight(Number(itemValue));
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
                  key={`imperial-weight-${pickerKey}-${pounds}`}
                  selectedValue={pounds}
                  onValueChange={(itemValue) => {
                    haptics.light();
                    console.log('Imperial weight picker changed to:', itemValue, 'type:', typeof itemValue);
                    setPounds(Number(itemValue)); // Convert to number
                  }}
                  itemStyle={{
                    fontSize: 16,
                    color: colors.black,
                  }}
                >
                  {Array.from({ length: 222 }, (_, i) => i + 88).map((lbs) => (
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