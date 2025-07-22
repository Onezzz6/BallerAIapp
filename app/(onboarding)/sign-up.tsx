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
import { doc, setDoc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { updateEmail, updatePassword, EmailAuthProvider, linkWithCredential } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { runPostLoginSequence, markAuthenticationComplete } from './paywall';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { usePathname } from 'expo-router';
import ScrollIfNeeded from '../components/ScrollIfNeeded';
import BackButton from '../components/BackButton';
import { useAuth } from '../context/AuthContext';
import Purchases from 'react-native-purchases';

export default function SignUpScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const { onboardingData } = useOnboarding();
  const { user } = useAuth();

  // Check if Apple authentication is available on this device
  useEffect(() => {
    const checkAppleAuthAvailability = async () => {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setIsAppleAvailable(isAvailable);
    };
    
    checkAppleAuthAvailability();
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
      // Check if we already have a user (from the new flow)
      if (user?.uid) {
        console.log('User already exists, creating real account and transferring data:', user.uid);
        console.log('User email:', email, 'User ID:', user.uid);
         
        // IMPORTANT: Get the temporary user's data FIRST, while we're still authenticated as them
        const tempUserDocRef = doc(db, 'users', user.uid);
        let tempUserData;
        
        try {
          const tempUserDoc = await getDoc(tempUserDocRef);
          
          if (!tempUserDoc.exists()) {
            throw new Error('Temporary user document not found');
          }
          
          tempUserData = tempUserDoc.data();
          console.log('Successfully retrieved temporary user data');
        } catch (dataError) {
          console.error('Error reading temporary user data:', dataError);
          // Fallback: try to update current user instead of creating new one
          try {
            console.log('Fallback: updating temporary user with real email');
            
            // Ensure RevenueCat is set up with current user ID
            try {
              console.log('Ensuring RevenueCat subscription is properly linked in fallback...');
              await Purchases.logIn(user.uid);
              console.log('RevenueCat user logged in successfully in fallback');
            } catch (revenueCatError) {
              console.error('Error logging in RevenueCat user in fallback (non-critical):', revenueCatError);
            }
            
            await updateDoc(tempUserDocRef, {
              email: email,
              isTemporary: false,
              updatedAt: new Date()
            });
            
            await analyticsService.logEvent('AA__32_signed_up_after_paywall_fallback');
            console.log('Temporary user updated with real email, navigating to home');
            router.replace('/(tabs)/home');
            return;
          } catch (updateError) {
            console.error('Error updating temporary user:', updateError);
            throw updateError;
          }
        }
        
        try {
          // Check if this is an anonymous user or temp email user
          const isAnonymousUser = tempUserData.isAnonymous === true;
          
          if (isAnonymousUser) {
            // GUARANTEED SINGLE ACCOUNT: Convert anonymous user to real email/password user
            console.log('Converting anonymous user to real email/password account');
            
            if (!auth.currentUser) {
              throw new Error('No current user to convert');
            }
            
            // Create email/password credential
            const credential = EmailAuthProvider.credential(email, password);
            
            // Link the credential to the existing anonymous user
            const linkedUser = await linkWithCredential(auth.currentUser, credential);
            
            console.log('Successfully converted anonymous user to email/password user');
            console.log('Same Firebase Auth UID maintained:', linkedUser.user.uid);
            
            // Update the SAME Firestore document with real email (no new document created)
            await updateDoc(tempUserDocRef, {
              email: email, // Store real email
              isTemporary: false,
              isAnonymous: false,
              hasEmailPassword: true,
              updatedAt: new Date()
            });
            
            console.log('GUARANTEED: Only 1 Firebase Auth user, only 1 Firestore document');
            
            await analyticsService.logEvent('AA__32_signed_up_after_paywall_converted');
            console.log('Account conversion complete! Navigating to home...');
            router.replace('/(tabs)/home');
            return;
          } else {
            // Fallback: Handle temporary email user (old system)
            console.log('Handling temporary email user with fallback system');
            
            const updatedUserData = {
              ...tempUserData,
              email: email, // Use real email
              isTemporary: false,
              updatedAt: new Date()
            };
            
            const newUserCredential = await authService.signUpWithEmail(email, password, updatedUserData as any);
            
            if (newUserCredential) {
              console.log('New account created successfully! Transferring subscription and cleaning up...');
              
              // Transfer RevenueCat subscription to new user
              try {
                await Purchases.logIn(newUserCredential.uid);
                console.log('RevenueCat subscription transferred to new user');
              } catch (rcError) {
                console.error('RevenueCat transfer error (non-critical):', rcError);
              }
              
              // Clean up old temporary document (best effort)
              try {
                await deleteDoc(tempUserDocRef);
                console.log('Old temporary document cleaned up successfully');
              } catch (cleanupError) {
                console.log('Old document cleanup skipped (expected due to permissions)');
              }
              
              await analyticsService.logEvent('AA__32_signed_up_after_paywall');
              console.log('Account creation complete! Navigating to home...');
              router.replace('/(tabs)/home');
              return;
            }
          }
        } catch (createError: any) {
          console.error('Error creating real account:', createError);
          
          // If email already exists, update the temporary user instead
          if (createError.code === 'auth/email-already-in-use') {
            try {
              console.log('Email already exists, updating temporary user with real email instead');
              
              // Ensure RevenueCat is set up with current user ID
              try {
                console.log('Ensuring RevenueCat subscription is properly linked...');
                await Purchases.logIn(user.uid);
                console.log('RevenueCat user logged in successfully');
              } catch (revenueCatError) {
                console.error('Error logging in RevenueCat user (non-critical):', revenueCatError);
              }
              
              await updateDoc(tempUserDocRef, {
                email: email, // Store the real email in Firestore
                isTemporary: false,
                updatedAt: new Date()
              });
              
              await analyticsService.logEvent('AA__32_signed_up_after_paywall_fallback');
              console.log('Temporary user updated with real email, navigating to home');
              router.replace('/(tabs)/home');
              return;
            } catch (updateError) {
              console.error('Error updating temporary user:', updateError);
              // This error will propagate and be handled by outer catch
              throw updateError;
            }
          } else {
            // For other errors (not email-already-in-use), re-throw
            throw createError;
          }
        }
      }
      
      // Fallback to original flow if no existing user (shouldn't happen in new flow)
      console.log('No temporary user found, using fallback flow');
      const newUser = await authService.signUpWithEmail(email, password, onboardingData);
      if (newUser) {
        await analyticsService.logEvent('AA__32_signed_up_fallback_flow');
        
        // Mark authentication as complete after successful sign-up
        markAuthenticationComplete();
        
        // Navigate directly to home since this is post-paywall
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      console.error('Sign-up error:', error);
      
      // If email exists, provide better options
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Email Already Exists',
          'This email is already associated with an account. What would you like to do?',
          [
            { text: 'Try Different Email', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: async () => {
                try {
                  const signedInUser = await authService.signInWithEmail(email, password);
                  if (signedInUser) {
                    await analyticsService.logEvent('AA__32_sign_in_complete');
                    
                    // Check if we have a temporary user to clean up
                    if (user?.uid && user.uid !== signedInUser.uid) {
                      try {
                        // Transfer any subscription/purchase data if needed and clean up temp user
                        const tempUserDocRef = doc(db, 'users', user.uid);
                        const tempUserDoc = await getDoc(tempUserDocRef);
                        
                        if (tempUserDoc.exists()) {
                          // Clean up temporary user document
                          await deleteDoc(tempUserDocRef);
                          console.log('Temporary user cleaned up after successful sign-in');
                        }
                      } catch (cleanupError) {
                        console.error('Error cleaning up temporary user:', cleanupError);
                        // Continue anyway - this is not critical
                      }
                    }
                    
                    console.log('User signed in successfully, navigating to home');
                    router.replace('/(tabs)/home');
                  }
                } catch (signInError: any) {
                  console.error('Sign-in error:', signInError);
                  Alert.alert(
                    'Sign In Failed', 
                    'The password you entered doesn\'t match this email. Would you like to reset your password?',
                    [
                      { text: 'Try Again', style: 'cancel' },
                      { 
                        text: 'Reset Password', 
                        onPress: () => {
                          Alert.alert(
                            'Reset Password',
                            'Please go to the sign-in screen to reset your password, then come back to complete your account setup.',
                            [{ text: 'OK' }]
                          );
                        }
                      }
                    ]
                  );
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to create an account. Please check your network connection and try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    setIsLoading(true);
    try {
      console.log("Starting Apple Sign-Up process...");
      
      // Check if we already have a user (from the new flow)
      if (user?.uid) {
        console.log('User already exists, handling Apple sign-in for existing account:', user.uid);
        
        // For existing users in new flow, we'll just navigate to home
        // The Apple authentication would be complex to merge with existing account
        await analyticsService.logEvent('AA__32_apple_sign_up_after_paywall');
        router.replace('/(tabs)/home');
        return;
      }
      
      // Fallback to original Apple flow if no existing user
      const { user: appleUser, hasDocument, isValidDocument, appleInfo } = await authService.authenticateWithApple();
      
      if (!appleUser) {
        console.log("No user returned from Apple authentication");
        setIsLoading(false);
        return;
      }

      console.log(`User authenticated. Has document: ${hasDocument}, Is valid: ${isValidDocument}`);
      
      if (hasDocument && isValidDocument) {
        console.log("User has valid document, navigating to home");
        await analyticsService.logEvent('AA__32_apple_sign_in_complete');
        
        markAuthenticationComplete();
        
        await runPostLoginSequence(
          appleUser.uid,
          () => router.replace('/(tabs)/home'),
          () => router.replace('/(onboarding)/paywall-upsell'),
          pathname,
          {
            referralCode: onboardingData.referralCode,
            referralDiscount: onboardingData.referralDiscount,
            referralInfluencer: onboardingData.referralInfluencer,
            referralPaywallType: onboardingData.referralPaywallType
          }
        );
      } else {
        console.log("User needs a document created before going through paywall");

        try {
          const userDocRef = doc(db, "users", appleUser.uid);
          await setDoc(userDocRef, onboardingData);
          console.log("User document created successfully");
          
          markAuthenticationComplete();
          
          await runPostLoginSequence(
            appleUser.uid,
            () => router.replace('/(tabs)/home'),
            () => router.replace('/(onboarding)/paywall-upsell'),
            pathname,
            {
              referralCode: onboardingData.referralCode,
              referralDiscount: onboardingData.referralDiscount,
              referralInfluencer: onboardingData.referralInfluencer,
              referralPaywallType: onboardingData.referralPaywallType
            }
          );
        } catch (error) {
          console.error("Error creating user document:", error);
          setIsLoading(false);
          throw error;
        }
      }
    } catch (error) {
      console.error("Apple sign-up error:", error);
      setIsLoading(false);
      
      if ((error as any)?.code !== 'ERR_CANCELED') {
        Alert.alert('Error', 'Failed to sign up with Apple. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollIfNeeded 
        style={{
          backgroundColor: '#ffffff',
        }}
      >
        {/* Absolute positioned back button - top left */}
        <View style={{
          position: 'absolute',
          top: 60,
          left: 24,
          zIndex: 1000,
        }}>
          <BackButton />
        </View>
        
        <Animated.View 
          entering={FadeIn.duration(500)}
          style={{
            flex: 1,
          }}
        >
          <View style={styles.container}>
            <View style={{
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
              paddingTop: 128,
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
              }} allowFontScaling={false}>
                Create Your Account
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                  placeholderTextColor="#666666"
                />
              </View>
              
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  placeholderTextColor="#666666"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#666666"
                  />
                </Pressable>
              </View>
            </View>

            <CustomButton
              title={isLoading ? "Creating Account..." : "Continue"}
              onPress={handleSubmit}
              disabled={isLoading}
              buttonStyle={{
                backgroundColor: '#4064F6',
                borderRadius: 36,
              }}
              textStyle={{
                color: '#FFFFFF',
                fontSize: 18,
                fontWeight: '600',
              }}
            />

            {/* Apple Sign In */}
            {isAppleAvailable && (
              <View style={{ 
                opacity: isLoading ? 0.5 : 1,
                flex: 1,
                marginTop: 24,
                alignItems: 'center',
                maxWidth: 375,
                alignSelf: 'center',
              }}>
                {isLoading ? (
                  <View
                    style={{
                      width: '100%',
                      height: 55,
                      backgroundColor: 'black',
                      borderRadius: 36,
                      maxWidth: 375,
                    }}
                  />
                ) : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={36}
                    style={styles.appleButton}
                    onPress={handleAppleSignUp}
                  />
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollIfNeeded>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 48,
    marginBottom: 32,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#000000',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 32,
  },
  inputContainer: {
    gap: 16,
    marginTop: 32,
    marginBottom: 24,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#000000',
  },
  passwordWrapper: {
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  passwordInput: {
    padding: 16,
    fontSize: 16,
    paddingRight: 50,
    color: '#000000',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666666',
    fontSize: 14,
  },
  appleButton: {
    height: 55,
    flex: 1,
    maxWidth: 375,
  }
}); 