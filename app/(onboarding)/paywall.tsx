import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import CustomButton from '../components/CustomButton';

async function presentPaywallIfNeeded() {
    console.log("Presenting paywall...");
    // Present paywall for current offering:
    const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: "pro"
    });
    console.log("Paywall result:", paywallResult);
    return paywallResult;
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
          if (result.customerInfo.entitlements.active.pro) { // Replace "pro" with your actual entitlement ID
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
          if (result.customerInfo.entitlements.active.pro) { // Replace "pro" with your actual entitlement ID
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