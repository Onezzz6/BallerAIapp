import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import CustomButton from '../components/CustomButton';

// Track if paywall is currently being displayed
let isPaywallCurrentlyShowing = false;

// Correct entitlement identifier
const ENTITLEMENT_ID = "BallerAISubscriptionGroup";

async function presentPaywallIfNeeded() {
    // Only prevent showing if it's already open - don't permanently disable it
    if (isPaywallCurrentlyShowing) {
        console.log("Paywall already showing, preventing duplicate display");
        return PAYWALL_RESULT.CANCELLED;
    }
    
    // First check if user already has an active subscription
    try {
        console.log("Checking subscription status before showing paywall...");
        const customerInfo = await Purchases.getCustomerInfo();
        
        // If the user already has the entitlement, no need to show paywall
        if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
            console.log("User already has active subscription, skipping paywall");
            return PAYWALL_RESULT.PURCHASED; // Return PURCHASED to indicate subscription is active
        }
        
        console.log("No active subscription found, presenting paywall...");
    } catch (error) {
        console.error("Error checking subscription status:", error);
        // Continue to show paywall if we can't verify subscription status
    }
    
    // Mark as showing before presenting
    isPaywallCurrentlyShowing = true;
    
    // Present paywall for current offering with correct entitlement:
    const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID
    });
    
    // After paywall is closed (whether purchased or cancelled), mark as not showing anymore
    isPaywallCurrentlyShowing = false;
    
    console.log("Paywall result:", paywallResult);
    return paywallResult;
}

/**
 * Specialized function to present paywall after authentication
 * This properly identifies the user, syncs purchases, and checks subscription status
 * @param userId The Firebase UID of the authenticated user
 */
export async function presentPaywallAfterAuth(userId: string) {
    console.log("Post-authentication paywall check...");
    
    try {
        // 1. First identify the user with RevenueCat
        console.log(`Identifying user with RevenueCat: ${userId}`);
        await Purchases.logIn(userId);
        
        // 2. Sync any existing purchases to associate with this user
        console.log("Syncing purchases with user account...");
        await Purchases.syncPurchases();
        
        // 3. Force-fetch fresh customer info to ensure we have latest entitlements
        console.log("Fetching fresh subscription data...");
        const customerInfo = await Purchases.getCustomerInfo();
        
        // 4. Check if user already has the entitlement (using correct identifier)
        if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
            console.log("User has active subscription after authentication, skipping paywall");
            return PAYWALL_RESULT.PURCHASED;
        }
        
        // 5. Double-check with a small delay to ensure network fetch completes
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("Double-checking subscription status with network request...");
        const freshCustomerInfo = await Purchases.getCustomerInfo();
        
        // Final check with the freshest possible data
        if (freshCustomerInfo.entitlements.active[ENTITLEMENT_ID]) {
            console.log("Fresh check confirms user has active subscription, skipping paywall");
            return PAYWALL_RESULT.PURCHASED;
        }
        
        // 6. If no active subscription after both checks, show the paywall
        console.log("Confirmed no active subscription found after authentication, showing paywall");
        return await presentPaywallIfNeeded();
    } catch (error) {
        console.error("Error refreshing subscription data after authentication:", error);
        // Fall back to regular paywall presentation
        return await presentPaywallIfNeeded();
    }
}

// For testing purposes - reset the flag if needed
export function resetPaywallFlag() {
    isPaywallCurrentlyShowing = false;
}

/*export default function PaywallScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4064F6" />
        <Text style={styles.loadingText}>Loading Plans...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <RevenueCatUI.Paywall 
        options={{
          offering: null,
        }}
        onPurchaseStarted={() => {
          console.log('Purchase started');
        }}
        onPurchaseCompleted={(result) => {
          console.log('Purchase completed');
          Alert.alert('Success!', 'Your purchase was successful.');
          if (result.customerInfo.entitlements.active[ENTITLEMENT_ID]) {
            router.replace('/(tabs)/home'); 
          } else {
            Alert.alert('Purchase Verified', 'Your purchase has been verified, but the subscription is not yet active. Please try restoring purchases or contact support.');
          }
        }}
        onPurchaseCancelled={() => {
          console.log('Purchase cancelled by user.');
        }}
        onRestoreCompleted={(result) => {
          console.log('Restore completed');
          Alert.alert('Success!', 'Your purchases have been restored.');
          if (result.customerInfo.entitlements.active[ENTITLEMENT_ID]) {
            router.replace('/(tabs)/home');
          } else {
            Alert.alert('Restore Verified', 'Your purchases have been restored, but no active subscription was found.');
          }
        }}
        onRestoreError={(result) => {
          console.error('Restore error:', result.error.message);
          Alert.alert('Restore Error', result.error.message);
        }}
        onDismiss={() => {
          console.log('Paywall dismissed by user.');
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }}
      />
    </View>
  );
}*/

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

export default presentPaywallIfNeeded;