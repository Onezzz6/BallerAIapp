import { Dimensions, View, Text, Image, Pressable, TextInput, Alert, Keyboard, TouchableWithoutFeedback, Modal, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withRepeat,
  Easing,
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
import analyticsService from '../services/analytics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

// Default empty onboarding data
const defaultOnboardingData = {
  hasSmartwatch: null,
  footballGoal: null,
  improvementFocus: null,
  trainingFrequency: null,
  motivation: null,
};

// ---------------------------------------------------------------------------
//  PHONE CAROUSEL -----------------------------------------------------------
// ---------------------------------------------------------------------------

const PhoneCarousel: React.FC = () => {
  // ---- timing configuration ---------------------------------------------
  const ENTER_MS = 600;   // swift, smooth slide-in
  const PAUSE_MS = 1200;  // time to glance at the centre (0.5s longer)
  const EXIT_MS  = 600;   // swift slide-out

  const PHONE_CYCLE = ENTER_MS + PAUSE_MS + EXIT_MS;  // 2 400 ms per phone
  const PHONE_COUNT = 7;
  const HANDOFF_OFFSET = ENTER_MS + PAUSE_MS;         // 1 800 ms - when exit starts
  const TOTAL_MS    = (PHONE_COUNT - 1) * HANDOFF_OFFSET + PHONE_CYCLE; // 13 200 ms - no gap

  // ---- geometry (screen-relative) ---------------------------------------
  const { width: W, height: H } = Dimensions.get('window');
  const START_X  =  W / 2 + 150;        // fully off the right edge
  const END_X    = -W / 2 - 150;        // fully off the left edge
  const START_Y  =  H / 2 + 250;        // below bottom edge
  const CENTRE_Y = -H * 0.10;           // slightly above vertical centre

  // ---- single repeating clock (milliseconds) ----------------------------
  const clock = useSharedValue(0);

  useEffect(() => {
    // Ensure clock starts at exactly 0 to fix first phone positioning
    clock.value = 0;
    
    clock.value = withRepeat(
      withTiming(TOTAL_MS, { duration: TOTAL_MS, easing: Easing.linear }),
      -1, // repeat forever
      false,
    );
  }, []);

  // ---- per-phone transform ----------------------------------------------
  const makeStyle = (index: number) =>
    useAnimatedStyle(() => {
      // local time for this phone in ms - next phone starts when current phone begins exit
      const tMs = clock.value - index * HANDOFF_OFFSET;

      // outside its active window → keep it hidden (off-screen)
      if (tMs < 0 || tMs >= PHONE_CYCLE) {
        return {
          transform: [
            { translateX: START_X },
            { translateY: START_Y },
            { rotate: '-25deg' },
          ],
        } as const;
      }

      const p = tMs / PHONE_CYCLE; // normalised 0-1 progress

      const enterFrac = ENTER_MS / PHONE_CYCLE;  // ≈ 0.3158
      const pauseFrac = PAUSE_MS / PHONE_CYCLE;  // ≈ 0.3684
      // exitFrac implicitly what remains to 1

      let x: number, y: number, r: string, scale: number;

      if (p < enterFrac) {
        // ↗ entering
        const q = p / enterFrac; // 0-1
        x = START_X - START_X * q;                 // START_X → 0
        y = START_Y - (START_Y - CENTRE_Y) * q;    // START_Y → CENTRE_Y
        r = `${-25 + 25 * q}deg`;                  // -25° → 0°
        scale = 1; // Normal size during entry
      } else if (p < enterFrac + pauseFrac) {
        // ■ pause with zoom effect
        x = 0;
        y = CENTRE_Y;
        r = '0deg';
        
        // Create zoom in/out effect during pause
        const pauseProgress = (p - enterFrac) / pauseFrac; // 0-1 during pause
        // Use sine wave for smooth zoom in and out: 0 → 1 → 0
        const zoomCurve = Math.sin(pauseProgress * Math.PI); // Creates a smooth 0→1→0 curve
        scale = 1 + (zoomCurve * 0.25); // Scale from 1.0 to 1.25 and back to 1.0 (bigger zoom)
      } else {
        // ↙ exiting
        const q = (p - enterFrac - pauseFrac) / (1 - enterFrac - pauseFrac); // 0-1
        x = 0 + END_X * q;                       // 0 → END_X
        y = CENTRE_Y + (START_Y - CENTRE_Y) * q; // CENTRE_Y → START_Y
        r = `${0 + 25 * q}deg`;                  // 0° → +25°
        scale = 1; // Normal size during exit
      }

      return {
        transform: [
          { translateX: x },
          { translateY: y },
          { rotate: r },
          { scale: scale },
        ],
      } as const;
    });

  // ---- images ------------------------------------------------------------
  const phoneImages = [
    require('../../assets/images/p1.png'),
    require('../../assets/images/p5.png'), // p5 jumps to second position
    require('../../assets/images/p2.png'),
    require('../../assets/images/p3.png'),
    require('../../assets/images/p4.png'),
    require('../../assets/images/p6.png'),
    require('../../assets/images/p7.png'),
  ];

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {phoneImages.map((img, i) => (
        <Animated.View
          key={i}
          style={[{ position: 'absolute', width: 200, height: 400 }, makeStyle(i)]}
        >
          <Image source={img} style={{ width: '100%', height: '100%', borderRadius: 25 }} />
        </Animated.View>
      ))}
    </View>
  );
};

