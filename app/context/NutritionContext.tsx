import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, onSnapshot, collection, query, where, orderBy, getDoc } from 'firebase/firestore';
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

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        if (userData.calorieGoal && userData.macroGoals) {
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
    
    const loadTodayData = async () => {
      try {
        console.log('Loading today nutrition data automatically on app start');
        const today = new Date();
        const dateString = formatDateId(today);
        
        // Get user goals first
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          console.error('User document not found');
          setIsLoading(false);
          return;
        }

        const userData = userDoc.data();
        
        // Use stored goals if available, otherwise calculate new ones
        let goals;
        if (userData.calorieGoal && userData.macroGoals) {
          goals = {
            calories: userData.calorieGoal,
            protein: userData.macroGoals.protein,
            carbs: userData.macroGoals.carbs,
            fats: userData.macroGoals.fat || userData.macroGoals.fats
          };
          console.log('DEBUG - Using goals from user document:', goals);
        } else {
          // Use the centralized calculation utility
          const { calorieGoal, macroGoals } = calculateNutritionGoals(userData);
          goals = {
            calories: calorieGoal,
            protein: macroGoals.protein,
            carbs: macroGoals.carbs,
            fats: macroGoals.fat
          };
          console.log('DEBUG - Calculated new goals:', goals);
        }

        // Get today's meals
        const startOfDay = getLocalStartOfDay(today);
        const endOfDay = getLocalEndOfDay(today);
        
        const mealsQuery = query(
          collection(db, 'meals'),
          where('userId', '==', user.uid),
          where('timestamp', '>=', startOfDay.toISOString()),
          where('timestamp', '<=', endOfDay.toISOString()),
          orderBy('timestamp', 'desc')
        );
        
        // Set up real-time listener for today's meals
        const unsubscribe = onSnapshot(mealsQuery, 
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
            
            setIsLoading(false);
          },
          (error) => {
            console.error('Error loading nutrition data:', error);
            setIsLoading(false);
          }
        );
        
        // Clean up listener on unmount
        return () => unsubscribe();
      } catch (error) {
        console.error('Error in initial nutrition data load:', error);
        setIsLoading(false);
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