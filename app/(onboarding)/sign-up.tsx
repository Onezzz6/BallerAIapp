import React from 'react';
import { View, Text, TextInput, Alert, StyleSheet, Pressable, Platform, Image, Keyboard, TouchableWithoutFeedback, SafeAreaView, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import authService from '../services/auth';
import { useOnboarding } from '../context/OnboardingContext';
import * as AppleAuthentication from 'expo-apple-authentication';
import Button from '../components/Button';
import analyticsService from '../services/analytics';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { runPostLoginSequence, markAuthenticationComplete } from './paywall';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { usePathname } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { useHaptics } from '../utils/haptics';

export default function SignUpScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const haptics = useHaptics();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isGoogleAvailable, setIsGoogleAvailable] = useState(false);
  const { onboardingData, clearOnboardingData } = useOnboarding();

  // Check if Apple authentication is available on this device
  useEffect(() => {
    const checkAppleAuth = async () => {
      const available = await AppleAuthentication.isAvailableAsync();
      setIsAppleAvailable(available);
    };
    checkAppleAuth();
  }, []);

  // Configure Google Sign In
  useEffect(() => {
    const configureGoogleSignIn = async () => {
      try {
        const webClientId = Constants.expoConfig?.extra?.googleWebClientId;
        console.log('🔍 Google Web Client ID:', webClientId ? 'Found' : 'Missing');
        
        if (webClientId) {
          await GoogleSignin.configure({
            webClientId: webClientId,
          });
          setIsGoogleAvailable(true);
          console.log('✅ Google Sign In configured successfully');
        } else {
          console.log('❌ Google Web Client ID not found');
        }
      } catch (error) {
        console.error('❌ Google Sign In configuration error:', error);
        setIsGoogleAvailable(false);
      }
    };
    configureGoogleSignIn();
  }, []);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleEmailSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    haptics.light();
    
    try {
      // Create new Firebase account directly  
      const user = await authService.signUpWithEmail(email, password, onboardingData as any);
      if (user) {
        await analyticsService.logEvent('A0_34_signed_up');
        
        // Mark authentication as complete after successful sign-up
        markAuthenticationComplete();
        
        // Clear onboarding data from AsyncStorage
        clearOnboardingData();
        
        // Run the definitive post-login sequence with current path and referral data
        await runPostLoginSequence(
          user.uid,
          () => router.replace('/(tabs)/home'),
          () => router.replace('/(onboarding)/one-time-offer'),
          pathname,
          // Pass referral code data for paywall selection
          {
            referralCode: onboardingData.referralCode,
            referralDiscount: onboardingData.referralDiscount,
            referralInfluencer: onboardingData.referralInfluencer,
            referralPaywallType: onboardingData.referralPaywallType
          }
        );
      }
    } catch (error: any) {
      console.error('Error during email sign up:', error);
      Alert.alert('Sign Up Error', error.message || 'An error occurred during sign up');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    if (!isAppleAvailable) {
      Alert.alert('Error', 'Apple Sign In is not available on this device');
      return;
    }

    setIsLoading(true);
    haptics.light();
    
    try {
      const result = await authService.signUpWithApple(onboardingData as any);
      if (result && result.user) {
        await analyticsService.logEvent('A0_34_signed_up_apple');
        
        // Mark authentication as complete after successful sign-up
        markAuthenticationComplete();
        
        // Clear onboarding data from AsyncStorage
        clearOnboardingData();
        
        // Run the definitive post-login sequence with current path and referral data
        await runPostLoginSequence(
          result.user.uid,
          () => router.replace('/(tabs)/home'),
          () => router.replace('/(onboarding)/one-time-offer'),
          pathname,
          // Pass referral code data for paywall selection
          {
            referralCode: onboardingData.referralCode,
            referralDiscount: onboardingData.referralDiscount,
            referralInfluencer: onboardingData.referralInfluencer,
            referralPaywallType: onboardingData.referralPaywallType
          }
        );
      }
    } catch (error: any) {
      console.error('Error during Apple sign up:', error);
      Alert.alert('Sign Up Error', error.message || 'An error occurred during sign up');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!isGoogleAvailable) {
      Alert.alert('Error', 'Google Sign In is not configured');
      return;
    }

    setIsLoading(true);
    haptics.light();
    
    try {
      // Sign in with Google
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      if (userInfo.data?.idToken) {
        // Create Firebase credential from Google token
        const googleCredential = GoogleAuthProvider.credential(userInfo.data.idToken);
        const userCredential = await signInWithCredential(auth, googleCredential);
        
        if (userCredential.user) {
          // Create user document in Firestore with onboarding data
          const userData = {
            email: userCredential.user.email,
            createdAt: new Date(),
            lastLoginAt: new Date(),
            signUpMethod: 'google',
            ...onboardingData,
            username: onboardingData.username || userCredential.user.displayName || 'User',
          };

          const userRef = doc(db, 'users', userCredential.user.uid);
          await setDoc(userRef, userData);

          await analyticsService.logEvent('A0_34_signed_up_google');
          
          // Mark authentication as complete after successful sign-up
          markAuthenticationComplete();
          
          // Clear onboarding data from AsyncStorage
          clearOnboardingData();
          
          // Run the definitive post-login sequence with current path and referral data
          await runPostLoginSequence(
            userCredential.user.uid,
            () => router.replace('/(tabs)/home'),
            () => router.replace('/(onboarding)/one-time-offer'),
            pathname,
            // Pass referral code data for paywall selection
            {
              referralCode: onboardingData.referralCode,
              referralDiscount: onboardingData.referralDiscount,
              referralInfluencer: onboardingData.referralInfluencer,
              referralPaywallType: onboardingData.referralPaywallType
            }
          );
        }
      }
    } catch (error: any) {
      console.error('Error during Google sign up:', error);
      Alert.alert('Sign Up Error', error.message || 'An error occurred during Google sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <SafeAreaView style={styles.container}>
          <Animated.View 
            entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
            style={styles.content}
          >
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <Image
                source={require('../../assets/images/BallerAILogo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>Create Your Account</Text>
            </View>

            {/* Email and Password Form */}
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.lightGray}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.lightGray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Continue Button */}
            <Button
              title={isLoading ? "Creating..." : "Continue"}
              onPress={handleEmailSignUp}
              disabled={isLoading || !email || !password}
              containerStyle={styles.continueButton}
            />

            {/* Social Sign In Buttons */}
            <View style={styles.socialButtonsContainer}>
              {/* Apple Sign In */}
              {isAppleAvailable && (
                <View style={{ opacity: isLoading ? 0.5 : 1, marginBottom: spacing.md }}>
                  {isLoading ? (
                    <View
                      style={{
                        height: 56,
                        width: '100%',
                        backgroundColor: colors.black,
                        borderRadius: 28,
                      }}
                    />
                  ) : (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={28}
                      style={{
                        height: 56,
                        width: '100%',
                      }}
                      onPress={handleAppleSignUp}
                    />
                  )}
                </View>
              )}
              
              {/* Google Sign In */}
              {isGoogleAvailable && (
                <Pressable 
                  style={{
                    height: 56,
                    width: '100%',
                    borderRadius: 28,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 16,
                    backgroundColor: colors.white,
                    borderWidth: 1,
                    borderColor: colors.borderColor,
                    opacity: isLoading ? 0.5 : 1,
                  }}
                  onPress={handleGoogleSignUp}
                  disabled={isLoading}
                >
                  <Image 
                    source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                    style={{ width: 24, height: 24, marginRight: 12 }}
                  />
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.black,
                  }}>
                    Continue with Google
                  </Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundColor,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: spacing.xxxl * 2,
    marginBottom: spacing.xl * 2,
  },
  logo: {
    width: 120,
    height: 120,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.black,
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 4,
    fontSize: 16,
    color: colors.black,
    backgroundColor: colors.inputBackground,
    marginBottom: spacing.md,
  },
  continueButton: {
    marginBottom: spacing.lg,
  },
  socialButtonsContainer: {
    marginTop: spacing.md,
  },
  termsText: {
    fontSize: 12,
    color: colors.mediumGray,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: spacing.md,
  },
}); 