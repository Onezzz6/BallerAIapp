import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, Pressable, Image, Alert } from 'react-native';
import Animated, { 
  FadeInRight, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import analyticsService from '../services/analytics';
import { useHaptics } from '../utils/haptics';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

interface CustomUrgencyPaywallProps {
  onPurchaseSuccess: () => void;
  onPurchaseCancel: () => void;
  onRestoreSuccess: () => void;
}

export default function CustomUrgencyPaywall({ 
  onPurchaseSuccess, 
  onPurchaseCancel, 
  onRestoreSuccess 
}: CustomUrgencyPaywallProps) {
  const haptics = useHaptics();
  const { user } = useAuth();
  const { onboardingData } = useOnboarding();

  // Timer state - 5 minutes = 300 seconds
  const [timeLeft, setTimeLeft] = useState(300);
  const [isExpired, setIsExpired] = useState(false);
  
  // RevenueCat state
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // UI state
  const [showMonthly, setShowMonthly] = useState(false);
  const [countryDiscount, setCountryDiscount] = useState('80');

  // Auto-switch selected package when toggling between monthly/yearly
  useEffect(() => {
    if (packages.length > 0) {
      if (showMonthly) {
        // Switch to monthly package
        const monthlyPackage = packages.find(pkg => 
          pkg.identifier.toLowerCase().includes('month') || pkg.packageType === 'MONTHLY'
        );
        if (monthlyPackage) setSelectedPackage(monthlyPackage);
      } else {
        // Switch to yearly package
        const yearlyPackage = packages.find(pkg => 
          pkg.identifier.toLowerCase().includes('year') || pkg.packageType === 'ANNUAL'
        );
        if (yearlyPackage) setSelectedPackage(yearlyPackage);
      }
    }
  }, [showMonthly, packages]);

  // Animation
  const pulseValue = useSharedValue(1);
  
  useEffect(() => {
    // Start pulse animation for urgency
    pulseValue.value = withRepeat(
      withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  // Countdown timer effect - restarts every 5 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Restart timer instead of expiring
          return 300; // Reset to 5 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load RevenueCat offerings
  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      console.log('🔥 Loading CustomUrgencyPaywall offerings...');
      
      // Log paywall presented analytics
      await analyticsService.logEvent('AA__33_urgency_paywall_presented');
      
      const offerings = await Purchases.getOfferings();
      const oneTimeOffer = offerings.all['OneTimeYearlyOffer'];
      
      if (oneTimeOffer && oneTimeOffer.availablePackages.length > 0) {
        console.log('✅ OneTimeYearlyOffer found with packages:', oneTimeOffer.availablePackages.length);
        setPackages(oneTimeOffer.availablePackages);
        
        // Auto-select yearly package by default (since we emphasize yearly)
        const yearlyPackage = oneTimeOffer.availablePackages.find(pkg => 
          pkg.identifier.toLowerCase().includes('year') || 
          pkg.packageType === 'ANNUAL'
        ) || oneTimeOffer.availablePackages[0];
        
        setSelectedPackage(yearlyPackage);
        console.log('📦 Auto-selected package:', yearlyPackage.identifier);
      } else {
        console.warn('⚠️ OneTimeYearlyOffer not found, using current offering');
        const currentOffering = offerings.current;
        if (currentOffering) {
          setPackages(currentOffering.availablePackages);
          setSelectedPackage(currentOffering.availablePackages[0]);
        }
      }
    } catch (error) {
      console.error('❌ Error loading offerings:', error);
      Alert.alert('Error', 'Unable to load subscription options. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate discount percentage
  const calculateDiscount = () => {
    if (packages.length < 2) return null;
    
    const yearlyPackage = packages.find(pkg => 
      pkg.identifier.toLowerCase().includes('year') || pkg.packageType === 'ANNUAL'
    );
    const monthlyPackage = packages.find(pkg => 
      pkg.identifier.toLowerCase().includes('month') || pkg.packageType === 'MONTHLY'
    );

    if (!yearlyPackage || !monthlyPackage) return null;

    const yearlyMonthlyPrice = yearlyPackage.product.price / 12;
    const monthlyPrice = monthlyPackage.product.price;
    const discount = Math.round(((monthlyPrice - yearlyMonthlyPrice) / monthlyPrice) * 100);
    
    return discount > 0 ? discount : null;
  };

  const handlePurchase = async () => {
    if (!selectedPackage || isPurchasing) return;

    haptics.light();
    setIsPurchasing(true);

    try {
      console.log('🛒 Starting purchase for package:', selectedPackage.identifier);
      
      // Log purchase attempt
      await analyticsService.logEvent('AA__33_urgency_paywall_purchase_started', {
        package_id: selectedPackage.identifier,
        price: selectedPackage.product.price,
        currency: selectedPackage.product.currencyCode,
      });

      const result = await Purchases.purchasePackage(selectedPackage);
      
      console.log('✅ Purchase successful:', result.customerInfo.entitlements.active);
      
      // Log successful purchase
      await analyticsService.logEvent('AA__33_urgency_paywall_purchased', {
        package_id: selectedPackage.identifier,
        price: selectedPackage.product.price,
        currency: selectedPackage.product.currencyCode,
        transaction_id: result.customerInfo.originalPurchaseDate,
      });

      onPurchaseSuccess();
      
    } catch (error: any) {
      console.log('❌ Purchase failed or cancelled:', error.message);
      
      // Log cancellation/failure
      await analyticsService.logEvent('AA__33_urgency_paywall_cancelled', {
        error: error.message,
        package_id: selectedPackage.identifier,
      });

      if (error.userCancelled) {
        console.log('User cancelled purchase');
        onPurchaseCancel();
      } else {
        Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (isRestoring) return;

    haptics.light();
    setIsRestoring(true);

    try {
      console.log('🔄 Restoring purchases...');
      
      // Log restore attempt
      await analyticsService.logEvent('AA__33_urgency_paywall_restore_started');

      const result = await Purchases.restorePurchases();
      
      console.log('✅ Restore successful:', result.entitlements.active);
      
      // Check if user has active subscription
      if (Object.keys(result.entitlements.active).length > 0) {
        // Log successful restore
        await analyticsService.logEvent('AA__33_urgency_paywall_restored');
        
        Alert.alert('Restore Successful', 'Your subscription has been restored!');
        onRestoreSuccess();
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases found to restore.');
      }
      
    } catch (error) {
      console.error('❌ Restore failed:', error);
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  const discount = calculateDiscount();

  if (isLoading) {
    return (
      <LinearGradient colors={['#00B050', '#0099A8', '#1976D2']} style={styles.fullScreenContainer}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading offers...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#00B050', '#0099A8', '#1976D2']} style={styles.fullScreenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentContainer}>
                  <Animated.View 
          entering={FadeInRight.duration(300).withInitialValues({ transform: [{ translateX: 400 }] })}
          style={styles.content}
        >
          {/* Background Stars/Sparkles */}
          <View style={styles.backgroundStars}>
            <Text style={[styles.backgroundStar, styles.star1]}>✦</Text>
            <Text style={[styles.backgroundStar, styles.star2]}>✧</Text>
            <Text style={[styles.backgroundStar, styles.star3]}>✦</Text>
            <Text style={[styles.backgroundStar, styles.star4]}>✧</Text>
            <Text style={[styles.backgroundStar, styles.star5]}>✦</Text>
            <Text style={[styles.backgroundStar, styles.star6]}>✧</Text>
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/images/icon.png')} style={styles.logoImage} />
          </View>

          {/* Main Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.mainTitle}>ONE TIME OFFER</Text>
            <Text style={styles.subtitle}>You will never see this again.</Text>
          </View>

          {/* Discount Card */}
          <View style={styles.discountCard}>
            <LinearGradient 
              colors={['#00E676', '#00BCD4', '#2196F3']} 
              style={styles.discountCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.discountCardInner}>
                <Text style={styles.discountPercentage}>{discount || countryDiscount}% OFF</Text>
                <Text style={styles.discountLabel}>FOREVER</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Timer Section */}
          <View style={styles.timerSection}>
            <Text style={styles.timerDescription}>This offer will expire in</Text>
            <Text style={styles.timerDisplay}>{formatTime(timeLeft)}</Text>
          </View>
        </Animated.View>
        </ScrollView>

        {/* Fixed Bottom Footer */}
        <LinearGradient 
          colors={['rgba(0, 180, 80, 0.1)', 'rgba(0, 153, 168, 0.4)', 'rgba(25, 118, 210, 0.7)', 'rgba(0, 50, 100, 0.9)']} 
          style={styles.fixedFooter}
        >
          {/* Plan Toggle */}
          <View style={styles.planToggleContainer}>
            <Pressable 
              style={styles.toggleSwitch}
              onPress={() => setShowMonthly(!showMonthly)}
            >
              <View style={[styles.toggleTrack, showMonthly && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, showMonthly && styles.toggleThumbActive]} />
              </View>
              <Text style={styles.toggleText}>
                {showMonthly ? 'Show Yearly (Recommended)' : 'Show Monthly'}
              </Text>
            </Pressable>
          </View>

          {/* Pricing Card */}
          <View style={styles.pricingContainer}>
            {packages
              .filter(pkg => {
                const isYearly = pkg.identifier.toLowerCase().includes('year') || pkg.packageType === 'ANNUAL';
                return showMonthly ? !isYearly : isYearly;
              })
              .map((pkg, index) => {
                const isYearly = pkg.identifier.toLowerCase().includes('year') || pkg.packageType === 'ANNUAL';
                
                return (
                  <Pressable key={pkg.identifier} style={styles.productCard} onPress={() => setSelectedPackage(pkg)}>
                    {/* "LOWEST PRICE EVER" Badge */}
                    <LinearGradient 
                      colors={['#00E676', '#00BCD4']} 
                      style={styles.priceBadge}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.priceBadgeText}>LOWEST PRICE EVER</Text>
                    </LinearGradient>

                    {/* Product Details */}
                    <View style={styles.productDetails}>
                      <View style={styles.productLeft}>
                        <Text style={styles.productTitle}>
                          {isYearly ? 'Yearly' : 'Monthly'}
                        </Text>
                        <Text style={styles.productSubtitle}>
                          {isYearly ? '12mo • ' + pkg.product.priceString : '1mo • ' + pkg.product.priceString}
                        </Text>
                      </View>
                      <View style={styles.productRight}>
                        <Text style={styles.productPrice}>
                          {isYearly ? (parseFloat(pkg.product.priceString.replace(/[^0-9.]/g, '')) / 12).toFixed(2) + ' €/mo' : pkg.product.priceString}
                        </Text>
                        {isYearly && (
                          <Text style={styles.billedText}>
                            Billed at {pkg.product.priceString}/yr.
                          </Text>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })
            }
          </View>

          {/* CTA Button */}
          <Pressable 
            style={[styles.claimButton, (isPurchasing || !selectedPackage) && styles.disabledButton]}
            onPress={handlePurchase}
            disabled={isPurchasing || !selectedPackage}
          >
            <LinearGradient 
              colors={['#00E676', '#00BCD4']} 
              style={styles.claimButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.claimButtonText}>
                {isPurchasing ? 'Processing...' : 'CLAIM YOUR OFFER NOW'}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Footer Text */}
          <Text style={styles.footerText}>Cancel anytime • Finally go pro!</Text>
        </LinearGradient>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    position: 'relative',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 300,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flex: 1,
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  mainTitleContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },

  mainSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E8F5E8',
    textAlign: 'center',
  },
  discountHeroContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  middleWhiteArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  timerInMiddle: {
    alignItems: 'center',
  },
  timerLabelMiddle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 8,
    textAlign: 'center',
  },
  timerTextMiddle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333333',
    fontVariant: ['tabular-nums'],
  },
  expiredTextMiddle: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '400',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  starLeft: {
    fontSize: 35,
    marginRight: 15,
    transform: [{ rotate: '-15deg' }],
    color: '#FFD700',
  },
  starRight: {
    fontSize: 35,
    marginLeft: 15,
    transform: [{ rotate: '15deg' }],
    color: '#FFD700',
  },
  discountHeroText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 2,
  },
  foreverText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: -8,
    letterSpacing: 2,
  },
  expiredText: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },

  pricingContainer: {
    width: '100%',
    marginBottom: 16,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#ffffff',
  },
  yearlyCard: {
    // Additional styling for yearly if needed
  },
  discountBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  discountBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
    marginTop: 8,
  },
  selectedText: {
    color: '#4CAF50',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333333',
    marginBottom: 4,
  },
  planSubtext: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  selectedSubtext: {
    color: '#4CAF50',
  },
  checkmark: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cccccc',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCircle: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  checkText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  purchaseButton: {
    backgroundColor: '#8BC34A',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  purchaseButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  footerBlock: {
    marginTop: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingTop: 15,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  footerLink: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  disabledLink: {
    color: '#cccccc',
  },
  planToggleContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 0,
  },
  toggleSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleTrack: {
    width: 50,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#333333',
    marginRight: 12,
    padding: 2,
  },
  toggleTrackActive: {
    backgroundColor: '#4CAF50',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
  },
  toggleThumbActive: {
    marginLeft: 24,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  singlePricingCard: {
    position: 'relative',
    width: '100%',
  },
  topDiscountBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: '#8BC34A',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
  },
  topDiscountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  
  // New Reference Design Styles
  backgroundStars: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  backgroundStar: {
    position: 'absolute',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
  },
  star1: {
    top: 80,
    left: 30,
  },
  star2: {
    top: 140,
    right: 40,
  },
  star3: {
    top: 200,
    left: 60,
  },
  star4: {
    top: 280,
    right: 30,
  },
  star5: {
    top: 360,
    left: 40,
  },
  star6: {
    top: 420,
    right: 60,
  },
  
  logoContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  logoImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  
  titleContainer: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  
  discountCard: {
    alignItems: 'center',
    marginBottom: 40,
  },
  discountCardGradient: {
    borderRadius: 20,
    padding: 2,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  discountCardInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 18,
    paddingVertical: 30,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  discountPercentage: {
    fontSize: 60,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: -8,
  },
  discountLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 2,
  },
  
  timerSection: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  timerDescription: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  
  productCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: '100%',
  },
  priceBadge: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  priceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1,
  },
  productDetails: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 80,
  },
  productLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  productSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  productRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 120,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 2,
  },
  billedText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 16,
  },
  
  claimButton: {
    marginBottom: 8,
    marginTop: 8,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: '100%',
  },
  claimButtonGradient: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  claimButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
}); 