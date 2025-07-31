import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import analyticsService from '../services/analytics';

const useAnalytics = () => {
  const { user } = useAuth();

  // Set up user tracking when auth state changes
  useEffect(() => {
    if (user) {
      // Set user ID for both Analytics and Crashlytics
      analyticsService.setUserId(user.uid);
      
      // Set basic user properties
      analyticsService.setUserProperties({
        email: user.email || 'no_email'
      });
    }
  }, [user]);

  return {
    logEvent: analyticsService.logEvent,
    logScreenView: analyticsService.logScreenView,
    logError: analyticsService.logError,
  };
};

export default useAnalytics; 