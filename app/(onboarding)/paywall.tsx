import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, AppState, Linking, ActivityIndicator } from 'react-native';
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
import axios from 'axios';
import { Buffer } from "buffer";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import subscriptionCheck from '../services/subscriptionCheck';

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
  const Set = useRef(false);
  const purchaseEmitter = useRef<NativeEventEmitter | null>(null);
  const appState = useRef(AppState.currentState);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isSignUp = params.isSignUp === 'true';
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isNavigatingHome, setIsNavigatingHome] = useState(false);
  // Add custom loading screen state and timing
  const [showCustomLoading, setShowCustomLoading] = useState(true);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Add a reference to track ongoing subscription checks
  const subscriptionCheckInProgress = useRef<Promise<any> | null>(null);
  // Reference to store cached subscription check result
  const cachedSubscriptionCheck = useRef<{ source: string; data: any } | null>(null);

  // Update local state whenever isPurchasing changes in AsyncStorage
  useEffect(() => {
    const checkPurchasingStatus = async () => {
      try {
        const status = await subscriptionCheck.checkIsPurchasing();
        setIsPurchasing(status);
      } catch (error) {
        console.error('Error checking purchasing status:', error);
      }
    };
    
    // Initial check
    checkPurchasingStatus();
    
    // Set up interval to check regularly
    const intervalId = setInterval(checkPurchasingStatus, 500);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const handleSuccessfulPurchase = async (purchase: any) => {
    try {
      const { uid, hasAppleInfo } = params;
      console.log('Processing successful purchase:', purchase);
      
      // Validate the receipt before processing the purchase
      const validationResult = await subscriptionCheck.validateReceipt(purchase);
      const { expirationDate, isRenewing } = validationResult;
      if (expirationDate === null) {
        console.error('Receipt validation failed');
        Alert.alert(
          'Purchase Verification Failed',
          'We were unable to verify your purchase. Please contact support if this issue persists.'
        );
        return false;
      }
      
      // If this is an Apple user who needs a document created
      if (uid && hasAppleInfo === 'true') {
        const userIdString = Array.isArray(uid) ? uid[0] : uid;
        
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
            autoRenewing: isRenewing
          }
        });
        
        // Initialize data listeners
        await initializeAllDataListeners(userIdString);
      } else if (user) {
        // For logged-in users, use the subscription service
        await subscriptionService.saveSubscriptionData(user.uid, purchase, expirationDate, isRenewing);
      }
      
      // Log the purchase event using the new modular API
      const analytics = getAnalytics();
      await logEvent(analytics, 'subscription_purchased', {
        productId: purchase.productId,
        transactionId: purchase.transactionId
      });
      
      return true;
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
    
    // Clear the purchase in progress flag regardless of the outcome
    try {
      await AsyncStorage.removeItem('purchase_in_progress');
    } catch (error) {
      console.error('Failed to clear purchase in progress flag:', error);
    }
    
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
        } finally {
          // Always reset purchasing state regardless of outcome
          await subscriptionCheck.cancelIsPurchasing();
        }
      }
    } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
      // Mark that the user just cancelled - for faster retry experience
      try {
        await AsyncStorage.setItem('purchase_just_cancelled', 'true');
      } catch (error) {
        console.error('Failed to set cancelled flag:', error);
      }
      
      // Do nothing on cancel - user just stays on paywall
      console.log('Purchase cancelled by user');
      await subscriptionCheck.cancelIsPurchasing();
    } else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
      Alert.alert('Purchase Pending', 'The purchase needs to be approved by a parent or guardian.');
      await subscriptionCheck.cancelIsPurchasing();
    } else {
      console.error('Purchase failed:', { responseCode });
      Alert.alert('Purchase Failed', 'There was an error processing your purchase. Please try again.');
      await subscriptionCheck.cancelIsPurchasing();
    }
  };

  const loadProducts = async () => {
    try {
      const productIds = Object.values(PRODUCT_IDS);
      console.log('IAP Debug Info:', {
        environment: __DEV__ ? 'Development' : 'Production',
        platform: Platform.OS,
        bundleId: Constants.expoConfig?.ios?.bundleIdentifier,
        productIds
      });
      
      // Add a delay to ensure store connection is ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { responseCode, results, errorCode } = await InAppPurchases.getProductsAsync(productIds);
      
      console.log('Store Response Details:', {
        responseCode,
        errorCode,
        productsCount: results?.length || 0,
        products: results?.map(p => ({
          id: p.productId,
          price: p.price,
          currency: p.priceCurrencyCode,
          description: p.description
        }))
      });
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        if (!results || results.length === 0) {
          console.error('No products returned from store. This might indicate:', [
            '- Product IDs not matching App Store Connect',
            '- Products not active in App Store Connect',
            '- Sandbox tester not properly configured',
            '- App Store Connect setup incomplete'
          ].join('\n'));
          
          Alert.alert(
            'Store Configuration',
            Platform.OS === 'ios' 
              ? 'Unable to load subscription options. Please ensure you are signed in with a Sandbox test account and have an active internet connection.'
              : 'Unable to load subscription options. Please ensure you are signed in with a test account and have an active internet connection.'
          );
          setIsLoading(false); // Set loading to false even if there's an error
        } else {
          console.log('Products loaded successfully:', results.map(p => ({
            id: p.productId,
            price: p.price,
            currency: p.priceCurrencyCode
          })));
          setProducts(results);
          setIsLoading(false); // Set loading to false when products are loaded
        }
      } else {
        throw new Error(`Store error: ${responseCode}${errorCode ? `, Error code: ${errorCode}` : ''}`);
      }
    } catch (error: any) {
      console.error('Product loading error:', {
        message: error.message,
        code: error?.code,
        name: error?.name,
        stack: error?.stack
      });
      
      Alert.alert(
        'Store Connection Error',
        Platform.OS === 'ios'
          ? 'Unable to connect to the App Store. Please ensure you are signed in with a Sandbox test account and have an active internet connection.'
          : 'Unable to connect to the Play Store. Please ensure you are signed in and have an active internet connection.'
      );
      setIsLoading(false); // Set loading to false when there's an error
    }
  };

  // Update initialization
  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      try {
        if (!isIAPInitialized.current) {
          console.log('Starting IAP initialization...');
          console.log('Environment:', __DEV__ ? 'Development' : 'Production');
          console.log('Platform:', Platform.OS);
          console.log('Bundle ID:', Constants.expoConfig?.ios?.bundleIdentifier);
          
          try {
            await InAppPurchases.connectAsync();
            console.log('IAP connected successfully');
          } catch (error: any) {
            // If already connected, that's fine - we can proceed
            if (error.code === 'ERR_IN_APP_PURCHASES_CONNECTION' && error.message.includes('Already connected')) {
              console.log('IAP already connected, proceeding...');
            } else {
              throw error; // Re-throw other errors
            }
          }
          
          if (isMounted && !purchaseListenerSet.current) {
            InAppPurchases.setPurchaseListener(purchaseListener);
            purchaseListenerSet.current = true;
            console.log('Purchase listener setup complete');
          }
          
          isIAPInitialized.current = true;
          if (isMounted) {
            await loadProducts();
            
            // Pre-check subscription status during loading phase
            // This prevents checks during purchase flow
            try {
              console.log('Pre-checking subscription status...');
              // Use the new shared service instead
              const existingSubscription = await subscriptionCheck.checkExistingSubscriptions(
                user?.uid || null, 
                isIAPInitialized.current
              );
              
              if (existingSubscription) {
                cachedSubscriptionCheck.current = existingSubscription;
                console.log('Found existing subscription during initialization:', existingSubscription.source);
                
                /*// Update UI state with subscription info
                if (existingSubscription.source === 'firebase' && user) {
                  const firebaseSubscription = await subscriptionService.getSubscriptionData(user.uid);
                  if (firebaseSubscription && firebaseSubscription.isActive) {
                    setSubscriptionData(firebaseSubscription);
                  }
                }*/

                router.replace('/(tabs)/home');
              } else {
                console.log('No active subscription found during initialization');
              }
            } catch (subError) {
              console.error('Error pre-checking subscription:', subError);
              // Fail silently - we'll just do the check during purchase if needed
            }
          }
        }
      } catch (error: any) {
        console.error('IAP Initialization Error:', {
          message: error.message,
          code: error?.code,
          name: error?.name,
          stack: error?.stack,
          environment: __DEV__ ? 'Development' : 'Production'
        });
        
        if (error.code === 'ERR_IN_APP_PURCHASES_CONNECTION' && isMounted) {
          // If we get a connection error, try to recover by reconnecting
          try {
            console.log('Attempting recovery after connection error...');
            await InAppPurchases.connectAsync();
            
            if (!purchaseListenerSet.current) {
              InAppPurchases.setPurchaseListener(purchaseListener);
              purchaseListenerSet.current = true;
            }
            
            if (isMounted) {
              await loadProducts();
            }
          } catch (retryError) {
            console.error('Recovery attempt failed:', retryError);
            if (isMounted) {
              Alert.alert(
                'Store Connection Error',
                Platform.OS === 'ios'
                  ? 'Unable to connect to the App Store. Please ensure you are signed in with a Sandbox test account and have an active internet connection.'
                  : 'Unable to connect to the Play Store. Please ensure you are signed in and have an active internet connection.'
              );
            }
          }
        }
      } finally {
        // Ensure loading state is updated even if there are errors
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Start initialization
    initialize();

    // Cleanup function
    return () => {
      /*isMounted = false;
      console.log('Cleaning up IAP...');
      if (purchaseListenerSet.current) {
        InAppPurchases.setPurchaseListener(() => {});
        purchaseListenerSet.current = false;
      }
      InAppPurchases.disconnectAsync().catch(console.error);
      isIAPInitialized.current = false;*/
    };
  }, []);

  // Monitor products state
  useEffect(() => {
    if (products.length > 0) {
      // When products are loaded, update the loading state
      setIsLoading(false);
    }
  }, [products]);

  // Ensure custom loading screen shows for at least 3 seconds
  useEffect(() => {
    // Set a minimum loading time of 3 seconds for the custom loading screen
    loadingTimerRef.current = setTimeout(() => {
      setShowCustomLoading(false);
    }, 3000);

    // Clean up the timer when component unmounts
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, []);

  // Hide custom loading when products are ready AND minimum time has passed
  useEffect(() => {
    if (!isLoading && !showCustomLoading) {
      // Both conditions are met: products loaded and minimum time passed
      console.log('Everything loaded and ready to show paywall');
    }
  }, [isLoading, showCustomLoading]);

  const handleContinue = async () => {
    // Immediately disable the button to prevent double-clicks
    await subscriptionCheck.setIsPurchasing();
    
    try {
      // Note: Comprehensive subscription check is now in app/_layout.tsx
      // We do a simple check here only to see if we should skip purchase flow
      if (user) {
        try {
          const firebaseSubscription = await subscriptionService.getSubscriptionData(user.uid);
          if (firebaseSubscription && firebaseSubscription.isActive) {
            console.log('Found active subscription in Firebase, navigating to home');
            await handleSuccessfulPurchase(firebaseSubscription);
            router.replace('/(tabs)/home');
            return;
          }
        } catch (error) {
          console.error('Error checking Firebase subscription in handleContinue:', error);
          // Continue with purchase if check fails
        }
      }
      
      // No existing subscription, proceed with new purchase immediately
      const productId = PRODUCT_IDS[selectedPlan as keyof typeof PRODUCT_IDS];
      
      console.log('Starting purchase for:', productId);
      
      // Directly start the purchase - this will trigger Apple's payment sheet
      await InAppPurchases.purchaseItemAsync(productId);

      //await subscriptionCheck.cancelIsPurchasing();
    } catch (error: any) {
      console.error('Error in handleContinue:', error);
      
      // Make sure to update purchasing state on error
      await subscriptionCheck.cancelIsPurchasing();
      
      if (error.code === 'ERR_IN_APP_PURCHASES_CONNECTION') {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the App Store. Please make sure you are signed in to your Apple ID and have a valid payment method.'
        );
      } else {
        Alert.alert(
          'Purchase Error',
          error.message || 'Unable to start the purchase. Please try again.'
        );
      }
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsLoading(true);
      console.log('Restoring purchases...');
      
      // Get all purchases
      const purchaseHistory = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (purchaseHistory && purchaseHistory.responseCode === InAppPurchases.IAPResponseCode.OK) {
        if (purchaseHistory.results && purchaseHistory.results.length > 0) {
          // Find the most recent active subscription
          const activeSubscription = purchaseHistory.results
            .filter(purchase => 
              purchase.productId.includes('BallerAISubscription') && 
              purchase.transactionReceipt && 
              !purchase.transactionReceipt.includes('sandbox')
            )
            .sort((a, b) => {
              const dateA = a.purchaseTime ? new Date(a.purchaseTime).getTime() : 0;
              const dateB = b.purchaseTime ? new Date(b.purchaseTime).getTime() : 0;
              return dateB - dateA;
            })[0];

          if (activeSubscription) {
            await handleSuccessfulPurchase(activeSubscription);
            Alert.alert('Success', 'Your purchases have been restored!');
            router.replace('/(tabs)/home');
            return;
          }
        }
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      } else {
        Alert.alert('Error', 'Failed to restore purchases. Please try again.');
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: '1month',
      duration: '1',
      price: products.find(p => p?.productId === PRODUCT_IDS['1month'])?.price || 'N/A',
      period: 'per month',
      totalPrice: (() => {
        const monthlyProduct = products.find(p => p?.productId === PRODUCT_IDS['1month']);
        if (monthlyProduct) {
          // Calculate yearly price from monthly price in micros
          const yearlyPriceInMicros = monthlyProduct.priceAmountMicros * 12;
          // Format the price using the same currency code
          const formatter = new Intl.NumberFormat("en-US", {
            style: 'currency',
            currency: monthlyProduct.priceCurrencyCode
          });
          return formatter.format(yearlyPriceInMicros / 1_000_000);
        }
        return 'N/A';
      })(),
      period2: 'yearly',
    },
    {
      id: '12months',
      duration: '12',
      price: (() => {
        const yearlyProduct = products.find(p => p?.productId === PRODUCT_IDS['12months']);
        if (yearlyProduct) {
          // Calculate monthly price from yearly price in micros
          const monthlyPriceInMicros = yearlyProduct.priceAmountMicros / 12;
          // Format the price using the same currency code
          const formatter = new Intl.NumberFormat("en-US", {
            style: 'currency',
            currency: yearlyProduct.priceCurrencyCode
          });
          return formatter.format(monthlyPriceInMicros / 1_000_000);
        }
        return 'N/A';
      })(),
      totalPrice: products.find(p => p?.productId === PRODUCT_IDS['12months'])?.price || 'N/A',
      period: 'per month',
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

  // Add navigation handler for back button
  const handleBack = () => {
    router.replace('/(onboarding)/sign-up');
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Add back button */}
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Pressable>
        
        {isLoading && !showCustomLoading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingIndicator}>
              {/* Activity indicator with color matching the app's theme */}
              <Text style={styles.loadingText}>Loading subscription options...</Text>
              <ActivityIndicator size="large" color="#4064F6" />
            </View>
          </View>
        ) : !showCustomLoading ? (
          <>
            <View style={styles.content}>
              <Text style={styles.title}>Better training.</Text>
              <Text style={styles.subtitle}>Better results!</Text>

              {/* Subscription Plans */}
              <View style={styles.plansContainer}>
                {subscriptionPlans.map((plan) => (
                  <Pressable
                    key={plan.id}
                    style={[
                      styles.planCard,
                      selectedPlan === plan.id && styles.selectedPlan,
                    ]}
                    onPress={() => setSelectedPlan(plan.id)}
                  >
                    {plan.isBestValue && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText} allowFontScaling={false}>
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
                      <Text style={styles.planPrice}>{plan.price}</Text>
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
                disabled={isPurchasing}
              />
            </View>
            
            {/* Add this before the closing ScrollView tag */}
            <Pressable 
              onPress={handleRestorePurchases}
              style={styles.restoreButton}
              disabled={isLoading || isPurchasing}
            >
              <Text style={styles.restoreButtonText}>
                Restore Purchases
              </Text>
            </Pressable>
            
            {/* Legal links */}
            <View style={styles.legalLinksContainer}>
              <Text style={styles.legalText}>
                By continuing, you agree to our{' '}
                <Text 
                  style={styles.legalLink}
                  onPress={() => Linking.openURL('https://ballerbizoy.com/privacy')}
                >
                  Privacy Policy
                </Text>
                {' '}and{' '}
                <Text 
                  style={styles.legalLink}
                  onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula')}
                >
                  Terms of Use
                </Text>
              </Text>
            </View>
          </>
        ) : null}
        
        {/* Purchase overlay with loading indicator */}
        {isPurchasing && (
          <View style={styles.disableInteractionOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}
      </ScrollView>
      
      {/* Custom account creation loading screen - moved outside ScrollView */}
      {isSignUp && showCustomLoading && (
        <Animated.View 
          style={styles.fullScreenOverlay}
          entering={FadeIn.duration(300)}
        >
          <Animated.View 
            style={styles.loadingContent}
            entering={FadeInDown.duration(400).springify()}
          >
            <Image 
              source={require('../../assets/images/mascot.png')}
              style={styles.loadingMascot}
              resizeMode="contain"
            />
            <Text style={styles.loadingTitle}>Creating Customized Account</Text>
            <Text style={styles.loadingSubtext}>
              Please wait while we set up your personalized experience.
            </Text>
            <ActivityIndicator size="large" color="#4064F6" />
          </Animated.View>
        </Animated.View>
      )}

      {/* Custom account creation loading screen - moved outside ScrollView */}
      {!isSignUp && showCustomLoading && (
        <Animated.View 
          style={styles.fullScreenOverlay}
          entering={FadeIn.duration(300)}
        >
          <Animated.View 
            style={styles.loadingContent}
            entering={FadeInDown.duration(400).springify()}
          >
            <Image 
              source={require('../../assets/images/mascot.png')}
              style={styles.loadingMascot}
              resizeMode="contain"
            />
            <Text style={styles.loadingTitle}>Subscription Expired</Text>
            <Text style={styles.loadingSubtext}>
              Please wait while we load your subscription options.
            </Text>
            <ActivityIndicator size="large" color="#4064F6" />
          </Animated.View>
        </Animated.View>
      )}
    </>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 24,
    textAlign: 'center',
  },
  plansContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    borderRadius: 32,
    paddingVertical: 16,
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
  backButton: {
    position: 'absolute',
    top: 72,
    left: 20,
    zIndex: 1,
    padding: 8,
  },
  restoreButton: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#666000',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  legalLinksContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
  legalLink: {
    color: '#999999',
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 600,
    paddingTop: 120,
  },
  loadingIndicator: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4064F6',
    marginBottom: 20,
  },
  disableInteractionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    paddingHorizontal: 24,
    elevation: 10, // For Android
  },
  loadingContent: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    width: '90%',
    maxWidth: 340,
  },
  loadingMascot: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
}); 