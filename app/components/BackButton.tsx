import { Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useOnboardingStep } from '../hooks/useOnboardingStep';

interface BackButtonProps {
  customBackPath?: string;
  screenId?: string;
}

export default function BackButton({ customBackPath, screenId }: BackButtonProps) {
  const router = useRouter();
  const onboardingStep = screenId ? useOnboardingStep(screenId) : null;

  const handlePress = () => {
    if (customBackPath) {
      router.push(customBackPath);
    } else if (onboardingStep) {
      // Use our custom navigation logic that respects skipOnBack
      onboardingStep.goToPrevious();
    } else {
      // Fallback to default behavior
      router.back();
    }
  };

  return (
    <Pressable 
      onPress={handlePress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        alignSelf: 'center',
      })}
    >
      <Animated.View 
        entering={FadeInRight.duration(300)}
      >
      <Image 
        source={require('../../assets/images/back-button.png')}
        style={{
          width: 40,
          height: 40,
        }}
        resizeMode="contain"
      />
      </Animated.View>
    </Pressable>
  );
} 