import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import CustomButton from '../components/CustomButton';

// Correct entitlement identifier
const ENTITLEMENT_ID = "BallerAISubscriptionGroup";

/**
 * Handles subscription check when app returns to foreground
 * Follows the identify→sync→fetch→gate flow to ensure we have fresh data
 * 
 * @param userId The Firebase UID of the authenticated user
 * @param navigateToHome Function to navigate to the home screen
 * @param navigateToWelcome Function to navigate to the welcome screen
 */
export async function checkSubscriptionOnForeground(
  userId: string,
  navigateToHome: () => void,
  navigateToWelcome: () => void
): Promise<void> {
  console.log("\n======== APP FOREGROUND SUBSCRIPTION CHECK ========");
  
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
    const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID
    });
    
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
 */
export async function runPostLoginSequence(
  userId: string, 
  navigateToHome: () => void,
  navigateToWelcome: () => void
): Promise<void> {
  console.log("======== RUNNING ONE-TIME POST-LOGIN SEQUENCE ========");
  
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
    
    // Log detailed subscription information
    console.log("\n\n=================== DETAILED SUBSCRIPTION INFO ===================");
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    if (entitlement) {
      console.log("✅ ACTIVE SUBSCRIPTION FOUND");
      console.log("📅 Expiration Date:", entitlement.expirationDate);
      console.log("🔄 Will Renew:", entitlement.willRenew ? "YES" : "NO");
      console.log("⚠️ Unsubscribe Detected At:", entitlement.unsubscribeDetectedAt || "N/A");
      
      // Additional subscription details
      console.log("🔄 Period Type:", entitlement.periodType || "N/A");
      console.log("📱 Store:", entitlement.store || "N/A");
      console.log("📂 Product Identifier:", entitlement.productIdentifier || "N/A");
      console.log("⏱️ Latest Purchase Date:", entitlement.latestPurchaseDate || "N/A");
      console.log("🏆 Original Purchase Date:", entitlement.originalPurchaseDate || "N/A");
      
      console.log("\n📊 Full entitlement object:");
      console.log(JSON.stringify(entitlement, null, 2));
      
      // Also log the raw purchases data for troubleshooting
      console.log("\n🧾 Active subscriptions from customerInfo:");
      console.log(JSON.stringify(customerInfo.activeSubscriptions, null, 2));
      
      console.log("\n🛒 All purchases:");
      console.log(JSON.stringify(customerInfo.allPurchaseDates, null, 2));
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
    const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID
    });
    
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
  
  try {
    // Check subscription status
    const customerInfo = await Purchases.getCustomerInfo();
    
    if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
      console.log("User has active subscription, skipping paywall");
      return PAYWALL_RESULT.PURCHASED;
    }
    
    // Present paywall if needed
    return await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID
    });
  } catch (error) {
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