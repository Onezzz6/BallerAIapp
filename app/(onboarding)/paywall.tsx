import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import CustomButton from '../components/CustomButton';
import { usePathname } from 'expo-router';
import { setReferralCode, configureRevenueCat, logInRevenueCatUser } from '../services/revenuecat';
// Remove import from _layout to fix circular dependency
// import { isOnOnboardingScreen } from '../_layout';

// Correct entitlement identifier
const ENTITLEMENT_ID = "BallerAISubscriptionGroup";

// Track if paywall is currently visible to prevent duplicate displays at any time during the app flow
let isPaywallCurrentlyPresented = false;

// Track if user has completed authentication - paywall should never show before this is true
let hasUserCompletedAuthentication = false;

// Function to set auth completion flag - call this ONLY after successful sign-in or sign-up
// This enables paywall presentation after authentication, in both the post-login sequence
// and when the app returns to the foreground later
export function markAuthenticationComplete() {
  console.log("✅ Authentication process completed - paywall can now be shown when needed");
  hasUserCompletedAuthentication = true;
}

// Function to reset auth completion flag - call this on sign-out
// This ensures the paywall won't be shown again until the user signs in again
export function resetAuthenticationStatus() {
  console.log("⏮️ Authentication status reset - paywall will not be shown until next sign-in");
  hasUserCompletedAuthentication = false;
  // RevenueCat state reset is handled in the signOut flow
}

// Local implementation of onboarding screen detection to avoid circular dependency
// This is only used to prevent foreground-background paywall checks during onboarding
// It is NOT used to skip paywall display after sign-in/sign-up
const isOnOnboardingScreen = (path: string) => {
  return path.includes('/(onboarding)') || 
    path.includes('/paywall') || 
    path.includes('/sign') || 
    path.includes('/motivation') ||
    path.includes('/tracking') ||
    path.includes('/football-goal') ||
    path.includes('/smart-watch') ||
    
    path.includes('/training-frequency') ||
    path.includes('/improvement-focus') ||
    path.includes('/username') ||
    path === '/';
};

/**
 * Handles subscription check when app returns to foreground
 * Follows the identify→sync→fetch→gate flow to ensure we have fresh data
 * 
 * @param userId The Firebase UID of the authenticated user
 * @param navigateToHome Function to navigate to the home screen
 * @param navigateToWelcome Function to navigate to the welcome screen
 * @param currentPath Optional current path to check if in onboarding
 */
