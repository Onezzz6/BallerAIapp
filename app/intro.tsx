import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Button from './components/Button';
import BackButton from './components/BackButton';
import ScrollIfNeeded from './components/ScrollIfNeeded';

export default function IntroScreen() {
  const router = useRouter();

  return (
    <ScrollIfNeeded
      style={{
        backgroundColor: '#ffffff',
        padding: 24,
      }}
    >
      <Animated.View 
        entering={FadeIn.duration(500)}
        exiting={FadeOut.duration(500)}
        style={{
          flex: 1,
        }}
      >
        {/* Back Button */}
        <View style={{
          position: 'absolute',
          top: 74,
          left: 24,
          zIndex: 10,
        }}>
          <BackButton />
        </View>
        
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
            Hi, I'm Ballzy!
          </Text>

          <Text style={{
            fontSize: 18,
            color: '#000000',
            opacity: 0.8,
            textAlign: 'center',
            marginBottom: 32,
          }}>
            Please, answer a few quick questions, so I can customize everything just for you!
          </Text>

          <Button 
            title="Continue" 
            onPress={() => router.push('/(onboarding)/username')}
            buttonStyle={{
              backgroundColor: '#4064F6',
            }}
          />
        </View>
      </Animated.View>
    </ScrollIfNeeded>
  );
} 