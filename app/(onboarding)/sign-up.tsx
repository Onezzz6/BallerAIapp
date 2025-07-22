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
import { updateEmail, updatePassword, EmailAuthProvider, linkWithCredential, OAuthProvider, GoogleAuthProvider } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
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
  const [isGoogleAvailable, setIsGoogleAvailable] = useState(false);
  const { onboardingData } = useOnboarding();
  const { user } = useAuth();

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
          console.log('Google Web Client ID not found in configuration');
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
      console.log("Starting Apple Sign-Up conversion...");
      
      if (!auth.currentUser) {
        Alert.alert('Error', 'Please complete onboarding first.');
        return;
      }

      // Check if current user is anonymous
      if (!auth.currentUser.isAnonymous) {
        Alert.alert('Error', 'User already has credentials.');
        return;
      }

      // Get Apple credential
      const appleAuthResult = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!appleAuthResult.identityToken) {
        throw new Error('Apple Sign In failed - no identity token');
      }

      // Create Apple credential for linking
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: appleAuthResult.identityToken,
        rawNonce: undefined, // You might want to add nonce for production
      });

      // Link Apple credential to existing anonymous user
      const linkedUser = await linkWithCredential(auth.currentUser, credential);
      console.log('Successfully linked Apple credentials to anonymous user:', linkedUser.user.uid);

      // Update Firestore document with Apple email
      const tempUserDocRef = doc(db, 'users', linkedUser.user.uid);
      await updateDoc(tempUserDocRef, {
        email: linkedUser.user.email || appleAuthResult.email || null,
        isAnonymous: false,
        hasAppleSignIn: true,
        updatedAt: new Date()
      });

      await analyticsService.logEvent('AA__32_apple_sign_up_converted');
      console.log('Apple conversion complete! Navigating to home...');
      router.replace('/(tabs)/home');
      
    } catch (error: any) {
      console.error('Apple Sign-Up conversion error:', error);
      Alert.alert('Error', error.message || 'Apple Sign-In failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      console.log("Starting Google Sign-Up conversion...");
      
      if (!auth.currentUser) {
        Alert.alert('Error', 'Please complete onboarding first.');
        return;
      }

      // Check if current user is anonymous
      if (!auth.currentUser.isAnonymous) {
        Alert.alert('Error', 'User already has credentials.');
        return;
      }

      // Check if Google Play Services are available (Android only)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }

      // Sign in with Google
      console.log('Attempting Google Sign In...');
      const userInfo = await GoogleSignin.signIn();
      console.log('Google Sign In successful, received user info:', userInfo.data?.user?.email);
      const idToken = userInfo.data?.idToken;
      console.log('ID Token received:', !!idToken);
      
      if (!idToken) {
        console.error('No ID token in response:', userInfo);
        throw new Error('Google Sign In failed - no ID token received');
      }

      // Create Google credential for linking
      console.log('Creating Google credential...');
      const credential = GoogleAuthProvider.credential(idToken);

      // Link Google credential to existing anonymous user
      const linkedUser = await linkWithCredential(auth.currentUser, credential);
      console.log('Successfully linked Google credentials to anonymous user:', linkedUser.user.uid);

      // Update Firestore document with Google email
      const tempUserDocRef = doc(db, 'users', linkedUser.user.uid);
      await updateDoc(tempUserDocRef, {
        email: linkedUser.user.email || null,
        isAnonymous: false,
        hasGoogleSignIn: true,
        updatedAt: new Date()
      });

      await analyticsService.logEvent('AA__32_google_sign_up_converted');
      console.log('Google conversion complete! Navigating to home...');
      router.replace('/(tabs)/home');
      
    } catch (error: any) {
      console.error('Google Sign-Up conversion error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'sign_in_cancelled' || error.code === '-5') {
        // User cancelled the sign-in flow
        console.log('Google Sign In was cancelled by user');
      } else if (error.code === 'sign_in_required') {
        console.log('User needs to sign in again');
        Alert.alert('Error', 'Please try signing in with Google again.');
      } else {
        Alert.alert('Error', error.message || 'Google Sign-In failed. Please try again.');
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

            {/* Social Sign In Options */}
            {(isAppleAvailable || isGoogleAvailable) && (
              <View style={styles.socialButtonsContainer}>
                <Text style={styles.orText}>or continue with</Text>
                
                <View style={styles.socialButtons}>
                  {/* Apple Sign In */}
                  {isAppleAvailable && (
                    <View style={styles.socialButtonWrapper}>
                      {isLoading ? (
                        <View style={[styles.socialButton, { backgroundColor: 'black' }]} />
                      ) : (
                        <AppleAuthentication.AppleAuthenticationButton
                          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                          cornerRadius={36}
                          style={styles.socialButton}
                          onPress={handleAppleSignUp}
                        />
                      )}
                    </View>
                  )}
                  
                  {/* Google Sign In */}
                  {isGoogleAvailable && (
                    <Pressable 
                      style={[styles.socialButton, styles.googleButton, { opacity: isLoading ? 0.5 : 1 }]}
                      onPress={handleGoogleSignUp}
                      disabled={isLoading}
                    >
                      <Image 
                        source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                        style={styles.googleIcon}
                      />
                      <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </Pressable>
                  )}
                </View>
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
  },
  socialButtonsContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  orText: {
    color: '#666666',
    fontSize: 14,
    marginBottom: 16,
  },
  socialButtons: {
    gap: 12,
    width: '100%',
    maxWidth: 375,
  },
  socialButtonWrapper: {
    width: '100%',
  },
  socialButton: {
    height: 55,
    borderRadius: 36,
    width: '100%',
  },
  googleButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '500',
  }
}); 