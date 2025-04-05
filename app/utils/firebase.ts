import firebase from '@react-native-firebase/app';
import '@react-native-firebase/analytics';
import '@react-native-firebase/crashlytics';

export const initializeFirebase = async () => {
  try {
    if (!firebase.apps.length) {
      await firebase.initializeApp();
    }
    
    // Enable analytics collection
    await firebase.analytics().setAnalyticsCollectionEnabled(true);
    
    // Enable crashlytics collection
    await firebase.crashlytics().setCrashlyticsCollectionEnabled(true);
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
};

export default initializeFirebase; 