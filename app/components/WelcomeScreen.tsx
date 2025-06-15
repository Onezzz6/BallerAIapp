import { View, Text, Image, Pressable, TextInput, Alert, Keyboard, TouchableWithoutFeedback, Modal } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
} from 'react-native-reanimated';
import Button from './Button';
import { useState, useEffect } from 'react';
import React from 'react';
import authService from '../services/auth';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { runPostLoginSequence, markAuthenticationComplete } from '../(onboarding)/paywall';
import { requestAppTrackingPermission } from '../utils/tracking';
import { colors, typography, spacing } from '../utils/theme';
import { useHaptics } from '../utils/haptics';

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
  const pathname = usePathname();
  const haptics = useHaptics();
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  // Use shared value for opacity animation
  const opacity = useSharedValue(0);

  // Create animated style for opacity
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  // Start fade-in animation on mount
  useEffect(() => {
    console.log("Preparing welcome screen animation");
    
    // Add a 1000ms delay before starting the fade-in animation
    const animationTimer = setTimeout(() => {
      console.log("Starting fade-in animation after delay");
      opacity.value = withTiming(1, { duration: 300 });
    }, 1000);
    
    return () => clearTimeout(animationTimer);
  }, []);

  // Request App Tracking Transparency permission
  useEffect(() => {
    // Delay the tracking request to avoid showing it immediately on screen load
    const trackingTimer = setTimeout(async () => {
      try {
        const trackingStatus = await requestAppTrackingPermission();
        console.log(`App tracking permission status: ${trackingStatus}`);
      } catch (error) {
        console.error('Failed to request tracking permission:', error);
      }
    }, 2000); // Show after 2 seconds
    
    return () => clearTimeout(trackingTimer);
  }, []);

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
    haptics.light();
    router.push('/(onboarding)/username');
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
      const user = await authService.signInWithEmail(email, password);
      if (user) {
        haptics.success();
        // Mark authentication as complete - this user is now signed in
        markAuthenticationComplete();
        
        // Run the definitive post-login sequence with current path
        await runPostLoginSequence(
          user.uid,
          () => router.replace('/(tabs)/home'),
          () => router.replace('/'),  // Navigate to welcome on cancellation
          pathname
        );
      }
    } catch (error: any) {
      haptics.error();
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
          'Failed to sign in. Please try again.'
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
      const { exists, user, wasCanceled } = await authService.checkAppleSignIn();
      console.log(`Apple Sign-In check result: exists=${exists}, user=${user ? 'present' : 'null'}`);
      
      // Add explicit check to make sure we have both exists=true AND a valid user object
      if (exists && user && user.uid) {
        console.log(`Valid user found with UID: ${user.uid}`);
        
        // Use the verification method that includes auto sign-out for invalid users
        const isValidUser = await authService.verifyCompleteUserAccount(user.uid);
        console.log(`User verification result: ${isValidUser ? 'VALID' : 'INVALID'}`);
        
        if (isValidUser) {
          console.log("User has valid document with complete onboarding data - navigating to home");
          haptics.success();
          
          // Mark authentication as complete - this user is now signed in
          markAuthenticationComplete();
          
          // Only navigate if we have a confirmed valid user
          await runPostLoginSequence(
            user.uid,
            () => router.replace('/(tabs)/home'),
            () => router.replace('/'),  // Navigate to welcome on cancellation
            pathname
          );
          return;
        } else {
          console.log("User validation failed - showing no account alert");
          haptics.error();
          showNoAccountAlert();
          router.replace('/(onboarding)/sign-up');
          return;
        }
      } else if (!wasCanceled) {
        console.log("No valid user found with Apple ID");
        haptics.error();
        // No user exists or user doesn't have proper account
        showNoAccountAlert();
      }
    } catch (error: any) {
      // Don't show error if user cancels
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple sign in error:', error);
        haptics.error();
        Alert.alert(
          'Sign in with Apple Failed',
          'Failed to sign in with Apple. Please try again.'
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
      'No account found with this Apple ID. You need to create one to continue.',
      [
        { 
          text: 'OK', 
          onPress: () => {
            setShowSignIn(true);
          }
        }
      ]
    );
  };

  const handleForgotPassword = () => {
    setResetEmail(email);
    setShowResetModal(true);
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(resetEmail);
      setShowResetModal(false);
      haptics.success();
      Alert.alert(
        'Password Reset Email Sent',
        'Check your email for instructions to reset your password.'
      );
    } catch (error: any) {
      haptics.error();
      let errorMessage = 'Failed to send the reset email. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <Animated.View 
          style={[
            {
              flex: 1,
              backgroundColor: colors.white,
              paddingHorizontal: spacing.lg,
            },
            animatedStyle
          ]}
        >
          {!showSignIn ? (
            // Get Started Screen
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              {/* Logo - Made bigger */}
              <Image
                source={require('../../assets/images/BallerAILogo.png')}
                style={{
                  width: 160,
                  height: 160,
                  resizeMode: 'contain',
                  marginBottom: spacing.xl,
                }}
              />
              
              {/* Title */}
              <Text style={[
                typography.largeTitle,
                {
                  textAlign: 'center',
                  marginBottom: spacing.xxl,
                }
              ]}>
                Ready to Go Pro?
              </Text>

              {/* Get Started Button - Made bigger */}
              <Button 
                title="Get Started" 
                onPress={handleGetStarted}
                buttonStyle={{
                  backgroundColor: colors.brandBlue,
                  paddingVertical: 18,
                  paddingHorizontal: 48,
                  borderRadius: 30,
                  width: '100%',
                  marginBottom: spacing.xxxl,
                }}
                textStyle={{
                  fontSize: 20,
                  fontWeight: '700',
                }}
              />

              {/* Already have account - Moved much lower */}
              <View style={{
                position: 'absolute',
                bottom: spacing.xxxl,
                alignItems: 'center',
                gap: spacing.md,
              }}>
                <Text style={[
                  typography.subtitle,
                  {
                    fontSize: 14,
                  }
                ]}>
                  Already have an account?
                </Text>
                <Pressable
                  onPress={() => {
                    haptics.light();
                    setShowSignIn(true);
                  }}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{
                    fontSize: 16,
                    color: colors.brandBlue,
                    fontWeight: '600',
                  }}>
                    Sign In
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            // Sign In Screen
            <View style={{
              flex: 1,
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
            }}>
              <View style={{ width: '100%', gap: spacing.lg }}>
                <Text style={[
                  typography.largeTitle,
                  {
                    textAlign: 'center',
                    marginBottom: spacing.lg,
                  }
                ]}>
                  Welcome Back!
                </Text>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    width: '100%',
                    borderWidth: 1,
                    borderColor: colors.borderColor,
                    borderRadius: 12,
                    padding: spacing.md,
                    fontSize: 16,
                    backgroundColor: colors.inputBackground,
                  }}
                />

                <View style={{ width: '100%' }}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    style={{
                      width: '100%',
                      borderWidth: 1,
                      borderColor: colors.borderColor,
                      borderRadius: 12,
                      padding: spacing.md,
                      paddingRight: 50,
                      fontSize: 16,
                      backgroundColor: colors.inputBackground,
                    }}
                  />
                  <Pressable
                    onPress={() => {
                      haptics.light();
                      setShowPassword(!showPassword);
                    }}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: [{ translateY: -12 }]
                    }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color={colors.mediumGray}
                    />
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleForgotPassword}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    alignItems: 'center',
                    marginTop: -8,
                    marginBottom: 8,
                  })}
                >
                  <Text style={{
                    fontSize: 14,
                    color: colors.mediumGray,
                    textDecorationLine: 'underline',
                  }}>
                    Forgot password?
                  </Text>
                </Pressable>

                <Button 
                  title={isLoading ? "Signing In..." : "Sign In"}
                  onPress={handleSignIn}
                  disabled={isLoading}
                  buttonStyle={{
                    backgroundColor: colors.brandBlue,
                    paddingVertical: 16,
                    borderRadius: 25,
                    marginTop: spacing.md,
                    marginBottom: spacing.sm,
                    opacity: isLoading ? 0.5 : 1,
                  }}
                  textStyle={{
                    fontSize: 18,
                    fontWeight: '600',
                  }}
                />

                {isAppleAvailable && (
                  <View style={{ 
                    opacity: isLoading ? 0.5 : 1,
                    width: '100%'
                  }}>
                    {isLoading ? (
                      <View
                        style={{
                          width: '100%',
                          height: 55,
                          marginBottom: spacing.md,
                          backgroundColor: colors.black,
                          borderRadius: 25,
                        }}
                      />
                    ) : (
                      <AppleAuthentication.AppleAuthenticationButton
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                        cornerRadius={25}
                        style={{
                          width: '100%',
                          height: 55,
                          marginBottom: spacing.md,
                        }}
                        onPress={handleAppleSignIn}
                      />
                    )}
                  </View>
                )}

                <Pressable
                  onPress={() => {
                    haptics.light();
                    setShowSignIn(false);
                  }}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    alignItems: 'center',
                    marginTop: spacing.md,
                  })}
                >
                  <Text style={{
                    fontSize: 16,
                    color: colors.mediumGray,
                  }}>
                    Back
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </Animated.View>
      </TouchableWithoutFeedback>
      
      {/* Password Reset Modal */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="slide"
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}>
            <View style={{
              width: '85%',
              backgroundColor: colors.white,
              borderRadius: 12,
              padding: spacing.lg,
              gap: spacing.md,
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '600',
                marginBottom: spacing.sm,
                textAlign: 'center',
              }}>
                Reset Password
              </Text>
              
              <TextInput
                value={resetEmail}
                onChangeText={setResetEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  borderRadius: 8,
                  padding: spacing.md,
                  fontSize: 16,
                }}
              />
              
              <View style={{
                flexDirection: 'row',
                gap: spacing.md,
                marginTop: spacing.md,
              }}>
                <Pressable
                  onPress={() => setShowResetModal(false)}
                  style={({ pressed }) => ({
                    flex: 1,
                    padding: spacing.md,
                    borderRadius: 8,
                    backgroundColor: colors.disabledBackground,
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{
                    fontSize: 16,
                    color: colors.mediumGray,
                    fontWeight: '600',
                  }}>
                    Cancel
                  </Text>
                </Pressable>
                
                <Pressable
                  onPress={handleResetPassword}
                  disabled={isLoading}
                  style={({ pressed }) => ({
                    flex: 1,
                    padding: spacing.md,
                    borderRadius: 8,
                    backgroundColor: colors.brandBlue,
                    alignItems: 'center',
                    opacity: pressed || isLoading ? 0.7 : 1,
                  })}
                >
                  <Text style={{
                    fontSize: 16,
                    color: colors.white,
                    fontWeight: '600',
                  }}>
                    {isLoading ? 'Sending...' : 'Send Reset Email'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
} 

