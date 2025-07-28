import React from 'react';
import { View, Text, TextInput, Alert, StyleSheet, Pressable, Platform, Image, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import authService from '../services/auth';
import { useOnboarding } from '../context/OnboardingContext';
import * as AppleAuthentication from 'expo-apple-authentication';
import CustomButton from '../components/CustomButton';
import analyticsService from '../services/analytics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';
import ScrollIfNeeded from '../components/ScrollIfNeeded';
import BackButton from '../components/BackButton';
import Purchases from 'react-native-purchases';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isGoogleAvailable, setIsGoogleAvailable] = useState(false);
  const { onboardingData, clearOnboardingData } = useOnboarding();

  // Check if social authentication methods are available on this device
  useEffect(() => {
    const checkSocialAuthAvailability = async () => {
      const appleAvailable = await AppleAuthentication.isAvailableAsync();
      setIsAppleAvailable(appleAvailable);
      
      // Configure Google Sign In
      try {
        const webClientId = Constants.expoConfig?.extra?.googleWebClientId;
        if (webClientId) {
          GoogleSignin.configure({
            webClientId: webClientId,
          });
          setIsGoogleAvailable(true);
          console.log('Google Sign In configured successfully');
        } else {
          console.log('Google Web Client ID not found');
          setIsGoogleAvailable(false);
        }
      } catch (error) {
        console.error('Error configuring Google Sign In:', error);
        setIsGoogleAvailable(false);
      }
    };
    
    checkSocialAuthAvailability();
  }, []);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Creating new account with email/password after paywall purchase');
      console.log('Email:', email);
      
      // Create Firebase Auth account with email/password and onboarding data
      const newUserCredential = await authService.signUpWithEmail(email, password, onboardingData as any);
      
      if (newUserCredential) {
        console.log('✅ New Firebase account created:', newUserCredential.uid);
        
        // Transfer RevenueCat subscription from device ID to user account
        try {
          console.log('Transferring RevenueCat subscription from device to user account...');
          await Purchases.logIn(newUserCredential.uid);
          console.log('✅ RevenueCat subscription transferred successfully');
        } catch (rcError) {
          console.error('❌ RevenueCat transfer error (non-critical):', rcError);
          // Continue even if RevenueCat transfer fails
        }
        
        // Clear onboarding data from AsyncStorage since account is created
        try {
          await clearOnboardingData();
          console.log('✅ Onboarding data cleared from AsyncStorage');
        } catch (clearError) {
          console.error('Error clearing onboarding data (non-critical):', clearError);
        }
        
        await analyticsService.logEvent('AA__32_signed_up_after_paywall_new_flow');
        console.log('✅ Account creation complete! Navigating to home...');
        router.replace('/(tabs)/home');
        return;
      } else {
        throw new Error('Failed to create user account');
      }
      
    } catch (error: any) {
      console.error('Error creating account:', error);
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters long.';
      }
      
      Alert.alert('Sign Up Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!isGoogleAvailable) {
      Alert.alert('Error', 'Google Sign In is not available on this device.');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Starting Google Sign Up after paywall...');
      
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      
      if (userInfo.data?.idToken) {
        const googleCredential = GoogleAuthProvider.credential(userInfo.data.idToken);
        const userCredential = await signInWithCredential(auth, googleCredential);
        
        // Create user document with onboarding data - use the existing sign in method then update with onboarding data
        const existingUser = await authService.signInWithGoogle();
        
        if (existingUser) {
          console.log('✅ Google account created:', existingUser.uid);
          
          // Transfer RevenueCat subscription
          try {
            await Purchases.logIn(existingUser.uid);
            console.log('✅ RevenueCat subscription transferred to Google account');
          } catch (rcError) {
            console.error('❌ RevenueCat transfer error (non-critical):', rcError);
          }
          
          // Clear onboarding data
          try {
            await clearOnboardingData();
            console.log('✅ Onboarding data cleared');
          } catch (clearError) {
            console.error('Error clearing onboarding data (non-critical):', clearError);
          }
          
          await analyticsService.logEvent('AA__32_google_sign_up_after_paywall');
          router.replace('/(tabs)/home');
        }
      }
    } catch (error: any) {
      console.error('Google Sign Up error:', error);
      
      if (error.code === 'auth/account-exists-with-different-credential') {
        Alert.alert('Account Exists', 'An account already exists with this email address.');
      } else {
        Alert.alert('Sign Up Failed', 'Failed to sign up with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    if (!isAppleAvailable) {
      Alert.alert('Error', 'Apple Sign In is not available on this device.');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Starting Apple Sign Up after paywall...');
      
      const appleAuthResult = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const newUserResult = await authService.signUpWithApple(onboardingData as any);
      
      if (newUserResult && newUserResult.user) {
        console.log('✅ Apple account created:', newUserResult.user.uid);
        
        // Transfer RevenueCat subscription
        try {
          await Purchases.logIn(newUserResult.user.uid);
          console.log('✅ RevenueCat subscription transferred to Apple account');
        } catch (rcError) {
          console.error('❌ RevenueCat transfer error (non-critical):', rcError);
        }
        
        // Clear onboarding data
        try {
          await clearOnboardingData();
          console.log('✅ Onboarding data cleared');
        } catch (clearError) {
          console.error('Error clearing onboarding data (non-critical):', clearError);
        }
        
        await analyticsService.logEvent('AA__32_apple_sign_up_after_paywall');
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      console.error('Apple Sign Up error:', error);
      
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('User canceled Apple Sign In');
        return;
      }
      
      Alert.alert('Sign Up Failed', 'Failed to sign up with Apple. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollIfNeeded style={styles.container}>
        <BackButton />
        
        <Animated.View entering={FadeIn.duration(600)} style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>Complete your BallerAI journey</Text>
          </View>

          {/* Email/Password Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password (min. 6 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#666" 
                />
              </Pressable>
            </View>
          </View>

          {/* Create Account Button */}
          <CustomButton
            title={isLoading ? "Creating Account..." : "Create Account"}
            onPress={handleSubmit}
            disabled={isLoading}
            containerStyle={styles.buttonContainer}
          />

          {/* Social Sign Up Options */}
          {(isAppleAvailable || isGoogleAvailable) && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtons}>
                {isAppleAvailable && (
                  <Pressable 
                    style={styles.socialButton} 
                    onPress={handleAppleSignUp}
                    disabled={isLoading}
                  >
                    <Text style={styles.socialButtonText}>Continue with Apple</Text>
                  </Pressable>
                )}

                {isGoogleAvailable && (
                  <Pressable 
                    style={styles.socialButton} 
                    onPress={handleGoogleSignUp}
                    disabled={isLoading}
                  >
                    <Text style={styles.socialButtonText}>Continue with Google</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </Animated.View>
      </ScrollIfNeeded>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  eyeIcon: {
    padding: 8,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#666666',
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
}); 