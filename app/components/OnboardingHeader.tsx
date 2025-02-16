import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import BackButton from './BackButton';

type Props = {
  currentStep: number;
  totalSteps: number;
}

export default function OnboardingHeader({ currentStep, totalSteps }: Props) {
  return (
    <View style={{
      paddingTop: 48,
      paddingHorizontal: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
  );
} 