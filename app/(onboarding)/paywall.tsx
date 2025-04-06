import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, AppState, Linking } from 'react-native';
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

  let expirationDateFromValidReceipt: Date | null = null;

  const handleSuccessfulPurchase = async (purchase: any) => {
    try {
      const { uid, hasAppleInfo } = params;
      console.log('Processing successful purchase:', purchase);
      
      expirationDateFromValidReceipt = null;

      // Validate the receipt before processing the purchase
      const isValid = await validateReceipt(purchase);
      
      if (!isValid) {
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
        
        // TODO: Fix Apple sign in

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
            expiresDate: expirationDateFromValidReceipt.toISOString() || expirationDate.toISOString(),
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
        await subscriptionService.processSuccessfulPurchase(user.uid, purchase, expirationDateFromValidReceipt);
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
        } else {
          console.log('Products loaded successfully:', results.map(p => ({
            id: p.productId,
            price: p.price,
            currency: p.priceCurrencyCode
          })));
          setProducts(results);
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
    }
  };

  const handlePurchase = async (productId: string) => {
    try {
      console.log('Starting purchase flow for:', productId);
      
      // Ensure products are loaded
      if (!products || products.length === 0) {
        console.log('No products loaded, attempting to load products first');
        await loadProducts();
      }
      
      // Verify the product exists in our loaded products
      const product = products.find(p => p.productId === productId);
      if (!product) {
        console.error('Product not found in available products:', {
          requestedId: productId,
          availableProducts: products.map(p => p.productId)
        });
        throw new Error('Selected subscription plan not available');
      }

      console.log('Initiating purchase for product:', {
        id: product.productId,
        price: product.price,
        currency: product.priceCurrencyCode
      });

      // The purchaseItemAsync function doesn't return a response directly
      // Instead, it triggers the purchase listener we set up earlier
      await InAppPurchases.purchaseItemAsync(productId);
      
      // The purchase result will be handled by the purchaseListener function
      // which we set up in the initialization code
      
    } catch (error: any) {
      console.error('Purchase error:', {
        message: error.message,
        code: error?.code,
        name: error?.name,
        stack: error?.stack
      });
      
      Alert.alert(
        'Purchase Error',
        error.message === 'Selected subscription plan not available'
          ? 'The selected subscription plan is not available. Please try again later.'
          : 'Unable to complete the purchase. Please try again.'
      );
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
          
          await InAppPurchases.connectAsync();
          console.log('IAP connected successfully');
          
          if (isMounted && !purchaseListenerSet.current) {
            InAppPurchases.setPurchaseListener(purchaseListener);
            purchaseListenerSet.current = true;
            console.log('Purchase listener setup complete');
          }
          
          isIAPInitialized.current = true;
          if (isMounted) {
            await loadProducts();
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
      if (expoPurchaseListenerSet.current && purchaseEmitter.current) {
        purchaseEmitter.current.removeAllListeners('purchasesUpdated');
        expoPurchaseListenerSet.current = false;
        purchaseEmitter.current = null;
      }
      InAppPurchases.disconnectAsync().catch(console.error);
      isIAPInitialized.current = false;*/
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
      await handlePurchase(productId);
      
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

  // Function to check for existing subscriptions
  const checkExistingSubscriptions = async () => {
    try {
      console.log('Checking for existing Firebase subscription...');
      
      // First check Firebase if user is logged in
      if (user) {
        const firebaseSubscription = await subscriptionService.getSubscriptionData(user.uid);
        console.log('Firebase subscription check done.');
        
        if (firebaseSubscription) {
          console.log('Found subscription check result: ', firebaseSubscription);
          
          if (firebaseSubscription.isActive) {
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
      console.log('Checking for IAP subscription in purchase history...');
      const history = await InAppPurchases.getPurchaseHistoryAsync();
      console.log('Purchase history:', history);
      
      if (history && history.results && history.results.length > 0) {
        // Find active subscriptions
        const activeSubscriptions = history.results.filter(purchase => {
          const productId = purchase.productId;
          return (
            (productId === PRODUCT_IDS['1month'] ||
            productId === PRODUCT_IDS['12months']) &&
            purchase.transactionReceipt &&
            (purchase.purchaseState === InAppPurchases.InAppPurchaseState.PURCHASED ||
            purchase.purchaseState === InAppPurchases.InAppPurchaseState.RESTORED)
          );
        });

        // Validate receipts for active subscriptions
        const validatedSubscriptions = [];
        for (const subscription of activeSubscriptions) {
          const isValid  = await validateReceipt(subscription);
          if (isValid) {
            validatedSubscriptions.push(subscription);
          } else {
            console.log('Subscription validation failed:', subscription.productId);
          }
        }

        if (validatedSubscriptions.length > 0) {
          console.log('Found validated active subscriptions in IAP:', validatedSubscriptions);
          
          // If user is logged in, save this to Firebase
          if (user) {
            await subscriptionService.processSuccessfulPurchase(user.uid, validatedSubscriptions[0], expirationDateFromValidReceipt);
          }
          
          return { source: 'iap', data: validatedSubscriptions[0] };
        }
      }
      
      console.log('IAP subscription check done: No valid IAP subscriptions found');
      return null;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return null;
    }
  };

  // Add navigation handler for back button
  const handleBack = () => {
    router.replace('/(onboarding)/sign-up');
  };

  const validateReceipt = async (purchase: InAppPurchases.InAppPurchase): Promise<boolean> => {
    try {
      //console.log('Validating receipt on client side:', purchase);
      
      // For iOS, we can use the InAppPurchases API
      if (Platform.OS === 'ios') {
        // Since validateReceiptAsync is not available in the current version,
        // we'll implement a basic validation based on the purchase data
        
        // Check if the purchase has a valid receipt
        if (!purchase.transactionReceipt) {
          console.log('Validate receipt: No transaction receipt found');
          return false;
        }

        const prodURL = 'https://buy.itunes.apple.com/verifyReceipt'
        const stagingURL = 'https://sandbox.itunes.apple.com/verifyReceipt'
        const appSecret = '7e261d6bb5084148a94d1a665aa891da'

        const payload = {
          "receipt-data": purchase.transactionReceipt,
          "password": appSecret,
          "exclude-old-transactions": true,
        }

        // First, try to validate against production
        console.log('Validate receipt: Contacting production server...');
        const prodRes = await axios.post(prodURL, payload)
        //console.log('Validate receipt: Production server response: ', prodRes.data);
        // If status is 21007, fall back to sandbox
        if (prodRes.data && prodRes.data.status === 21007) {
          console.log('Validate receipt: Falling back to sandbox server...');
          const sandboxRes = await axios.post(stagingURL, payload)
          //console.log('Validate receipt: Sandbox server response: ', sandboxRes.data);

          if (sandboxRes.data && sandboxRes.data.latest_receipt_info && sandboxRes.data.latest_receipt_info.length > 0) {
            const receipt = sandboxRes.data.latest_receipt_info[0]
            //console.log('Validate receipt: Latest receipt: ', receipt);

            // Check expiration
            const expirationTime = new Date(parseInt(receipt.expires_date_ms));
            const now = new Date();
            console.log('Validate receipt: expiration: ', expirationTime);
            console.log('Validate receipt: now: ', now);
            const isValid = expirationTime > now;
            console.log('Validate receipt: Is receipt valid:', isValid);

            if (isValid) {
              expirationDateFromValidReceipt = expirationTime;
            }

            return isValid;
          }
        }

        console.log('Validate receipt: Returning false');
        return false;
      } 
      // For Android, we need to implement our own validation logic
      else if (Platform.OS === 'android') {
        // Android doesn't have a direct client-side validation API
        // We'll implement a basic check based on purchase time and product ID
        
        // Check if the purchase is recent (within the last 30 days)
        const purchaseTime = new Date(purchase.purchaseTime);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const isRecent = purchaseTime > thirtyDaysAgo;
        
        // Check if the product ID matches one of our subscription products
        const isValidProduct = Object.values(PRODUCT_IDS).includes(purchase.productId);
        
        return isRecent && isValidProduct;
      }
      
      return false;
    } catch (error) {
      console.error('Error validating receipt:', error);
      
      // In development mode, we'll simulate a successful validation
      if (__DEV__) {
        console.log('Development mode: Simulating successful receipt validation');
        return true;
      }
      
      return false;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Add back button */}
      <Pressable onPress={handleBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </Pressable>
      
      <View style={styles.content}>
        <Text style={styles.title}>Better training.</Text>
        <Text style={styles.subtitle}>Better results!</Text>

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
        />
      </View>
      
      {/* Add this before the closing ScrollView tag */}
      <Pressable 
        onPress={handleRestorePurchases}
        style={styles.restoreButton}
        disabled={isLoading}
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
    color: '#666',
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
}); 