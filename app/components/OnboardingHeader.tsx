import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import BackButton from './BackButton';
import Animated, { FadeIn, FadeOut, PinwheelIn } from 'react-native-reanimated';
import { colors, spacing } from '../utils/theme';

type Props = {
  currentStep: number;
  totalSteps: number;
  customBackPath?: string;
}

export default function OnboardingHeader({ currentStep, totalSteps, customBackPath }: Props) {
  const router = useRouter();
  // Calculate progress based on the totalSteps prop
  const progress = Math.min((currentStep / totalSteps) * 100, 100);

  return (
    <View style={{ 
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
        <BackButton customBackPath={customBackPath} />
        
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