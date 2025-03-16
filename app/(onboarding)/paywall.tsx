import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';
import * as InAppPurchases from 'expo-in-app-purchases';
import { SUBSCRIPTION_SKUS, initializeIAP, purchaseSubscription, cleanupIAP } from '../config/iap';

type SubscriptionPlan = {
  id: string;
  productId: string;
  duration: string;
  price: string;
  period: string;
  totalPrice: string;
  period2: string;
  isPopular?: boolean;
  isBestValue?: boolean;
  product?: InAppPurchases.IAPItemDetails;
};

type Review = {
  id: string;
  name: string;
  rating: number;
  comment: string;
};

const SUBSCRIPTION_IDS = {
  monthly: 'BallerAISubscriptionOneMonth',
  yearly: 'BallerAISubscriptionOneYear'
};

const PaywallScreen = () => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string>('12months');
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([
    {
      id: '1month',
      productId: SUBSCRIPTION_SKUS.monthly,
      duration: '1',
      price: '9.99',
      period: 'per month',
      totalPrice: '9,99 €',
      period2: 'monthly',
    },
    {
      id: '12months',
      productId: SUBSCRIPTION_SKUS.yearly,
      duration: '12',
      price: '4.99',
      period: 'per month',
      totalPrice: '59,99 €',
      period2: 'yearly',
      isBestValue: true,
    }
  ]);

  useEffect(() => {
    const setupIAP = async () => {
      try {
        console.log('[Paywall] Setting up IAP...');
        const products = await initializeIAP();
        console.log('[Paywall] Products received:', products);
        if (products && products.length > 0) {
          const updatedPlans = subscriptionPlans.map(plan => {
            const product = products.find(p => p.productId === plan.productId);
            if (product) {
              console.log('[Paywall] Found matching product for plan:', plan.id);
              return {
                ...plan,
                price: product.price,
                product
              };
            }
            console.log('[Paywall] No matching product found for plan:', plan.id);
            return plan;
          });
          console.log('[Paywall] Updated subscription plans:', updatedPlans);
          setSubscriptionPlans(updatedPlans);
        } else {
          console.log('[Paywall] No products received from IAP');
        }
      } catch (error) {
        console.error('[Paywall] Error setting up IAP:', error);
      }
    };

    setupIAP();
    return () => {
      console.log('[Paywall] Cleaning up IAP...');
      cleanupIAP();
    };
  }, []);

  const reviews: Review[] = [
    {
      id: '1',
      name: 'Carlos D.',
      rating: 5,
      comment: 'Well worth the cost! These exercise routines really woke up my muscles and I like how we can add different equipment!',
    },
    {
      id: '2',
      name: 'Emma M.',
      rating: 5,
      comment: 'Buying this app has really made a difference in my lifestyle. It\'s the best app for fitness. Surprised by the quality!',
    },
  ];

  const handleSubscription = async () => {
    try {
      console.log('[Paywall] Starting subscription process...');
      setIsLoading(true);
      
      // Find the selected plan
      const plan = subscriptionPlans.find(p => p.id === selectedPlan);
      console.log('[Paywall] Selected plan:', plan);
      
      if (!plan?.productId) {
        console.error('[Paywall] No product ID found for selected plan');
        throw new Error('Selected plan not available');
      }

      // Request the purchase
      console.log('[Paywall] Requesting purchase for product:', plan.productId);
      const result = await purchaseSubscription(plan.productId);
      console.log('[Paywall] Purchase result:', result);
      
      if (result) {
        console.log('[Paywall] Purchase successful, navigating to home...');
        router.replace('/(tabs)/home');
      } else {
        console.error('[Paywall] Purchase failed with null result');
        throw new Error('Subscription purchase failed');
      }
    } catch (error: any) {
      console.error('[Paywall] Subscription error:', error);
      if (!error.message?.includes('user canceled')) {
        Alert.alert(
          'Subscription Error',
          error.message || 'Failed to process subscription. Please try again.'
        );
      }
    } finally {
      console.log('[Paywall] Subscription process complete');
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array(rating).fill(0).map((_, index) => (
      <Ionicons key={index} name="star" size={20} color="#FFD700" />
    ));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Better training.{'\n'}Better results!</Text>

        {/* Subscription Plans */}
        <View style={styles.plansContainer}>
          {subscriptionPlans.map((plan) => (
            <Pressable
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.selectedPlan,
                plan.isBestValue && styles.bestValuePlan,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              {(plan.isBestValue) && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    BEST VALUE
                  </Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <Text style={styles.planDuration}>{plan.duration}</Text>
                <Text style={styles.planPeriod}>Month{plan.duration !== '1' ? 's' : ''}</Text>
              </View>
              
              {selectedPlan === plan.id && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={24} color="#4064F6" />
                </View>
              )}
              
              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>{plan.price} €</Text>
                <Text style={styles.planPriceDetail}>{plan.period}</Text>
              </View>
              
              <Text style={styles.planTotal}>{plan.totalPrice}</Text>
              <Text style={styles.planTotalPeriod}>{plan.period2}</Text>
            </Pressable>
          ))}
        </View>

        {/* Pro Testimonial Section */}
        <View style={styles.testimonialSection}>
          <Text style={styles.testimonialTitle}>Trusted by Professionals</Text>
          <View style={styles.testimonialContent}>
            <Image 
              source={require('../../assets/images/BallerAILogo.png')}
              style={styles.testimonialImage}
              resizeMode="cover"
            />
            <Text style={styles.testimonialText}>
              "BallerAI changed the way I approach training forever. The ease of use and the amount of value it has brought to my professional life is incredible. I have loved the recovery plans and macro calculation methods the most. I'm improving at the highest rate possible."
            </Text>
          </View>
        </View>

        {/* Continue Button */}
        <CustomButton
          title={isLoading ? "Processing..." : "Continue"}
          onPress={handleSubscription}
          disabled={isLoading}
          buttonStyle={[
            styles.continueButton,
            isLoading ? { opacity: 0.7 } : {}
          ] as any}
          textStyle={styles.continueButtonText}
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4064F6" />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default PaywallScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 32,
    textAlign: 'center',
  },
  plansContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  planCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    position: 'relative',
    opacity: 0.8,
  },
  selectedPlan: {
    borderColor: '#4064F6',
    borderWidth: 2,
    opacity: 1,
    backgroundColor: '#F5F5FF',
  },
  bestValuePlan: {
    // Empty for future styling if needed
  },
  badge: {
    position: 'absolute',
    top: -12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#4064F6',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  planDuration: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4064F6',
  },
  planPeriod: {
    fontSize: 16,
    color: '#4064F6',
  },
  planPricing: {
    alignItems: 'center',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  planPriceDetail: {
    fontSize: 14,
    color: '#666666',
  },
  planTotal: {
    fontSize: 16,
    color: '#666666',
  },
  planTotalPeriod: {
    fontSize: 14,
    color: '#666666',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  testimonialSection: {
    marginBottom: 32,
    padding: 24,
    backgroundColor: '#F8F8F8',
    borderRadius: 24,
  },
  testimonialTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 24,
    textAlign: 'center',
  },
  testimonialContent: {
    alignItems: 'center',
    gap: 24,
  },
  testimonialImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
  },
  testimonialText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#000000',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: '#4064F6',
    borderRadius: 36,
    paddingVertical: 16,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  }
}); 