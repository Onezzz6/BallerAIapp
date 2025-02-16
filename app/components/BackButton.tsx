import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function BackButton() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => ({
        position: 'absolute',
        top: 50,
        left: 20,
        opacity: pressed ? 0.7 : 1,
        zIndex: 1,
      })}
    >
      <Ionicons name="chevron-back" size={32} color="#000000" />
    </Pressable>
  );
} 