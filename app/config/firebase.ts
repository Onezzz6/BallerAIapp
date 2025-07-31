import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';

// Use environment variables for consistency, with hardcoded fallbacks
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || "AIzaSyCmZ2KAFhYz0DCy210YwkVGDaRf_TFBKYQ",
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || "love-b6fe6.firebaseapp.com",
  databaseURL: Constants.expoConfig?.extra?.firebaseDatabaseUrl || "https://love-b6fe6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || "love-b6fe6",
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || "love-b6fe6.firebasestorage.app",
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || "764862532296",
  appId: Constants.expoConfig?.extra?.firebaseAppId || "1:764862532296:web:4c72411c65ced74840f3fd",
  measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId || "G-Q1JK3QPMDV"
};

// Only initialize the app if it hasn't been initialized already
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
export default app; 