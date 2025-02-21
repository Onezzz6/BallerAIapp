import { View, Text, TextInput, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import authService from '../../app/services/auth';
import { useOnboarding } from '../../app/context/OnboardingContext';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { onboardingData, clearOnboardingData } = useOnboarding();

  const handleSignUp = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await authService.signUpWithEmail(email, password, onboardingData);
      await clearOnboardingData();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await authService.signInWithGoogle();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 24,
      }}
    >
      <View style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
      }}>
        <Image 
          source={require('../../assets/images/BallerAILogo.png')}
          style={{
            width: 60,
            height: 60,
            marginBottom: 16,
          }}
          resizeMode="contain"
        />
        <Text style={{
          fontSize: 24,
          color: '#000000',
          marginBottom: 8,
        }}>
          Welcome to
        </Text>
        <Text style={{
          fontSize: 36,
          color: '#000000',
          fontWeight: '600',
          marginBottom: 60,
        }}>
          BallerAI
        </Text>
      </View>

      <View style={{
        flex: 2,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        marginHorizontal: -24,
      }}>
        <Text style={{
          fontSize: 20,
          color: '#000000',
          marginBottom: 16,
        }}>
          Email Address
        </Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: '#E5E5E5',
          borderRadius: 100,
          paddingHorizontal: 16,
          marginBottom: 24,
        }}>
          <Ionicons name="mail-outline" size={24} color="#666666" />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email..."
            style={{
              flex: 1,
              paddingVertical: 12,
              marginLeft: 8,
              fontSize: 16,
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={{
          fontSize: 20,
          color: '#000000',
          marginBottom: 16,
        }}>
          Password
        </Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: '#E5E5E5',
          borderRadius: 100,
          paddingHorizontal: 16,
          marginBottom: 32,
        }}>
          <Ionicons name="lock-closed-outline" size={24} color="#666666" />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password..."
            secureTextEntry={!showPassword}
            style={{
              flex: 1,
              paddingVertical: 12,
              marginLeft: 8,
              fontSize: 16,
            }}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)}>
            <Ionicons 
              name={showPassword ? "eye-outline" : "eye-off-outline"} 
              size={24} 
              color="#666666" 
            />
          </Pressable>
        </View>

        <Button 
          title="Sign Up" 
          onPress={handleSignUp}
          buttonStyle={{
            backgroundColor: '#99E86C',
            marginBottom: 24,
          }}
        />

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 24,
        }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E5E5E5' }} />
          <Text style={{ marginHorizontal: 16, color: '#666666' }}>Or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E5E5E5' }} />
        </View>

        <Pressable
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            borderWidth: 2,
            borderColor: '#E5E5E5',
            borderRadius: 100,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Image 
            source={require('../../assets/images/google-icon.png')}
            style={{ width: 24, height: 24, marginRight: 8 }}
          />
          <Text style={{
            fontSize: 16,
            color: '#000000',
          }}>
            Continue with Google
          </Text>
        </Pressable>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          marginTop: 24,
        }}>
          <Text style={{ color: '#666666' }}>
            Already have an account?{' '}
          </Text>
          <Pressable onPress={() => router.push('/sign-in')}>
            <Text style={{ color: '#4169E1', fontWeight: '600' }}>
              Sign In
            </Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
} 