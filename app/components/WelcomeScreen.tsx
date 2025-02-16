import { View, Text, Image } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function WelcomeScreen() {
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
          source={require('../../assets/images/BallerAILogo.png')}
          style={{
            width: 120,
            height: 120,
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
          Ready to start your journey to becoming professional?
        </Text>

        <Text style={{
          fontSize: 18,
          color: '#000000',
          opacity: 0.8,
          textAlign: 'center',
        }}>
          Prevent, Perform, and Excel.
        </Text>
      </View>
    </Animated.View>
  );
} 