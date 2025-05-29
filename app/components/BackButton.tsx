import { Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';

interface BackButtonProps {
  customBackPath?: string;
}

export default function BackButton({ customBackPath }: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (customBackPath) {
      router.push(customBackPath);
    } else {
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