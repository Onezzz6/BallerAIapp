import React, { createContext, useContext } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, useRouter, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NutritionProvider } from './context/NutritionContext';
import { TrainingProvider } from './context/TrainingContext';
import { Alert, Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import subscriptionService, { PRODUCT_IDS } from './services/subscription';
import axios from 'axios';

import Purchases, { CustomerInfo } from 'react-native-purchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { initializeAppsFlyer, cleanupAppsFlyer } from './config/appsflyer';
import { configureRevenueCat, logInRevenueCatUser, setReferralCode } from './services/revenuecat';
import { checkSubscriptionOnForeground, resetPaywallPresentationFlag } from './(onboarding)/paywall';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './config/firebase';

// Create a context for subscription state
type SubscriptionContextType = {
  customerInfo: CustomerInfo | null;
  isSubscriptionActive: boolean;
  refreshSubscriptionStatus: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  customerInfo: null,
  isSubscriptionActive: false,
  refreshSubscriptionStatus: async () => {}
});

export const useSubscription = () => useContext(SubscriptionContext);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Subscription provider component
function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const customerInfoListenerSetup = useRef<boolean>(false);
  
  // Reset listener setup when user changes (including logout)
  useEffect(() => {
    if (!user) {
      // User logged out, reset listener setup for next login
      customerInfoListenerSetup.current = false;
    }
  }, [user]);

  // Check if the user has an active subscription
  const isSubscriptionActive = React.useMemo(() => {
    return customerInfo?.entitlements.active["BallerAISubscriptionGroup"] ? true : false;
  }, [customerInfo]);

  // Function to refresh subscription data
  const refreshSubscriptionStatus = async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      console.log("Refreshed subscription data:", 
        info.entitlements.active["BallerAISubscriptionGroup"] ? "ACTIVE" : "INACTIVE");
    } catch (error) {
      console.error("Error refreshing subscription data:", error);
    }
  };

  // Check API key availability on startup
  useEffect(() => {
    const apiKey = Platform.OS === 'ios' 
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
      
    if (!apiKey) {
      console.error(`RevenueCat ${Platform.OS} API key not found in environment variables.`);
      Alert.alert("Configuration Error", "In-app purchases are currently unavailable. Missing API Key.");
    } else {
      console.log('RevenueCat API key found - will configure when user authenticates');
    }
  }, []);

  // When user changes, configure RevenueCat with Firebase UID and sync purchases
  useEffect(() => {
    const identifyUser = async () => {
      if (user && user.uid) {
        try {
          console.log(`==== SETTING UP REVENUECAT FOR USER: ${user.uid} ====`);
          
          // Reset paywall presentation flag for new user session
          resetPaywallPresentationFlag();
          
          // Reset listener setup flag for new user (in case previous user was signed out without cleanup)
          customerInfoListenerSetup.current = false;
          
          // Step 1: Ensure RevenueCat SDK is configured (first time) or log in user (subsequent times)
          await configureRevenueCat(); // Configure SDK without user ID (first time only)
          await logInRevenueCatUser(user.uid); // Log in the specific user
          console.log("RevenueCat user session established");
          
          // Step 2: Set up CustomerInfo update listener (must be after configuration)
          // Only set up listener once per session
          if (!customerInfoListenerSetup.current) {
            Purchases.addCustomerInfoUpdateListener((info) => {
              setCustomerInfo(info);
              console.log("CustomerInfo updated:", 
                info.entitlements.active["BallerAISubscriptionGroup"] ? "ACTIVE" : "INACTIVE");
            });
            customerInfoListenerSetup.current = true;
            console.log("CustomerInfo listener registered");
          }
          
          // Step 3: Sync purchases to ensure all receipts are associated with this user
          await Purchases.syncPurchases();
          console.log("Purchase sync complete");
          
          // Step 4: Force a fresh fetch of subscription data
          console.log("Fetching fresh subscription data after identification");
          const info = await Purchases.getCustomerInfo();
          setCustomerInfo(info);
          
          // Step 5: Load and sync existing referral code from Firestore to RevenueCat
          try {
            console.log("Step 5: Checking for existing referral code in Firestore...");
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.referralCode) {
                console.log(`Found existing referral code: ${userData.referralCode}, syncing to RevenueCat`);
                await setReferralCode(userData.referralCode);
              } else {
                console.log("No referral code found in user document");
              }
            } else {
              console.log("User document not found");
            }
          } catch (error) {
            console.error("Error syncing existing referral code:", error);
            // Don't fail the identification sequence if referral code sync fails
          }
          
          // Step 6: Initial fetch of subscription data for the UI
          await refreshSubscriptionStatus();
          
          // Log subscription status for debugging
          const hasActiveSubscription = !!info.entitlements.active["BallerAISubscriptionGroup"];
          console.log(`User subscription status: ${hasActiveSubscription ? "ACTIVE" : "INACTIVE"}`);
          console.log("==== REVENUECAT IDENTIFICATION SEQUENCE COMPLETE ====");
        } catch (error) {
          console.error("Error in RevenueCat identification sequence:", error);
        }
      }
    };
    
    identifyUser();
  }, [user]);
  
  // Background subscription check with 45-second cooldown
  useEffect(() => {
    if (!user) {
      console.log('🚫 Background check setup skipped - no user');
      return;
    }
    
    console.log('🔧 Setting up background subscription check for user:', user.uid);
    console.log('📱 Current app state on setup:', AppState.currentState);
    let lastBackgroundCheckTime = 0;
    const BACKGROUND_CHECK_COOLDOWN = 45000; // 45 seconds in milliseconds
    
    const handleAppStateChange = (nextAppState: string) => {
      console.log('📱 App state changed to:', nextAppState);
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        const currentTime = Date.now();
        const timeSinceLastCheck = currentTime - lastBackgroundCheckTime;
        
        console.log('🔍 Background/inactive state detected:', {
          currentTime: new Date(currentTime).toLocaleTimeString(),
          lastCheckTime: lastBackgroundCheckTime === 0 ? 'never' : new Date(lastBackgroundCheckTime).toLocaleTimeString(),
          timeSinceLastCheck: Math.floor(timeSinceLastCheck / 1000) + 's',
          cooldownRequired: Math.floor(BACKGROUND_CHECK_COOLDOWN / 1000) + 's'
        });
        
        // Check if 45 seconds have passed since last background check
        if (timeSinceLastCheck >= BACKGROUND_CHECK_COOLDOWN) {
          console.log('✅ COOLDOWN PASSED - Running background/inactive subscription check');
          console.log('⏰ Time since last check:', Math.floor(timeSinceLastCheck / 1000) + ' seconds');
          lastBackgroundCheckTime = currentTime;
          
          // Get current pathname at the time of check
          const currentPath = pathname;
          console.log('📍 Current path during background check:', currentPath);
          
          // Check if user is on one of the 5 main tabs
          const isOnMainTabs = currentPath.includes('/home') || 
                              currentPath.includes('/nutrition') || 
                              currentPath.includes('/profile') || 
                              currentPath.includes('/recovery') || 
                              currentPath.includes('/training');
          
          console.log('🎯 User is on main tabs:', isOnMainTabs);
          
          if (isOnMainTabs) {
            console.log('🔍 User is on main tabs - performing subscription check');
            
            // Perform subscription check when app goes to background (no onboarding checks)
            checkSubscriptionOnForeground(
              user.uid,
              () => {
                console.log('✅ Background check result: User has active subscription');
              },
              () => {
                console.log('❌ Background check result: User subscription expired or cancelled - navigating to welcome');
                // Navigate to welcome screen when paywall is cancelled
                router.replace('/welcome');
              },
              undefined // Pass undefined to skip onboarding checks entirely
            );
          } else {
            console.log('🚫 User is not on main tabs - skipping background subscription check');
          }
        } else {
          const remainingTime = Math.ceil((BACKGROUND_CHECK_COOLDOWN - timeSinceLastCheck) / 1000);
          console.log('⏳ COOLDOWN ACTIVE - Background/inactive check skipped');
          console.log('⏰ Time remaining in cooldown:', remainingTime + ' seconds');
          console.log('🔄 Next check available at:', new Date(lastBackgroundCheckTime + BACKGROUND_CHECK_COOLDOWN).toLocaleTimeString());
        }
      } else {
        console.log('ℹ️ App state is', nextAppState, '- subscription check only runs on background/inactive state');
      }
    };
    
    // Add listener for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    console.log('👂 AppState listener registered');
    
    // Cleanup listener on unmount or user change
    return () => {
      console.log('🧹 Cleaning up background check listener');
      subscription?.remove();
    };
  }, [user]);

  return (
    <SubscriptionContext.Provider 
      value={{ 
        customerInfo, 
        isSubscriptionActive, 
        refreshSubscriptionStatus 
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

function RootLayoutContent() {
  const { user } = useAuth();

  // Function to check if we're on an onboarding screen
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
      path === '/';
  };

  return (
    <ThemeProvider value={useColorScheme() === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// Make the isOnOnboardingScreen function available to other components
// This is only used to prevent foreground-background paywall checks during onboarding
// It is NOT used to skip paywall display after sign-in/sign-up
export const isOnOnboardingScreen = (path: string) => {
  return path.includes('/(onboarding)') || 
    path.includes('/welcome') ||
    path.includes('/gender') || 
    path.includes('/training-frequency') ||
    path.includes('/where-did-you-find-us') ||
    path.includes('/tried-other-apps') ||
    path.includes('/analyzing') ||
    path.includes('/measurements') ||
    path.includes('/age') ||
    path.includes('/username') ||
    path.includes('/improvement-focus') ||
    path.includes('/goal-timeline') ||
    path.includes('/motivation-confirmation') ||
    path.includes('/holding-back') ||
    path.includes('/training-accomplishment') ||
    path.includes('/encouragement') ||
    path.includes('/team-status') ||
    path.includes('/position') ||
    path.includes('/injury-history') ||
    path.includes('/fitness-level') ||
    path.includes('/activity-level') ||
    path.includes('/sleep-hours') ||
    path.includes('/nutrition') ||
    path.includes('/referral-code') ||
    path.includes('/social-proof') ||
    path.includes('/motivation-reason') ||
    path.includes('/profile-generation') ||
    path.includes('/profile-complete') ||
    path.includes('/generating-profile') ||
    path.includes('/paywall') || 
    path.includes('/sign') || 
    path.includes('/motivation') ||
    path.includes('/tracking') ||
    path.includes('/football-goal') ||
    path.includes('/smart-watch') ||
    path === '/';
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;

    if (loaded) {
      SplashScreen.hideAsync();
    }

    // Initialize AppsFlyer
    initializeAppsFlyer();

    return () => {
      // Cleanup AppsFlyer listeners
      cleanupAppsFlyer();
    };
  }, [loaded, error]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReducedMotionConfig mode={ReduceMotion.Never} />
      <AuthProvider>
        <SubscriptionProvider>
          <AuthStateManager>
            <NutritionProvider>
              <OnboardingProvider>
                <TrainingProvider>
                  <RootLayoutContent />
                </TrainingProvider>
              </OnboardingProvider>
            </NutritionProvider>
          </AuthStateManager>
        </SubscriptionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

// Auth state manager component
function AuthStateManager({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  // Note: Removed automatic navigation logic - SortingScreen now handles this
  // This prevents the welcome screen flash and ensures proper routing
  // Also removed LoadingScreen here to prevent multiple loading screens
  
  return <>{children}</>;
}
