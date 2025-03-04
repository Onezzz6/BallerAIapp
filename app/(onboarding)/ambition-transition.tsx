import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import BackButton from '../components/BackButton';

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
 
      {/* Mascot */}
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
          resizeMode="contain"
        />
 
        <Text style={{
          fontSize: 28,
          color: '#000000',
          fontWeight: '600',
          textAlign: 'center',
        }}>
          Great! You clearly show ambition!
        </Text>

        <Text style={{
          fontSize: 18,
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
            backgroundColor: '#4064F6',
          }}
        />
      </View>
    </Animated.View>
  );
} 