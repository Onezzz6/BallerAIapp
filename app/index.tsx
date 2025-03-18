import WelcomeScreen from './components/WelcomeScreen';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View, Text } from 'react-native';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './config/firebase';
import nutritionService from './services/nutrition';
import recoveryService from './services/recovery';
import trainingService from './services/training';

// Function to initialize all data listeners
const initializeAllDataListeners = async (userId: string) => {
  console.log("Initializing all data listeners for user:", userId);
  try {
    // Initialize nutrition data listeners first - this is generally safer because
    // it doesn't have permissions issues as often
    await nutritionService.initializeDataListeners(userId);
    
    // Initialize recovery data listeners with error handling
    try {
      await recoveryService.initializeDataListeners(userId);
    } catch (error) {
      console.warn("Non-critical error initializing recovery data listeners:", error);
      // Continue even if recovery fails
    }
    
    // Initialize training data listeners with error handling
    try {
      await trainingService.initializeDataListeners(userId);
    } catch (error) {
      console.warn("Non-critical error initializing training data listeners:", error);
      // Continue even if training fails
    }
    
    console.log("All data listeners initialized successfully");
    return true;
  } catch (error) {
    console.error("Error initializing data listeners:", error);
    return false;
  }
};

// Root component - serves as the entry point
export default function App() {
  const router = useRouter();
  const auth = getAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializingData, setIsInitializingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          console.log("User is authenticated, checking for user doc");
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            console.log("User document exists, initializing data listeners");
            setIsInitializingData(true);
            
            try {
              // Try to initialize data listeners
              await initializeAllDataListeners(user.uid);
              
              // Add a slight delay to ensure that even if there are permission issues,
              // the app will proceed to the home screen
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              console.log("Navigation to home screen delayed to ensure data is ready");
              router.replace("/(tabs)/home");
            } catch (error) {
              console.error("Error initializing data:", error);
              // Continue anyway - the user should still see the home screen
              // even if some data isn't loaded
              router.replace("/(tabs)/home");
            } finally {
              setIsInitializingData(false);
            }
          } else {
            console.log("User is logged in but no document exists, redirecting to onboarding");
            router.replace("/(onboarding)");
          }
        } else {
          console.log("No user logged in, showing welcome screen");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error in auth state change handler:", error);
        setError("There was an error loading your account. Please try again.");
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (isLoading || isInitializingData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        {isInitializingData && (
          <Text style={{ marginTop: 20, textAlign: 'center' }}>
            Initializing your data...{'\n'}This may take a moment.
          </Text>
        )}
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', marginBottom: 20, textAlign: 'center' }}>{error}</Text>
        <Text 
          style={{ color: 'blue', textDecorationLine: 'underline' }}
          onPress={() => setError(null)}
        >
          Try Again
        </Text>
      </View>
    );
  }

  return <WelcomeScreen />;
} 