export async function checkSubscriptionOnForeground(
  userId: string,
  navigateToHome: () => void,
  navigateToWelcome: () => void,
  currentPath?: string
): Promise<void> {
  console.log("\n======== APP FOREGROUND SUBSCRIPTION CHECK ========");
  console.log(`UserID: ${userId}, Current path: ${currentPath || 'undefined'}`);
  
  // If a paywall is already being presented, skip this check entirely
  if (isPaywallCurrentlyPresented) {
    console.log("⚠️ Paywall is already being presented - skipping duplicate check");
    return;
  }
  
  // Skip check only if user is in onboarding flow
  if (currentPath) {
    console.log(`Current path for checking: "${currentPath}"`);
    const inOnboarding = isOnOnboardingScreen(currentPath);
    console.log(`Is in onboarding flow? ${inOnboarding ? 'YES' : 'NO'}`);
    
    if (inOnboarding) {
      console.log("⚠️ User is in onboarding flow - skipping subscription check");
      return;
    }
  } else {
    console.log("⚠️ No current path provided - continuing with subscription check");
  }

  try {
    // 1. Ensure RevenueCat is configured and user is logged in
    console.log(`STEP 1: Ensuring RevenueCat is set up for user: ${userId}`);
    await configureRevenueCat(); // Configure SDK (no-op if already configured)
    await logInRevenueCatUser(userId); // Ensure correct user is logged in
    
    // 2. Sync purchases to ensure all receipts are associated
    console.log("STEP 2: Syncing purchases with user account...");
    await Purchases.syncPurchases();
    
    // 3. Clear customer info cache to ensure fresh data
    console.log("STEP 3: Clearing customer info cache...");
    try {
      if (typeof Purchases.invalidateCustomerInfoCache === 'function') {
        await Purchases.invalidateCustomerInfoCache();
        console.log("Cache successfully invalidated");
      } else {
        console.log("Cache invalidation method not available, using alternate approach");
      }
    } catch (cacheError) {
      console.error("Cache clearing error (non-fatal):", cacheError);
    }
    
    // 4. Force network fetch of latest subscription data
    console.log("STEP 4: Forcing network fetch of subscription data...");
    // Small delay to ensure cache clear has propagated
    await new Promise(resolve => setTimeout(resolve, 100));
    const customerInfo = await Purchases.getCustomerInfo();
    console.log("Network fetch complete");
    
    // Log subscription details for debugging
    console.log("\n======= FOREGROUND CHECK SUBSCRIPTION INFO =======");
    
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    if (entitlement) {
      console.log("✅ ACTIVE SUBSCRIPTION FOUND");
      console.log("📅 Expiration Date:", entitlement.expirationDate);
      console.log("🔄 Will Renew:", entitlement.willRenew ? "YES" : "NO");
      console.log("🆔 Product ID:", entitlement.productIdentifier);
      console.log("Subscription active - no paywall needed");
      return;
    } else {
      console.log("❌ No active subscription found for entitlement:", ENTITLEMENT_ID);
    }
    console.log("===============================================\n");
    
    // 5. If no active subscription, show the paywall
    console.log("STEP 5: Presenting paywall...");
    
    // Mark paywall as being presented to prevent duplicates
    isPaywallCurrentlyPresented = true;
    
    // Important: we don't want to show the paywall twice, so we wrap this in a try/catch
    // and ensure we only navigate once when necessary
    try {
      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID
      });
      
      // Reset paywall presented flag
      isPaywallCurrentlyPresented = false;
      
      // 6. Handle result with appropriate navigation
      console.log("STEP 6: Handling paywall result:", paywallResult);
      if (paywallResult === PAYWALL_RESULT.PURCHASED || 
          paywallResult === PAYWALL_RESULT.RESTORED) {
        // Success - navigate to home
        console.log("Purchase/restore successful - navigating to home");
        navigateToHome();
          } else {
        // Cancelled - navigate to welcome screen to sign in again
        console.log("Paywall cancelled - navigating to welcome screen");
        navigateToWelcome();
      }
    } catch (error) {
      // Reset paywall presented flag even if there's an error
      isPaywallCurrentlyPresented = false;
      
      console.error("Error presenting paywall:", error);
      // On paywall presentation error, default to welcome screen
      navigateToWelcome();
    }
  } catch (error) {
    // Reset paywall presented flag even if there's an error
    isPaywallCurrentlyPresented = false;
    
    console.error("Error in foreground subscription check:", error);
    // On error, default to welcome screen
    navigateToWelcome();
  }
}

/**
 * The definitive, imperative post-login RevenueCat sequence
 * This handles user identification, purchase syncing, and paywall presentation
 * in a precise order to prevent race conditions
 * 
 * @param userId The Firebase UID of the authenticated user
 * @param navigateToHome Function to navigate to the home screen
 * @param navigateToWelcome Function to navigate to the welcome screen
 * @param currentPath Optional current path to check if in onboarding
 * @param referralData Optional referral code data for post-onboarding paywall selection
 */
