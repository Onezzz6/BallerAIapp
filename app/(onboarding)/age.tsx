import { View, Text, SafeAreaView } from 'react-native';
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

export default function AgeScreen() {
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const headerHeight = useOnboardingHeaderHeight();
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('age');
  
  // Parse existing birth date or set defaults
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();
  
  // Use saved birth date if available, otherwise default values
  const savedBirthYear = onboardingData.birthYear ? parseInt(onboardingData.birthYear) : null;
  const savedBirthMonth = onboardingData.birthMonth ? parseInt(onboardingData.birthMonth) : null;
  const savedBirthDay = onboardingData.birthDay ? parseInt(onboardingData.birthDay) : null;
  
  const initialYear = savedBirthYear || currentYear - 18;
  const initialMonth = savedBirthMonth || currentMonth;
  const initialDay = savedBirthDay || currentDay;
  
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(initialDay);
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
    await analyticsService.logEvent('AA__08_age_continue');
    
    // Save both the calculated age and the exact birth date
    await updateOnboardingData({ 
      age: age.toString(),
      birthYear: selectedYear.toString(),
      birthMonth: selectedMonth.toString(),
      birthDay: selectedDay.toString()
    });
    
    // NEW: Use automatic navigation instead of hardcoded route
    goToNext();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="age" />

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