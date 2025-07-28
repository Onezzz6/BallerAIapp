import { View, Text, SafeAreaView } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useEffect } from 'react';
import analyticsService from '../services/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';

export default function MotivationConfirmationScreen() {
  const haptics = useHaptics();
  const { onboardingData } = useOnboarding();
  const headerHeight = useOnboardingHeaderHeight();
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('motivation-confirmation');

  const handleContinue = async () => {
    haptics.light();
    await analyticsService.logEvent('A0_13_motivation_confirmation_continue');
    // NEW: Use automatic navigation instead of hardcoded route
    goToNext();
  };

  // Get the improvement focus text
  const getImprovementText = () => {
    switch (onboardingData.improvementFocus) {
      case 'speed': return 'speed';
      case 'strength': return 'strength';
      case 'endurance': return 'endurance';
      case 'technical': return 'technical skills';
      case 'everything': return 'overall performance';
      default: return 'performance';
    }
  };

  // Get the timeline text
  const getTimelineText = () => {
    switch (onboardingData.goalTimeline) {
      case '1-month': return '1 month';
      case '3-months': return '3 months';
      case '6-months': return '6 months';
      case 'no-deadline': return 'with consistent training';
      default: return 'with dedicated effort';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="motivation-confirmation" />

      <Animated.View 
        entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{
          flex: 1,
          backgroundColor: colors.backgroundColor,
        }}
      >

        <View style={{
          paddingHorizontal: 24,
          paddingTop: headerHeight,
          paddingBottom: 64,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Main motivational text */}
          <Text style={[
            typography.title,
            {
              textAlign: 'center',
              marginBottom: 32,
              fontSize: 32,
              lineHeight: 40,
            }
          ]} allowFontScaling={false}>
            It is definitely an achievable goal to improve your{' '}
            <Text style={{ color: '#FF8A65' }}>
              {getImprovementText()}
            </Text>
            {onboardingData.goalTimeline !== 'no-deadline' ? ` in ${getTimelineText()}` : ` ${getTimelineText()}`}
          </Text>

          {/* Supporting text */}
          <Text style={[
            typography.subtitle,
            {
              textAlign: 'center',
              fontSize: 18,
              color: colors.mediumGray,
              lineHeight: 26,
              paddingHorizontal: 12,
            }
          ]} allowFontScaling={false}>
            90% of BallerAI athletes say that the change is obvious after using our personalized training and load management tools.
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