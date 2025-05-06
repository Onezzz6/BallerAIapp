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
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import subscriptionService, { PRODUCT_IDS } from './services/subscription';
import axios from 'axios';
import authService from './services/auth';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { user } = useAuth();
  const pathname = usePathname();
  const appState = useRef(AppState.currentState);
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
        <AuthStateManager>
          <NutritionProvider>
            <OnboardingProvider>
              <TrainingProvider>
                <RootLayoutContent />
              </TrainingProvider>
            </OnboardingProvider>
          </NutritionProvider>
        </AuthStateManager>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

// New component to manage auth state
function AuthStateManager({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  // Navigate to home when user is authenticated
  useEffect(() => {
    if (user && !isLoading) {
      const checkUser = async () => {
        const userDoc = await authService.getUserDocument(user.uid);
        if (userDoc) {
          // Keep showing loading screen while we prepare to navigate
          const timer = setTimeout(() => {
            router.replace('/(tabs)/home');
          }, 100);
          
          return () => clearTimeout(timer);
        }
      };

      checkUser();
    }
  }, [user, isLoading]);
  
  // Show loading screen until auth state is determined
  // OR if we're authenticated and preparing to navigate
  if (isLoading && user === null) {
    return <LoadingScreen />;
  }
  
  return <>{children}</>;
}
