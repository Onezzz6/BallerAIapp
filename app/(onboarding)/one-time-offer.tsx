import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import CustomUrgencyPaywall from './custom-urgency-paywall';

export default function OneTimeOfferScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { onboardingData } = useOnboarding();

  const handlePurchaseSuccess = () => {
    console.log('✅ Custom paywall purchase successful - navigating to sign-up');
    router.replace('/(onboarding)/sign-up');
  };

  const handlePurchaseCancel = () => {
    console.log('❌ Custom paywall cancelled - staying on paywall (no escape!)');
    // Don't navigate anywhere - keep them trapped on the paywall
    // They either pay or force-close the app
  };

  const handleRestoreSuccess = () => {
    console.log('✅ Custom paywall restore successful - navigating to home');
    router.replace('/(tabs)/home');
  };

  // Always show custom paywall immediately (no spinning wheel)
  return (
    <CustomUrgencyPaywall
      onPurchaseSuccess={handlePurchaseSuccess}
      onPurchaseCancel={handlePurchaseCancel}
      onRestoreSuccess={handleRestoreSuccess}
    />
  );
} 