import { Platform, Alert } from 'react-native';
import {
  initConnection,
  getProducts,
  requestSubscription,
  getAvailablePurchases,
  finishTransaction,
  PurchaseError,
  SubscriptionPurchase,
  ProductPurchase,
  validateReceiptIos,
  validateReceiptAndroid,
  clearTransactionIOS,
  flushFailedPurchasesCachedAsPendingAndroid,
  purchaseErrorListener,
  purchaseUpdatedListener,
  Product,
  Purchase,
} from 'react-native-iap';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth } from 'firebase/auth';

// Define the product IDs for your subscriptions
export const SUBSCRIPTION_SKUS = Platform.select({
  ios: [
    'BallerAISubscriptionOneMonth',
    'BallerAISubscriptionOneYear',
  ],
  android: [
    'baller_ai_subscription_one_month',
    'baller_ai_subscription_one_year',
  ],
  default: [],
});

// Define the product type interfaces
export interface SubscriptionData {
  id: string;
  duration: string;
  price: string;
  period: string;
  totalPrice: string; 
  period2: string;
  isBestValue?: boolean;
  productObject?: Product;
}

const subscriptionService = {
  // Initialize the connection to the app store
  async initialize() {
    try {
      console.log('Initializing IAP connection...');
      console.log('Current platform:', Platform.OS);
      
      const connectionResult = await initConnection();
      console.log('IAP connection result:', connectionResult);
      
      // On Android, clear any failed purchases
      if (Platform.OS === 'android') {
        await flushFailedPurchasesCachedAsPendingAndroid();
      }
      
      // Check if we're running in a sandbox environment
      if (Platform.OS === 'ios') {
        try {
          // This is a dummy validation to see if we're in sandbox mode
          const receipt = '';
          const validation = await validateReceiptIos({
            receiptBody: {
              'receipt-data': receipt
            },
            isTest: true, // Use sandbox validation
          });
          console.log('App Store environment status:', validation);
          if (validation.environment === 'Sandbox') {
            console.log('Running in App Store SANDBOX environment');
          }
        } catch (validationError) {
          console.log('Receipt validation test error (expected):', validationError);
        }
      }
      
      console.log('IAP connection initialized successfully');
      console.log('Available subscription SKUs:', );
      return true;
    } catch (error) {
      console.error('Failed to initialize IAP connection:', error);
      return false;
    }
  },

  // Get available products from the store
  async getSubscriptions(): Promise<SubscriptionData[]> {
    try {
      // Ensure IAP is initialized
      await this.initialize();
      
      // Get products from the store
      console.log('Fetching subscription products from app store...');
      console.log('SKUs being requested:', SUBSCRIPTION_SKUS);
      
      // Log our expected product IDs
      if (Platform.OS === 'ios') {
        console.log('iOS Product IDs to be requested:', [
          'BallerAISubscriptionOneMonth',
          'BallerAISubscriptionOneYear'
        ]);
      }
      
      let products: Product[] = [];
      
      // Verify the SKUs array is not empty
      if (!SUBSCRIPTION_SKUS || SUBSCRIPTION_SKUS.length === 0) {
        console.error('ERROR: SUBSCRIPTION_SKUS is empty! Check Platform.select() result');
        // Force set the correct values for iOS
        const forcedSkus = Platform.OS === 'ios' ? 
          ['BallerAISubscriptionOneMonth', 'BallerAISubscriptionOneYear'] :
          ['baller_ai_subscription_one_month', 'baller_ai_subscription_one_year'];
          
        console.log('Forcing SKUs to:', forcedSkus);
        products = await getProducts({ skus: forcedSkus });
        console.log('Products fetched with forced SKUs:', products);
      } else {
        products = await getProducts({ skus: SUBSCRIPTION_SKUS as string[] });
        console.log('Products fetched successfully:', products);
        
        if (products.length === 0) {
          console.error('ERROR: No products returned from the App Store. Verification steps:');
          console.error('1. Product IDs in app.config.js match EXACTLY with App Store Connect');
          console.error('2. Bundle ID in app.config.js matches EXACTLY with App Store Connect');
          console.error('3. IAP products in App Store Connect are in "Ready to Submit" state');
          console.error('4. You are signed in with a valid sandbox test account on this device');
          console.error('5. The app has proper IAP entitlements in your Apple Developer account');
          console.error('6. The products have complete metadata, screenshots, and pricing in App Store Connect');
          
          // Try another approach - get all available products
          try {
            console.log('Attempting to get all available products with empty skus array...');
            const allProducts = await getProducts({ skus: [] });
            console.log('All available products:', allProducts);
          } catch (e) {
            console.error('Failed to fetch all products:', e);
          }
          
          // Return empty array instead of fallback data
          return [];
        }
      }
      
      // Map raw products to our SubscriptionData format
      const subscriptionPlans: SubscriptionData[] = products.map(product => {
        // Determine if it's a monthly or yearly subscription
        const isYearly = product.productId.toLowerCase().includes('year');
        const isMonthly = product.productId.toLowerCase().includes('month');
        
        // Convert price to float for calculations
        const priceValue = parseFloat(product.price.replace(/[^0-9.-]+/g, ''));
        
        // Format for display
        let duration = '1';
        let period = 'per month';
        let period2 = 'monthly';
        let totalPrice = product.localizedPrice;
        let isBestValue = false;
        
        if (isYearly) {
          duration = '12';
          period = 'per month';
          period2 = 'yearly';
          // For yearly subscription, we can calculate the monthly price
          const monthlyPrice = (priceValue / 12).toFixed(2);
          totalPrice = product.localizedPrice;
          isBestValue = true;
        } else if (isMonthly) {
          duration = '1';
          period = 'per month';
          period2 = 'monthly';
        }
        
        return {
          id: isYearly ? '12months' : '1month', // Match the original IDs in the UI
          duration,
          price: isYearly ? (priceValue / 12).toFixed(2) : priceValue.toFixed(2),
          period,
          totalPrice,
          period2,
          isBestValue,
          productObject: product, // Store the full product object for purchase
        };
      });
      
      // Return the subscription plans (or empty array if none found)
      return subscriptionPlans;
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      // Return empty array instead of fallback data
      return [];
    }
  },

  // Get the product ID from the plan ID
  getProductIdFromPlanId(planId: string) {
    if (planId === '1month') {
      return Platform.OS === 'ios' ? 'BallerAISubscriptionOneMonth' : 'baller_ai_subscription_one_month';
    } else if (planId === '12months') {
      return Platform.OS === 'ios' ? 'BallerAISubscriptionOneYear' : 'baller_ai_subscription_one_year';
    }
    return '';
  },

  // Purchase a subscription
  async purchaseSubscription(planId: string) {
    try {
      // Get the right product ID based on the plan
      const productId = this.getProductIdFromPlanId(planId);
      
      if (!productId) {
        throw new Error('Invalid plan selected');
      }
      
      console.log(`Purchasing subscription ${productId}...`);
      
      // Request the subscription purchase
      const purchase = await requestSubscription({
        sku: productId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false, // For proper receipt handling
      });
      
      console.log('Purchase successful:', purchase);
      
      // Finish the transaction
      if (Platform.OS === 'ios' && purchase) {
        // Cast the purchase to Purchase type to satisfy TypeScript
        await finishTransaction({ 
          purchase: purchase as Purchase, 
          isConsumable: false 
        });
      }

      // Store subscription info in Firestore
      await this.recordPurchaseInFirestore(planId, purchase);
      
      return {
        success: true,
        // Use optional chaining and type assertions to safely access transactionReceipt
        receipt: typeof purchase === 'object' && purchase ? 
          (purchase as any).transactionReceipt || '' : '',
        purchaseData: purchase,
      };
    } catch (error: any) {
      console.error('Purchase failed:', error);
      
      // Handle user cancellation gracefully
      if (error.code === 'E_USER_CANCELLED') {
        return {
          success: false,
          cancelled: true,
          message: 'Purchase was cancelled',
        };
      }
      
      // Handle other errors
      return {
        success: false,
        error: error.message || 'Failed to complete purchase',
      };
    }
  },
  
  // Record purchase information in Firestore
  async recordPurchaseInFirestore(planId: string, purchase: any) {
    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        console.error('No authenticated user found');
        return false;
      }
      
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.error('User document does not exist');
        return false;
      }
      
      // Calculate expiration date based on subscription type
      const now = new Date();
      let expirationDate = new Date();
      
      if (planId === '12months') {
        expirationDate.setFullYear(now.getFullYear() + 1); // 1 year from now
      } else {
        expirationDate.setMonth(now.getMonth() + 1); // 1 month from now
      }
      
      // Update the user document with subscription info
      await updateDoc(userDocRef, {
        hasActiveSubscription: true,
        subscriptionType: planId === '12months' ? 'yearly' : 'monthly',
        subscriptionPurchaseDate: now.toISOString(),
        subscriptionExpirationDate: expirationDate.toISOString(),
        subscriptionProductId: this.getProductIdFromPlanId(planId),
        subscriptionReceipt: purchase?.transactionReceipt || '',
        lastUpdatedAt: now.toISOString(),
      });
      
      console.log(`Subscription recorded in Firestore for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to record purchase in Firestore:', error);
      return false;
    }
  },

  // Check if the user has a valid subscription
  async hasActiveSubscription(): Promise<boolean> {
    try {
      // First check local database
      const localResult = await this.checkLocalSubscriptionStatus();
      if (localResult) {
        return true;
      }
      
      // If not found in local storage, check with store
      const storeResult = await this.checkSubscriptionStatus();
      return storeResult.hasActiveSubscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  },
  
  // Check subscription status in Firestore
  async checkLocalSubscriptionStatus(): Promise<boolean> {
    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        console.log('No authenticated user found');
        return false;
      }
      
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log('User document does not exist');
        return false;
      }
      
      const userData = userDoc.data();
      
      // Check if user has an active subscription
      if (userData.hasActiveSubscription) {
        // Verify the expiration date
        const expirationDate = new Date(userData.subscriptionExpirationDate);
        const now = new Date();
        
        if (expirationDate > now) {
          console.log('User has an active subscription until', expirationDate);
          return true;
        } else {
          console.log('Subscription expired on', expirationDate);
          
          // Update the user document to mark subscription as inactive
          await updateDoc(userDocRef, {
            hasActiveSubscription: false,
            lastUpdatedAt: now.toISOString(),
          });
          
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking local subscription status:', error);
      return false;
    }
  },
  
  // Validate receipt on the App Store for iOS
  async validateIOSReceipt(receipt: string) {
    try {
      console.log('Validating iOS receipt...');
      const validation = await validateReceiptIos({
        receiptBody: {
          'receipt-data': receipt
        },
        isTest: true, // Use true for sandbox testing, false for production
      });
      
      console.log('Receipt validation result:', validation);
      return validation;
    } catch (error) {
      console.error('Receipt validation failed:', error);
      throw error;
    }
  },
  
  // Restore previous purchases
  async restorePurchases() {
    try {
      console.log('Restoring purchases...');
      const purchases = await getAvailablePurchases();
      console.log('Available purchases:', purchases);
      
      // Filter for active subscriptions
      const activeSubscriptions = purchases.filter(
        purchase => purchase.productId && SUBSCRIPTION_SKUS?.includes(purchase.productId)
      );
      
      if (activeSubscriptions.length > 0) {
        console.log('Active subscriptions found:', activeSubscriptions);
        
        // Record the restored purchase in Firestore
        const latestPurchase = activeSubscriptions[0]; // Use the first one
        const planId = latestPurchase.productId?.includes('Year') ? '12months' : '1month';
        await this.recordPurchaseInFirestore(planId, latestPurchase);
        
        return {
          success: true,
          purchases: activeSubscriptions,
        };
      }
      
      console.log('No active subscriptions found');
      return {
        success: true,
        purchases: [],
      };
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      return {
        success: false,
        error: 'Failed to restore purchases',
      };
    }
  },
  
  // Check if user has active subscription
  async checkSubscriptionStatus() {
    try {
      const result = await this.restorePurchases();
      
      if (result.success && result.purchases && result.purchases.length > 0) {
        // Verify the receipts if needed
        // For sandbox testing, we'll just check if any subscription exists
        return {
          hasActiveSubscription: true,
          subscriptions: result.purchases,
        };
      }
      
      return {
        hasActiveSubscription: false,
      };
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return {
        hasActiveSubscription: false,
        error: 'Failed to verify subscription',
      };
    }
  },
  
  // Set up purchase listeners - call in app initialization
  setupPurchaseListeners() {
    // Listen for purchase updates
    const purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: ProductPurchase | SubscriptionPurchase) => {
        console.log('Purchase updated:', purchase);
        
        // Validate the purchase
        if (purchase && 'transactionReceipt' in purchase && purchase.transactionReceipt) {
          try {
            // Finish the transaction
            await finishTransaction({ purchase, isConsumable: false });
            console.log('Transaction finished');
            
            // Record the purchase in Firestore
            const planId = purchase.productId?.includes('Year') ? '12months' : '1month';
            await this.recordPurchaseInFirestore(planId, purchase);
          } catch (error) {
            console.error('Failed to finish transaction:', error);
          }
        }
      }
    );
    
    // Listen for purchase errors
    const purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.error('Purchase error listener:', error);
        // Handle specific errors if needed
      }
    );
    
    // Return the subscription removal functions for cleanup
    return () => {
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
    };
  },
};

export default subscriptionService; 