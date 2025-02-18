import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from './components/Button';

export default function IntroScreen() {
  const router = useRouter();

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 24,
      }}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
      }}>
        <Image
          source={require('../assets/images/mascot.png')}
          style={{
            width: 200,
            height: 200,
            resizeMode: 'contain',
            marginBottom: 20,
          }}
        />
        
        <Text style={{
          fontSize: 28,
          color: '#000000',
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: 12,
        }}>
          Hi, I'm BallerAI, your AI football partner!
        </Text>

        <Text style={{
          fontSize: 18,
          color: '#000000',
          opacity: 0.8,
          textAlign: 'center',
          marginBottom: 32,
        }}>
          I will guide you to your goals. Before we start, answer a few quick questions to make sure I can customize everything just for you!
        </Text>

        <Button 
          title="Continue" 
          onPress={() => router.push('/(onboarding)/username')}
          buttonStyle={{
            backgroundColor: '#007AFF',
          }}
        />
      </View>
    </Animated.View>
  );
} 