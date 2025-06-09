import appsFlyer from 'react-native-appsflyer';
import { Platform } from 'react-native';

// AppsFlyer configuration
const APPSFLYER_CONFIG = {
  devKey: '9UYqWbj9ubHbuZzAoxHCRc',
  isDebug: __DEV__, // Enable debug mode in development
  appId: Platform.OS === 'ios' ? '6742112516' : 'com.ballerai.app', // iOS App Store ID and Android package name
  onInstallConversionDataCanceller: null as any,
  onDeepLinkCanceller: null as any,
};

// Initialize AppsFlyer
export const initializeAppsFlyer = () => {
  console.log('Initializing AppsFlyer...');
  
  // Set up conversion data listener
  const onInstallConversionDataCanceller = appsFlyer.onInstallConversionData((res) => {
    console.log('AppsFlyer conversion data:', res);
    
    if (JSON.parse(res.data.is_first_launch) === true) {
      if (res.data.af_status === 'Non-organic') {
        console.log('This is a non-organic install. Media source:', res.data.media_source);
        // Handle non-organic install (user came from an ad/campaign)
        console.log('Campaign:', res.data.campaign);
        console.log('Ad Set:', res.data.adset);
        console.log('Ad:', res.data.ad);
      } else if (res.data.af_status === 'Organic') {
        console.log('This is an organic install.');
        // Handle organic install (user found the app naturally)
      }
    } else {
      console.log('This is not a first launch.');
    }
  });

  // Set up deep link listener
  const onDeepLinkCanceller = appsFlyer.onDeepLink((res) => {
    console.log('AppsFlyer deep link data:', res);
    
    if (res.deepLinkStatus !== 'NOT_FOUND') {
      console.log('Deep link found:', res.data);
      // Handle deep link navigation here
      // You can use your navigation system to route users based on deep link data
    }
  });

  // Store cancellers for cleanup
  APPSFLYER_CONFIG.onInstallConversionDataCanceller = onInstallConversionDataCanceller;
  APPSFLYER_CONFIG.onDeepLinkCanceller = onDeepLinkCanceller;

  // Initialize AppsFlyer with configuration
  appsFlyer.initSdk(
    {
      devKey: APPSFLYER_CONFIG.devKey,
      isDebug: APPSFLYER_CONFIG.isDebug,
      appId: APPSFLYER_CONFIG.appId,
      onInstallConversionDataListener: true, // Enable conversion data
      onDeepLinkListener: true, // Enable deep linking
    },
    (result) => {
      console.log('AppsFlyer initialization result:', result);
      
      // Run test after successful initialization (only in development)
      if (__DEV__) {
        setTimeout(() => {
          console.log('Testing AppsFlyer integration...');
          
          appsFlyer.logEvent('af_test_event', { foo: 'bar' }, (res) => {
            console.log('AF test event result:', res);
          }, (err) => {
            console.error('AF test event error:', err);
          });
          
          // Also test with timestamp
          appsFlyer.logEvent('ballerai_test_event', {
            test_timestamp: new Date().toISOString(),
            app_version: '1.0.5',
            platform: Platform.OS
          }, (res) => {
            console.log('BallerAI test event result:', res);
          }, (err) => {
            console.error('BallerAI test event error:', err);
          });
        }, 2000); // Wait 2 seconds after initialization
      }
    },
    (error) => {
      console.error('AppsFlyer initialization error:', error);
    }
  );
};

// Cleanup function
export const cleanupAppsFlyer = () => {
  if (APPSFLYER_CONFIG.onInstallConversionDataCanceller) {
    APPSFLYER_CONFIG.onInstallConversionDataCanceller();
    APPSFLYER_CONFIG.onInstallConversionDataCanceller = null;
  }
  if (APPSFLYER_CONFIG.onDeepLinkCanceller) {
    APPSFLYER_CONFIG.onDeepLinkCanceller();
    APPSFLYER_CONFIG.onDeepLinkCanceller = null;
  }
};

// Log custom events
export const logAppsFlyerEvent = (eventName: string, eventValues?: Record<string, any>) => {
  appsFlyer.logEvent(eventName, eventValues || {}, 
    (res) => {
      console.log('AppsFlyer event logged successfully:', eventName, res);
    },
    (err) => {
      console.error('AppsFlyer event logging error:', eventName, err);
    }
  );
};

// Common event helpers
export const logPurchaseEvent = (revenue: number, currency: string = 'USD', productId?: string) => {
  logAppsFlyerEvent('af_purchase', {
    af_revenue: revenue,
    af_currency: currency,
    af_content_id: productId,
  });
};

export const logSubscriptionEvent = (revenue: number, currency: string = 'USD', subscriptionType?: string) => {
  logAppsFlyerEvent('af_subscribe', {
    af_revenue: revenue,
    af_currency: currency,
    af_content_type: subscriptionType,
  });
};

export const logUserRegistrationEvent = (method?: string) => {
  logAppsFlyerEvent('af_complete_registration', {
    af_registration_method: method || 'unknown',
  });
};

export const logTutorialCompletionEvent = () => {
  logAppsFlyerEvent('af_tutorial_completion', {});
};

// Test function to verify AppsFlyer integration
export const testAppsFlyerIntegration = () => {
  console.log('Testing AppsFlyer integration...');
  
  appsFlyer.logEvent('af_test_event', { foo: 'bar' }, (res) => {
    console.log('AF test event result:', res);
  }, (err) => {
    console.error('AF test event error:', err);
  });
  
  // Also test with our helper function
  logAppsFlyerEvent('ballerai_test_event', {
    test_timestamp: new Date().toISOString(),
    app_version: '1.0.5',
    platform: Platform.OS
  });
};

export default {
  initializeAppsFlyer,
  cleanupAppsFlyer,
  logAppsFlyerEvent,
  logPurchaseEvent,
  logSubscriptionEvent,
  logUserRegistrationEvent,
  logTutorialCompletionEvent,
  testAppsFlyerIntegration,
}; 