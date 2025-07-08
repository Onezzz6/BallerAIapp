import { View, Image } from 'react-native';
import { useEffect } from 'react';
import Animated, { 
  useSharedValue,
  useAnimatedStyle,
  withTiming
} from 'react-native-reanimated';

interface LoadingScreenProps {
  shouldFadeOut?: boolean;
}

export default function LoadingScreen({ shouldFadeOut = false }: LoadingScreenProps) {
  const opacity = useSharedValue(0); // Start at 0 for manual fade-in

  useEffect(() => {
    // Fade in immediately when component mounts
    opacity.value = withTiming(1, { duration: 500 });
  }, [opacity]);

  useEffect(() => {
    if (shouldFadeOut) {
      // Fade out when requested
      opacity.value = withTiming(0, { duration: 500 });
    }
  }, [shouldFadeOut, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        {
          flex: 1,
          backgroundColor: '#ffffff',
          justifyContent: 'center',
          alignItems: 'center',
        },
        animatedStyle
      ]}
    >
      <Image
        source={require('../../assets/images/BallerAILogo.png')}
        style={{
          width: 120,
          height: 120,
          resizeMode: 'contain'
        }}
      />
    </Animated.View>
  );
} 