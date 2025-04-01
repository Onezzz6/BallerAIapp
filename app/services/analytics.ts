import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';

// Custom event names
export const AnalyticsEvents = {
  APP_OPEN: 'app_open',
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  GENERATE_TRAINING_PLAN: 'generate_training_plan',
  VIEW_TRAINING_PLAN: 'view_training_plan',
  COMPLETE_TRAINING: 'complete_training',
  GENERATE_MEAL_PLAN: 'generate_meal_plan',
  VIEW_MEAL_PLAN: 'view_meal_plan',
  LOG_MEAL: 'log_meal',
  VIEW_PROFILE: 'view_profile',
  UPDATE_PROFILE: 'update_profile',
  START_RECOVERY: 'start_recovery',
  COMPLETE_RECOVERY: 'complete_recovery',
} as const;

// Analytics service
const analyticsService = {
  // Log a custom event
  logEvent: async (eventName: string, params?: { [key: string]: any }) => {
    try {
      await analytics().logEvent(eventName, params);
      console.log(`Analytics event logged: ${eventName}`, params);
    } catch (error) {
      console.error('Error logging analytics event:', error);
      // Log error to Crashlytics
      crashlytics().recordError(error as Error);
    }
  },

  // Set user properties
  setUserProperties: async (properties: { [key: string]: string }) => {
    try {
      await analytics().setUserProperties(properties);
      console.log('User properties set:', properties);
    } catch (error) {
      console.error('Error setting user properties:', error);
      crashlytics().recordError(error as Error);
    }
  },

  // Set user ID
  setUserId: async (userId: string) => {
    try {
      await analytics().setUserId(userId);
      await crashlytics().setUserId(userId);
      console.log('User ID set for analytics and crashlytics:', userId);
    } catch (error) {
      console.error('Error setting user ID:', error);
      crashlytics().recordError(error as Error);
    }
  },

  // Log screen view
  logScreenView: async (screenName: string, screenClass?: string) => {
    try {
      await analytics().logEvent('screen_view', {
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
      console.log(`Screen view logged: ${screenName}`);
    } catch (error) {
      console.error('Error logging screen view:', error);
      crashlytics().recordError(error as Error);
    }
  },

  // Initialize crash reporting
  initializeCrashReporting: async () => {
    try {
      await crashlytics().setCrashlyticsCollectionEnabled(true);
      console.log('Crashlytics initialized');
    } catch (error) {
      console.error('Error initializing Crashlytics:', error);
    }
  },

  // Log error to Crashlytics
  logError: async (error: Error) => {
    try {
      await crashlytics().recordError(error);
      console.log('Error logged to Crashlytics:', error.message);
    } catch (crashError) {
      console.error('Error logging to Crashlytics:', crashError);
    }
  },
};

// Initialize analytics when the service is imported
analyticsService.initializeCrashReporting().catch(console.error);

export default analyticsService; 