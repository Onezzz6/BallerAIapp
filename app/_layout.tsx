import React, { createContext, useContext } from 'react';
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
import { AppState, AppStateStatus, Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import subscriptionService, { PRODUCT_IDS } from './services/subscription';
import axios from 'axios';
import authService from './services/auth';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { presentPaywallAfterAuth } from './(onboarding)/paywall';

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
  const appState = useRef(AppState.currentState);

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

  // Initialize RevenueCat and set up listeners
  useEffect(() => {
    if (Platform.OS === 'ios') {
      const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
      if (apiKey) {
        Purchases.configure({ apiKey });
        console.log('RevenueCat SDK configured for iOS with API key from env');
        
        // Set up CustomerInfo update listener
        const customerInfoUpdateListener = Purchases.addCustomerInfoUpdateListener((info) => {
          setCustomerInfo(info);
          console.log("CustomerInfo updated:", 
            info.entitlements.active["BallerAISubscriptionGroup"] ? "ACTIVE" : "INACTIVE");
        });
        
        // Set up AppState listener to refresh when app comes to foreground
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
          if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            console.log('App has come to the foreground, refreshing subscription data');
            refreshSubscriptionStatus();
          }
          appState.current = nextAppState;
        };
        
        // We just use this pattern for the listeners without trying to use the returned value
        AppState.addEventListener('change', handleAppStateChange);
        
        // Initial fetch of subscription data
        refreshSubscriptionStatus();
        
        // No cleanup needed for AppState listener in this implementation
        // RevenueCat listeners are automatically cleaned up when the component unmounts
        return () => {
          // Cleanup is handled automatically
          console.log("Cleaning up RevenueCat listeners");
        };
      } else {
        console.error('RevenueCat iOS API key not found in environment variables.');
        Alert.alert("Configuration Error", "In-app purchases are currently unavailable. Missing API Key.");
      }
    }
  }, []);

  // When user changes, identify them with RevenueCat and sync purchases
  useEffect(() => {
    const identifyUser = async () => {
      if (user && user.uid) {
        try {
          console.log(`Identifying user with RevenueCat: ${user.uid}`);
          await Purchases.logIn(user.uid);
          await Purchases.syncPurchases();
          await refreshSubscriptionStatus();
        } catch (error) {
          console.error("Error identifying user with RevenueCat:", error);
        }
      }
    };
    
    identifyUser();
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
  const pathname = usePathname();
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

  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (error) throw error;

    if (loaded) {
      SplashScreen.hideAsync();
    }

    // Show initial loading screen for 2 seconds
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [loaded, error]);

  if (!loaded) {
    return null;
  }

  if (initialLoading) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
  const { isSubscriptionActive } = useSubscription();
  
  // Navigate to home when user is authenticated
  useEffect(() => {
    if (user && !isLoading) {
      const checkUser = async () => {
        const userDoc = await authService.getUserDocument(user.uid);
        if (userDoc) {
          // If user is already subscribed, go directly to home
          if (isSubscriptionActive) {
            console.log("User has active subscription, navigating to home");
            router.replace('/(tabs)/home');
            return;
          }
          
          // Keep showing loading screen while we prepare to navigate
          const timer = setTimeout(async () => {
            const paywallResult = await presentPaywallAfterAuth(user.uid);
            if (paywallResult === PAYWALL_RESULT.PURCHASED) {
              console.log("Paywall purchased...");
              router.replace('/(tabs)/home');
            }
            else if (paywallResult === PAYWALL_RESULT.RESTORED) {
              console.log("Paywall restored...");
              router.replace('/(tabs)/home');
            }
            else if (paywallResult === PAYWALL_RESULT.CANCELLED) {
              console.log("Paywall cancelled...");
              if (router.canGoBack()) {
                  router.back();
              } else {
                  router.replace('/');
              }
            }
          }, 100);
          
          return () => clearTimeout(timer);
        }
      };

      checkUser();
    }
  }, [user, isLoading, isSubscriptionActive]);
  
  // Show loading screen until auth state is determined
  // OR if we're authenticated and preparing to navigate
  if (isLoading && user === null) {
    return <LoadingScreen />;
  }
  
  return <>{children}</>;
}
