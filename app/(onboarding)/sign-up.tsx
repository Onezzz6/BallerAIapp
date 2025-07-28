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
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      
      // CRITICAL: Check if device subscription belongs to another account
      await checkAndHandleSubscriptionTransfer();
      
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

  const checkAndHandleSubscriptionTransfer = async () => {
    try {
      console.log('🔥 SUBSCRIPTION_DEBUG - Checking if subscription transfer is needed...');
      
      // Get current RevenueCat customer info
      const customerInfo = await Purchases.getCustomerInfo();
      const hasSubscription = !!customerInfo.entitlements.active["BallerAISubscriptionGroup"];
      
      // DEBUG: Log full customer info to understand what we're dealing with
      console.log('🔥 SUBSCRIPTION_DEBUG - Sign-up transfer check:', {
        hasSubscription,
        originalAppUserId: customerInfo.originalAppUserId,
        appUserId: customerInfo.originalPurchaseDate,
        entitlements: Object.keys(customerInfo.entitlements.active),
        allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
      });
      
      if (!hasSubscription) {
        console.log('🔥 SUBSCRIPTION_DEBUG - No subscription found, proceeding with normal account creation');
        await createAccount();
        return;
      }
      
      // Check if subscription belongs to another Firebase account
      const originalAppUserId = customerInfo.originalAppUserId;
      
      // IMPORTANT: $RCAnonymousID could be either:
      // 1. Interrupted purchase (user just bought, creating their first account) 
      // 2. Account transfer (user bought on different account, creating second account)
      const isDeviceSubscription = !originalAppUserId;
      const isAnonymousAccount = originalAppUserId?.startsWith('$RCAnonymousID');
      
      console.log('🔥 SUBSCRIPTION_DEBUG - Transfer detection logic:', {
        originalAppUserId,
        isDeviceSubscription,
        hasOriginalId: !!originalAppUserId,
        isAnonymousAccount,
      });
      
      // If no originalAppUserId, it's truly a device subscription
      if (isDeviceSubscription) {
        console.log('🔥 SUBSCRIPTION_DEBUG - Device subscription detected, proceeding with normal account creation');
        await createAccount();
        return;
      }
      
      // If it's an anonymous account, this could be an interrupted purchase
      // In the new account-first flow, this is actually EXPECTED behavior
      if (isAnonymousAccount) {
        console.log('🔥 SUBSCRIPTION_DEBUG - Anonymous account detected (likely interrupted purchase from paywall)');
        
        // CRITICAL: Check if this anonymous subscription has already been claimed
        const subscriptionKey = `claimed_subscription_${originalAppUserId}`;
        const alreadyClaimed = await AsyncStorage.getItem(subscriptionKey);
        
        console.log('🔥 SUBSCRIPTION_DEBUG - Checking if anonymous subscription already claimed:', {
          subscriptionKey,
          alreadyClaimed: !!alreadyClaimed,
          originalAppUserId
        });
        
        if (alreadyClaimed) {
          console.log('🔥 SUBSCRIPTION_DEBUG - ❌ SUBSCRIPTION ALREADY CLAIMED by another account');
          console.log('🔥 SUBSCRIPTION_DEBUG - This is account transfer scenario, showing transfer prompt');
          
          const claimData = JSON.parse(alreadyClaimed);
          Alert.alert(
            'Subscription Already Used',
            `This subscription has already been used to create another account on this device.\n\nCreating this account will transfer the subscription from the previous account.`,
            [
              { 
                text: 'Cancel', 
                style: 'cancel',
                onPress: () => {
                  console.log('🔥 SUBSCRIPTION_DEBUG - User cancelled transfer of already-claimed subscription');
                  setIsLoading(false);
                }
              },
              { 
                text: 'Transfer Subscription', 
                style: 'destructive',
                onPress: async () => {
                  console.log('🔥 SUBSCRIPTION_DEBUG - User confirmed transfer of already-claimed subscription');
                  await createAccount();
                }
              }
            ]
          );
          return;
        }
        
        console.log('🔥 SUBSCRIPTION_DEBUG - Anonymous subscription not yet claimed, proceeding with normal account creation');
        console.log('🔥 SUBSCRIPTION_DEBUG - Will mark as claimed immediately to prevent double-claiming');
        
        // CRITICAL: Mark as claimed IMMEDIATELY to prevent race conditions
        await AsyncStorage.setItem(subscriptionKey, JSON.stringify({
          claimedBy: 'PENDING_TRANSFER',
          attemptedAt: new Date().toISOString(),
          status: 'ATTEMPTING'
        }));
        console.log('🔥 SUBSCRIPTION_DEBUG - ✅ Pre-marked anonymous subscription to prevent double-claiming');
        
        await createAccount();
        return;
      }
      
      // Only show transfer prompt for actual Firebase UIDs (real account transfers)
      console.log('🔥 SUBSCRIPTION_DEBUG - FOUND SUBSCRIPTION FROM REAL FIREBASE ACCOUNT, SHOULD SHOW TRANSFER PROMPT');
      console.log('🔥 SUBSCRIPTION_DEBUG - Other Firebase account ID:', originalAppUserId);
      
      Alert.alert(
        'Transfer Subscription?',
        `This device has an active subscription from another account.\n\nCreating this new account will transfer the subscription to it.\n\nThe previous account will lose access to the subscription.`,
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              console.log('🔥 SUBSCRIPTION_DEBUG - User cancelled subscription transfer');
              setIsLoading(false);
            }
          },
          { 
            text: 'Transfer Subscription', 
            style: 'destructive',
            onPress: async () => {
              console.log('🔥 SUBSCRIPTION_DEBUG - User confirmed subscription transfer');
              await createAccount();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error checking subscription transfer:', error);
      // Fallback to normal account creation
      console.log('Subscription check failed, proceeding with normal account creation');
      await createAccount();
    }
  };

  const createAccount = async () => {
    try {
      // DEBUG: Check subscription state BEFORE account creation
      console.log('🔥 SUBSCRIPTION_DEBUG - BEFORE account creation:');
      const beforeInfo = await Purchases.getCustomerInfo();
      console.log('🔥 SUBSCRIPTION_DEBUG - Before Original App User ID:', beforeInfo.originalAppUserId);
      console.log('🔥 SUBSCRIPTION_DEBUG - Before Has subscription:', !!beforeInfo.entitlements.active["BallerAISubscriptionGroup"]);
      
      // Create Firebase Auth account with email/password and onboarding data
      const newUserCredential = await authService.signUpWithEmail(email, password, onboardingData as any);
      
      if (newUserCredential) {
        console.log('🔥 SUBSCRIPTION_DEBUG - New Firebase account created:', newUserCredential.uid);
        
        // Transfer RevenueCat subscription from device/previous account to new user account
        try {
          console.log('🔥 SUBSCRIPTION_DEBUG - CALLING Purchases.logIn to transfer subscription');
          
          // CRITICAL: Clear cache before transfer to ensure fresh state
          console.log('🔥 SUBSCRIPTION_DEBUG - Clearing RevenueCat cache before transfer');
          try {
            if (typeof Purchases.invalidateCustomerInfoCache === 'function') {
              await Purchases.invalidateCustomerInfoCache();
            }
          } catch (cacheError) {
            console.log('🔥 SUBSCRIPTION_DEBUG - Cache clear failed (non-critical):', cacheError);
          }
          
          // Retry logic for RevenueCat transfer
          let transferWorked = false;
          let hasSubscription = false;
          let finalCustomerInfo = null;
          
          for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`🔥 SUBSCRIPTION_DEBUG - Transfer attempt ${attempt}/3`);
            
            try {
              // This should transfer the subscription
              console.log('🔥 SUBSCRIPTION_DEBUG - Calling logIn with Firebase UID:', newUserCredential.uid);
              await Purchases.logIn(newUserCredential.uid);
              console.log('🔥 SUBSCRIPTION_DEBUG - Purchases.logIn completed');
              
              // CRITICAL: Sync purchases to ensure transfer is reflected immediately
              console.log('🔥 SUBSCRIPTION_DEBUG - Syncing purchases to complete transfer');
              await Purchases.syncPurchases();
              console.log('🔥 SUBSCRIPTION_DEBUG - Purchase sync completed');
              
              // Wait for server sync
              console.log(`🔥 SUBSCRIPTION_DEBUG - Waiting for server sync (attempt ${attempt})...`);
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Longer wait on retries
              
              // Force fresh fetch after transfer
              console.log('🔥 SUBSCRIPTION_DEBUG - Forcing fresh customer info fetch');
              const customerInfo = await Purchases.getCustomerInfo();
              
              // Check if transfer worked
              transferWorked = customerInfo.originalAppUserId === newUserCredential.uid;
              hasSubscription = !!customerInfo.entitlements.active["BallerAISubscriptionGroup"];
              finalCustomerInfo = customerInfo;
              
              console.log(`🔥 SUBSCRIPTION_DEBUG - Attempt ${attempt} result:`, {
                transferWorked,
                hasSubscription,
                expectedUID: newUserCredential.uid,
                actualUID: customerInfo.originalAppUserId
              });
              
              if (transferWorked && hasSubscription) {
                console.log(`🔥 SUBSCRIPTION_DEBUG - ✅ Transfer succeeded on attempt ${attempt}`);
                break;
              } else if (attempt < 3) {
                console.log(`🔥 SUBSCRIPTION_DEBUG - ❌ Transfer failed on attempt ${attempt}, retrying...`);
              }
              
            } catch (attemptError) {
              console.error(`🔥 SUBSCRIPTION_DEBUG - Attempt ${attempt} error:`, attemptError);
              if (attempt === 3) throw attemptError;
            }
          }
          
          console.log('🔥 SUBSCRIPTION_DEBUG - FINAL TRANSFER RESULT:');
          console.log('🔥 SUBSCRIPTION_DEBUG - Transfer worked:', transferWorked);
          console.log('🔥 SUBSCRIPTION_DEBUG - Has subscription:', hasSubscription);
          console.log('🔥 SUBSCRIPTION_DEBUG - Final Original App User ID:', finalCustomerInfo?.originalAppUserId);
          
          if (!transferWorked) {
            console.error('🔥 SUBSCRIPTION_DEBUG - ❌ TRANSFER FAILED after 3 attempts - originalAppUserId did not change');
          }
          
          if (!hasSubscription) {
            console.error('🔥 SUBSCRIPTION_DEBUG - ❌ SUBSCRIPTION LOST - user has no active entitlement');
          }
          
          // Update AsyncStorage with final result
          if (beforeInfo.originalAppUserId?.startsWith('$RCAnonymousID')) {
            const subscriptionKey = `claimed_subscription_${beforeInfo.originalAppUserId}`;
            await AsyncStorage.setItem(subscriptionKey, JSON.stringify({
              claimedBy: newUserCredential.uid,
              claimedAt: new Date().toISOString(),
              status: transferWorked ? 'SUCCESS' : 'FAILED',
              transferWorked,
              hasSubscription,
              attempts: 3
            }));
            console.log('🔥 SUBSCRIPTION_DEBUG - ✅ Updated anonymous subscription claim status:', {
              subscriptionKey,
              status: transferWorked ? 'SUCCESS' : 'FAILED'
            });
          }
          
        } catch (rcError) {
          console.error('🔥 SUBSCRIPTION_DEBUG - RevenueCat transfer ERROR:', rcError);
          
          // Update AsyncStorage with error result
          if (beforeInfo.originalAppUserId?.startsWith('$RCAnonymousID')) {
            const subscriptionKey = `claimed_subscription_${beforeInfo.originalAppUserId}`;
            await AsyncStorage.setItem(subscriptionKey, JSON.stringify({
              claimedBy: newUserCredential.uid,
              claimedAt: new Date().toISOString(),
              status: 'ERROR',
              error: rcError instanceof Error ? rcError.message : String(rcError),
              transferWorked: false,
              hasSubscription: false
            }));
            console.log('🔥 SUBSCRIPTION_DEBUG - ✅ Updated anonymous subscription claim status with error');
          }
          
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
      console.error('Error in createAccount:', error);
      throw error; // Re-throw to be handled by outer catch
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
      
      // CRITICAL: Check if device subscription belongs to another account
      await checkAndHandleGoogleSubscriptionTransfer();
      
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

  const checkAndHandleGoogleSubscriptionTransfer = async () => {
    try {
      // Get current RevenueCat customer info
      const customerInfo = await Purchases.getCustomerInfo();
      const hasSubscription = !!customerInfo.entitlements.active["BallerAISubscriptionGroup"];
      
      if (!hasSubscription) {
        console.log('🔥 SUBSCRIPTION_DEBUG - Google sign-up: No subscription, proceeding normally');
        await createGoogleAccount();
        return;
      }
      
      // Check if subscription belongs to another Firebase account
      const originalAppUserId = customerInfo.originalAppUserId;
      const isDeviceSubscription = !originalAppUserId;
      const isAnonymousAccount = originalAppUserId?.startsWith('$RCAnonymousID');
      
      // If no originalAppUserId, it's truly a device subscription
      if (isDeviceSubscription) {
        console.log('🔥 SUBSCRIPTION_DEBUG - Google sign-up: Device subscription, proceeding normally');
        await createGoogleAccount();
        return;
      }
      
      // If it's an anonymous account, this is likely an interrupted purchase
      if (isAnonymousAccount) {
        console.log('🔥 SUBSCRIPTION_DEBUG - Google sign-up: Anonymous account (interrupted purchase), proceeding normally');
        await createGoogleAccount();
        return;
      }
      
      console.log('🔥 SUBSCRIPTION_DEBUG - Google sign-up: FOUND SUBSCRIPTION FROM REAL FIREBASE ACCOUNT');
      
      // Only show transfer prompt for actual Firebase UIDs
      Alert.alert(
        'Transfer Subscription?',
        'This device has an active subscription from another account. Signing up with Google will transfer the subscription to your Google account.\n\nThe previous account will lose access.',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              console.log('🔥 SUBSCRIPTION_DEBUG - Google transfer cancelled');
              setIsLoading(false);
            }
          },
          { 
            text: 'Transfer Subscription', 
            style: 'destructive',
            onPress: async () => {
              console.log('🔥 SUBSCRIPTION_DEBUG - Google transfer confirmed');
              await createGoogleAccount();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('🔥 SUBSCRIPTION_DEBUG - Google transfer check error:', error);
      await createGoogleAccount();
    }
  };

  const createGoogleAccount = async () => {
    try {
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
      console.error('Error in createGoogleAccount:', error);
      throw error;
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
      
      // CRITICAL: Check if device subscription belongs to another account
      await checkAndHandleAppleSubscriptionTransfer();
      
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

  const checkAndHandleAppleSubscriptionTransfer = async () => {
    try {
      // Get current RevenueCat customer info
      const customerInfo = await Purchases.getCustomerInfo();
      const hasSubscription = !!customerInfo.entitlements.active["BallerAISubscriptionGroup"];
      
      if (!hasSubscription) {
        console.log('🔥 SUBSCRIPTION_DEBUG - Apple sign-up: No subscription, proceeding normally');
        await createAppleAccount();
        return;
      }
      
      // Check if subscription belongs to another Firebase account
      const originalAppUserId = customerInfo.originalAppUserId;
      const isDeviceSubscription = !originalAppUserId;
      const isAnonymousAccount = originalAppUserId?.startsWith('$RCAnonymousID');
      
      // If no originalAppUserId, it's truly a device subscription
      if (isDeviceSubscription) {
        console.log('🔥 SUBSCRIPTION_DEBUG - Apple sign-up: Device subscription, proceeding normally');
        await createAppleAccount();
        return;
      }
      
      // If it's an anonymous account, this is likely an interrupted purchase
      if (isAnonymousAccount) {
        console.log('🔥 SUBSCRIPTION_DEBUG - Apple sign-up: Anonymous account (interrupted purchase), proceeding normally');
        await createAppleAccount();
        return;
      }
      
      console.log('🔥 SUBSCRIPTION_DEBUG - Apple sign-up: FOUND SUBSCRIPTION FROM REAL FIREBASE ACCOUNT');
      
      // Only show transfer prompt for actual Firebase UIDs
      Alert.alert(
        'Transfer Subscription?',
        'This device has an active subscription from another account. Signing up with Apple will transfer the subscription to your Apple account.\n\nThe previous account will lose access.',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              console.log('🔥 SUBSCRIPTION_DEBUG - Apple transfer cancelled');
              setIsLoading(false);
            }
          },
          { 
            text: 'Transfer Subscription', 
            style: 'destructive',
            onPress: async () => {
              console.log('🔥 SUBSCRIPTION_DEBUG - Apple transfer confirmed');
              await createAppleAccount();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('🔥 SUBSCRIPTION_DEBUG - Apple transfer check error:', error);
      await createAppleAccount();
    }
  };

  const createAppleAccount = async () => {
    try {
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
      console.error('Error in createAppleAccount:', error);
      throw error;
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