import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useEffect } from 'react';
import ProgressIndicator from './ProgressIndicator';

export default function AnalyzingScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/analysis-complete');
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{
        fontSize: 28,
        color: '#000000',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 40,
      }}>
        Analyzing answers and creating your custom profile
      </Text>

      <ProgressIndicator />
    </Animated.View>
  );
} 