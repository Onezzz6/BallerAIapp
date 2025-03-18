import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import nutritionService from '../services/nutrition';
import recoveryService from '../services/recovery';
import trainingService from '../services/training';
import subscriptionService, { SubscriptionData } from '../services/subscription';
import { useOnboarding } from '../context/OnboardingContext';
import { getAuth } from 'firebase/auth';

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
  const [isLoading, setIsLoading] = useState(false);
  const { onboardingData } = useOnboarding(); // Get the real onboarding data
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionData[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  
  // Check for existing subscription on mount
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const hasActive = await subscriptionService.hasActiveSubscription();
        setHasSubscription(hasActive);
        
        if (hasActive) {
          console.log('User already has an active subscription');
          await handleUserDocumentCreation();
          // Navigate to home if subscription exists
          router.replace('/(tabs)/home');
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    };
    
    checkSubscription();
  }, []);
  
  // Initialize IAP and fetch subscription products
  useEffect(() => {
    const initializeSubscriptions = async () => {
      try {
        console.log('Initializing subscription service...');
        setIsLoading(true);
        
        // Get subscription products from Apple
        const plans = await subscriptionService.getSubscriptions();
        console.log('Fetched subscription plans:', plans);
        
        if (plans && plans.length > 0) {
          setSubscriptionPlans(plans);
        }
      } catch (error) {
        console.error('Failed to initialize subscriptions:', error);
        // If there's an error, we'll fall back to the default plans in the subscription service
      } finally {
        setIsLoading(false);
      }
    };
    
    // Set up purchase listeners
    const removeListeners = subscriptionService.setupPurchaseListeners();
    
    // Initialize subscriptions
    initializeSubscriptions();
    
    // Clean up listeners when component unmounts
    return () => {
      removeListeners();
    };
  }, []);

  // Function to handle subscription purchase
  const handlePurchaseSubscription = async () => {
    try {
      setIsPurchasing(true);
      
      // Log the product ID being purchased
      const productId = subscriptionService.getProductIdFromPlanId(selectedPlan);
      console.log(`Attempting to purchase product ID: ${productId}`);
      
      // First verify that the product is available
      const plans = await subscriptionService.getSubscriptions();
      const validProduct = plans.find(plan => plan.id === selectedPlan);
      
      if (!validProduct || !validProduct.productObject) {
        // If product not found, show a detailed error
        const error = `Product ${selectedPlan} (${productId}) is not available. This may be because:
        1. The product is not properly configured in App Store Connect
        2. Your app's bundle ID doesn't match App Store Connect
        3. You're not signed in with a sandbox test account
        4. The product is not in "Ready to Submit" state`;
        
        console.error(error);
        Alert.alert(
          'Product Not Available', 
          'The selected subscription plan is not available for purchase. Please try again later or contact support.',
          [
            { 
              text: 'More Info',
              onPress: () => Alert.alert('Developer Info', error) 
            },
            { text: 'OK' }
          ]
        );
        return;
      }
      
      // Request the subscription purchase
      const result = await subscriptionService.purchaseSubscription(selectedPlan);
      
      if (result.success) {
        console.log('Purchase successful!');
        
        // Proceed with user document creation if needed
        await handleUserDocumentCreation();
        
        // Navigate to home
        router.replace('/(tabs)/home');
      } else if (result.cancelled) {
        console.log('Purchase was cancelled by user');
        Alert.alert(
          'Purchase Cancelled',
          'You need an active subscription to use BallerAI. Please subscribe to continue.'
        );
      } else {
        console.error('Purchase failed:', result.error);
        Alert.alert(
          'Purchase Failed', 
          'There was an error processing your purchase. Please try again later.',
          [
            { 
              text: 'Error Details',
              onPress: () => Alert.alert('Technical Details', result.error) 
            },
            { text: 'OK' }
          ]
        );
      }
    } catch (error: any) {
      console.error('Error during purchase:', error);
      const errorMessage = error?.message || 'An unknown error occurred';
      
      // Show detailed error for debugging
      Alert.alert(
        'Purchase Error', 
        'An error occurred during the purchase process.',
        [
          { 
            text: 'Technical Details',
            onPress: () => Alert.alert('Error Details', errorMessage) 
          },
          { text: 'OK' }
        ]
      );
    } finally {
      setIsPurchasing(false);
    }
  };
  
  // Function to handle restoring purchases
  const handleRestorePurchases = async () => {
    try {
      setIsRestoringPurchases(true);
      
      const result = await subscriptionService.restorePurchases();
      
      if (result.success && result.purchases && result.purchases.length > 0) {
        console.log('Purchases restored successfully!');
        
        // Proceed with user document creation if needed
        await handleUserDocumentCreation();
        
        // Navigate to home
        router.replace('/(tabs)/home');
      } else {
        console.log('No purchases found to restore');
        Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsRestoringPurchases(false);
    }
  };
  
  // Function to handle user document creation
  const handleUserDocumentCreation = async () => {
    try {
      const { uid, hasAppleInfo } = params;
      const auth = getAuth();
      const userId = auth.currentUser?.uid || (uid ? (Array.isArray(uid) ? uid[0] : uid) : null);
      
      if (!userId) {
        console.error('No user ID found');
        return false;
      }
      
      // If this is a new user who needs a document created
      if (hasAppleInfo === 'true' || !await verifyUserDocument(userId)) {
        console.log('Creating user document for user with uid:', userId);
        console.log('Using onboarding data:', onboardingData);
        
        // Create the user document with the actual onboarding data
        await createUserDocument(userId, {
          ...onboardingData, // Use all the onboarding data
          createdAt: new Date().toISOString(),
          hasCompletedOnboarding: true,
          hasActiveSubscription: true, // Mark that they have an active subscription
          subscriptionPurchaseDate: new Date().toISOString(),
          subscriptionType: selectedPlan === '12months' ? 'yearly' : 'monthly',
        });
        
        // Initialize all data listeners before navigating
        console.log('Initializing data listeners for newly created user');
        await initializeAllDataListeners(userId);
        
        // Add a delay to ensure Firebase has time to process the data
        console.log('Waiting for data to be processed...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify that user document exists and contains all required data
        let verified = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!verified && attempts < maxAttempts) {
          verified = await verifyUserDocument(userId);
          if (!verified) {
            console.log(`Verification attempt ${attempts + 1} failed. Waiting...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }
        
        if (!verified) {
          console.warn("Could not verify user document after multiple attempts, but proceeding anyway");
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error creating user document:', error);
      return false;
    }
  };

  // Updated handle continue to always require a purchase in production
  // And offer a skip option only in development if specifically enabled
  const handleContinue = async () => {
    // Always trigger purchase flow regardless of environment
    // But in development, you can optionally add a way to bypass
    const skipPurchaseInDev = false; // Set to true to enable skipping in dev
    
    if (__DEV__ && skipPurchaseInDev) {
      // In development mode with skip enabled, allow skipping payment
      try {
        setIsLoading(true);
        await handleUserDocumentCreation();
        console.log('Development mode: Skipping purchase and navigating to home screen');
        router.replace('/(tabs)/home');
      } catch (error) {
        console.error('Error in development continuation:', error);
        Alert.alert('Error', 'Failed to complete the process. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // In production or dev without skip, always trigger the purchase flow
      handlePurchaseSubscription();
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
        {subscriptionPlans.length === 0 ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Subscription Plans Unavailable</Text>
            <Text style={styles.errorText}>
              We couldn't load the subscription plans from the App Store. This might be due to:
            </Text>
            <View style={styles.errorList}>
              <Text style={styles.errorListItem}>• No internet connection</Text>
              <Text style={styles.errorListItem}>• App Store configuration issues</Text>
              <Text style={styles.errorListItem}>• You are not signed in with a Sandbox Test Account</Text>
            </View>
            <Text style={styles.errorText}>
              Please check your internet connection and try again.
            </Text>
            <CustomButton
              title="Try Again"
              onPress={async () => {
                setIsLoading(true);
                const plans = await subscriptionService.getSubscriptions();
                if (plans.length > 0) {
                  setSubscriptionPlans(plans);
                }
                setIsLoading(false);
              }}
              buttonStyle={styles.retryButton}
              textStyle={styles.retryButtonText}
              disabled={isLoading}
            />
          </View>
        ) : (
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
        )}

        {/* Pro Testimonial Section */}
        {subscriptionPlans.length > 0 && (
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
        )}

        {/* Restore Purchases Button */}
        <Pressable
          onPress={handleRestorePurchases}
          disabled={isRestoringPurchases || isPurchasing || isLoading || subscriptionPlans.length === 0}
          style={({ pressed }) => ({
            marginBottom: 16,
            alignItems: 'center',
            opacity: (pressed || isRestoringPurchases || subscriptionPlans.length === 0) ? 0.7 : 1,
          })}
        >
          <Text style={[
            styles.restorePurchasesText,
            subscriptionPlans.length === 0 && styles.disabledText
          ]}>
            {isRestoringPurchases ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </Pressable>

        {/* Continue Button - Only show if subscription plans are available */}
        {subscriptionPlans.length > 0 && (
          <CustomButton
            title={isPurchasing ? "Processing Purchase..." : (isLoading ? "Processing..." : "Subscribe & Continue")}
            onPress={handleContinue}
            buttonStyle={styles.continueButton}
            textStyle={styles.continueButtonText}
            disabled={isPurchasing || isLoading}
          />
        )}
        
        {/* Terms & Conditions - Only show if subscription plans are available */}
        {subscriptionPlans.length > 0 && (
          <Text style={styles.termsText}>
            By subscribing, you agree to our Terms of Service and Privacy Policy. 
            Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.
          </Text>
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
  restorePurchasesText: {
    fontSize: 14,
    color: '#4064F6',
    fontWeight: '500',
  },
  termsText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  errorContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorList: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    width: '100%',
  },
  errorListItem: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#4064F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledText: {
    color: '#CCCCCC',
  },
}); 