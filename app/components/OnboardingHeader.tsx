import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import BackButton from './BackButton';

type Props = {
  currentStep: number;
  totalSteps: number;
}

export default function OnboardingHeader({ currentStep, totalSteps }: Props) {
  const router = useRouter();
  // We have 20 total steps in the onboarding flow
  const TOTAL_ONBOARDING_STEPS = 20;
  const progress = (currentStep / TOTAL_ONBOARDING_STEPS) * 100;

  return (
    <View style={{ 
      paddingTop: 48,
      paddingHorizontal: 24,
      backgroundColor: '#ffffff',
    }}>
      {/* Header with Logo */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48, // Fixed height for consistency
      }}>
        <BackButton />
        
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginLeft: 'auto',
        }}>
          <Image 
            source={require('../../assets/images/BallerAILogo.png')}
            style={{
              width: 24,
              height: 24,
            }}
            resizeMode="contain"
          />
          <Text style={{
            fontSize: 20,
            fontWeight: '600',
            color: '#000000',
          }}>
            BallerAI
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={{
        width: '100%',
        height: 4,
        backgroundColor: '#E5E5E5',
        borderRadius: 2,
        marginTop: 24,
      }}>
        <View style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: '#007AFF',
          borderRadius: 2,
        }} />
      </View>
    </View>
  );
} 