import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

// Queue for attributes that need to be set after configuration
let pendingAttributes: Record<string, string> = {};

// Track if RevenueCat has been configured to prevent double configuration
let isRevenueCatConfigured = false;

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
    const apiKey = Platform.OS === 'ios' 
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

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

    const apiKey = Platform.OS === 'ios' 
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

    if (!apiKey) {
      console.log('RevenueCat API key not found - running in development mode');
      return; // Quietly no-op in development
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
  }
};

/**
 * Log in a user to RevenueCat - call this after SDK is configured
 * @param uid - Firebase user ID
 */
export const logInRevenueCatUser = async (uid: string): Promise<void> => {
  try {
    const apiKey = Platform.OS === 'ios' 
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

    if (!apiKey) {
      console.log('RevenueCat API key not found - skipping login in development');
      return;
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
  }
};

/**
 * Set referral code as a subscriber attribute in RevenueCat
 * This can be called multiple times (RevenueCat will dedupe)
 * If SDK isn't configured yet, the code will be queued and set after configuration
 * @param code - The validated referral code
 */
export const setReferralCode = async (code: string): Promise<void> => {
  try {
    const apiKey = Platform.OS === 'ios' 
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

    if (!apiKey) {
      console.log('RevenueCat API key not found - skipping referral code setting in development');
      return; // Quietly no-op in development
    }

    if (!code.trim()) {
      console.log('Empty referral code provided - skipping');
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    
    // If SDK is not configured yet, queue the attribute for later
    if (!isRevenueCatConfigured) {
      console.log(`RevenueCat not configured yet - queueing referral code: ${cleanCode}`);
      pendingAttributes.referral_code = cleanCode;
      return;
    }
    
    console.log(`Setting referral code attribute in RevenueCat: ${cleanCode}`);
    
    // Set the referral code as a subscriber attribute
    await Purchases.setAttributes({
      referral_code: cleanCode
    });
    
    console.log('Referral code attribute set successfully in RevenueCat');
  } catch (error) {
    console.error('Error setting referral code in RevenueCat:', error);
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
    const apiKey = Platform.OS === 'ios' 
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

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