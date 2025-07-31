import { View, Text, SafeAreaView, Image, Dimensions, StyleSheet } from 'react-native';
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
import { useAuth } from '../../context/AuthContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { runPostLoginSequence, markAuthenticationComplete } from './paywall';
import { usePathname } from 'expo-router';
import analyticsService from '../../services/analytics';
import { colors, typography } from '../../utils/theme';
import { useHaptics } from '../../utils/haptics';

// Phone Carousel Component (same as profile-complete)
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
      const tMs = clock.value - index * HANDOFF_OFFSET;

      if (tMs < 0 || tMs >= PHONE_CYCLE) {
        return {
          transform: [
            { translateX: START_X },
            { translateY: START_Y },
            { rotate: '-25deg' },
          ],
        } as const;
      }

      const p = tMs / PHONE_CYCLE;

      const enterFrac = ENTER_MS / PHONE_CYCLE;
      const pauseFrac = PAUSE_MS / PHONE_CYCLE;

      let x: number, y: number, r: string, scale: number;

      if (p < enterFrac) {
        const q = p / enterFrac;
        x = START_X - START_X * q;
        y = START_Y - (START_Y - CENTRE_Y) * q;
        r = `${-25 + 25 * q}deg`;
        scale = 1;
      } else if (p < enterFrac + pauseFrac) {
        x = 0;
        y = CENTRE_Y;
        r = '0deg';
        
        const pauseProgress = (p - enterFrac) / pauseFrac;
        const zoomCurve = Math.sin(pauseProgress * Math.PI);
        scale = 1 + (zoomCurve * 0.25);
      } else {
        const q = (p - enterFrac - pauseFrac) / (1 - enterFrac - pauseFrac);
        x = 0 + END_X * q;
        y = CENTRE_Y + (START_Y - CENTRE_Y) * q;
        r = `${0 + 25 * q}deg`;
        scale = 1;
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

  const phoneImages = [
    require('../../assets/images/p1.png'),
    require('../../assets/images/p5.png'),
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

export default function PaywallUpsellScreen() {
  const haptics = useHaptics();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { onboardingData } = useOnboarding();

  // This screen is obsolete - redirect to home
  useEffect(() => {
    console.log('⚠️ PaywallUpsellScreen is obsolete, redirecting to home');
    router.replace('/(tabs)/home');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* No back button - users can't go back */}
      
      <Animated.View 
        entering={FadeInRight.duration(300).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Unlock Your Full Potential
          </Text>
          <Text style={styles.subtitle}>
            Join thousands of players already using BallerAI Pro
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>⚽</Text>
            <Text style={styles.benefitText}>Personalized Training Plans</Text>
          </View>
          
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>📊</Text>
            <Text style={styles.benefitText}>Advanced Performance Analytics</Text>
          </View>
          
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>🍎</Text>
            <Text style={styles.benefitText}>AI-Powered Nutrition Guidance</Text>
          </View>
          
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>💪</Text>
            <Text style={styles.benefitText}>Recovery & Injury Prevention</Text>
          </View>
          
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>🏆</Text>
            <Text style={styles.benefitText}>Achieve Your Football Goals Faster</Text>
          </View>
        </View>

        {/* Phone Carousel */}
        <View style={styles.carouselContainer}>
          <PhoneCarousel />
        </View>
      </Animated.View>

      {/* Go Pro Button - Fixed at bottom */}
      <View style={styles.buttonContainer}>
        <Button 
          title="Go Pro" 
          onPress={async () => {
            await analyticsService.logEvent('A0_35_paywall_upsell_go_pro');
            router.push('/(onboarding)/paywall');
          }}
          buttonStyle={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 60,
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsContainer: {
    marginBottom: 32,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
  },
  benefitText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  carouselContainer: {
    flex: 1,
    marginTop: 20,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 34,
    paddingTop: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    backgroundColor: '#4064F6',
    borderRadius: 36,
  },
}); 