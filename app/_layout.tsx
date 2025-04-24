import React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Slot, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import LoadingScreen from './components/LoadingScreen';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NutritionProvider } from './context/NutritionContext';
import { TrainingProvider } from './context/TrainingContext';
import { AppState, Alert, Platform } from 'react-native';
import * as InAppPurchases from 'expo-in-app-purchases';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import subscriptionService, { PRODUCT_IDS } from './services/subscription';
import subscriptionCheck from './services/subscriptionCheck';
import axios from 'axios';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { user } = useAuth();
  const pathname = usePathname();
  const appState = useRef(AppState.currentState);
  const isIAPInitialized = useRef(false);
  const subscriptionCheckInProgress = useRef<Promise<any> | null>(null);
  const lastPathRef = useRef(pathname);

  // Update last path whenever pathname changes
  useEffect(() => {
    lastPathRef.current = pathname;
  }, [pathname]);

  // Function to check if we're on an onboarding screen
  const isOnOnboardingScreen = (path: string) => {
    return path.includes('/(onboarding)') || 
      path.includes('/paywall') || 
      path.includes('/sign') || 
      path === '/';
  };

  // Initialize IAP
  useEffect(() => {
    let isActive = true;
    
    const initializeIAP = async () => {
      if (user && !isIAPInitialized.current) {
        try {
          console.log('Starting IAP initialization in RootLayout...');
          console.log('Environment:', __DEV__ ? 'Development' : 'Production');
          console.log('Platform:', Platform.OS);
          console.log('Bundle ID:', Constants.expoConfig?.ios?.bundleIdentifier);
          
          try {
            await InAppPurchases.connectAsync();
            console.log('IAP connected successfully');
          } catch (error: any) {
            // If already connected, that's fine - we can proceed
            if (error.code === 'ERR_IN_APP_PURCHASES_CONNECTION' && error.message.includes('Already connected')) {
              console.log('IAP already connected, proceeding...');
            } else {
              throw error; // Re-throw other errors
            }
          }
          
          isIAPInitialized.current = true;

          // Use the shared service
          const existingSubscription = await subscriptionCheck.checkExistingSubscriptions(
            user.uid, 
            isIAPInitialized.current
          );

          // Check if we have a valid subscription
          const hasValidSubscription = existingSubscription && 
            existingSubscription.data &&
            existingSubscription.source === 'firebase' &&
            existingSubscription.data.isActive;
            
          if (hasValidSubscription) {
            // If we have a valid Firebase subscription, navigate to home
            console.log('Navigating to home screen after successful Firebase subscription verification');
            router.replace('/(tabs)/home');
          }
          else {
            console.log('No valid Firebase subscription found');
          }
        } catch (error) {
          console.error('Error initializing IAP in RootLayout:', error);
          // Don't block the app from loading if IAP initialization fails
        }
      }
    };
    
    initializeIAP();
    
    return () => {
      isActive = false;
    };
  }, [user]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        const isPurchasing = await subscriptionCheck.checkIsPurchasing();

        console.log('App has come to the foreground!');
        console.log('Current path:', lastPathRef.current);
        console.log('Is purchasing:', isPurchasing);

        // Determine if we're on an onboarding or paywall screen
        const currentPath = lastPathRef.current;
        const isOnOnboarding = isOnOnboardingScreen(currentPath);
        const isAlreadyInside = !isOnOnboarding;

        // We should only check subscriptions if either:
        // 1. User is in the main app (not in onboarding)
        // 2. User is in onboarding but a purchase might be in progress
        //const shouldCheckSubscription = isAlreadyInside || isPurchasing;
        
        // Check for existing subscriptions when app becomes active
        if (isIAPInitialized.current && user) {
          try {
            // Make sure we're not already checking subscriptions
            if (!subscriptionCheckInProgress.current) {
              if (isOnOnboarding) {
                await subscriptionCheck.setIsPurchasing();
              }

              // Use the shared service
              const existingSubscription = await subscriptionCheck.checkExistingSubscriptions(
                user.uid, 
                isIAPInitialized.current
              );

              // Check if we have a valid subscription
              const hasValidSubscription = existingSubscription && 
                existingSubscription.data && 
                (
                  (existingSubscription.source === 'firebase' && existingSubscription.data.isActive) ||
                  (existingSubscription.source === 'iap' && existingSubscription.data.transactionReceipt)
                );
              
              if (hasValidSubscription) {
                await subscriptionCheck.setIsPurchasing();
                if (existingSubscription.source === 'iap') {
                  console.log('Processing existing subscription on app active:', existingSubscription);
                  const result = await subscriptionCheck.handleSubscriptionData(
                    existingSubscription.data, 
                    user.uid
                  );

                  if (result) {
                    // If we have a valid subscription and we're in onboarding, navigate to home
                    if (isOnOnboarding) {
                      console.log('Navigating to home screen after IAP subscription verification');
                      // Navigate with delay
                      setTimeout(() => {
                        router.replace('/(tabs)/home');
                      }, 1000);
                      await subscriptionCheck.cancelIsPurchasing();;
                    }
                    return;
                  }
                }
                else {
                  // If we have a valid Firebase subscription and we're in onboarding, navigate to home
                  if (isOnOnboarding) {
                    console.log('Navigating to home screen after Firebase subscription verification');
                    router.replace('/(tabs)/home');
                    await subscriptionCheck.cancelIsPurchasing();;
                  }

                  const firebaseSubscription = await subscriptionService.getSubscriptionData(user.uid);
                  const daysLeft = subscriptionService.getDaysRemaining(firebaseSubscription);

                  // Show alert if subscription is expiring soon (within 3 days)
                  if (daysLeft !== null && daysLeft <= 3) {
                    console.log('Firebase subscription valid for 3 days or less: check if IAP subscription is valid and renewing');

                    const purchaseHistory = await InAppPurchases.getPurchaseHistoryAsync();
      
                    if (purchaseHistory && purchaseHistory.responseCode === InAppPurchases.IAPResponseCode.OK) {
                      if (purchaseHistory.results && purchaseHistory.results.length > 0) {
                        // Find the most recent active subscription
                        const activeSubscription = purchaseHistory.results
                          .filter(purchase => 
                            purchase.productId.includes('BallerAISubscription') && 
                            purchase.transactionReceipt
                          )
                          .sort((a, b) => {
                            const dateA = a.purchaseTime ? new Date(a.purchaseTime).getTime() : 0;
                            const dateB = b.purchaseTime ? new Date(b.purchaseTime).getTime() : 0;
                            return dateB - dateA;
                          })[0];
              
                        if (activeSubscription) {
                          const validationResult = await subscriptionCheck.validateReceipt(activeSubscription);
                          if (!validationResult.isRenewing) {
                            Alert.alert('Subscription Expiring Soon', `Your subscription will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew now to continue enjoying all features.`);
                          }
                        }
                      }
                    }
                  }
                     
                  await subscriptionCheck.cancelIsPurchasing();
                  return;
                }
              }

              // Only navigate to paywall if we're already inside the app
              // (not if we're already on an onboarding screen)
              if (isAlreadyInside) {
                console.log('No active subscription found, navigating to paywall');
                setTimeout(() => {
                  router.replace('/(onboarding)/paywall');
                }, 1000);
                await subscriptionCheck.cancelIsPurchasing();
              }
            }
          } catch (checkError) {
            console.error('Error checking subscription on app state change:', checkError);
          }
        }
      }
      await subscriptionCheck.cancelIsPurchasing();
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  return (
    <ThemeProvider value={useColorScheme() === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (error) throw error;

    if (loaded) {
      SplashScreen.hideAsync();
    }

    // Show loading screen for 2 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [loaded, error]);

  if (!loaded) {
    return null;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NutritionProvider>
          <OnboardingProvider>
            <TrainingProvider>
              <RootLayoutContent />
            </TrainingProvider>
          </OnboardingProvider>
        </NutritionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