// ---------------------------------------------------------------------------
//  WELCOME SCREEN (everything else unchanged) ------------------------------
// ---------------------------------------------------------------------------

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
  const [isGoogleAvailable, setIsGoogleAvailable] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  
  // Use onboarding navigation system
  const { goToNext } = useOnboardingStep('welcome');



  // Log welcome event when screen loads (but only after a delay to prevent logging for users being sorted)
  useEffect(() => {
    const logWelcomeEvent = async () => {
      try {
        // Wait 1 second before logging to prevent analytics for users being immediately redirected
        await new Promise(resolve => setTimeout(resolve, 1000));
        await analyticsService.logEvent('A0_01_welcome');
      } catch (error) {
        console.error("Error logging '01_welcome' event:", error);
      }
    };
    
    // Only log if user stays on welcome screen for more than 1 second
    const timer = setTimeout(logWelcomeEvent, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Request ATT permission after slight delay
  useEffect(() => {
    const trackTimer = setTimeout(async () => {
      try {
        await requestAppTrackingPermission();
      } catch (e) {
        console.error('ATT request failed', e);
      }
    }, 2000);
    return () => clearTimeout(trackTimer);
  }, []);

  // Check social auth availability
  useEffect(() => {
    const checkSocialAuthAvailability = async () => {
      try {
        setIsAppleAvailable(await AppleAuthentication.isAvailableAsync());
      } catch (e) {
        console.error('Apple auth availability error', e);
        setIsAppleAvailable(false);
      }

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

  // ------------------------------------------------------- helper handlers
  const dismissKeyboard = () => Keyboard.dismiss();

  const handleGetStarted = async () => {
    analyticsService.logEvent('A0_01_welcome_get_started');
    goToNext();
  };

  // ----- sign-in, reset password, Apple auth … -----------
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
        markAuthenticationComplete();
        await runPostLoginSequence(
          user.uid,
          () => router.replace('/(tabs)/home'),
          () => router.replace('/'),
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
        Alert.alert('Error', 'Failed to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      const { exists, user, wasCanceled } = await authService.checkAppleSignIn();
      
      if (exists && user && user.uid) {
        const isValidUser = await authService.verifyCompleteUserAccount(user.uid);
        
        if (isValidUser) {
          haptics.success();
          markAuthenticationComplete();
          await runPostLoginSequence(
            user.uid,
            () => router.replace('/(tabs)/home'),
            () => router.replace('/'),
            pathname
          );
          return;
        } else {
          haptics.error();
          showNoAccountAlert();
          router.replace('/(onboarding)/sign-up');
          return;
        }
      } else if (!wasCanceled) {
        haptics.error();
        showNoAccountAlert();
      }
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        haptics.error();
        Alert.alert('Sign in with Apple Failed', 'Failed to sign in with Apple. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const showNoAccountAlert = () => {
    Alert.alert(
      'Account Not Found',
      'No account found with this Apple ID. You need to create one to continue.',
      [{ text: 'OK', onPress: () => setShowSignIn(true) }]
    );
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      console.log("Starting Google Sign-In...");
      
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

      // Create Google credential for Firebase
      console.log('Creating Google credential...');
      const credential = GoogleAuthProvider.credential(idToken);

      // Sign in with Firebase using Google credentials
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      
      if (user) {
        haptics.success();
        markAuthenticationComplete();
        await runPostLoginSequence(
          user.uid,
          () => router.replace('/(tabs)/home'),
          () => router.replace('/'),
          pathname
        );
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      haptics.error();
      
      if (error.code === 'auth/user-not-found') {
        Alert.alert('Account Not Found', 'No account found with this Google account. Please create an account first.');
      } else if (error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Error', error.message || 'Google Sign-In failed');
      }
    } finally {
      setIsLoading(false);
    }
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
      Alert.alert('Password Reset Email Sent', 'Check your email for instructions to reset your password.');
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

  // -----------------------------------------------------------------------
  return (
    <>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={{ flex: 1 }}>
          {/* top half: white background */}
          <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            {!showSignIn ? (
              // Get Started view ─ shows the phone carousel
              <View style={{ flex: 1 }}>
                <PhoneCarousel />
              </View>
            ) : (
              // Sign-in form
              <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg }}>
                <View style={{ width: '100%', gap: spacing.lg }}>
                  <Text style={[
                    typography.largeTitle,
                    {
                      textAlign: 'center',
                      marginBottom: spacing.xl,
                    }
                  ]}>
                    Welcome Back!
                  </Text>

                  {!showEmailForm ? (
                    // Show three uniform buttons initially
                    <View style={{ gap: spacing.md }}>
                      {/* Email Sign In Button */}
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
                          borderColor: colors.brandBlue,
                          opacity: isLoading ? 0.5 : 1,
                        }}
                        onPress={() => {
                          haptics.light();
                          setShowEmailForm(true);
                        }}
                        disabled={isLoading}
                      >
                        <Ionicons name="mail-outline" size={24} color={colors.brandBlue} />
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: colors.brandBlue,
                          marginLeft: 12,
                        }}>
                          Continue with Email
                        </Text>
                      </Pressable>

                      {/* Apple Sign In */}
                      {isAppleAvailable && (
                        <View style={{ opacity: isLoading ? 0.5 : 1 }}>
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
                              onPress={handleAppleSignIn}
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
                          onPress={handleGoogleSignIn}
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
                  ) : (
                    // Show email form when email button is pressed
                    <View style={{ width: '100%' }}>
                      <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          placeholder="Enter your email"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoFocus
                          style={{
                            borderWidth: 1,
                            borderColor: colors.borderColor,
                            borderRadius: 12,
                            padding: spacing.md,
                            fontSize: 16,
                            backgroundColor: colors.inputBackground,
                          }}
                        />

                        <View style={{ position: 'relative' }}>
                          <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter your password"
                            secureTextEntry={!showPassword}
                            style={{
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
                              right: 16,
                              top: 16,
                            }}
                          >
                            <Ionicons
                              name={showPassword ? 'eye-off' : 'eye'}
                              size={24}
                              color={colors.mediumGray}
                            />
                          </Pressable>
                        </View>
                      </View>

                      <Pressable
                        onPress={handleForgotPassword}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                          alignItems: 'center',
                          marginBottom: spacing.md,
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
                          marginBottom: spacing.lg,
                          opacity: isLoading ? 0.5 : 1,
                        }}
                        textStyle={{
                          fontSize: 18,
                          fontWeight: '600',
                        }}
                      />

                      <Pressable
                        onPress={() => {
                          haptics.light();
                          setShowEmailForm(false);
                          setEmail('');
                          setPassword('');
                        }}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                          alignItems: 'center',
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
                  )}

                  {!showEmailForm && (
                    <Pressable
                      onPress={() => {
                        haptics.light();
                        setShowSignIn(false);
                      }}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                        alignItems: 'center',
                        marginTop: spacing.lg,
                      })}
                    >
                      <Text style={{
                        fontSize: 16,
                        color: colors.mediumGray,
                      }}>
                        Back
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* fixed bottom sheet (unchanged) */}
          {!showSignIn && (
            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: 60,
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}>
                <Text style={{ fontSize: 28, fontWeight: '700', textAlign: 'center', color: colors.black, lineHeight: 34, marginBottom: 16 }} allowFontScaling={false}>
                  Living like the pros{'\n'}made easy!
                </Text>
              <Button
                title="Get Started"
                onPress={handleGetStarted}
                buttonStyle={{ backgroundColor: colors.brandBlue, paddingVertical: 18, borderRadius: 36, width: '100%', marginBottom: 16 }}
                textStyle={{ fontSize: 18, fontWeight: '600', color: colors.white }}
              />
              <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, color: colors.mediumGray }}>
                  Already have an account?{' '}
                </Text>
                <Pressable
                  onPress={() => {
                    haptics.light();
                    setShowSignIn(true);
                  }}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    alignItems: 'center',
                  })}
                >
                  <Text style={{
                    fontSize: 16,
                    color: colors.brandBlue,
                  }}>
                    Sign In
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Password reset modal */}
      <Modal visible={showResetModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
                    borderRadius: 32,
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
                    borderRadius: 32,
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
                    {isLoading ? 'Sending Link...' : 'Reset'}
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

