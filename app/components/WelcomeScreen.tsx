import { Dimensions, View, Text, Image, Pressable, TextInput, Alert, Keyboard, TouchableWithoutFeedback, Modal } from 'react-native';
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
import analytics from '@react-native-firebase/analytics';

// Default empty onboarding data
const defaultOnboardingData = {
  hasSmartwatch: null,
  footballGoal: null,
  improvementFocus: null,
  trainingFrequency: null,
  hasGymAccess: null,
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
  const [resetEmail, setResetEmail] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);



  // Log welcome event when screen loads
  useEffect(() => {
    const logWelcomeEvent = async () => {
      try {
        await analytics().logEvent('1welcome');
        console.log("Analytics event '1welcome' logged.");
      } catch (error) {
        console.error("Error logging '1welcome' event:", error);
      }
    };
    logWelcomeEvent();
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

  // Check Apple auth availability
  useEffect(() => {
    (async () => {
      try {
        setIsAppleAvailable(await AppleAuthentication.isAvailableAsync());
      } catch (e) {
        console.error('Apple auth availability error', e);
        setIsAppleAvailable(false);
      }
    })();
  }, []);

  // ------------------------------------------------------- helper handlers
  const dismissKeyboard = () => Keyboard.dismiss();

  const handleGetStarted = () => {
    haptics.light();
    router.push('/(onboarding)/gender');
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

