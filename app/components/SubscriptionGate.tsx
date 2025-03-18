import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { usePathname } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import subscriptionService from '../services/subscription';
import CustomButton from './CustomButton';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import the paywall screen directly
import PaywallScreen from '../(onboarding)/paywall';

/**
 * SubscriptionGate component
 * This component checks if the user has an active subscription
 * and shows the paywall if needed instead of navigating
 */
const SubscriptionGate = ({ children }: { children: React.ReactNode }) => {
  // For development/debugging only - set to true to bypass subscription check
  const BYPASS_SUBSCRIPTION_CHECK = false; // Set to true temporarily for testing
  
  const [isChecking, setIsChecking] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const pathname = usePathname();
  
  // Log the current route for debugging
  useEffect(() => {
    console.log('Current pathname:', pathname);
  }, [pathname]);

  // Check authentication status
  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setUserId(user?.uid || null);
    });
    
    return () => unsubscribe();
  }, []);

  // Check subscription status when user is authenticated
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isAuthenticated || !userId) {
        setIsChecking(false);
        return;
      }

      try {
        setIsChecking(true);
        console.log('Checking subscription status for user:', userId);
        
        const hasActive = await subscriptionService.hasActiveSubscription();
        console.log('Subscription status:', hasActive);
        
        setHasSubscription(hasActive);
        
        // If no subscription and not already on paywall, show paywall
        if (!hasActive && !pathname.includes('paywall') && !isOnboardingRoute) {
          console.log('No active subscription found, showing paywall');
          setShowPaywall(true);
        } else {
          setShowPaywall(false);
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
        // On error, assume no subscription to be safe
        setHasSubscription(false);
        setShowPaywall(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkSubscription();
  }, [isAuthenticated, userId, pathname]);
  
  // For onboarding routes, don't check subscription
  const isOnboardingRoute = pathname.includes('/(onboarding)') || 
                            pathname.includes('/paywall') ||
                            pathname === '/' || 
                            pathname === '/index';
  
  // Don't gate onboarding routes
  if (isOnboardingRoute) {
    return <>{children}</>;
  }
  
  // If in bypass mode and in development, don't check subscription
  if (__DEV__ && BYPASS_SUBSCRIPTION_CHECK) {
    console.log('DEVELOPMENT MODE: Bypassing subscription check');
    return <>{children}</>;
  }
  
  // Show loading indicator while checking
  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4064F6" />
        <Text style={styles.text}>Verifying subscription...</Text>
      </View>
    );
  }
  
  // If subscription check is complete and user has a subscription, show children
  if (hasSubscription) {
    return <>{children}</>;
  }
  
  // If showPaywall is true, render the PaywallScreen component directly
  if (showPaywall) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaywallScreen />
      </GestureHandlerRootView>
    );
  }
  
  // If no subscription, show a message and button to go to paywall
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscription Required</Text>
      <Text style={styles.text}>
        You need an active subscription to access this content.
      </Text>
      <CustomButton
        title="Subscribe Now"
        onPress={() => {
          console.log('Subscribe Now button pressed, showing paywall');
          setShowPaywall(true);
        }}
        buttonStyle={styles.button}
        textStyle={styles.buttonText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#666666',
    marginTop: 10,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4064F6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SubscriptionGate; 