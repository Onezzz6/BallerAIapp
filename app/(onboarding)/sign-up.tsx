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
import { db } from '../config/firebase';
import { runPostLoginSequence, markAuthenticationComplete } from './paywall';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { usePathname } from 'expo-router';
import ScrollIfNeeded from '../components/ScrollIfNeeded';
import BackButton from '../components/BackButton';
import { useAuth } from '../context/AuthContext';

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
         
         try {
           // Get the current user's data from Firestore
           const tempUserDocRef = doc(db, 'users', user.uid);
           const tempUserDoc = await getDoc(tempUserDocRef);
           
           if (!tempUserDoc.exists()) {
             throw new Error('Temporary user document not found');
           }
           
           const tempUserData = tempUserDoc.data();
           
           // Create a new Firebase Auth account with the real email and password
           const newUserCredential = await authService.signUpWithEmail(email, password, tempUserData as any);
           
           if (newUserCredential) {
             // Delete the temporary user document
             await deleteDoc(tempUserDocRef);
             
             // Sign out the temporary user (happens automatically when new user signs up)
             console.log('Temporary account cleaned up, new real account created');
             
             await analyticsService.logEvent('AA__32_signed_up_after_paywall');
             console.log('Real account created successfully, navigating to home');
             router.replace('/(tabs)/home');
             return;
           }
         } catch (error) {
           console.error('Error creating real account:', error);
           
           // If creating new account failed but we have temp user, update temp user with real email
           if (error && (error as any).code === 'auth/email-already-in-use') {
             try {
               console.log('Falling back to updating temporary user with real email');
               const userDocRef = doc(db, 'users', user.uid);
               await updateDoc(userDocRef, {
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
               // Continue to normal flow as final fallback
             }
           }
           
           // Fall through to normal flow as backup if all else fails
         }
       }
      
      // Fallback to original flow if no existing user
      const newUser = await authService.signUpWithEmail(email, password, onboardingData);
      if (newUser) {
        await analyticsService.logEvent('AA__32_signed_up');
        
        // Mark authentication as complete after successful sign-up
        markAuthenticationComplete();
        
        // Run the definitive post-login sequence with current path and referral data
        await runPostLoginSequence(
          newUser.uid,
          () => router.replace('/(tabs)/home'),
          () => router.replace('/(onboarding)/paywall-upsell'),
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
                width: '100%',
                marginTop: 24,
              }}>
                {isLoading ? (
                  <View
                    style={{
                      width: '100%',
                      height: 55,
                      backgroundColor: 'black',
                      borderRadius: 36,
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
    width: '100%',
  }
}); 