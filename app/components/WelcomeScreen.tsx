import { View, Text, Image, Pressable, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from './Button';
import { useState } from 'react';
import React from 'react';
import authService from '../services/auth';

export default function WelcomeScreen() {
  const router = useRouter();
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = () => {
    router.push('/intro');
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    setIsLoading(true);
    try {
      // Try to sign in directly instead of checking email first
      const user = await authService.signInWithEmail(email, password);
      if (user) {
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        Alert.alert(
          'Account Not Found',
          'No account found with this email. Would you like to create one?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Get Started', 
              onPress: () => {
                setEmail('');
                setPassword('');
                setShowSignIn(false);
              }
            }
          ]
        );
      } else if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Invalid password. Please try again.');
      } else {
        Alert.alert(
          'Error',
          error.message || 'Failed to sign in. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          Ready to become professional?
        </Text>

        <Text style={{
          fontSize: 18,
          color: '#000000',
          opacity: 0.8,
          textAlign: 'center',
        }}>
          Prevent, Perform, and Excel.
        </Text>

        {!showSignIn ? (
          <>
            <Button 
              title="Get Started" 
              onPress={handleGetStarted}
              buttonStyle={{
                backgroundColor: '#007AFF',
                marginBottom: 32,
              }}
            />

            <View style={{ alignItems: 'center', gap: 12 }}>
              <Text style={{
                fontSize: 14,
                color: '#666666',
              }}>
                Already have an account?
              </Text>
              <Pressable
                onPress={() => setShowSignIn(true)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{
                  fontSize: 16,
                  color: '#007AFF',
                  fontWeight: '600',
                }}>
                  Sign In
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={{ width: '100%', gap: 16 }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                width: '100%',
                height: 50,
                borderWidth: 1,
                borderColor: '#E5E5E5',
                borderRadius: 12,
                paddingHorizontal: 16,
                fontSize: 16,
              }}
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              style={{
                width: '100%',
                height: 50,
                borderWidth: 1,
                borderColor: '#E5E5E5',
                borderRadius: 12,
                paddingHorizontal: 16,
                fontSize: 16,
              }}
            />

            <Button 
              title={isLoading ? "Signing In..." : "Sign In"}
              onPress={handleSignIn}
              disabled={isLoading}
              buttonStyle={{
                backgroundColor: '#007AFF',
                marginBottom: 16,
                opacity: isLoading ? 0.5 : 1,
              }}
            />

            <Pressable
              onPress={() => setShowSignIn(false)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                alignItems: 'center',
              })}
            >
              <Text style={{
                fontSize: 14,
                color: '#666666',
              }}>
                Back to sign up
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );
} 