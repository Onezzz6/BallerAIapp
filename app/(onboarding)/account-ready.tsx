import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
                
export default function AccountReadyScreen() {
  const router = useRouter();

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
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

        <Text style={{
          fontSize: 28,
          color: '#000000',
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: 20,
        }}>
          Your Personalized account is ready!
        </Text>

        <Text style={{
          fontSize: 18,
          color: '#666666',
          textAlign: 'center',
        }}>
          Remember the more you use the app, the better it will get!
        </Text>

        <Button 
          title="Take the first step to becoming a pro!" 
          onPress={() => {
            router.push('/sign-up');
          }}
        />
      </View>
    </Animated.View>
  );
} 