import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Alert, 
  TextInput, 
  Modal, 
  ScrollView, 
  Image, 
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import authService from '../../services/auth';
import { useOnboarding } from '../../context/OnboardingContext';
import * as AppleAuthentication from 'expo-apple-authentication';
import Button from '../components/Button';
import analyticsService from '../../services/analytics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  Easing,
  FadeInRight
} from 'react-native-reanimated';
// Dashboard version: No paywall logic needed
import { colors, typography, spacing, borderRadius } from '../../utils/theme';
import { useHaptics } from '../../utils/haptics';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import auth from '@react-native-firebase/auth';
import { db } from '../../config/firebase';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { requestAppTrackingPermission } from '../../utils/tracking';

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

  useEffect(() => {
    // Log welcome event when screen loads (but only after a delay to prevent logging for users being sorted)
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
        // COMPREHENSIVE DIAGNOSTIC LOGGING - Remove after issue is resolved
        console.log('🔍 [GOOGLE_DIAGNOSTIC] === COMPLETE ENVIRONMENT ANALYSIS ===');
        console.log('🔍 [GOOGLE_DIAGNOSTIC] Platform:', Platform.OS);
        console.log('🔍 [GOOGLE_DIAGNOSTIC] Constants.expoConfig exists:', !!Constants.expoConfig);
        console.log('🔍 [GOOGLE_DIAGNOSTIC] Constants.expoConfig.extra exists:', !!Constants.expoConfig?.extra);
        
        // Log ALL extra config keys to see what's available
        const extraKeys = Constants.expoConfig?.extra ? Object.keys(Constants.expoConfig.extra) : [];
        console.log('🔍 [GOOGLE_DIAGNOSTIC] Available extra config keys:', extraKeys);
        
        // Get the Web Client ID and analyze it
        const webClientId = Constants.expoConfig?.extra?.googleWebClientId;
        console.log('🔍 [GOOGLE_DIAGNOSTIC] googleWebClientId exists:', !!webClientId);
        console.log('🔍 [GOOGLE_DIAGNOSTIC] googleWebClientId type:', typeof webClientId);
        console.log('🔍 [GOOGLE_DIAGNOSTIC] googleWebClientId length:', webClientId?.length || 'N/A');
        console.log('🔍 [GOOGLE_DIAGNOSTIC] FULL googleWebClientId:', webClientId);
        
        // Check if it contains the expected patterns
        const isWorkingClientId = webClientId?.includes('erdilhdkatve342v2ca6ivd5mvjnefj9');
        const isIOSClientId = webClientId?.includes('fkvrcavkkultnmks81lbq7nqv4d4682i');
        console.log('🔍 [GOOGLE_DIAGNOSTIC] Contains WORKING client ID (erdilhd...):', isWorkingClientId);
        console.log('🔍 [GOOGLE_DIAGNOSTIC] Contains iOS client ID (fkvrcav...):', isIOSClientId);
        
        // Log specific Firebase/Google related configs
        console.log('🔍 [GOOGLE_DIAGNOSTIC] firebaseAppId:', Constants.expoConfig?.extra?.firebaseAppId);
        console.log('🔍 [GOOGLE_DIAGNOSTIC] googleApiKey:', Constants.expoConfig?.extra?.googleApiKey ? 'EXISTS' : 'MISSING');
        
        // Final determination
        console.log('🔍 [GOOGLE_DIAGNOSTIC] === CONCLUSION ===');
        if (isWorkingClientId) {
          console.log('✅ [GOOGLE_DIAGNOSTIC] Using CORRECT Web Client ID (erdilhd...)');
        } else if (isIOSClientId) {
          console.log('❌ [GOOGLE_DIAGNOSTIC] Using WRONG iOS Client ID (fkvrcav...)');
        } else {
          console.log('❓ [GOOGLE_DIAGNOSTIC] Using UNKNOWN Client ID:', webClientId);
        }
        console.log('🔍 [GOOGLE_DIAGNOSTIC] === END ANALYSIS ===');
        
        GoogleSignin.configure({
          webClientId: webClientId,
          offlineAccess: true,
        });
        setIsGoogleAvailable(true);
        console.log('✅ [WELCOME_GOOGLE_CONFIG] Google Sign In configured successfully');
      } catch (error) {
        console.error('❌ [WELCOME_GOOGLE_CONFIG] Error configuring Google Sign In:', error);
        console.error('❌ [WELCOME_GOOGLE_CONFIG] Error details:', JSON.stringify(error, null, 2));
        setIsGoogleAvailable(false);
      }
    };
    
    checkSocialAuthAvailability();
  }, []);

  // ------------------------------------------------------- helper handlers
  const dismissKeyboard = () => Keyboard.dismiss();

  const handleGetStarted = async () => {
    haptics.light();
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
        // Dashboard version: Navigate directly to home
        console.log('🎯 Dashboard version - sign-in successful, navigating to home');
        router.replace('/(tabs)/home');
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
      const { user, hasDocument, isValidDocument, wasCanceled } = await authService.authenticateWithApple();
      
      if (hasDocument && user && user.uid) {
        const isValidUser = await authService.verifyUserAccount(user);
        
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
      'No account found with this Apple ID. Please create an account first.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create Account', 
          onPress: () => {
            // Close sign-in modal and let them use the main "Get Started" flow
            setShowSignIn(false);
            setEmail('');
            setPassword('');
          }
        }
      ]
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
        console.log('No ID token received - likely user cancelled:', userInfo);
        // This usually means the user cancelled the sign-in process
        // Don't show error - treat as cancellation
        return;
      }

      // Create Google credential for Firebase
      console.log('Creating Google credential...');
      const credential = auth.GoogleAuthProvider.credential(idToken);

      // Sign in with Firebase using Google credentials
      const userCredential = await auth().signInWithCredential(credential);
      const user = userCredential.user;
      
      if (user) {
        console.log('Firebase auth successful, checking if user document exists...');
        
        // Check if user document exists in Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists || !authService.isValidUserDocument(userDoc.data())) {
          console.log('No valid user document found - this is sign-in only, not sign-up');
          
          // Sign out the newly created user immediately
          await auth().signOut();
          
          haptics.error();
          Alert.alert(
            'Account Not Found', 
            'No account found with this Google account. Please create an account first.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Create Account', 
                onPress: () => {
                  // Close sign-in modal and let them use the main "Get Started" flow
                  setShowSignIn(false);
                  setEmail('');
                  setPassword('');
                }
              }
            ]
          );
          return;
        }
        
        console.log('Valid user document found, proceeding with sign-in');
        haptics.success();
        // Dashboard version: Navigate directly to home
        console.log('🎯 Dashboard version - sign-in successful, navigating to home');
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      
      // Check if user cancelled the sign-in process
      if (error.code === statusCodes.SIGN_IN_CANCELLED || 
          error.code === 'SIGN_IN_CANCELLED' ||
          error.code === statusCodes.IN_PROGRESS ||
          error.message?.includes('SIGN_IN_CANCELLED') ||
          error.message?.includes('cancelled') ||
          error.message?.includes('canceled') ||
          error.message?.includes('The user canceled') ||
          error.message?.includes('User cancelled') ||
          error.toString().includes('cancelled')) {
        console.log('User cancelled Google Sign-In:', error.code || error.message);
        // Don't show error - user cancelled intentionally
      } else {
        // Only show error for actual failures, not cancellations
        haptics.error();
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
                  Welcome to the future of {'\n'} performance
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

