import React, { useEffect, useContext } from 'react';
import { NutritionContext } from '../../context/NutritionContext';
import auth from '@react-native-firebase/auth';

/**
 * This component doesn't render anything but initializes nutrition data 
 * as soon as the app starts and the user is authenticated.
 */
const NutritionDataLoader = () => {
  const nutritionContext = useContext(NutritionContext);

  useEffect(() => {
    console.log('NutritionDataLoader: Component mounted, ready to initialize data');
    
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('NutritionDataLoader: User authenticated, initializing nutrition data');
        
        // Initialize nutrition data
        if (nutritionContext && nutritionContext.initializeData) {
          nutritionContext.initializeData();
        } else {
          console.warn('NutritionDataLoader: Nutrition context or initialize function not available');
        }
      } else {
        console.log('NutritionDataLoader: User not authenticated yet');
      }
    });
    
    return () => unsubscribe();
  }, [nutritionContext]);

  // This component doesn't render anything
  return null;
};

export default NutritionDataLoader; 