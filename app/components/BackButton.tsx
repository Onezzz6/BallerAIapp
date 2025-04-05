import { Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';

export default function BackButton() {
  const router = useRouter();

  return (
    <Pressable 
      onPress={() => router.back()}
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