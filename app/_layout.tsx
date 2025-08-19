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
import { AuthProvider, useAuth } from '../context/AuthContext';
import { OnboardingProvider } from '../context/OnboardingContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NutritionProvider } from '../context/NutritionContext';
import { TrainingProvider } from '../context/TrainingContext';
import { XpProvider } from '../context/XpContext';
import { XpLevelUpManager } from './components/XpLevelUpManager';
import { Alert, Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { initializeAppsFlyer, cleanupAppsFlyer } from './config/appsflyer';
import firestore from '@react-native-firebase/firestore';
import { db } from '../config/firebase';

// Dashboard version: No subscription context needed
type DashboardContextType = {
  // Placeholder for future dashboard-specific state
};

const DashboardContext = createContext<DashboardContextType>({});

export const useDashboard = () => useContext(DashboardContext);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Dashboard provider component (simplified, no subscription logic)
function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef<string>(pathname);
  
  // Update pathname ref whenever pathname changes
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Dashboard version: No subscription setup needed
  useEffect(() => {
    if (user && user.uid) {
      console.log(`Dashboard version: User ${user.uid} authenticated, no subscription setup needed`);
    }
  }, [user]);

  return (
    <DashboardContext.Provider value={{}}>
      {children}
    </DashboardContext.Provider>
  );
}

function RootLayoutContent() {
  const { user } = useAuth();

  // Function to check if we're on an onboarding screen
  const isOnOnboardingScreen = (path: string) => {
    return path.includes('/(onboarding)') || 
      path.includes('/sign') || 
      path.includes('/motivation') ||
      path.includes('/tracking') ||
      path.includes('/football-goal') ||
      path.includes('/smart-watch') ||
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
export const isOnOnboardingScreen = (path: string) => {
  return path.includes('/(onboarding)') || 
    path.includes('/welcome') ||
    path.includes('/gender') || 
    path.includes('/measurements') ||
    path.includes('/age') ||
    path.includes('/username') ||
    path.includes('/referral-code') ||
    path.includes('/profile-complete') ||
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
        <DashboardProvider>
          <XpProvider>
            <AuthStateManager>
              <NutritionProvider>
                <OnboardingProvider>
                  <TrainingProvider>
                    <RootLayoutContent />
                  </TrainingProvider>
                </OnboardingProvider>
              </NutritionProvider>
            </AuthStateManager>
            <XpLevelUpManager />
          </XpProvider>
        </DashboardProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

// Auth state manager component (simplified)
function AuthStateManager({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  // Dashboard version: Simplified auth state management, no subscription checks
  
  return <>{children}</>;
}