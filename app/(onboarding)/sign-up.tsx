import React from 'react';
import { View, Text, TextInput, Alert, StyleSheet, Pressable, Platform, Image, Keyboard, TouchableWithoutFeedback, SafeAreaView, KeyboardAvoidingView, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import authService from '../../services/auth';
import { useOnboarding } from '../../context/OnboardingContext';
import * as AppleAuthentication from 'expo-apple-authentication';
import Button from '../components/Button';
import analyticsService from '../../services/analytics';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import auth from '@react-native-firebase/auth';
import { db } from '../../config/firebase';
import { runPostLoginSequence, markAuthenticationComplete } from './paywall';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { usePathname } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';
import { useHaptics } from '../../utils/haptics';

// Get screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
      const user = await authService.signUpWithApple(onboardingData as any);
      if (user) {
        await analyticsService.logEvent('A0_34_signed_up_apple');
        
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
        const googleCredential = auth.GoogleAuthProvider.credential(userInfo.data.idToken);
        const userCredential = await auth().signInWithCredential(googleCredential);
        
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

          const userRef = db.collection('users').doc(userCredential.user.uid);
          await userRef.set(userData);

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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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
                <Text style={styles.title} allowFontScaling={false}>Create Your Account</Text>
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
                  <View style={styles.socialButtonWrapper}>
                    {isLoading ? (
                      <View style={styles.socialButtonPlaceholder} />
                    ) : (
                      <View style={styles.appleButtonContainer}>
                        <AppleAuthentication.AppleAuthenticationButton
                          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                          cornerRadius={28}
                          style={styles.appleButton}
                          onPress={handleAppleSignUp}
                        />
                      </View>
                    )}
                  </View>
                )}
                
                {/* Google Sign In */}
                {isGoogleAvailable && (
                  <Pressable 
                    style={[styles.googleButton, { opacity: isLoading ? 0.5 : 1 }]}
                    onPress={handleGoogleSignUp}
                    disabled={isLoading}
                  >
                    <Image 
                      source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                      style={styles.googleIcon}
                    />
                    <Text style={styles.googleButtonText}>
                      Continue with Google
                    </Text>
                  </Pressable>
                )}
              </View>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundColor,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: screenHeight - 100, // Ensure content takes full height minus safe areas
  },
  content: {
    flex: 1,
    paddingHorizontal: Math.max(spacing.lg, screenWidth * 0.05), // Responsive horizontal padding
    paddingBottom: spacing.lg,
    justifyContent: 'center', // Center content vertically
  },
  logoSection: {
    alignItems: 'center',
    marginTop: Math.max(spacing.xl, screenHeight * 0.08), // Responsive top margin
    marginBottom: Math.max(spacing.xl, screenHeight * 0.05), // Responsive bottom margin
  },
  logo: {
    width: Math.min(120, screenWidth * 0.3), // Responsive logo size
    height: Math.min(120, screenWidth * 0.3),
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: Math.max(spacing.lg, screenHeight * 0.04), // Responsive margin
  },
  title: {
    fontSize: Math.min(28, screenWidth * 0.08), // Responsive font size
    fontWeight: 'bold',
    color: colors.black,
    textAlign: 'center',
  },
  form: {
    marginBottom: Math.max(spacing.lg, screenHeight * 0.03), // Responsive margin
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md + 4 : spacing.md + 2, // Platform-specific padding
    fontSize: 16,
    color: colors.black,
    backgroundColor: colors.inputBackground,
    marginBottom: spacing.md,
    minHeight: 50, // Ensure minimum touch target
  },
  continueButton: {
    marginBottom: Math.max(spacing.lg, screenHeight * 0.025), // Responsive margin
  },
  socialButtonsContainer: {
    marginTop: spacing.md,
    paddingBottom: spacing.xl, // Extra bottom padding for scrolling
  },
  socialButtonWrapper: {
    opacity: 1,
    marginBottom: spacing.md,
  },
  socialButtonPlaceholder: {
    width: '100%',
    height: 54, // Exact same total height as Button component
    backgroundColor: colors.black,
    borderRadius: 28, // Match Button component
    justifyContent: 'center',
    alignItems: 'center',
  },
  appleButtonContainer: {
    width: '100%',
    height: 54, // Exact same total height as Button component (16+22+16)
    borderRadius: 28, // Match Button component
    overflow: 'hidden', // Ensure rounded corners
  },
  appleButton: {
    width: '100%',
    height: 54, // Fill the container completely
  },
  googleButton: {
    padding: 16, // Match Button component
    width: '100%',
    height: 54, // Exact same total height as Button component
    borderRadius: 28, // Match Button component
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  googleIcon: {
    width: 20, // Slightly smaller to match proportions
    height: 20,
    marginRight: 8, // Reduced spacing to fit better with padding: 16
  },
  googleButtonText: {
    fontSize: 18, // Match Button component
    fontWeight: '600', // Match Button component
    color: colors.black,
    textAlign: 'center',
  },
  termsText: {
    fontSize: 12,
    color: colors.mediumGray,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: spacing.md,
  },
}); 