export async function runPostLoginSequence(
  userId: string, 
  navigateToHome: () => void,
  navigateToWelcome: () => void,
  currentPath?: string,
  referralData?: {
    referralCode: string | null;
    referralDiscount: number | null;
    referralInfluencer: string | null;
    referralPaywallType: string | null;
  }
): Promise<void> {
  console.log("======== RUNNING ONE-TIME POST-LOGIN SEQUENCE ========");
  console.log(`UserID: ${userId}, Current path: ${currentPath || 'undefined'}`);
  console.log(`Authentication Status: ${hasUserCompletedAuthentication ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  // If a paywall is already being presented, skip this check entirely
  if (isPaywallCurrentlyPresented) {
    console.log("⚠️ Paywall is already being presented - skipping duplicate post-login sequence");
    return;
  }
  
  // IMPORTANT: We removed the check for onboarding screens here
  // We always want to show the paywall right after sign-in/sign-up
  // regardless of what screen the user is on
  
  try {
    // 1. Ensure RevenueCat SDK is configured and log in user
    console.log(`STEP 1: Setting up RevenueCat for user: ${userId}`);
    await configureRevenueCat(); // Configure SDK (first time only)
    await logInRevenueCatUser(userId); // Log in the specific user
    
    // 2. Set referral code attribute if available
    if (referralData?.referralCode) {
      console.log(`STEP 2: Setting referral code attribute in RevenueCat: ${referralData.referralCode}`);
      await setReferralCode(referralData.referralCode);
    } else {
      console.log("STEP 2: No referral code to set in RevenueCat");
    }
    
    // 3. Sync any existing Apple receipts
    console.log("STEP 3: Syncing purchases with user account...");
    await Purchases.syncPurchases();
    
    // 4. CRITICAL: Clear the customer info cache to ensure we don't read stale data
    console.log("STEP 4: Clearing customer info cache...");
    // This ensures the next getCustomerInfo call will be a true server fetch
    try {
      // Using invalidateCustomerInfoCache() if available
      if (typeof Purchases.invalidateCustomerInfoCache === 'function') {
        await Purchases.invalidateCustomerInfoCache();
        console.log("Cache successfully invalidated");
          } else {
        console.log("Cache invalidation method not available, using alternate approach");
      }
    } catch (cacheError) {
      console.error("Cache clearing error (non-fatal):", cacheError);
    }
    
    // 5. Force-fetch the latest entitlement state with a true network request
    console.log("STEP 5: Forcing network fetch of subscription data...");
    
    // Adding a small delay to ensure the cache clear has propagated
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get freshest possible data directly from server
    // We MUST wait for this network request to complete before proceeding
    const customerInfo = await Purchases.getCustomerInfo();
    console.log("Network fetch complete");
    
    // Log detailed subscription info for debugging
    console.log("\n=================== DETAILED SUBSCRIPTION INFO ===================");
    
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    if (entitlement) {
      console.log("✅ ACTIVE SUBSCRIPTION FOUND");
      console.log("📅 Expiration Date:", entitlement.expirationDate);
      console.log("🔄 Will Renew:", entitlement.willRenew ? "YES" : "NO");
      
      if (entitlement.unsubscribeDetectedAt) {
        console.log("⚠️ Unsubscribe Detected At:", entitlement.unsubscribeDetectedAt);
      }
          } else {
      console.log("❌ No active BallerAISubscriptionGroup entitlement found");
      console.log("\n📊 All entitlements:");
      console.log(JSON.stringify(customerInfo.entitlements, null, 2));
      
      console.log("\n🧾 Customer info overview:");
      console.log("- Original App User ID:", customerInfo.originalAppUserId);
      console.log("- First Seen:", customerInfo.firstSeen);
      console.log("- Request Date:", customerInfo.requestDate);
      
      console.log("\n🛒 All purchases (may be expired):");
      console.log(JSON.stringify(customerInfo.allPurchaseDates, null, 2));
    }
    console.log("=================================================================\n\n");
    
    // 6. Check if user has the required entitlement using the fresh data
    console.log("STEP 6: Checking entitlement status with fresh data...");
    const hasActiveSubscription = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    console.log(`Subscription status from server: ${hasActiveSubscription ? "ACTIVE ✓" : "INACTIVE ✗"}`);
    
    if (hasActiveSubscription) {
      // User already has subscription, navigate to home
      console.log("SUCCESS: User has active subscription, navigating to home");
      navigateToHome();
      return;
    }
    
    // 7. Only if truly no subscription, show paywall ONCE
    console.log("STEP 7: No active subscription confirmed, showing paywall...");
    
    // Dynamic paywall selection based on referral code type
    const hasReferralCode = referralData && referralData.referralCode;
    const paywallType = referralData?.referralPaywallType;
    
    if (hasReferralCode && paywallType === 'freetrial') {
      console.log(`🎁 FREE TRIAL REFERRAL CODE DETECTED: ${referralData.referralCode} from ${referralData.referralInfluencer}`);
      console.log("Will show FREE TRIAL paywall");
    } else if (hasReferralCode) {
      console.log(`🎁 DISCOUNT REFERRAL CODE DETECTED: ${referralData.referralCode} (${referralData.referralDiscount}% off from ${referralData.referralInfluencer})`);
      console.log("Will show DISCOUNT paywall");
    } else {
      console.log("No referral code - will show REGULAR paywall");
    }
    
    // Mark paywall as being presented to prevent duplicates
    isPaywallCurrentlyPresented = true;
    
    // Show appropriate paywall based on referral code status
    let paywallResult;
    
    // First, get offerings to specify which one to show
    console.log("STEP 7a: Fetching offerings...");
    const offerings = await Purchases.getOfferings();
    
    if (hasReferralCode && paywallType === 'freetrial') {
      // For free trial referral users, show the free trial paywall
      console.log("🎁 Presenting FREE TRIAL paywall for free trial referral user");
      const freeTrialOffering = offerings.all['free trial paywall'];
      
      if (freeTrialOffering) {
        console.log("✅ Free trial offering found, presenting free trial paywall");
        paywallResult = await RevenueCatUI.presentPaywall({
          offering: freeTrialOffering
        });
      } else {
        console.warn("⚠️ Free trial offering not found, falling back to default paywall");
        paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: ENTITLEMENT_ID
        });
      }
    } else if (hasReferralCode) {
      // For discount referral users, show the referral offering with discounted products
      console.log("🎁 Presenting DISCOUNT paywall for discount referral user");
      const referralOffering = offerings.all['ReferralOffering'];
      
      if (referralOffering) {
        console.log("✅ ReferralOffering found, presenting with discount");
        paywallResult = await RevenueCatUI.presentPaywall({
          offering: referralOffering
        });
      } else {
        console.warn("⚠️ ReferralOffering not found, falling back to default paywall");
        paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: ENTITLEMENT_ID
        });
      }
    } else {
      // Present regular paywall for non-referral users
      console.log("💰 Presenting REGULAR paywall for non-referral user");
      const regularOffering = offerings.all['NewOfferings'] || offerings.current;
      
      if (regularOffering) {
        console.log("✅ Regular offering found, presenting standard paywall");
        paywallResult = await RevenueCatUI.presentPaywall({
          offering: regularOffering
        });
      } else {
        console.warn("⚠️ Regular offering not found, using default paywall");
        paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: ENTITLEMENT_ID
        });
      }
    }
    
    // Reset paywall presented flag
    isPaywallCurrentlyPresented = false;
    
    // 8. Handle paywall result with appropriate navigation
    if (paywallResult === PAYWALL_RESULT.PURCHASED || 
        paywallResult === PAYWALL_RESULT.RESTORED) {
      // Get fresh info after purchase
      console.log("STEP 8: Purchase/restore successful, refreshing data...");
      await Purchases.getCustomerInfo();
      
      // Log analytics for referral code success
      if (hasReferralCode) {
        console.log("🎉 REFERRAL CODE PURCHASE SUCCESS!");
        // You can add specific analytics here for successful referral purchases
      }
      
      console.log("Navigating to home screen after successful purchase");
      navigateToHome();
    } else if (paywallResult === PAYWALL_RESULT.CANCELLED) {
      console.log("STEP 8: Paywall cancelled by user");
      
      // Log analytics for referral code cancellation
      if (hasReferralCode) {
        console.log("🚫 REFERRAL CODE PAYWALL CANCELLED");
        // You can add specific analytics here for cancelled referral paywalls
      }
      
      console.log("Navigating to welcome screen after paywall cancellation");
      navigateToWelcome();
    }
    
    console.log(`Paywall sequence complete with result: ${paywallResult}${hasReferralCode ? ' (with referral code)' : ''}`);
    console.log("===============================================");
  } catch (error) {
    // Reset paywall presented flag even if there's an error
    isPaywallCurrentlyPresented = false;
    
    console.error("Error in RevenueCat post-login sequence:", error);
    // If any error occurs, navigate to welcome screen
    console.log("Navigating to welcome screen due to error");
    navigateToWelcome();
  }
}

/**
 * Legacy function - do NOT use this for post-authentication flows
 * Only use this for unauthenticated usage of the app where you need to check for a subscription
 */
async function presentPaywallIfNeeded(): Promise<PAYWALL_RESULT> {
  console.warn("⚠️ WARNING: Using legacy paywall check - should NOT be used after authentication");
  
  // If a paywall is already being presented, skip showing another one
  if (isPaywallCurrentlyPresented) {
    console.log("⚠️ Paywall is already being presented - skipping duplicate presentation");
    return PAYWALL_RESULT.CANCELLED;
  }
  
  try {
    // Check subscription status
    const customerInfo = await Purchases.getCustomerInfo();
    
    if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
      console.log("User has active subscription, skipping paywall");
      return PAYWALL_RESULT.PURCHASED;
    }
    
    // Mark paywall as being presented to prevent duplicates
    isPaywallCurrentlyPresented = true;
    
    // Present paywall if needed
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID
    });
    
    // Reset paywall presented flag
    isPaywallCurrentlyPresented = false;
    
    return result;
  } catch (error) {
    // Reset paywall presented flag even if there's an error
    isPaywallCurrentlyPresented = false;
    
    console.error("Error in legacy paywall check:", error);
    return PAYWALL_RESULT.CANCELLED;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
});

// Export the legacy function for backward compatibility
export default presentPaywallIfNeeded;