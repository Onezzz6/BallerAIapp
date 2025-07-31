import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOfferings } from 'react-native-purchases';
import Constants from 'expo-constants';

// Track if RevenueCat is already configured to prevent double configuration
let isRevenueCatConfigured = false;

// Queue for attributes when RevenueCat is not yet configured
let pendingAttributes: Record<string, string> = {};

/**
 * Check if we already have an active subscription for a specific entitlement
 * This is safe to call before configuration - it will return false if not configured
 * @param entitlementId - The entitlement ID to check for
 * @returns boolean indicating if the entitlement is active
 */
export const hasActiveSubscription = async (entitlementId: string): Promise<boolean> => {
  try {
    // Get RevenueCat API key using consistent method with other services
    const apiKey = Platform.OS === 'ios' 
      ? Constants.expoConfig?.extra?.revenueCatIosApiKey
      : Constants.expoConfig?.extra?.revenueCatAndroidApiKey;

    if (!apiKey) {
      console.log('RevenueCat API key not found - subscription check skipped');
      return false;
    }

    // Ensure RevenueCat is configured before checking subscription
    if (!isRevenueCatConfigured) {
      await configureRevenueCat(); // This will configure with the API key
    }
    
    const customerInfo = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active[entitlementId];
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
};

/**
 * Configure RevenueCat SDK - this should be called exactly once per app process
 * After configuration, use logInRevenueCatUser() to switch users
 * @param uid - Optional Firebase user ID for initial configuration
 */
export const configureRevenueCat = async (uid?: string): Promise<void> => {
  try {
    // Guard against double configuration - SDK only allows this once per process
    if (isRevenueCatConfigured) {
      console.log('RevenueCat already configured - use logInRevenueCatUser() to switch users');
      return;
    }

    // Get RevenueCat API key using consistent method with other services  
    const apiKey = Platform.OS === 'ios' 
      ? Constants.expoConfig?.extra?.revenueCatIosApiKey
      : Constants.expoConfig?.extra?.revenueCatAndroidApiKey;

    if (!apiKey) {
      console.error('RevenueCat API key not found in environment variables');
      console.error('Available extra keys:', Object.keys(Constants.expoConfig?.extra || {}));
      throw new Error('RevenueCat API key is required for proper functionality');
    }

    console.log(`Configuring RevenueCat SDK${uid ? ` with initial user: ${uid}` : ''}`);
    
    // Configure RevenueCat - optionally with initial user ID
    await Purchases.configure({ 
      apiKey,
      ...(uid && { appUserID: uid })
    });
    
    isRevenueCatConfigured = true;
    console.log('RevenueCat SDK configured successfully');
    
    // Note: Pending attributes will be flushed after user login to ensure they're
    // attached to the correct Firebase UID, not the anonymous user
  } catch (error) {
    console.error('Error configuring RevenueCat:', error);
    throw error; // Re-throw to ensure calling code handles the error
  }
};

/**
 * Log in a user to RevenueCat - call this after SDK is configured
 * @param uid - Firebase user ID
 */
export const logInRevenueCatUser = async (uid: string): Promise<void> => {
  try {
    // Get RevenueCat API key using consistent method with other services
    const apiKey = Platform.OS === 'ios' 
      ? Constants.expoConfig?.extra?.revenueCatIosApiKey
      : Constants.expoConfig?.extra?.revenueCatAndroidApiKey;

    if (!apiKey) {
      console.error('RevenueCat API key not found - cannot log in user');
      throw new Error('RevenueCat API key is required for user login');
    }

    if (!isRevenueCatConfigured) {
      console.log('RevenueCat not configured yet - configuring with user ID');
      await configureRevenueCat(uid);
      return;
    }

    console.log(`Logging in RevenueCat user: ${uid}`);
    await Purchases.logIn(uid);
    console.log('RevenueCat user logged in successfully');
    
    // Flush any pending attributes after login to ensure they're attached to the correct user
    if (Object.keys(pendingAttributes).length > 0) {
      console.log(`Flushing ${Object.keys(pendingAttributes).length} pending attributes to user: ${uid}`);
      await Purchases.setAttributes(pendingAttributes);
      pendingAttributes = {}; // Clear the queue
      console.log('Pending attributes flushed successfully');
    }
  } catch (error) {
    console.error('Error logging in RevenueCat user:', error);
    throw error; // Re-throw to ensure calling code handles the error
  }
};

/**
 * Set a referral code in RevenueCat for attribution
 * @param referralCode - The referral code to set
 */
export const setReferralCode = async (referralCode: string): Promise<void> => {
  try {
    // Get RevenueCat API key using consistent method with other services
    const apiKey = Platform.OS === 'ios' 
      ? Constants.expoConfig?.extra?.revenueCatIosApiKey
      : Constants.expoConfig?.extra?.revenueCatAndroidApiKey;

    if (!apiKey) {
      console.log('RevenueCat API key not found - skipping referral code setting in development');
      return; // Quietly no-op in development
    }

    // Ensure RevenueCat is configured before setting attributes
    if (!isRevenueCatConfigured) {
      console.log('RevenueCat not configured yet - queueing referral code for later');
      pendingAttributes['referral_code'] = referralCode;
      return;
    }

    console.log(`Setting referral code in RevenueCat: ${referralCode}`);
    
    await Purchases.setAttributes({
      'referral_code': referralCode
    });
    
    console.log('Referral code set successfully in RevenueCat');
  } catch (error) {
    console.error('Error setting referral code in RevenueCat:', error);
  }
};

/**
 * Reset RevenueCat user state - call this on user logout
 * This clears pending attributes but keeps SDK configured (as required by SDK)
 */
export const resetRevenueCatState = (): void => {
  console.log('Resetting RevenueCat user state for user logout');
  // DO NOT reset isRevenueCatConfigured - SDK only allows configure() once per process
  pendingAttributes = {}; // Clear any pending attributes
};

/**
 * Log out current RevenueCat user - call this on user logout
 */
export const logOutRevenueCatUser = async (): Promise<void> => {
  try {
    // Get RevenueCat API key using consistent method with other services
    const apiKey = Platform.OS === 'ios' 
      ? Constants.expoConfig?.extra?.revenueCatIosApiKey
      : Constants.expoConfig?.extra?.revenueCatAndroidApiKey;

    if (!apiKey) {
      console.log('RevenueCat API key not found - skipping logout in development');
      return;
    }

    if (!isRevenueCatConfigured) {
      console.log('RevenueCat not configured - skipping logout');
      return;
    }

    console.log('Logging out current RevenueCat user');
    await Purchases.logOut();
    console.log('RevenueCat user logged out successfully');
  } catch (error) {
    console.error('Error logging out RevenueCat user:', error);
  }
};

/**
 * Set additional user attributes in RevenueCat
 * This can be used to track other user properties for segmentation
 * If SDK isn't configured yet, attributes will be queued and set after configuration
 * @param attributes - Key-value pairs of user attributes
 */
export const setUserAttributes = async (attributes: Record<string, string>): Promise<void> => {
  try {
    // Get RevenueCat API key using consistent method with other services
    const apiKey = Platform.OS === 'ios' 
      ? Constants.expoConfig?.extra?.revenueCatIosApiKey
      : Constants.expoConfig?.extra?.revenueCatAndroidApiKey;

    if (!apiKey) {
      console.log('RevenueCat API key not found - skipping user attributes setting in development');
      return; // Quietly no-op in development
    }

    // If SDK is not configured yet, queue the attributes for later
    if (!isRevenueCatConfigured) {
      console.log(`RevenueCat not configured yet - queueing ${Object.keys(attributes).length} user attributes`);
      Object.assign(pendingAttributes, attributes);
      return;
    }

    console.log(`Setting ${Object.keys(attributes).length} user attributes in RevenueCat`);
    
    await Purchases.setAttributes(attributes);
    
    console.log('User attributes set successfully in RevenueCat');
  } catch (error) {
    console.error('Error setting user attributes in RevenueCat:', error);
  }
};

// TypeScript types for better type safety
export interface RevenueCatAttributes {
  referral_code?: string;
  [key: string]: string | undefined;
} 