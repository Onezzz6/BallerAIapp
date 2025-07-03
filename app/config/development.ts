/**
 * Development Configuration
 * 
 * This file contains flags and settings for development mode.
 * These flags help prevent analytics, tracking, and other services
 * from polluting production data when working in development.
 */

// Main development flag - automatically detects if running in development
export const IS_DEVELOPMENT = __DEV__;

// Analytics flags
export const ANALYTICS_CONFIG = {
  // Disable Firebase Analytics in development
  DISABLE_FIREBASE_ANALYTICS: IS_DEVELOPMENT,
  
  // Disable AppsFlyer in development
  DISABLE_APPSFLYER: IS_DEVELOPMENT,
  
  // Disable Crashlytics in development
  DISABLE_CRASHLYTICS: IS_DEVELOPMENT,
  
  // Log what would have been sent instead of sending
  LOG_DISABLED_EVENTS: IS_DEVELOPMENT,
};

// Other development flags
export const DEV_CONFIG = {
  // Enable extra logging
  VERBOSE_LOGGING: IS_DEVELOPMENT,
  
  // Mock API responses (if needed)
  MOCK_API_RESPONSES: false,
  
  // Skip certain validation checks
  SKIP_VALIDATIONS: false,
};

/**
 * Helper function to check if analytics should be disabled
 */
export const shouldDisableAnalytics = () => {
  return ANALYTICS_CONFIG.DISABLE_FIREBASE_ANALYTICS;
};

/**
 * Helper function to check if AppsFlyer should be disabled
 */
export const shouldDisableAppsFlyer = () => {
  return ANALYTICS_CONFIG.DISABLE_APPSFLYER;
};

/**
 * Helper function to check if Crashlytics should be disabled
 */
export const shouldDisableCrashlytics = () => {
  return ANALYTICS_CONFIG.DISABLE_CRASHLYTICS;
};

/**
 * Log a message indicating that a service is disabled
 */
export const logDisabledService = (serviceName: string, action: string, data?: any) => {
  if (ANALYTICS_CONFIG.LOG_DISABLED_EVENTS) {
    console.log(`[${serviceName.toUpperCase()} DISABLED] Would have ${action}`, data || '');
  }
};

export default {
  IS_DEVELOPMENT,
  ANALYTICS_CONFIG,
  DEV_CONFIG,
  shouldDisableAnalytics,
  shouldDisableAppsFlyer,
  shouldDisableCrashlytics,
  logDisabledService,
}; 