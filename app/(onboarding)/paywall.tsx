import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, AppState } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import nutritionService from '../services/nutrition';
import recoveryService from '../services/recovery';
import trainingService from '../services/training';
import { useOnboarding } from '../context/OnboardingContext';
import { getAnalytics, logEvent } from '@react-native-firebase/analytics';
import * as InAppPurchases from 'expo-in-app-purchases';
import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import subscriptionService, { PRODUCT_IDS, SubscriptionData } from '../services/subscription';
import { useAuth } from '../context/AuthContext';

// Initialize data listeners function defined locally to avoid circular imports
const initializeAllDataListeners = async (userId: string) => {
  console.log("Initializing all data listeners for user:", userId);
  try {
    // Initialize nutrition data listeners
    nutritionService.initializeDataListeners(userId);
    
    // Initialize recovery data listeners
    recoveryService.initializeDataListeners(userId);
    
    // Initialize training data listeners
    trainingService.initializeDataListeners(userId);
    
    console.log("All data listeners initialized successfully");
    return true;
  } catch (error) {
    console.error("Error initializing data listeners:", error);
    return false;
  }
};

// Function to create user document
const createUserDocument = async (userId: string, userData: any) => {
  try {
    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, userData);
    console.log("User document created successfully");
    return true;
  } catch (error) {
    console.error("Error creating user document:", error);
    throw error;
  }
};

// Function to verify the user document exists and contains all required data
const verifyUserDocument = async (userId: string) => {
  try {
    console.log("Verifying user document...");
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log("User document verified:", userData);
      return true;
    }
    
    console.log("User document does not exist or is incomplete");
    return false;
  } catch (error) {
    console.error("Error verifying user document:", error);
    return false;
  }
};

type SubscriptionPlan = {
  id: string;
  duration: string;
  price: string;
  period: string;
  totalPrice: string;
  period2: string;
  isBestValue?: boolean;
};

type Review = {
  id: string;
  name: string;
  rating: number;
  comment: string;
};

const PaywallScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<string>('12months');
  const [products, setProducts] = useState<InAppPurchases.IAPItemDetails[]>([]);
  const { onboardingData } = useOnboarding();
  const { user } = useAuth();
  const isIAPInitialized = useRef(false);
  const purchaseListenerSet = useRef(false);
  const expoPurchaseListenerSet = useRef(false);
  const purchaseEmitter = useRef<NativeEventEmitter | null>(null);
  const appState = useRef(AppState.currentState);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  // Product IDs for your subscription plans
  const PRODUCT_IDS = {
    '1month': 'BallerAISubscriptionOneMonth',
    '12months': 'BallerAISubscriptionOneYear'
  };

  const handleSuccessfulPurchase = async (purchase: any) => {
    try {
      const { uid, hasAppleInfo } = params;
      console.log('Processing successful purchase:', purchase);
      
      // If this is an Apple user who needs a document created
      if (uid && hasAppleInfo === 'true') {
        const userIdString = Array.isArray(uid) ? uid[0] : uid;
        
        // Calculate expiration date based on product ID
        const isYearlySubscription = purchase.productId === PRODUCT_IDS['12months'];
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + (isYearlySubscription ? 12 : 1));
        
        // Create the user document with subscription info
        await createUserDocument(userIdString, {
          ...onboardingData,
          createdAt: new Date().toISOString(),
          hasCompletedOnboarding: true,
          subscription: {
            productId: purchase.productId,
            purchaseTime: new Date().toISOString(),
            expiresDate: expirationDate.toISOString(),
            isActive: true,
            transactionId: purchase.transactionId || null,
            status: 'active',
            autoRenewing: true
          }
        });
        
        // Initialize data listeners
        await initializeAllDataListeners(userIdString);
      } else if (user) {
        // For logged-in users, use the subscription service
        await subscriptionService.processSuccessfulPurchase(user.uid, purchase);
      }
      
      // Log the purchase event using the new modular API
      const analytics = getAnalytics();
      await logEvent(analytics, 'subscription_purchased', {
        productId: purchase.productId,
        transactionId: purchase.transactionId
      });
      
    } catch (error) {
      console.error('Error handling purchase:', error);
      throw error; // Re-throw to be caught by the caller
    }
  };

  const navigateToApp = () => {
    console.log('Navigating to home screen');
    router.replace('/(tabs)/home');
  };

  // Global purchase listener reference
  const purchaseListener = async ({ responseCode, results }: InAppPurchases.IAPQueryResponse<InAppPurchases.InAppPurchase>) => {
    console.log('Purchase listener triggered:', { responseCode, results });
    
    if (responseCode === InAppPurchases.IAPResponseCode.OK) {
      if (results && results.length > 0) {
        try {
          const purchase = results[0];
          console.log('Processing purchase:', purchase);
          
          // Acknowledge the purchase first
          await InAppPurchases.finishTransactionAsync(purchase, true);
          
          // Handle the successful purchase
          await handleSuccessfulPurchase(purchase);
          
          // Navigate to home immediately after successful purchase
          console.log('Purchase successful, navigating to home');
          router.replace('/(tabs)/home');
          
        } catch (error) {
          console.error('Error processing purchase:', error);
          Alert.alert('Error', 'Failed to process purchase. Please try again.');
        }
      }
    } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
      // Do nothing on cancel - user just stays on paywall
      console.log('Purchase cancelled by user');
    } else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
      Alert.alert('Purchase Pending', 'The purchase needs to be approved by a parent or guardian.');
    } else {
      console.error('Purchase failed:', { responseCode });
      Alert.alert('Purchase Failed', 'There was an error processing your purchase. Please try again.');
    }
  };

  // Expo purchase listener
  const expoPurchaseListener = (event: any) => {
    console.log('Expo purchase listener triggered:', event);
    if (event && event.purchases && event.purchases.length > 0) {
      const purchase = event.purchases[0];
      console.log('Processing Expo purchase:', purchase);
      
      // Handle the successful purchase
      handleSuccessfulPurchase(purchase)
        .then(() => {
          console.log('Expo purchase successful, navigating to home');
          router.replace('/(tabs)/home');
        })
        .catch(error => {
          console.error('Error processing Expo purchase:', error);
          Alert.alert('Error', 'Failed to process purchase. Please try again.');
        });
    }
  };

  const loadProducts = async () => {
    try {
      const productIds = Object.values(PRODUCT_IDS);
      console.log('Loading products:', productIds);
      
      const { responseCode, results } = await InAppPurchases.getProductsAsync(productIds);
      
      console.log('Products response code:', responseCode);
      console.log('Raw products response:', results);
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        if (!results || results.length === 0) {
          console.error('No products found. Product IDs:', productIds);
          Alert.alert(
            'Configuration Error',
            'Unable to load subscription options. Please try again later.'
          );
        } else {
          console.log('Products loaded successfully:', results);
          setProducts(results);
        }
      } else {
        throw new Error(`Failed to load products. Response code: ${responseCode}`);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert(
        'Error',
        'Failed to load subscription options. Please check your internet connection and try again.'
      );
    }
  };

  // Function to check for existing subscriptions
  const checkExistingSubscriptions = async () => {
    try {
      console.log('Checking for existing subscriptions...');
      
      // First check Firebase if user is logged in
      if (user) {
        const firebaseSubscription = await subscriptionService.getSubscriptionData(user.uid);
        
        if (firebaseSubscription) {
          console.log('Found subscription in Firebase:', firebaseSubscription);
          
          // Check if subscription is still active
          const isActive = await subscriptionService.isSubscriptionActive(user.uid);
          
          if (isActive) {
            // Update local state
            setSubscriptionData(firebaseSubscription);
            setDaysRemaining(subscriptionService.getDaysRemaining(firebaseSubscription));
            return { source: 'firebase', data: firebaseSubscription };
          } else {
            console.log('Firebase subscription is not active');
          }
        }
      }
      
      // If no active subscription in Firebase, check IAP
      const history = await InAppPurchases.getPurchaseHistoryAsync();
      console.log('Purchase history:', history);
      
      if (history && history.results && history.results.length > 0) {
        // Find active subscriptions
        const activeSubscriptions = history.results.filter(purchase => {
          const productId = purchase.productId;
          return (
            productId === PRODUCT_IDS['1month'] ||
            productId === PRODUCT_IDS['12months']
          );
        });
        
        if (activeSubscriptions.length > 0) {
          console.log('Found active subscriptions in IAP:', activeSubscriptions);
          
          // If user is logged in, save this to Firebase
          if (user) {
            await subscriptionService.processSuccessfulPurchase(user.uid, activeSubscriptions[0]);
          }
          
          return { source: 'iap', data: activeSubscriptions[0] };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return null;
    }
  };

  // Check subscription status when component mounts
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        setIsLoading(true);
        
        // If user is logged in, check Firebase first
        if (user) {
          const firebaseSubscription = await subscriptionService.getSubscriptionData(user.uid);
          
          if (firebaseSubscription) {
            setSubscriptionData(firebaseSubscription);
            setDaysRemaining(subscriptionService.getDaysRemaining(firebaseSubscription));
            
            // If subscription is active, navigate to home
            if (firebaseSubscription.isActive) {
              const expirationDate = new Date(firebaseSubscription.expiresDate);
              const now = new Date();
              
              if (expirationDate > now) {
                console.log('Active subscription found in Firebase, navigating to home');
                router.replace('/(tabs)/home');
                return;
              } else {
                console.log('Firebase subscription has expired');
                // Update status to expired
                await subscriptionService.updateSubscriptionStatus(user.uid, 'expired');
              }
            }
          }
        }
        
        // Check IAP for existing subscriptions
        const existingSubscription = await checkExistingSubscriptions();
        
        if (existingSubscription) {
          console.log('Processing existing subscription:', existingSubscription);
          await handleSuccessfulPurchase(existingSubscription.data);
          router.replace('/(tabs)/home');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsLoading(false);
      }
    };
    
    checkSubscription();
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    
    const initializeIAP = async () => {
      try {
        if (!isIAPInitialized.current && isMounted) {
          console.log('Initializing IAP...');
          await InAppPurchases.connectAsync();
          console.log('IAP connected');
          
          if (isMounted && !purchaseListenerSet.current) {
            console.log('Setting up purchase listener...');
            InAppPurchases.setPurchaseListener(purchaseListener);
            purchaseListenerSet.current = true;
            console.log('Purchase listener setup complete');
          }
          
          isIAPInitialized.current = true;
          if (isMounted) {
            await loadProducts();
            // Check for existing subscriptions after initialization
            const existingSubscription = await checkExistingSubscriptions();
            if (existingSubscription && isMounted) {
              console.log('Processing existing subscription:', existingSubscription);
              await handleSuccessfulPurchase(existingSubscription.data);
              router.replace('/(tabs)/home');
            }
          }
        }
      } catch (error: any) {
        if (error.code === 'ERR_IN_APP_PURCHASES_CONNECTION' && isMounted) {
          console.log('IAP already connected, setting up listener and loading products...');
          if (!purchaseListenerSet.current) {
            InAppPurchases.setPurchaseListener(purchaseListener);
            purchaseListenerSet.current = true;
          }
          await loadProducts();
          // Check for existing subscriptions after initialization
          const existingSubscription = await checkExistingSubscriptions();
          if (existingSubscription && isMounted) {
            console.log('Processing existing subscription:', existingSubscription);
            await handleSuccessfulPurchase(existingSubscription.data);
            router.replace('/(tabs)/home');
          }
        } else {
          console.error('Error initializing IAP:', error);
          if (isMounted) {
            Alert.alert('Error', 'Failed to initialize in-app purchases. Please try again.');
          }
        }
      }
    };

    // Set up Expo purchase listener
    if (!expoPurchaseListenerSet.current) {
      console.log('Setting up Expo purchase listener...');
      try {
        // Try to get the ExpoPurchases module
        const ExpoPurchases = NativeModules.ExpoPurchases;
        if (ExpoPurchases) {
          purchaseEmitter.current = new NativeEventEmitter(ExpoPurchases);
          purchaseEmitter.current.addListener('purchasesUpdated', expoPurchaseListener);
          expoPurchaseListenerSet.current = true;
          console.log('Expo purchase listener setup complete');
        } else {
          console.log('ExpoPurchases module not found, skipping listener setup');
        }
      } catch (error) {
        console.error('Error setting up Expo purchase listener:', error);
      }
    }

    initializeIAP();

    return () => {
      isMounted = false;
      console.log('Cleaning up IAP...');
      if (purchaseListenerSet.current) {
        InAppPurchases.setPurchaseListener(() => {});
        purchaseListenerSet.current = false;
      }
      if (expoPurchaseListenerSet.current && purchaseEmitter.current) {
        purchaseEmitter.current.removeAllListeners('purchasesUpdated');
        expoPurchaseListenerSet.current = false;
        purchaseEmitter.current = null;
      }
      InAppPurchases.disconnectAsync().catch(console.error);
      isIAPInitialized.current = false;
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        // Check for existing subscriptions when app becomes active
        if (isIAPInitialized.current) {
          const existingSubscription = await checkExistingSubscriptions();
          if (existingSubscription) {
            console.log('Processing existing subscription on app active:', existingSubscription);
            await handleSuccessfulPurchase(existingSubscription.data);
            router.replace('/(tabs)/home');
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleContinue = async () => {
    try {
      // Check for existing subscription first
      const existingSubscription = await checkExistingSubscriptions();
      
      if (existingSubscription) {
        // Process existing subscription and navigate directly
        await handleSuccessfulPurchase(existingSubscription.data);
        router.replace('/(tabs)/home');
        return;
      }
      
      // No existing subscription, proceed with new purchase
      const productId = PRODUCT_IDS[selectedPlan as keyof typeof PRODUCT_IDS];
      
      // Start the purchase immediately
      await InAppPurchases.purchaseItemAsync(productId);
      
    } catch (error: any) {
      console.error('Error in handleContinue:', error);
      if (error.code === 'ERR_IN_APP_PURCHASES_CONNECTION') {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the App Store. Please make sure you are signed in to your Apple ID and have a valid payment method.'
        );
      } else {
        Alert.alert(
          'Purchase Error',
          error.message || 'Unable to start purchase. Please try again.'
        );
      }
    }
  };

  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: '1month',
      duration: '1',
      price: '9.99',
      period: 'per month',
      totalPrice: '9,99 €',
      period2: 'monthly',
    },
    {
      id: '12months',
      duration: '12',
      price: '4.99',
      period: 'per month',
      totalPrice: '59,99 €',
      period2: 'yearly',
      isBestValue: true,
    }
  ];

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

  const renderStars = (rating: number) => {
    return Array(rating).fill(0).map((_, index) => (
      <Ionicons key={index} name="star" size={20} color="#FFD700" />
    ));
  };

  // Render subscription status if available
  const renderSubscriptionStatus = () => {
    if (!subscriptionData) return null;
    
    const status = subscriptionData.status;
    const daysLeft = daysRemaining;
    
    if (status === 'active' && daysLeft !== null && daysLeft > 0) {
      return (
        <View style={styles.subscriptionStatusContainer}>
          <Text style={styles.subscriptionStatusText}>
            You have an active subscription with {daysLeft} days remaining
          </Text>
          <CustomButton
            title="Continue to App"
            onPress={() => router.replace('/(tabs)/home')}
            buttonStyle={styles.continueButton}
            textStyle={styles.continueButtonText}
          />
        </View>
      );
    } else if (status === 'expired') {
      return (
        <View style={styles.subscriptionStatusContainer}>
          <Text style={styles.subscriptionStatusText}>
            Your subscription has expired. Please renew to continue using the app.
          </Text>
        </View>
      );
    } else if (status === 'cancelled') {
      return (
        <View style={styles.subscriptionStatusContainer}>
          <Text style={styles.subscriptionStatusText}>
            Your subscription has been cancelled. Please subscribe again to continue using the app.
          </Text>
        </View>
      );
    }
    
    return null;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Better training.{'\n'}Better results!</Text>

        {/* Subscription Status */}
        {renderSubscriptionStatus()}

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
              {plan.isBestValue && (
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
              source={require('../../assets/images/2027.png')}
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
          title="Continue"
          onPress={handleContinue}
          buttonStyle={styles.continueButton}
          textStyle={styles.continueButtonText}
        />
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
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 32,
    textAlign: 'center',
  },
  plansContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectedPlan: {
    backgroundColor: '#F0F4FF',
    borderColor: '#4064F6',
    borderWidth: 2,
  },
  bestValuePlan: {
    backgroundColor: '#F0F4FF',
  },
  badge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#4064F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  planDuration: {
    fontSize: 40,
    fontWeight: '600',
    color: '#4064F6',
  },
  planPeriod: {
    fontSize: 16,
    color: '#4064F6',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  planPricing: {
    alignItems: 'center',
    marginTop: 12,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
  },
  planPriceDetail: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  planTotal: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  planTotalPeriod: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  testimonialSection: {
    marginBottom: 32,
    backgroundColor: '#F8F8F8',
    borderRadius: 24,
    padding: 24,
  },
  testimonialTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 24,
  },
  testimonialContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  testimonialImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  testimonialText: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: '#4064F6',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subscriptionStatusContainer: {
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  subscriptionStatusText: {
    fontSize: 16,
    color: '#4064F6',
    textAlign: 'center',
    marginBottom: 12,
  },
}); 