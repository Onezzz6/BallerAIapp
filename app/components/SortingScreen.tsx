import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import LoadingScreen from './LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { useDashboard } from '../_layout';
import authService from '../../services/auth';

/**
 * SortingScreen - Dashboard Version
 * 
 * This screen:
 * 1. Shows the loading screen while checking auth status
 * 2. Routes users to the appropriate screen based on their status
 * 3. Prevents the welcome screen flash for existing users
 * 4. No subscription checks (dashboard version)
 */
export default function SortingScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasCheckedUser, setHasCheckedUser] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);
  const [shouldFadeOut, setShouldFadeOut] = useState(false);

  // Debug logging for state changes
  useEffect(() => {
    console.log('SortingScreen State:', {
      authLoading,
      navigationReady,
      minLoadingComplete,
      user: !!user,
      userUid: user?.uid || 'none',
      hasCheckedUser,
      shouldFadeOut
    });
  }, [authLoading, navigationReady, minLoadingComplete, user, hasCheckedUser, shouldFadeOut]);

  // Ensure minimum loading time for smooth UX
  useEffect(() => {
    console.log('SortingScreen: Starting minimum loading timer (2 seconds)');
    const timer = setTimeout(() => {
      console.log('SortingScreen: Minimum loading time completed');
      setMinLoadingComplete(true);
    }, 2000); // Show loading for at least 2 seconds
    
    return () => clearTimeout(timer);
  }, []);

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

    // Start immediately
    checkNavigationReady();
  }, [router]);

  const performNavigation = (path: string) => {
    try {
      console.log(`SortingScreen: Starting fade out before navigating to ${path}`);
      setShouldFadeOut(true);
      
      // Wait for fade out animation to complete, then navigate
      setTimeout(() => {
        console.log(`SortingScreen: Navigating to ${path}`);
        router.replace(path);
        setIsInitializing(false);
      }, 500); // Wait for fade out animation duration
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
        // Wait for auth state to be determined, navigation to be ready, and minimum loading time
        if (authLoading || !navigationReady || !minLoadingComplete) {
          return;
        }

        // Case 1: No user - show welcome screen for onboarding
        if (!user) {
          console.log('SortingScreen: No user found, navigating to welcome screen');
          performNavigation('/welcome');
          return;
        }

        // Case 2: User exists - verify account completion (dashboard version: no subscription check)
        console.log('SortingScreen: User found, verifying account...');
        
        // Verify user has a valid, complete account (not just a document)
        console.log('SortingScreen: Verifying user account completion for UID:', user.uid);
        const isValidUser = await authService.verifyUserAccount(user);
        
        if (!isValidUser) {
          console.log('SortingScreen: User account is invalid or incomplete, navigating to welcome screen');
          performNavigation('/welcome');
          return;
        }
        
        console.log('SortingScreen: User account verified, dashboard version - navigating to home');
        
        // Dashboard version: Skip subscription check, go directly to home
        setHasCheckedUser(true);

      } catch (error) {
        console.error('Error in SortingScreen initialization:', error);
        // On error, default to welcome screen
        performNavigation('/welcome');
      }
    };

    // Only run when dependencies change
    if (!hasCheckedUser && navigationReady && minLoadingComplete) {
      initializeApp();
    }
  }, [user, authLoading, router, hasCheckedUser, navigationReady, minLoadingComplete]);

  // Separate effect to handle navigation after user verification (dashboard version)
  useEffect(() => {
    if (hasCheckedUser && user && !authLoading && navigationReady && minLoadingComplete) {
      console.log('SortingScreen: Making final routing decision...');
      console.log('SortingScreen: Dashboard version - user verified, navigating to home');
      performNavigation('/(tabs)/home');
    }
  }, [hasCheckedUser, user, authLoading, router, navigationReady, minLoadingComplete]);

  // Show loading screen while determining where to navigate
  const shouldShowLoading = isInitializing || authLoading || !navigationReady || !minLoadingComplete;
  
  console.log('SortingScreen: Loading decision:', {
    shouldShowLoading,
    isInitializing,
    authLoading,
    navigationReady,
    minLoadingComplete,
    shouldFadeOut
  });
  
  if (shouldShowLoading) {
    console.log('SortingScreen: Showing LoadingScreen');
    return <LoadingScreen shouldFadeOut={shouldFadeOut} />;
  }

  // This should not be reached due to navigation, but just in case
  console.warn('SortingScreen: Reached end of component without navigation - this should not happen');
  return <LoadingScreen shouldFadeOut={shouldFadeOut} />;
}