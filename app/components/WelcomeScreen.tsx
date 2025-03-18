import { View, Text, Image, Pressable, TextInput, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from './Button';
import { useState, useEffect } from 'react';
import React from 'react';
import authService from '../services/auth';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';

// Default empty onboarding data
const defaultOnboardingData = {
  hasSmartwatch: null,
  footballGoal: null,
  improvementFocus: null,
  trainingFrequency: null,
  hasGymAccess: null,
  motivation: null,
};

export default function WelcomeScreen() {
  const router = useRouter();
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  // Check if Apple authentication is available on this device
  useEffect(() => {
    const checkAppleAuthAvailability = async () => {
      try {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        setIsAppleAvailable(isAvailable);
      } catch (error) {
        console.error('Error checking Apple Authentication availability:', error);
        setIsAppleAvailable(false);
      }
    };
    
    checkAppleAuthAvailability();
  }, []);

  const handleGetStarted = () => {
    router.push('/intro');
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
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
      } else if (
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-email' ||
        error.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Invalid email or password. Please try again.');
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

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      console.log("Starting Apple Sign-In process...");
      
      // Check if a user with this Apple ID exists without creating one
      const { exists, user } = await authService.checkAppleSignIn();
      console.log(`Apple Sign-In check result: exists=${exists}, user=${user ? 'present' : 'null'}`);
      
      // Add explicit check to make sure we have both exists=true AND a valid user object
      if (exists && user && user.uid) {
        console.log(`Valid user found with UID: ${user.uid}`);
        
        // Use the verification method that includes auto sign-out for invalid users
        const isValidUser = await authService.verifyCompleteUserAccount(user.uid);
        console.log(`User verification result: ${isValidUser ? 'VALID' : 'INVALID'}`);
        
        if (isValidUser) {
          console.log("User has valid document with complete onboarding data - navigating to home");
          // Only navigate if we have a confirmed valid user
          router.replace('/(tabs)/home');
          return;
        } else {
          console.log("User validation failed - showing no account alert");
          showNoAccountAlert();
          return;
        }
      } else {
        console.log("No valid user found with Apple ID");
        // No user exists or user doesn't have proper account
        showNoAccountAlert();
      }
    } catch (error: any) {
      // Don't show error if user cancels
      if (error.code !== 'ERR_CANCELED') {
        console.error('Apple sign in error:', error);
        Alert.alert(
          'Error',
          error.message || 'Failed to sign in with Apple. Please try again.'
        );
      } else {
        console.log("User canceled Apple Sign-In");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to show account not found alert
  const showNoAccountAlert = () => {
    Alert.alert(
      'Account Not Found',
      'No account found with this login method. Would you like to create one?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Get Started', 
          onPress: () => {
            // Reset form and stay on welcome screen (match email behavior)
            setEmail('');
            setPassword('');
            setShowSignIn(false);
          }
        }
      ]
    );
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
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
              marginBottom: 0,
            }}
          />
          
          <Text style={{
            fontSize: 32,
            color: '#000000',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: 0,
          }}>
            Ready to go pro?
          </Text>

          {!showSignIn ? (
            <>
              <Button 
                title="Get Started" 
                onPress={handleGetStarted}
                buttonStyle={{
                  backgroundColor: '#4064F6',
                  marginBottom: 16,
                }}
              />

              <View style={{alignItems: 'center', gap: 12, marginTop: 32 }}>
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
                    color: '#4064F6',
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

              <View style={{ position: 'relative' }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  style={{
                    width: '100%',
                    height: 50,
                    borderWidth: 1,
                    borderColor: '#E5E5E5',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingRight: 50,
                    fontSize: 16,
                  }}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                  }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#666666"
                  />
                </Pressable>
              </View>

              <Button 
                title={isLoading ? "Signing In..." : "Sign In"}
                onPress={handleSignIn}
                disabled={isLoading}
                buttonStyle={{
                  backgroundColor: '#4064F6',
                  marginBottom: 16,
                  opacity: isLoading ? 0.5 : 1,
                }}
              />

              {isAppleAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={12}
                  style={{
                    width: '100%',
                    height: 50,
                    marginBottom: 16,
                  }}
                  onPress={handleAppleSignIn}
                />
              )}

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
                  Back
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
} 