import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from './Button';
import analytics from '@react-native-firebase/analytics';

export default function AnalysisCompleteScreen() {
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
        gap: 32,
      }}>
        <Image
          source={require('../../assets/images/mascot.png')}
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
          Great job!
        </Text>

        <Text style={{
          fontSize: 18,
          color: '#666666',
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 20,
        }}>
          You're getting closer to your goals!
        </Text>

        <Button 
          title="Let's Continue" 
          onPress={async () => {
            await analytics().logEvent('onboarding_analysis_complete_continue');
            router.push('/fitness-level');
          }}
        />
      </View>
    </Animated.View>
  );
} 