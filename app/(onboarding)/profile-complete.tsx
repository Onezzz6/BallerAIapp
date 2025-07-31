import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, Image, Dimensions } from 'react-native';
import Animated, { 
  FadeInRight, 
  FadeInDown, 
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useHaptics } from '../../utils/haptics';
import Button from '../components/Button';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import analyticsService from '../../services/analytics';
import { colors, typography } from '../../utils/theme';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { useOnboarding } from '../../context/OnboardingContext';
import Purchases, { PurchasesOfferings } from 'react-native-purchases';
import { configureRevenueCat, setReferralCode } from '../../services/revenuecat';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

const ENTITLEMENT_ID = "BallerAISubscriptionGroup";

// Session-based event tracking to prevent duplicates
let sessionEventTracker = {
  paywallPresented: false,
  paywallPurchased: false,
  oneTimeOfferPurchased: false,
  reset: () => {
    sessionEventTracker.paywallPresented = false;
    sessionEventTracker.paywallPurchased = false;
    sessionEventTracker.oneTimeOfferPurchased = false;
  }
};

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
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('profile-complete');

  const handleGetStarted = async () => {
    // Prevent double-clicking
    if (isCreatingAccount) {
      console.log('Profile complete already in progress, ignoring click');
      return;
    }
    
    haptics.light();
    setIsCreatingAccount(true);
    
    // Reset session event tracker for new onboarding session
    sessionEventTracker.reset();
    console.log('🔥 ANALYTICS: Session event tracker reset for new onboarding session');
    
    await analyticsService.logEvent('A0_31_profile_complete_get_started');
    
    try {
      console.log('Profile complete - checking if device already has subscription...');
      
      // Configure RevenueCat to check device subscription status
      await configureRevenueCat();
      
      // CRITICAL: Clear cache to ensure fresh subscription data
      console.log('🔥 SUBSCRIPTION_DEBUG - Clearing RevenueCat cache before subscription check');
      try {
        if (typeof Purchases.invalidateCustomerInfoCache === 'function') {
          await Purchases.invalidateCustomerInfoCache();
        }
      } catch (cacheError) {
        console.log('🔥 SUBSCRIPTION_DEBUG - Cache clear failed (non-critical):', cacheError);
      }
      
      // Check if this device already has an active subscription
      const customerInfo = await Purchases.getCustomerInfo();
      const hasActiveSubscription = !!customerInfo.entitlements.active[ENTITLEMENT_ID];

      console.log('🔥 SUBSCRIPTION_DEBUG - Profile complete subscription check:', {
        hasActiveSubscription,
        originalAppUserId: customerInfo.originalAppUserId,
        entitlements: Object.keys(customerInfo.entitlements.active),
        allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
      });

      if (hasActiveSubscription) {
        console.log('✅ Found existing subscription on device - skipping paywall');
        console.log('🎯 DEBUG - This will go directly to sign-up, bypassing paywall');
        console.log('User probably purchased but didn\'t complete sign-up, navigating directly to sign-up');
        await analyticsService.logEvent('A0_31_existing_subscription_found');
        router.replace('/(onboarding)/sign-up');
        return;
      }

      console.log('❌ No existing subscription found on device - showing paywall first');
      console.log('🎯 DEBUG - This will show paywall for new purchase');
      await analyticsService.logEvent('A0_31_no_subscription_showing_paywall');
      
      // Fetch offerings for paywall modal
      const offeringsResult = await Purchases.getOfferings();
      await presentPaywallModal(offeringsResult);

    } catch (error) {
      console.error('Error checking subscription status:', error);
      console.log('Subscription check failed, defaulting to paywall flow');
      await analyticsService.logEvent('A0_31_profile_complete_error');
      router.replace('/(onboarding)/paywall');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const presentPaywallModal = async (offeringsResult: PurchasesOfferings) => {
    try {
      console.log('Showing paywall based on referral code status');
      
      // Prevent duplicate paywall presented events
      if (!sessionEventTracker.paywallPresented) {
        await analyticsService.logEvent('A0_32_paywall_presented');
        sessionEventTracker.paywallPresented = true;
        console.log('🔥 ANALYTICS: A0_32_paywall_presented logged (first time this session)');
      } else {
        console.log('🔥 ANALYTICS: A0_32_paywall_presented SKIPPED (already logged this session)');
      }
      
      const hasReferralCode = onboardingData.referralCode;
      const paywallType = onboardingData.referralPaywallType;
      let paywallResult;
      let offeringUsed = null;

      if (hasReferralCode && paywallType === 'freetrial') {
        console.log('🎁 Showing FREE TRIAL paywall for referral user');
        const freeTrialOffering = offeringsResult.all['FreeTrialOffering'];
        offeringUsed = freeTrialOffering;
        if (freeTrialOffering) {
          paywallResult = await RevenueCatUI.presentPaywall({ offering: freeTrialOffering });
        } else {
          console.warn('FreeTrialOffering not found, falling back to StandardOffering');
          const standardOffering = offeringsResult.all['StandardOffering'];
          if (standardOffering) {
            paywallResult = await RevenueCatUI.presentPaywall({ offering: standardOffering });
          } else {
            console.warn('StandardOffering also not found, using presentPaywallIfNeeded');
            paywallResult = await RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: ENTITLEMENT_ID });
          }
        }
      } else if (hasReferralCode) {
        console.log('🎁 Showing DISCOUNT paywall for referral user');
        const referralOffering = offeringsResult.all['ReferralOffering'];
        offeringUsed = referralOffering;
        if (referralOffering) {
          paywallResult = await RevenueCatUI.presentPaywall({ offering: referralOffering });
        } else {
          console.warn('ReferralOffering not found, falling back to StandardOffering');
          const standardOffering = offeringsResult.all['StandardOffering'];
          if (standardOffering) {
            paywallResult = await RevenueCatUI.presentPaywall({ offering: standardOffering });
          } else {
            console.warn('StandardOffering also not found, using presentPaywallIfNeeded');
            paywallResult = await RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: ENTITLEMENT_ID });
          }
        }
      } else {
        console.log('💰 Showing STANDARD paywall for regular user');
        const regularOffering = offeringsResult.all['StandardOffering'] || offeringsResult.current;
        offeringUsed = regularOffering;
        if (regularOffering) {
          paywallResult = await RevenueCatUI.presentPaywall({ offering: regularOffering });
        } else {
          console.warn('StandardOffering not found, using presentPaywallIfNeeded as final fallback');
          paywallResult = await RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: ENTITLEMENT_ID });
        }
      }

      if (paywallResult === PAYWALL_RESULT.PURCHASED || paywallResult === PAYWALL_RESULT.RESTORED) {
        console.log('✅ Purchase/restore successful - navigating to sign-up');
        
        // Prevent duplicate purchase events
        if (paywallResult === PAYWALL_RESULT.PURCHASED && !sessionEventTracker.paywallPurchased) {
          try {
            // Get fresh customer info to find the actual purchased product
            const customerInfo = await Purchases.getCustomerInfo();
            const activeEntitlements = customerInfo.entitlements.active;
            
            // Only log if user actually has active subscription (prevents false positives)
            if (activeEntitlements[ENTITLEMENT_ID]) {
              const purchasedProduct = activeEntitlements[ENTITLEMENT_ID].productIdentifier;
              
              // Determine paywall type based on offering used
              let analyticsPaywallType = 'standard';
              if (hasReferralCode && paywallType === 'freetrial') {
                analyticsPaywallType = 'free_trial';
              } else if (hasReferralCode) {
                analyticsPaywallType = 'referral';
              }
              
              await analyticsService.logEvent('A0_32_paywall_purchased', {
                product_id: purchasedProduct,
                paywall_type: analyticsPaywallType,
                offering_identifier: offeringUsed?.identifier || 'default'
              });
              
              sessionEventTracker.paywallPurchased = true;
              console.log('🔥 ANALYTICS: A0_32_paywall_purchased logged (first time this session)');
            } else {
              console.log('🔥 ANALYTICS: A0_32_paywall_purchased SKIPPED (no active subscription found)');
            }
          } catch (error) {
            console.error('Error logging paywall purchase:', error);
          }
        } else if (paywallResult === PAYWALL_RESULT.PURCHASED) {
          console.log('🔥 ANALYTICS: A0_32_paywall_purchased SKIPPED (already logged this session)');
        }
        
        router.replace('/(onboarding)/sign-up');
      } else {
        console.log('❌ Paywall cancelled - navigating to one-time offer');
        router.replace('/(onboarding)/one-time-offer');
      }
    } catch (error) {
      console.error('Error presenting paywall:', error);
      router.replace('/(onboarding)/one-time-offer');
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
          title={"Let's Get Started!"} 
          onPress={handleGetStarted}
          disabled={isCreatingAccount}
        />
      </View>
    </SafeAreaView>
  );
} 