import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Button from './components/Button';
import OnboardingHeader from './components/OnboardingHeader';
import ScrollIfNeeded from './components/ScrollIfNeeded';
import analytics from '@react-native-firebase/analytics';

export default function IntroScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <OnboardingHeader 
        currentStep={1}
        totalSteps={26}
      />

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
              onPress={async () => {
                await analytics().logEvent('onboarding_intro_continue');
                router.push('/(onboarding)/username');
              }}
              buttonStyle={{
                backgroundColor: '#4064F6',
              }}
            />
          </View>
        </Animated.View>
      </ScrollIfNeeded>
    </View>
  );
} 