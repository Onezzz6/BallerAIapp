import { useEffect } from 'react';
import { initializeFirebaseServices } from './app/config/firebase';

export default function App() {
  useEffect(() => {
    initializeFirebaseServices();
  }, []);

  // ... rest of your App component code ...
} 