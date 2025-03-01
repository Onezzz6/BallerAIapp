import { Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';

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
      <Image 
        source={require('../../assets/images/back-button.png')}
        style={{
          width: 40,
          height: 40,
        }}
        resizeMode="contain"
      />
    </Pressable>
  );
} 