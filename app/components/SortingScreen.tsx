import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import LoadingScreen from './LoadingScreen';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../_layout';
import authService from '../services/auth';

/**
 * SortingScreen - The invisible router that determines where users should go
 * 
 * This screen:
 * 1. Shows the loading screen while checking auth/subscription status
 * 2. Routes users to the appropriate screen based on their status
 * 3. Prevents the welcome screen flash for existing users
 * 4. Prevents analytics events from being logged for users not starting onboarding
 */
export default function SortingScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isSubscriptionActive, customerInfo, refreshSubscriptionStatus } = useSubscription();
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasCheckedSubscription, setHasCheckedSubscription] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);

  // Check if navigation is ready
  useEffect(() => {
    const checkNavigationReady = () => {
      try {
        // Test if router is available and can be used
        if (router && typeof router.replace === 'function') {
          setNavigationReady(true);
        } else {
          // If router is not ready, try again after a short delay
          setTimeout(checkNavigationReady, 100);
        }
      } catch (error) {
        // If there's an error accessing the router, try again
        setTimeout(checkNavigationReady, 100);
      }
    };

    // Add a delay to ensure the root layout has time to mount
    // This coordinates with the root layout's 2-second initial loading
    setTimeout(checkNavigationReady, 2200);
  }, [router]);

  const performNavigation = (path: string) => {
    try {
      console.log(`SortingScreen: Navigating to ${path}`);
      router.replace(path);
      setIsInitializing(false);
    } catch (error) {
      console.error('Navigation error:', error);
      // If navigation fails, try again after a short delay
      setTimeout(() => {
        try {
          router.replace(path);
          setIsInitializing(false);
        } catch (retryError) {
          console.error('Navigation retry failed:', retryError);
          // Default to showing loading screen if navigation consistently fails
          setIsInitializing(false);
        }
      }, 500);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for auth state to be determined and navigation to be ready
        if (authLoading || !navigationReady) {
          return;
        }

        // Case 1: No user - show welcome screen for onboarding
        if (!user) {
          console.log('SortingScreen: No user found, navigating to welcome screen');
          performNavigation('/welcome');
          return;
        }

        // Case 2: User exists - need to wait for RevenueCat to initialize
        console.log('SortingScreen: User found, waiting for RevenueCat initialization...');
        
        // Get user document to ensure they exist in our system
        const userDoc = await authService.getUserDocument(user.uid);
        
        if (!userDoc) {
          console.log('SortingScreen: User document not found, navigating to welcome screen');
          performNavigation('/welcome');
          return;
        }

        // Wait for RevenueCat to initialize and fetch fresh subscription status
        // We'll wait a bit longer to ensure RevenueCat has time to sync
        console.log('SortingScreen: Waiting for RevenueCat subscription sync...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Force refresh subscription status to ensure we have the latest data
        await refreshSubscriptionStatus();
        
        // Add small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setHasCheckedSubscription(true);

      } catch (error) {
        console.error('Error in SortingScreen initialization:', error);
        // On error, default to welcome screen
        performNavigation('/welcome');
      }
    };

    // Only run once when component mounts
    if (!hasCheckedSubscription && navigationReady) {
      initializeApp();
    }
  }, [user, authLoading, router, refreshSubscriptionStatus, hasCheckedSubscription, navigationReady]);

  // Separate effect to handle navigation after subscription status is determined
  useEffect(() => {
    if (hasCheckedSubscription && user && !authLoading && navigationReady) {
      console.log('SortingScreen: Making final routing decision...');
      console.log('SortingScreen: Subscription active:', isSubscriptionActive);
      
      if (isSubscriptionActive) {
        console.log('SortingScreen: User has active subscription, navigating to home');
        performNavigation('/(tabs)/home');
      } else {
        console.log('SortingScreen: User has no active subscription, navigating to welcome screen');
        performNavigation('/welcome');
      }
    }
  }, [hasCheckedSubscription, isSubscriptionActive, user, authLoading, router, navigationReady]);

  // Show loading screen while determining where to navigate
  if (isInitializing || authLoading || !navigationReady) {
    return <LoadingScreen />;
  }

  // This should not be reached due to navigation, but just in case
  console.warn('SortingScreen: Reached end of component without navigation - this should not happen');
  return <LoadingScreen />;
} 