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
import firestore from '@react-native-firebase/firestore';
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
  const { onboardingData, clearOnboardingData, getInitialXpData } = useOnboarding();

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
        console.log('🔧 [GOOGLE_CONFIG] Starting Google Sign-In configuration...');
        console.log('🔧 [GOOGLE_CONFIG] Platform:', Platform.OS);
        console.log('🔧 [GOOGLE_CONFIG] Constants.expoConfig available:', !!Constants.expoConfig);
        console.log('🔧 [GOOGLE_CONFIG] Constants.expoConfig.extra available:', !!Constants.expoConfig?.extra);
        
                // Use Web Client ID from environment configuration
        const webClientId = Constants.expoConfig?.extra?.googleWebClientId;
        console.log('🔧 [GOOGLE_CONFIG] Google Web Client ID Found in Config:', !!Constants.expoConfig?.extra?.googleWebClientId);
        console.log('🔧 [GOOGLE_CONFIG] Using Web Client ID:', webClientId ? `${webClientId.substring(0, 20)}...` : 'MISSING');

        // Configure Google Sign-In with proper Web Client ID
        console.log('🔧 [GOOGLE_CONFIG] Calling GoogleSignin.configure with Web Client ID...');
        await GoogleSignin.configure({
          webClientId: webClientId,
          offlineAccess: true,
        });
        console.log('🔧 [GOOGLE_CONFIG] GoogleSignin.configure completed successfully');
        
        // Test if GoogleSignin is properly configured
        const currentUser = await GoogleSignin.getCurrentUser();
        console.log('🔧 [GOOGLE_CONFIG] Current user:', !!currentUser);
        
        setIsGoogleAvailable(true);
        console.log('✅ [GOOGLE_CONFIG] Google Sign In configured successfully with Web Client ID');
      } catch (error) {
        console.error('❌ [GOOGLE_CONFIG] Google Sign In configuration error:', error);
        console.error('❌ [GOOGLE_CONFIG] Error details:', JSON.stringify(error, null, 2));
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
      // First check if user already exists by trying to get sign-in methods
      const signInMethods = await auth().fetchSignInMethodsForEmail(email);
      
      if (signInMethods && signInMethods.length > 0) {
        // Account already exists
        console.log('Account already exists with email:', email);
        haptics.error();
        
        Alert.alert(
          'Account Already Exists',
          `An account with this email already exists. Would you like to sign in to your existing account?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: async () => {
                try {
                  // User wants to sign in - attempt to sign them in with provided credentials
                  console.log('User chose to sign in to existing account with email');
                  haptics.success();
                  
                  const user = await authService.signInWithEmail(email, password);
                  if (user) {
                    // Mark authentication as complete
                    markAuthenticationComplete();
                    
                    // Run the sign-in sequence
                    await runPostLoginSequence(
                      user.uid,
                      () => router.replace('/(tabs)/home'),
                      () => router.replace('/'),
                      pathname
                    );
                  }
                } catch (signInError: any) {
                  console.error('Error signing in with existing account:', signInError);
                  haptics.error();
                  
                  if (signInError.code === 'auth/wrong-password' || 
                      signInError.code === 'auth/invalid-credential') {
                    Alert.alert('Incorrect Password', 'The password you entered is incorrect. Please try again or reset your password.');
                  } else {
                    Alert.alert('Sign In Error', signInError.message || 'Failed to sign in. Please try again.');
                  }
                }
              }
            }
          ]
        );
        return;
      }
      
      // No existing account, proceed with sign-up
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
      haptics.error();
      
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Account Already Exists',
          'An account with this email already exists. Would you like to sign in to your existing account?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: async () => {
                try {
                  // User wants to sign in - attempt to sign them in with provided credentials
                  console.log('User chose to sign in to existing account with email (from catch)');
                  haptics.success();
                  
                  const user = await authService.signInWithEmail(email, password);
                  if (user) {
                    // Mark authentication as complete
                    markAuthenticationComplete();
                    
                    // Run the sign-in sequence
                    await runPostLoginSequence(
                      user.uid,
                      () => router.replace('/(tabs)/home'),
                      () => router.replace('/'),
                      pathname
                    );
                  }
                } catch (signInError: any) {
                  console.error('Error signing in with existing account:', signInError);
                  haptics.error();
                  
                  if (signInError.code === 'auth/wrong-password' || 
                      signInError.code === 'auth/invalid-credential') {
                    Alert.alert('Incorrect Password', 'The password you entered is incorrect. Please try again or reset your password.');
                  } else {
                    Alert.alert('Sign In Error', signInError.message || 'Failed to sign in. Please try again.');
                  }
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Sign Up Error', error.message || 'An error occurred during sign up');
      }
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
      // First do Apple authentication to get user info
      console.log('🍎 Starting Apple authentication...');
      const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, email, fullName } = appleAuthRequestResponse;
      
      if (!identityToken) {
        throw new Error('No identity token received from Apple');
      }

      // Create Firebase credential and sign in
      console.log('Creating Firebase credential and checking for existing account...');
      const appleCredential = auth.AppleAuthProvider.credential(identityToken);
      const result = await auth().signInWithCredential(appleCredential);
      
      if (result.user) {
        // Check if user document exists in Firestore (this is the reliable way to detect existing accounts)
        console.log('Checking if Firestore user document exists for user:', result.user.uid);
        const userDoc = await db.collection('users').doc(result.user.uid).get();
        
        if (userDoc.exists && userDoc.data()) {
          // Account already exists - ask if they want to sign in to existing account
          console.log('Existing account found with user document - asking user if they want to sign in');
          
          haptics.error();
          Alert.alert(
            'Account Already Exists',
            `You already have an account with this Apple ID. Would you like to sign in to your existing account?`,
            [
              { 
                text: 'Cancel', 
                style: 'cancel',
                onPress: async () => {
                  // User wants to cancel - sign them out and stay on sign-up screen
                  await auth().signOut();
                }
              },
              { 
                text: 'Sign In', 
                onPress: async () => {
                  // User wants to sign in - proceed with existing account login
                  console.log('User chose to sign in to existing account');
                  haptics.success();
                  
                  // Mark authentication as complete
                  markAuthenticationComplete();
                  
                  // Run the sign-in sequence with their existing account
                  await runPostLoginSequence(
                    result.user.uid,
                    () => router.replace('/(tabs)/home'),
                    () => router.replace('/'),
                    pathname
                  );
                }
              }
            ]
          );
          return;
        }

        // No existing user document found, proceed with new account creation
        console.log('No existing account found, proceeding with Apple sign-up');

        // Prepare user data with Apple info and onboarding data
        const xpData = getInitialXpData();
        const userData = {
          email: email || result.user.email || '',
          displayName: fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : result.user.displayName || '',
          ...onboardingData,
          ...xpData, // Add XP system fields
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastLoginAt: firestore.FieldValue.serverTimestamp(),
          isOnboardingComplete: true,
          authProvider: 'apple'
        };

        // Save user data to Firestore
        await db.collection('users').doc(result.user.uid).set(userData);
        
        console.log('✅ User data saved to Firestore');
        
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
      haptics.error();
      
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled - don't show error
        console.log('Apple sign-up cancelled by user');
      } else if (error.message?.includes('Account Already Exists') || error.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Account Already Exists',
          'An account with this Apple ID already exists. Would you like to sign in to your existing account?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => {
                // This case shouldn't happen with the new flow, but keeping for safety
                console.log('Apple account exists error - should not reach here with new flow');
                router.replace('/?openSignIn=true');
              }
            }
          ]
        );
      } else {
        Alert.alert('Sign Up Error', error.message || 'An error occurred during sign up');
      }
    } finally {
      setIsLoading(false);
    }
  };

    const handleGoogleSignUp = async () => {
    const webClientId = Constants.expoConfig?.extra?.googleWebClientId;

    console.log('🚀 [GOOGLE_SIGNUP] Starting Google Sign-Up process...');
    console.log('🚀 [GOOGLE_SIGNUP] isGoogleAvailable:', isGoogleAvailable);
    console.log('🚀 [GOOGLE_SIGNUP] Web Client ID being used:', webClientId ? `${webClientId.substring(0, 20)}...` : 'MISSING');
    console.log('🚀 [GOOGLE_SIGNUP] App Package Name:', 'com.ballerbizoy.ballerai');
    console.log('🚀 [GOOGLE_SIGNUP] Registered SHA-1s: 6E:3D:A0:33 (dev), 6A:C5:85:29 (prod), DE:D7:E9:BE (play)');
    
    if (!isGoogleAvailable) {
      console.log('❌ [GOOGLE_SIGNUP] Google Sign-In not available - showing error');
      Alert.alert('Error', 'Google Sign In is not configured');
      return;
    }

    setIsLoading(true);
    haptics.light();
    
    try {
      console.log('🔍 [GOOGLE_SIGNUP] Step 1: Checking Google Play Services...');
      // Sign in with Google to get user info
      await GoogleSignin.hasPlayServices();
      console.log('✅ [GOOGLE_SIGNUP] Google Play Services available');
      
      console.log('🔍 [GOOGLE_SIGNUP] Step 2: Initiating Google Sign-In with HARDCODED Web Client ID...');
      console.log('🔍 [GOOGLE_SIGNUP] About to call GoogleSignin.signIn()...');
      const userInfo = await GoogleSignin.signIn();
      console.log('🔍 [GOOGLE_SIGNUP] GoogleSignin.signIn() completed');
      console.log('🔍 [GOOGLE_SIGNUP] UserInfo structure:', {
        hasData: !!userInfo.data,
        hasIdToken: !!userInfo.data?.idToken,
        hasUser: !!userInfo.data?.user,
        hasEmail: !!userInfo.data?.user?.email,
        email: userInfo.data?.user?.email ? `${userInfo.data.user.email.substring(0, 5)}...` : 'MISSING'
      });
      
      if (userInfo.data?.idToken && userInfo.data?.user?.email) {
        console.log('✅ [GOOGLE_SIGNUP] Google authentication successful, checking for existing account...');
        console.log('🔍 [GOOGLE_SIGNUP] ID Token length:', userInfo.data.idToken.length);
        console.log('🔍 [GOOGLE_SIGNUP] User email:', userInfo.data.user.email);
        
        console.log('🔍 [GOOGLE_SIGNUP] Step 3: Creating Firebase credential...');
        // Create Firebase credential from Google token and sign in
        const googleCredential = auth.GoogleAuthProvider.credential(userInfo.data.idToken);
        console.log('✅ [GOOGLE_SIGNUP] Firebase credential created');
        
        console.log('🔍 [GOOGLE_SIGNUP] Step 4: Signing in with Firebase credential...');
        const userCredential = await auth().signInWithCredential(googleCredential);
        console.log('✅ [GOOGLE_SIGNUP] Firebase authentication successful');
        
        if (userCredential.user) {
          console.log('🔍 [GOOGLE_SIGNUP] Step 5: Checking for existing user document...');
          console.log('🔍 [GOOGLE_SIGNUP] Firebase User ID:', userCredential.user.uid);
          console.log('🔍 [GOOGLE_SIGNUP] Firebase User Email:', userCredential.user.email);
          console.log('🔍 [GOOGLE_SIGNUP] Firebase User Display Name:', userCredential.user.displayName);
          
          // Check if user document exists in Firestore (this is the reliable way to detect existing accounts)
          const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
          console.log('🔍 [GOOGLE_SIGNUP] Firestore query completed');
          console.log('🔍 [GOOGLE_SIGNUP] User document exists:', userDoc.exists);
          console.log('🔍 [GOOGLE_SIGNUP] User document has data:', !!userDoc.data());
          
          if (userDoc.exists && userDoc.data()) {
            // Account already exists - ask if they want to sign in to existing account
            console.log('Existing account found with user document - asking user if they want to sign in');
            
            haptics.error();
            Alert.alert(
              'Account Already Exists',
              `You already have an account with this Google account. Would you like to sign in to your existing account?`,
              [
                { 
                  text: 'Cancel', 
                  style: 'cancel',
                  onPress: async () => {
                    // User wants to cancel - sign them out and stay on sign-up screen
                    await auth().signOut();
                    await GoogleSignin.signOut();
                  }
                },
                { 
                  text: 'Sign In', 
                  onPress: async () => {
                    // User wants to sign in - proceed with existing account login
                    console.log('User chose to sign in to existing account');
                    haptics.success();
                    
                    // Mark authentication as complete
                    markAuthenticationComplete();
                    
                    // Run the sign-in sequence with their existing account
                    await runPostLoginSequence(
                      userCredential.user.uid,
                      () => router.replace('/(tabs)/home'),
                      () => router.replace('/'),
                      pathname
                    );
                  }
                }
              ]
            );
            return;
          }
          
          // No existing user document found, proceed with new account creation
          console.log('No existing account found, proceeding with Google sign-up');
          
          // Create user document in Firestore with onboarding data
          const xpData = getInitialXpData();
          const userData = {
            email: userCredential.user.email,
            createdAt: firestore.FieldValue.serverTimestamp(),
            lastLoginAt: firestore.FieldValue.serverTimestamp(),
            signUpMethod: 'google',
            ...onboardingData,
            ...xpData, // Add XP system fields
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
      } else {
        console.log('❌ [GOOGLE_SIGNUP] No ID token or email received');
        console.log('❌ [GOOGLE_SIGNUP] UserInfo data structure:', JSON.stringify(userInfo, null, 2));
      }
    } catch (error: any) {
      console.error('❌ [GOOGLE_SIGNUP] Error during Google sign up:', error);
      console.error('❌ [GOOGLE_SIGNUP] Error code:', error.code);
      console.error('❌ [GOOGLE_SIGNUP] Error message:', error.message);
      console.error('❌ [GOOGLE_SIGNUP] Error stack:', error.stack);
      console.error('❌ [GOOGLE_SIGNUP] Error toString:', error.toString());
      console.error('❌ [GOOGLE_SIGNUP] Full error object:', JSON.stringify(error, null, 2));
      haptics.error();
      
      // Check if user cancelled the sign-in process
      const { statusCodes } = require('@react-native-google-signin/google-signin');
      console.log('🔍 [GOOGLE_SIGNUP] Checking if error is cancellation...');
      console.log('🔍 [GOOGLE_SIGNUP] statusCodes.SIGN_IN_CANCELLED:', statusCodes.SIGN_IN_CANCELLED);
      console.log('🔍 [GOOGLE_SIGNUP] statusCodes.IN_PROGRESS:', statusCodes.IN_PROGRESS);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED || 
          error.code === 'SIGN_IN_CANCELLED' ||
          error.code === statusCodes.IN_PROGRESS ||
          error.message?.includes('SIGN_IN_CANCELLED') ||
          error.message?.includes('cancelled') ||
          error.message?.includes('canceled') ||
          error.message?.includes('The user canceled') ||
          error.message?.includes('User cancelled') ||
          error.toString().includes('cancelled')) {
        console.log('✅ [GOOGLE_SIGNUP] Google sign-up cancelled by user - no error shown');
        // Don't show error - user cancelled intentionally
      } else if (error.code === 'auth/email-already-in-use') {
        console.log('⚠️ [GOOGLE_SIGNUP] Email already in use error');
        Alert.alert(
          'Account Already Exists',
          'An account with this Google account already exists. Would you like to sign in to your existing account?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => {
                router.replace('/?openSignIn=true');
              }
            }
          ]
        );
      } else {
        console.log('❌ [GOOGLE_SIGNUP] Unknown error - showing generic error');
        Alert.alert('Sign Up Error', error.message || 'An error occurred during sign up');
      }
    } finally {
      console.log('🔚 [GOOGLE_SIGNUP] Finally block - setting isLoading to false');
      setIsLoading(false);
    }
    console.log('🔚 [GOOGLE_SIGNUP] Google Sign-Up process completed');
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
                    <Text style={styles.googleButtonText} allowFontScaling={false}>
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