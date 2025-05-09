import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import CustomButton from '../components/CustomButton';
import { usePathname } from 'expo-router';
// Remove import from _layout to fix circular dependency
// import { isOnOnboardingScreen } from '../_layout';

// Correct entitlement identifier
const ENTITLEMENT_ID = "BallerAISubscriptionGroup";

// Track if paywall is currently visible to prevent duplicate displays at any time during the app flow
let isPaywallCurrentlyPresented = false;

// Track if user has completed authentication - paywall should never show before this is true
let hasUserCompletedAuthentication = false;

// Function to set auth completion flag - call this ONLY after successful sign-in or sign-up
export function markAuthenticationComplete() {
  console.log("✅ Authentication process completed - paywall can now be shown when needed");
  hasUserCompletedAuthentication = true;
}

// Function to reset auth completion flag - call this on sign-out
export function resetAuthenticationStatus() {
  console.log("⏮️ Authentication status reset - paywall will not be shown until next sign-in");
  hasUserCompletedAuthentication = false;
}

// Local implementation of onboarding screen detection to avoid circular dependency
const isOnOnboardingScreen = (path: string) => {
  return path.includes('/(onboarding)') || 
    path.includes('/paywall') || 
    path.includes('/sign') || 
    path.includes('/intro') ||
    path.includes('/motivation') ||
    path.includes('/tracking') ||
    path.includes('/football-goal') ||
    path.includes('/smart-watch') ||
    path.includes('/gym-access') ||
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
  console.log(`Authentication Status: ${hasUserCompletedAuthentication ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  // MOST IMPORTANT CHECK - Never show paywall if user hasn't completed sign-in/sign-up
  if (!hasUserCompletedAuthentication) {
    console.log("⚠️ User has not completed authentication - skipping subscription check");
    return;
  }
  
  // If a paywall is already being presented, skip this check entirely
  if (isPaywallCurrentlyPresented) {
    console.log("⚠️ Paywall is already being presented - skipping duplicate check");
    return;
  }
  
  // If we're in the onboarding flow, skip the check entirely
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
    // 1. Identify the user to ensure we're checking the right account
    console.log(`STEP 1: Identifying user with RevenueCat: ${userId}`);
    await Purchases.logIn(userId);
    
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
      // No need to show paywall for active subscriptions
      console.log("Subscription active - no paywall needed");
      return;
    } else {
      console.log("❌ No active subscription found - presenting paywall");
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
 */
export async function runPostLoginSequence(
  userId: string, 
  navigateToHome: () => void,
  navigateToWelcome: () => void,
  currentPath?: string
): Promise<void> {
  console.log("======== RUNNING ONE-TIME POST-LOGIN SEQUENCE ========");
  console.log(`UserID: ${userId}, Current path: ${currentPath || 'undefined'}`);
  console.log(`Authentication Status: ${hasUserCompletedAuthentication ? 'COMPLETED' : 'NOT COMPLETED'}`);
  
  // If a paywall is already being presented, skip this check entirely
  if (isPaywallCurrentlyPresented) {
    console.log("⚠️ Paywall is already being presented - skipping duplicate post-login sequence");
    return;
  }
  
  // Check if we're in the onboarding flow
  if (currentPath && isOnOnboardingScreen(currentPath)) {
    // If we haven't yet completed onboarding, don't show the paywall yet
    // Just navigate to the home screen for now
    console.log("⚠️ User is still in onboarding flow - allowing them to finish onboarding first");
    console.log("Navigating to home without showing paywall");
    navigateToHome();
    return;
  }
  
  try {
    // 1. First identify the user with RevenueCat
    console.log(`STEP 1: Identifying user with RevenueCat: ${userId}`);
    await Purchases.logIn(userId);
    
    // 2. Sync any existing Apple receipts
    console.log("STEP 2: Syncing purchases with user account...");
    await Purchases.syncPurchases();
    
    // 3. CRITICAL: Clear the customer info cache to ensure we don't read stale data
    console.log("STEP 3: Clearing customer info cache...");
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
    
    // 4. Force-fetch the latest entitlement state with a true network request
    console.log("STEP 4: Forcing network fetch of subscription data...");
    
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
    
    // 5. Check if user has the required entitlement using the fresh data
    console.log("STEP 5: Checking entitlement status with fresh data...");
    const hasActiveSubscription = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    console.log(`Subscription status from server: ${hasActiveSubscription ? "ACTIVE ✓" : "INACTIVE ✗"}`);
    
    if (hasActiveSubscription) {
      // User already has subscription, navigate to home
      console.log("SUCCESS: User has active subscription, navigating to home");
      navigateToHome();
      return;
    }
    
    // 6. Only if truly no subscription, show paywall ONCE
    console.log("STEP 6: No active subscription confirmed, showing paywall...");
    
    // Mark paywall as being presented to prevent duplicates
    isPaywallCurrentlyPresented = true;
    
    const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID
    });
    
    // Reset paywall presented flag
    isPaywallCurrentlyPresented = false;
    
    // 7. Handle paywall result with appropriate navigation
    if (paywallResult === PAYWALL_RESULT.PURCHASED || 
        paywallResult === PAYWALL_RESULT.RESTORED) {
      // Get fresh info after purchase
      console.log("STEP 7: Purchase/restore successful, refreshing data...");
      await Purchases.getCustomerInfo();
      console.log("Navigating to home screen after successful purchase");
      navigateToHome();
    } else if (paywallResult === PAYWALL_RESULT.CANCELLED) {
      console.log("STEP 7: Paywall cancelled by user");
      console.log("Navigating to welcome screen after paywall cancellation");
      navigateToWelcome();
    }
    
    console.log("Paywall sequence complete with result:", paywallResult);
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