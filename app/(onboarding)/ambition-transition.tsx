import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';

export default function AmbitionTransitionScreen() {
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
      <OnboardingHeader 
        currentStep={4}
        totalSteps={7}
      />
      
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 32,
      }}>
        <Text style={{
          fontSize: 28,
          color: '#000000',
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: 20,
        }}>
          Great! You clearly show great ambition - this is very important in achieving your goals!
        </Text>

        <Text style={{
          fontSize: 20,
          color: '#666666',
          textAlign: 'center',
        }}>
          Last few questions to understand your current situation!
        </Text>

        <Button 
          title="Continue" 
          onPress={() => {
            router.push('/training-frequency');
          }}
          buttonStyle={{
            backgroundColor: '#007AFF',
          }}
        />
      </View>
    </Animated.View>
  );
} 