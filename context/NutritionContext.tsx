import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import firestore from '@react-native-firebase/firestore';
import { db } from '../config/firebase';
import { format, startOfDay, endOfDay } from 'date-fns';
import { calculateNutritionGoals, type ActivityLevel } from '../utils/nutritionCalculations';

// Helper functions
const getLocalStartOfDay = (date: Date) => {
  const result = startOfDay(date);
  return result;
};

const getLocalEndOfDay = (date: Date) => {
  const result = endOfDay(date);
  return result;
};

const formatDateId = (date: Date) => {
  return format(date, 'yyyy-MM-dd');
};

type MacroGoals = {
  calories: { current: number; goal: number };
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fats: { current: number; goal: number };
};

type NutritionContextType = {
  macros: MacroGoals;
  updateMacros: (newMacros: MacroGoals) => void;
  todaysMeals: Array<any>;
  isLoading: boolean;
};

const defaultMacros: MacroGoals = {
  calories: { current: 0, goal: 0 },
  protein: { current: 0, goal: 0 },
  carbs: { current: 0, goal: 0 },
  fats: { current: 0, goal: 0 }
};

const NutritionContext = createContext<NutritionContextType>({
  macros: defaultMacros,
  updateMacros: () => {},
  todaysMeals: [],
  isLoading: true
});

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [macros, setMacros] = useState<MacroGoals>(defaultMacros);
  const [todaysMeals, setTodaysMeals] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reset state when user logs out
  useEffect(() => {
    if (!user) {
      setMacros(defaultMacros);
      setTodaysMeals([]);
    }
  }, [user]);

  // Set up real-time listener for user data changes
  useEffect(() => {
    if (!user) return;

    const userRef = db.collection('users').doc(user.uid);
    const unsubscribe = userRef.onSnapshot((doc) => {
      if (doc.exists) {
        const userData = doc.data();
        if (userData && userData.calorieGoal && userData.macroGoals) {
          // Update macros with new goals while preserving current values
          setMacros(prev => ({
            ...prev,
            calories: { ...prev.calories, goal: userData.calorieGoal },
            protein: { ...prev.protein, goal: userData.macroGoals.protein },
            carbs: { ...prev.carbs, goal: userData.macroGoals.carbs },
            fats: { ...prev.fats, goal: userData.macroGoals.fat }
          }));
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Automatically load today's nutrition data when the app starts
  useEffect(() => {
    if (!user) return;
    
    // Set loading state
    setIsLoading(true);
    //console.log('DEBUG - NutritionContext: Setting loading state to true');
    
    const loadTodayData = async () => {
      try {
        //console.log('DEBUG - Loading today nutrition data automatically on app start');
        const today = new Date();
        const dateString = formatDateId(today);
        
        // Get user goals first
        const userDocRef = db.collection('users').doc(user.uid);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
          //console.error('DEBUG - User document not found');
          setIsLoading(false);
          //console.log('DEBUG - NutritionContext: Setting loading state to false - user not found');
          return;
        }

        const userData = userDoc.data();
        
        // Use stored goals if available, otherwise calculate new ones
        let goals;
        let goalsNeedSaving = false;
        
        if (userData.calorieGoal && userData.macroGoals) {
          goals = {
            calories: userData.calorieGoal,
            protein: userData.macroGoals.protein,
            carbs: userData.macroGoals.carbs,
            fats: userData.macroGoals.fat || userData.macroGoals.fats
          };
          console.log('DEBUG - Using existing goals from user document:', goals);
        } else {
          // Use the centralized calculation utility
          console.log('DEBUG - No goals found, calculating new goals from user data');
          const calculatedGoals = calculateNutritionGoals(userData);
          
          goals = {
            calories: calculatedGoals.calorieGoal,
            protein: calculatedGoals.macroGoals.protein,
            carbs: calculatedGoals.macroGoals.carbs,
            fats: calculatedGoals.macroGoals.fat
          };
          
          // Mark that these goals need to be saved
          goalsNeedSaving = true;
          console.log('DEBUG - Calculated new goals:', goals);
          
          // Save the calculated goals to the user document to ensure persistence
          if (goalsNeedSaving && goals.calories > 0) {
            try {
              console.log('DEBUG - Saving calculated goals to user document from NutritionContext');
              await userDocRef.update({
                calorieGoal: goals.calories,
                macroGoals: {
                  protein: goals.protein,
                  carbs: goals.carbs,
                  fat: goals.fats
                }
              });
              console.log('DEBUG - Goals saved successfully from NutritionContext');
            } catch (error) {
              console.error('ERROR - Failed to save calculated goals:', error);
            }
          }
        }

        // Update macros state with the goals right away, before meals are loaded
        // This ensures the UI shows the goals even if there are no meals yet
        setMacros(prev => ({
          ...prev,
          calories: { ...prev.calories, goal: goals.calories },
          protein: { ...prev.protein, goal: goals.protein },
          carbs: { ...prev.carbs, goal: goals.carbs },
          fats: { ...prev.fats, goal: goals.fats }
        }));
        
        // Keep the loading state true until we've checked for meals
        // But if we have goals, we can at least set that part of the state
        console.log('DEBUG - NutritionContext: Goals loaded, checking for meals...');

        // Get today's meals
        const startOfDay = getLocalStartOfDay(today);
        const endOfDay = getLocalEndOfDay(today);
        
        try {
          const mealsQuery = db.collection('meals')
            .where('userId', '==', user.uid)
            .where('timestamp', '>=', startOfDay.toISOString())
            .where('timestamp', '<=', endOfDay.toISOString())
            .orderBy('timestamp', 'desc');
          
          // Set up real-time listener for today's meals
          const unsubscribe = mealsQuery.onSnapshot(
            (snapshot) => {
              const meals = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              
              setTodaysMeals(meals);
              
              // Calculate current macros from meals
              const computedTotals = meals.reduce((acc, meal: any) => ({
                calories: acc.calories + (meal.totalMacros?.calories || 0),
                protein: acc.protein + (meal.totalMacros?.protein || 0),
                carbs: acc.carbs + (meal.totalMacros?.carbs || 0),
                fats: acc.fats + (meal.totalMacros?.fats || 0)
              }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
              
              // Update macros with both current values and goals
              setMacros({
                calories: { current: computedTotals.calories, goal: goals.calories },
                protein: { current: computedTotals.protein, goal: goals.protein },
                carbs: { current: computedTotals.carbs, goal: goals.carbs },
                fats: { current: computedTotals.fats, goal: goals.fats }
              });
              
              // Finally set loading to false AFTER we've loaded everything
              setIsLoading(false);
              console.log('DEBUG - NutritionContext: Setting loading state to false - all data loaded');
            },
            (error) => {
              //console.error('Error loading nutrition data:', error);
              // Still set loading to false even if there's an error, but keep any goals we've calculated
              setIsLoading(false);
              console.log('DEBUG - NutritionContext: Setting loading state to false - error loading data');
            }
          );
          
          // Clean up listener on unmount
          return () => unsubscribe();
        } catch (error) {
          console.error('Error setting up meals listener:', error);
          // If we couldn't set up the listener, at least set loading to false
          setIsLoading(false);
          console.log('DEBUG - NutritionContext: Setting loading state to false - error setting up listener');
        }
      } catch (error) {
        console.error('Error in initial nutrition data load:', error);
        setIsLoading(false);
        console.log('DEBUG - NutritionContext: Setting loading state to false - general error');
      }
    };
    
    loadTodayData();
  }, [user]);

  const updateMacros = (newMacros: MacroGoals) => {
    setMacros(newMacros);
  };

  return (
    <NutritionContext.Provider value={{ 
      macros, 
      updateMacros, 
      todaysMeals,
      isLoading 
    }}>
      {children}
    </NutritionContext.Provider>
  );
}

export const useNutrition = () => useContext(NutritionContext);

// Add default export
const NutritionModule = {
  NutritionProvider,
  useNutrition,
};

export default NutritionModule;
export type { MacroGoals, NutritionContextType }; 