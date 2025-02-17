import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';

export default function MotivationScreen() {
  const router = useRouter();

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={5}
        totalSteps={7}
      />
      
      <View style={{
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 32,
      }}>
        <Image 
          source={require('../../assets/images/mascot.png')}
          style={{
            width: 200,
            height: 200,
          }}
          resizeMode="contain"
        />

        <View style={{ gap: 16 }}>
          <Text style={{
            fontSize: 24,
            color: '#000000',
            fontWeight: '600',
            textAlign: 'center',
          }}>
            Great! You clearly show great ambition, this is very important in achieving your goals!
          </Text>
          
          <Text style={{
            fontSize: 18,
            color: '#666666',
            textAlign: 'center',
          }}>
            Last few questions to understand your current situation!
          </Text>
        </View>

        <Button 
          title="Continue" 
          onPress={() => {
            router.push('/training-frequency');
          }}
        />
      </View>
    </Animated.View>
  );
} 