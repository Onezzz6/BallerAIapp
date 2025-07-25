import { View, Text, SafeAreaView, Image, Dimensions } from 'react-native';
import Animated, { 
  FadeInRight, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import analyticsService from '../services/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import { useOnboarding } from '../context/OnboardingContext';
import { useAuth } from '../context/AuthContext';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { runPostLoginSequence, markAuthenticationComplete } from './paywall';
import { usePathname } from 'expo-router';

// Phone Carousel Component
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

export default function ProfileCompleteScreen() {
  const haptics = useHaptics();
  const router = useRouter();
  const pathname = usePathname();
  const { onboardingData } = useOnboarding();
  const { user } = useAuth();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('profile-complete');

  const handleGetStarted = async () => {
    // Prevent double-clicking
    if (isCreatingAccount) {
      console.log('Account creation already in progress, ignoring click');
      return;
    }
    
    haptics.light();
    setIsCreatingAccount(true);
    
    await analyticsService.logEvent('AA__31_profile_complete_get_started');
    
    try {
      // Create anonymous Firebase Auth user (guaranteed single account)
      console.log('Creating anonymous user account with onboarding data...');
      
      const userCredential = await signInAnonymously(auth);
      const newUser = userCredential.user;
      
      console.log('Anonymous user created successfully:', newUser.uid);
      
      // Create Firestore document with all onboarding data
      await setDoc(doc(db, 'users', newUser.uid), {
        email: null, // Anonymous user has no email until sign-up
        isAnonymous: true,
        isTemporary: true, // Will be set to false after email/password linking
        createdAt: new Date(),
        ...onboardingData
      });
      
      console.log('User document created with onboarding data');
      
      // Mark authentication as complete after account creation
      markAuthenticationComplete();
      
      // Show paywall immediately after account creation
      await runPostLoginSequence(
        newUser.uid,
        // If paywall successful → navigate to sign-up to attach real email
        () => {
          console.log('Paywall successful - navigating to sign-up to attach email');
          router.replace('/(onboarding)/sign-up');
        },
        // If paywall cancelled → navigate to one-time offer screen
        () => {
          console.log('Paywall cancelled - navigating to one-time offer screen');
          router.replace('/(onboarding)/one-time-offer');
        },
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
      console.error('Error creating user account or showing paywall:', error);
      // Reset loading state on error
      setIsCreatingAccount(false);
      // Fallback to old flow if there's an error
      router.push('/(onboarding)/sign-up' as any);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="profile-complete" />

      <Animated.View 
        entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
        }}
      >
        {/* All done badge - positioned higher */}
        <View style={{
          paddingHorizontal: 24,
          paddingTop: 18,
          alignItems: 'center',
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFF3CD',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            marginBottom: 20,
          }}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>✅</Text>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#856404',
            }}>
              All done!
            </Text>
          </View>
        </View>

        {/* Phone Carousel */}
        <View style={{ flex: 1 }}>
          <PhoneCarousel />
        </View>
      </Animated.View>

      {/* Bottom component with text and button */}
      <View style={{
        position: 'absolute',
        bottom: 32,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 14,
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}>
        <Text style={[
          typography.title,
          {
            textAlign: 'center',
            fontSize: 24,
            color: colors.black,
            lineHeight: 28,
            marginBottom: 20,
          }
        ]} allowFontScaling={false}>
          Your fully personalized{'\n'}account is ready
        </Text>
        
        <Button 
          title={isCreatingAccount ? "Creating Account..." : "Let's Get Started!"} 
          onPress={handleGetStarted}
          disabled={isCreatingAccount}
        />
      </View>
    </SafeAreaView>
  );
} 