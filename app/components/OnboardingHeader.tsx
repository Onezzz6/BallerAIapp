import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import BackButton from './BackButton';
import Animated, { FadeIn, FadeOut, PinwheelIn } from 'react-native-reanimated';

type Props = {
  currentStep: number;
  totalSteps: number;
}

export default function OnboardingHeader({ currentStep, totalSteps }: Props) {
  const router = useRouter();
  // We have 20 total steps in the onboarding flow
  const TOTAL_ONBOARDING_STEPS = 20;
  const progress = (currentStep / TOTAL_ONBOARDING_STEPS) * 100;

  return (
    <View style={{ 
      paddingTop: 48,
      paddingHorizontal: 24,
      backgroundColor: '#ffffff',
    }}>
      {/* Header with Logo */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 92, // Fixed height for consistency
      }}>
        <BackButton />
        
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
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
              color: '#000000',
            }} allowFontScaling={false}>
            BallerAI
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={{
        width: '100%',
        height: 12,
        backgroundColor: '#E5E5E5',
        borderRadius: 8,
        marginTop: 6,
      }}>
        <Animated.View 
          entering={FadeIn.duration(500)}
          exiting={FadeOut.duration(200)}
        >
          <View style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: '#4064F6',
            borderRadius: 8,
          }} />
        </Animated.View>
      </View>
    </View>
  );
} 