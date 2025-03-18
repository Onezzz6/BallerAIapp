import WelcomeScreen from './components/WelcomeScreen';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';
import authService from './services/auth';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Only redirect to home if user is authenticated AND has a valid profile
    const verifyCompleteAccount = async () => {
      if (!isLoading && user) {
        try {
          setIsVerifying(true);
          console.log("Index: Verifying user has complete profile...");
          
          // Check if the user has a valid Firestore document
          const isValid = await authService.verifyCompleteUserAccount(user.uid);
          
          if (isValid) {
            console.log("Index: User has valid profile, navigating to home");
            router.replace('/(tabs)/home');
          } else {
            console.log("Index: User authenticated but has incomplete profile, staying on welcome screen");
            // User is authenticated in Firebase but doesn't have complete profile
            // Keep them on the welcome screen
            await authService.signOut();
          }
        } catch (error) {
          console.error("Index: Error verifying user account:", error);
          // On any error, sign out and stay on welcome screen
          await authService.signOut();
        } finally {
          setIsVerifying(false);
        }
      }
    };
    
    verifyCompleteAccount();
  }, [user, isLoading, router]);

  // Show loading spinner while verifying user status
  if (isLoading || isVerifying) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4064F6" />
      </View>
    );
  }

  // Only show the welcome screen if user is not authenticated or verification failed
  return <WelcomeScreen />;
} 