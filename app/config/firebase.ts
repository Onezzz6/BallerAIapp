import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCmZ2KAFhYz0DCy210YwkVGDaRf_TFBKYQ",
  authDomain: "love-b6fe6.firebaseapp.com",
  databaseURL: "https://love-b6fe6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "love-b6fe6",
  storageBucket: "love-b6fe6.firebasestorage.app",
  messagingSenderId: "764862532296",
  appId: "1:764862532296:web:4c72411c65ced74840f3fd",
  measurementId: "G-Q1JK3QPMDV"
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
const db = getFirestore(app);

export { auth, db };
export default app; 