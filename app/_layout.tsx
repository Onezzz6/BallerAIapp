import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import LoadingScreen from './components/LoadingScreen';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from './context/AuthContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NutritionProvider } from './context/NutritionContext';
import { TrainingProvider } from './context/TrainingContext';
import subscriptionService from './services/subscription';
import SubscriptionGate from './components/SubscriptionGate';

// Prevent the splash screen from auto-hiding before asset loading is complete.
ExpoSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (error) throw error;

    if (loaded) {
      ExpoSplashScreen.hideAsync();
    }

    // Show loading screen for 2 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [loaded, error]);

  // Initialize subscription service
  useEffect(() => {
    const initSubscriptions = async () => {
      try {
        console.log('Initializing subscription service in app layout...');
        await subscriptionService.initialize();
        
        // Set up purchase listeners
        const removeListeners = subscriptionService.setupPurchaseListeners();
        
        // Clean up listeners when component unmounts
        return () => {
          removeListeners();
        };
      } catch (error) {
        console.error('Failed to initialize subscription service:', error);
      }
    };
    
    initSubscriptions();
  }, []);

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
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <SubscriptionGate>
                  <Slot />
                </SubscriptionGate>
                <StatusBar style="auto" />
              </ThemeProvider>
            </TrainingProvider>
          </OnboardingProvider>
        </NutritionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
