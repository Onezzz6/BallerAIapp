import { View, Text, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';
import analytics from '@react-native-firebase/analytics';
import { colors, typography, spacing } from '../utils/theme';
import { useHaptics } from '../utils/haptics';

export default function GenderScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selectedGender, setSelectedGender] = useState(onboardingData.gender || '');

  const handleGenderSelect = (gender: string) => {
    haptics.light();
    setSelectedGender(gender);
  };

  const handleContinue = async () => {
    if (selectedGender) {
      haptics.light();
      await analytics().logEvent('onboarding_gender_continue');
      await updateOnboardingData({ gender: selectedGender });
      router.push('/age');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <OnboardingHeader 
        currentStep={3}
        totalSteps={26}
      />

      <Animated.View 
        entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{ flex: 1, backgroundColor: colors.backgroundColor }}
      >
        {/* Scrollable Content Area */}
        {/*<ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section - Same as measurements */}
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
              Choose your Gender
            </Text>
            <Text style={[
              typography.subtitle,
              {
                fontSize: 16,
                color: colors.mediumGray,
              }
            ]}>
              This will be used to calibrate your nutrition.
            </Text>
          </View>

          {/* Gender Options - Clean list with proper spacing */}
          <View style={{
            paddingHorizontal: 24,
            paddingBottom: 64,
            flex: 1,
            justifyContent: 'center',
          }}>
            <View style={{
              gap: 12, // Space between pills
            }}>
              {[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ].map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleGenderSelect(option.value)}
                  style={({ pressed }) => ({
                    height: 60, // Much thinner to match reference
                    backgroundColor: selectedGender === option.value ? colors.selectedBackground : colors.white,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: selectedGender === option.value ? colors.selectedBorder : colors.borderColor,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text style={{
                    fontSize: 18,
                    color: colors.black,
                    fontWeight: '500',
                  }}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        {/*</ScrollView>*/}
      </Animated.View>

      {/* Fixed Continue Button - Always stays at bottom */}
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
          disabled={!selectedGender}
        />
      </View>
    </SafeAreaView>
  );
} 