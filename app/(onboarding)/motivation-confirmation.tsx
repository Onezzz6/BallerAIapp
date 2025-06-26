import { View, Text, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import analytics from '@react-native-firebase/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';

export default function MotivationConfirmationScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { onboardingData } = useOnboarding();

  const handleContinue = async () => {
    console.log('Continue button pressed on motivation-confirmation');
    haptics.light();
    
    try {
      await analytics().logEvent('onboarding_motivation_confirmation_continue');
      console.log('Analytics event logged successfully');
    } catch (error) {
      console.log('Analytics error:', error);
    }
    
    console.log('Attempting to navigate to holding-back');
    router.push('/(onboarding)/holding-back');
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
      <OnboardingHeader 
        currentStep={12}
        totalSteps={28}
      />

      <Animated.View 
        entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{
          flex: 1,
          backgroundColor: colors.backgroundColor,
        }}
      >

        <View style={{
          paddingHorizontal: 24,
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
            It is definitely a feasible goal to improve your{' '}
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