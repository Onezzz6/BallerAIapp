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
      }}
    >
      {/* Header with Back Button and Logo */}
      <View style={{
        paddingTop: 48,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <BackButton />
        
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
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

      {/* Mascot */}
      <View style={{
        alignItems: 'center',
        marginTop: 20,
      }}>
        <Image 
          source={require('../../assets/images/mascot.png')}
          style={{
            width: 120,
            height: 120,
          }}
          resizeMode="contain"
        />
      </View>

      <View style={{
        flex: 1,
        paddingHorizontal: 24,
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
          Great you clearly show ambition!
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