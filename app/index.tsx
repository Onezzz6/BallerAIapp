import WelcomeScreen from './components/WelcomeScreen';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // If user is authenticated, redirect to home screen
    if (!isLoading && user) {
      router.replace('/(tabs)/home');
    }
  }, [user, isLoading, router]);

  // Only show the welcome screen if user is not authenticated
  return <WelcomeScreen />;
} 