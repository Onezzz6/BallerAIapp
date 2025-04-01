import { initializeApp } from '@react-native-firebase/app';
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const initializeFirebase = async () => {
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');

    // Enable analytics collection
    await analytics().setAnalyticsCollectionEnabled(true);
    console.log('Analytics collection enabled');

    // Enable crashlytics collection
    await crashlytics().setCrashlyticsCollectionEnabled(true);
    console.log('Crashlytics collection enabled');

    return app;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
};

export default initializeFirebase;