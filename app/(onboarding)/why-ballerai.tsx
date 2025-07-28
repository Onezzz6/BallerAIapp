import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { colors } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { BALLERAI_SOLUTIONS } from './helping-solutions';
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import analyticsService from '../services/analytics';

export default function WhyBallerAIScreen() {
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  
  // NEW: Use the automatic onboarding step system
  const { goToNext, goToStep } = useOnboardingStep('why-ballerai');
  
  // Get the selected holding back reason
  const holdingBack = onboardingData.holdingBack;
  const solution = holdingBack ? BALLERAI_SOLUTIONS[holdingBack as keyof typeof BALLERAI_SOLUTIONS] : null;

  // Fallback if no selection (shouldn't happen in normal flow)
  if (!solution) {
    goToStep('training-accomplishment');
    return null;
  }

  const handleContinue = async () => {
    haptics.light();
    
    try {
      await analyticsService.logEvent('A0_24_why_ballerai_continue', {
        holding_back_reason: holdingBack
      });
    } catch (error) {
      console.log('Analytics error:', error);
    }
    
    // NEW: Use automatic navigation instead of hardcoded route
    goToNext();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="why-ballerai" />

      <Animated.View 
        entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{
          flex: 1,
          backgroundColor: colors.backgroundColor,
        }}
      >
        {/* Content */}
        <View style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: 120,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Big Header */}
          <Text style={{
            fontSize: 32,
            fontWeight: '700',
            color: colors.black,
            textAlign: 'center',
            marginBottom: 32,
            lineHeight: 40,
          }} allowFontScaling={false}>
            {holdingBack === 'injuries' ? (
              <>
                You will prevent{' '}
                <Text style={{ color: '#FF8A65' }}>
                  {solution.problem}
                </Text>
                {' '}with BallerAI!
              </>
            ) : holdingBack === 'no-optimal-recovery' || holdingBack === 'inconsistent-nutrition' ? (
              <>
                We will fix{' '}
                <Text style={{ color: '#FF8A65' }}>
                  {solution.problem}
                </Text>
                {' '}with BallerAI!
              </>
            ) : (
              <>
                We will fix{' '}
                <Text style={{ color: '#FF8A65' }}>
                  {solution.problem}
                </Text>
                {' '}with BallerAI!
              </>
            )}
          </Text>

          {/* Description */}
          <Text style={{
            fontSize: 18,
            color: colors.mediumGray,
            textAlign: 'center',
            lineHeight: 26,
            paddingHorizontal: 12,
          }}>
            {solution.description}
          </Text>
        </View>
      </Animated.View>

      {/* Static Continue Button */}
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