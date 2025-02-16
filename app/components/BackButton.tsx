import { Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';

export default function BackButton() {
  const router = useRouter();

  return (
    <Pressable 
      onPress={() => router.back()}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        alignSelf: 'flex-start',
      })}
    >
      <Image 
        source={require('../../assets/images/back-button.png')}
        style={{
          width: 36,
          height: 36,
        }}
        resizeMode="contain"
      />
    </Pressable>
  );
} 