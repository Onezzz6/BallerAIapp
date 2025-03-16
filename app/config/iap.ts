import { Platform } from 'react-native';
import * as InAppPurchases from 'expo-in-app-purchases';

// Product IDs
export const SUBSCRIPTION_SKUS = Platform.select({
  ios: {
    monthly: 'BallerAISubscriptionOneMonth',
    yearly: 'BallerAISubscriptionOneYear'
  },
  android: {
    monthly: 'BallerAISubscriptionOneMonth',
    yearly: 'BallerAISubscriptionOneYear'
  }
}) || { monthly: '', yearly: '' };

let isIAPInitialized = false;
let purchasePromiseResolver: ((value: InAppPurchases.InAppPurchase | null) => void) | null = null;

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize IAP
export const initializeIAP = async (retryCount = 0): Promise<InAppPurchases.IAPItemDetails[]> => {
  try {
    console.log('[IAP] Starting initialization... (attempt ' + (retryCount + 1) + ')');
    
    if (!isIAPInitialized) {
      console.log('[IAP] Connecting to store...');
      await InAppPurchases.connectAsync();
      
      // Set up purchase listener
      console.log('[IAP] Setting up purchase listener...');
      InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
        console.log('[IAP] Purchase listener triggered:', { 
          responseCode, 
          errorCode,
          responseCodeName: Object.entries(InAppPurchases.IAPResponseCode)
            .find(([_, value]) => value === responseCode)?.[0]
        });
        console.log('[IAP] Purchase results:', results);
        
        if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
          console.log('[IAP] Purchase successful');
          purchasePromiseResolver?.(results[0]);
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('[IAP] Purchase cancelled by user');
          purchasePromiseResolver?.(null);
        } else {
          console.error('[IAP] Purchase error:', errorCode);
          purchasePromiseResolver?.(null);
        }
        purchasePromiseResolver = null;
      });
      
      isIAPInitialized = true;
      console.log('[IAP] Initialization complete');
    }

    // Load products
    console.log('[IAP] Loading products...');
    console.log('[IAP] Product IDs:', [SUBSCRIPTION_SKUS.monthly, SUBSCRIPTION_SKUS.yearly]);
    
    const response = await InAppPurchases.getProductsAsync([
      SUBSCRIPTION_SKUS.monthly,
      SUBSCRIPTION_SKUS.yearly
    ]);

    console.log('[IAP] Products loaded:', response?.results);
    
    if (!response?.results || response.results.length === 0) {
      if (retryCount < MAX_RETRIES) {
        console.log('[IAP] No products found, retrying in ' + RETRY_DELAY + 'ms...');
        await delay(RETRY_DELAY);
        return initializeIAP(retryCount + 1);
      } else {
        console.error('[IAP] Failed to load products after ' + MAX_RETRIES + ' attempts');
      }
    }

    return response?.results ?? [];
  } catch (error) {
    console.error('[IAP] Error initializing:', error);
    if (retryCount < MAX_RETRIES) {
      console.log('[IAP] Retrying initialization in ' + RETRY_DELAY + 'ms...');
      await delay(RETRY_DELAY);
      return initializeIAP(retryCount + 1);
    }
    return [];
  }
};

// Purchase subscription
export const purchaseSubscription = async (sku: string): Promise<InAppPurchases.InAppPurchase | null> => {
  try {
    console.log('[IAP] Starting purchase flow for SKU:', sku);
    if (!isIAPInitialized) {
      console.log('[IAP] Not initialized, initializing now...');
      const products = await initializeIAP();
      if (!products.some(p => p.productId === sku)) {
        throw new Error('Product not available for purchase. Please check your App Store Connect configuration.');
      }
    }

    // Create a new promise that we'll resolve through the purchase listener
    console.log('[IAP] Creating purchase promise...');
    const purchasePromise = new Promise<InAppPurchases.InAppPurchase | null>((resolve) => {
      purchasePromiseResolver = resolve;
    });

    // Start the purchase flow
    console.log('[IAP] Calling purchaseItemAsync...');
    await InAppPurchases.purchaseItemAsync(sku);
    console.log('[IAP] purchaseItemAsync called, waiting for listener...');

    // Wait for the purchase listener to resolve the promise
    const result = await purchasePromise;
    console.log('[IAP] Purchase flow complete:', result);
    return result;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('[IAP] Purchase error:', error.message);
      if (!error.message?.includes('user canceled')) {
        throw error;
      }
    }
    return null;
  }
};

// Clean up IAP connection
export const cleanupIAP = async () => {
  try {
    if (isIAPInitialized) {
      await InAppPurchases.disconnectAsync();
      isIAPInitialized = false;
      purchasePromiseResolver = null;
    }
  } catch (error) {
    console.error('Error cleaning up IAP:', error);
  }
};

// Validate receipt (for iOS)
export const validateReceipt = async (receipt: string) => {
  // Implement your receipt validation logic here
  // You should validate the receipt with Apple's servers
  // For production, this should be done on your backend
  return true;
}; 