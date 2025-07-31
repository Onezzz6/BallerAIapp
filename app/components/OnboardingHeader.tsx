import { View, Text, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import BackButton from './BackButton';
import Animated, { FadeIn, FadeOut, PinwheelIn } from 'react-native-reanimated';
import { colors, spacing } from '../../utils/theme';
import { getStepInfo } from '../(onboarding)/_onboarding-flow';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Custom hook to calculate the onboarding header height consistently across all screens
 * This includes the safe area insets plus the header content height
 * Android gets reduced padding to prevent content being pushed off-screen
 */
export function useOnboardingHeaderHeight() {
  const insets = useSafeAreaInsets();
  
  // Calculate header height with Android-specific adjustment
  // Android needs more padding to prevent title cutoff
  const headerHeight = Platform.OS === 'android' 
    ? insets.top + 88
    : insets.top + 40; // Original iOS padding
  
  return headerHeight;
}

type Props = {
  // NEW: Automatic step detection (preferred method)
  screenId?: string;
  
  // OLD: Manual step specification (for backward compatibility)
  currentStep?: number;
  totalSteps?: number;
  
  customBackPath?: string;
}

export default function OnboardingHeader({ 
  screenId, 
  currentStep: manualCurrentStep, 
  totalSteps: manualTotalSteps, 
  customBackPath 
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Determine step information
  let currentStep: number;
  let totalSteps: number;
  
  if (screenId) {
    // NEW: Automatic detection using flow configuration
    const stepInfo = getStepInfo(screenId);
    currentStep = stepInfo.currentStep;
    totalSteps = stepInfo.totalSteps;
  } else if (manualCurrentStep !== undefined && manualTotalSteps !== undefined) {
    // OLD: Manual specification (backward compatibility)
    currentStep = manualCurrentStep;
    totalSteps = manualTotalSteps;
  } else {
    // Fallback
    console.warn('OnboardingHeader: Either screenId or currentStep/totalSteps must be provided');
    currentStep = 1;
    totalSteps = 1;
  }
  
  // Calculate progress based on the totalSteps
  const progress = Math.min((currentStep / totalSteps) * 100, 100);

  return (
    <View style={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      paddingTop: insets.top,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.backgroundColor,
    }}>
      {/* Header with BallerAI Logo */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64, // Fixed height for consistency
      }}>
        <BackButton customBackPath={customBackPath} screenId={screenId} />
        
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginLeft: 'auto',
        }}>
          <Animated.View 
            entering={PinwheelIn.duration(500)}
          >
          <Image 
            source={require('../../assets/images/BallerAILogo.png')}
            style={{
              width: 32,
              height: 32,
            }}
            resizeMode="contain"
            />
          </Animated.View>
          <Text 
            style={{
              fontSize: 28,
              fontWeight: '300',
              color: colors.black,
            }} allowFontScaling={false}>
            BallerAI
          </Text>
        </View>
      </View>

      {/* Progress Bar - Thinner but brand blue */}
      <View style={{
        width: '100%',
        height: 6,
        backgroundColor: colors.veryLightGray,
        borderRadius: 3,
        marginBottom: 8,
      }}>
        <Animated.View 
          entering={FadeIn.duration(500)}
          exiting={FadeOut.duration(200)}
        >
          <View style={{
            width: `${progress}%`,
            height: 6,
            backgroundColor: colors.brandBlue,
            borderRadius: 3,
          }} />
        </Animated.View>
      </View>
    </View>
  );
} 
