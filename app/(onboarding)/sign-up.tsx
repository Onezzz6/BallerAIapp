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
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { runPostLoginSequence, markAuthenticationComplete } from './paywall';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { usePathname } from 'expo-router';
import ScrollIfNeeded from '../components/ScrollIfNeeded';
import BackButton from '../components/BackButton';

export default function SignUpScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const { onboardingData } = useOnboarding();

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
      // First try to create new account  
      const user = await authService.signUpWithEmail(email, password, onboardingData);
      if (user) {
        await analyticsService.logEvent('AA__32_signed_up');
        
        // Mark authentication as complete after successful sign-up
        markAuthenticationComplete();
        
        // Run the definitive post-login sequence with current path and referral data
        await runPostLoginSequence(
          user.uid,
          () => router.replace('/(tabs)/home'),
          () => router.replace('/(onboarding)/sign-up'),  // Navigate to sign-up screen on cancellation
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
      // If email exists, prompt for sign in
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Existing Account',
          'Looks like you already have an account. Would you like to sign in?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: async () => {
                try {
                  const user = await authService.signInWithEmail(email, password);
                  if (user) {
                    await analyticsService.logEvent('AA__32_sign_in_complete');
                    
                    // Mark authentication as complete after successful sign-in
                    markAuthenticationComplete();
                    
                    // Run the definitive post-login sequence with current path and referral data
                    await runPostLoginSequence(
                      user.uid,
                      () => router.replace('/(tabs)/home'),
                      () => router.replace('/'),  // Navigate to welcome on cancellation
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
                } catch (signInError: any) {
                  Alert.alert('Error', 'Invalid password. Please try again.');
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
      
      const { user, hasDocument, isValidDocument, appleInfo } = await authService.authenticateWithApple();
      
      if (!user) {
        console.log("No user returned from Apple authentication");
        setIsLoading(false);
        return;
      }

      console.log(`User authenticated. Has document: ${hasDocument}, Is valid: ${isValidDocument}`);
      
      if (hasDocument && isValidDocument) {
        console.log("User has valid document, navigating to home");
        await analyticsService.logEvent('AA__32_apple_sign_in_complete');
        
        // Mark authentication as complete after successful Apple sign-in
        markAuthenticationComplete();
        
                  // Run the definitive post-login sequence with current path and referral data
          await runPostLoginSequence(
            user.uid,
            () => router.replace('/(tabs)/home'),
            () => router.replace('/(onboarding)/sign-up'),  // Navigate to sign-up on cancellation
            pathname,
            // Pass referral code data for paywall selection
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
          const userDocRef = doc(db, "users", user.uid);
          await setDoc(userDocRef, onboardingData);
          console.log("User document created successfully");
          
          // Mark authentication as complete after successful Apple sign-up
          markAuthenticationComplete();
          
          // Run the definitive post-login sequence with current path and referral data
          await runPostLoginSequence(
            user.uid,
            () => router.replace('/(tabs)/home'),
            () => router.replace('/(onboarding)/sign-up'),  // Navigate to sign-up on cancellation
            pathname,
            // Pass referral code data for paywall selection
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