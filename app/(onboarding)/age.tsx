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

export default function AgeScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  
  // Parse existing age or set defaults
  const existingAge = onboardingData.age ? parseInt(onboardingData.age) : null;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();
  
  // Calculate birth year from age or use current date
  const initialYear = existingAge ? currentYear - existingAge : currentYear - 18;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedDay, setSelectedDay] = useState(currentDay);
  const [selectedYear, setSelectedYear] = useState(initialYear);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate days array (1-31, will be validated)
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const handleContinue = async () => {
    // Calculate age from selected date
    const birthDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    haptics.light();
    await analytics().logEvent('onboarding_age_continue');
    await updateOnboardingData({ age: age.toString() });
    router.push('/measurements');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <OnboardingHeader 
        currentStep={4}
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
            When were you born?
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
          {/* Native Date Picker Grid */}
          <View style={{
            paddingHorizontal: 12,
            flexDirection: 'row',
          }}>
            {/* Month Picker */}
            <View style={{
              flex: 1,
            }}>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={(itemValue) => {
                  haptics.light();
                  setSelectedMonth(itemValue);
                }}
                itemStyle={{
                  fontSize: 18,
                  color: colors.black,
                }}
              >
                {months.map((month, index) => (
                  <Picker.Item
                    key={index + 1}
                    label={month}
                    value={index + 1}
                  />
                ))}
              </Picker>
            </View>

            {/* Day Picker */}
            <View style={{
              flex: 1,
              maxWidth: '25%',
              marginHorizontal: -6,
            }}>
              <Picker
                selectedValue={selectedDay}
                onValueChange={(itemValue) => {
                  haptics.light();
                  setSelectedDay(itemValue);
                }}
                itemStyle={{
                  fontSize: 18,
                  color: colors.black,
                }}
              >
                {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => i + 1).map((day) => (
                  <Picker.Item
                    key={day}
                    label={day.toString()}
                    value={day}
                  />
                ))}
              </Picker>
            </View>

            {/* Year Picker */}
            <View style={{
              flex: 1,
              maxWidth: '32%',
            }}>
              <Picker
                selectedValue={selectedYear}
                onValueChange={(itemValue) => {
                  haptics.light();
                  setSelectedYear(itemValue);
                }}
                itemStyle={{
                  fontSize: 18,
                  color: colors.black,
                }}
              >
                {Array.from({ length: 100 }, (_, i) => currentYear - i).map((year) => (
                  <Picker.Item
                    key={year}
                    label={year.toString()}
                    value={year}
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