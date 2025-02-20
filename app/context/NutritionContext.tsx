import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { format } from 'date-fns';
import { calculateDailyCalories, calculateMacroGoals, type ActivityLevel } from '../utils/nutritionCalculations';

type MacroGoals = {
  calories: { current: number; goal: number };
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fats: { current: number; goal: number };
};

type NutritionContextType = {
  macros: MacroGoals;
  updateMacros: (newMacros: MacroGoals) => void;
  todaysMeals: Array<{
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    timestamp: Date;
  }>;
};

const NutritionContext = createContext<NutritionContextType | null>(null);

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [macros, setMacros] = useState<MacroGoals>({
    calories: { current: 0, goal: 0 },
    protein: { current: 0, goal: 0 },
    carbs: { current: 0, goal: 0 },
    fats: { current: 0, goal: 0 }
  });
  const [todaysMeals, setTodaysMeals] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [goals, setGoals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0
  });

  // Load user profile and calculate goals
  useEffect(() => {
    if (!user) return;

    const loadUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          const weight = parseFloat(userData.weight);
          const height = parseFloat(userData.height);
          const age = parseInt(userData.age);
          
          const dailyCalories = calculateDailyCalories(
            weight,
            height,
            age,
            userData.gender.toLowerCase(),
            userData.activityLevel as ActivityLevel
          );

          const calculatedGoals = calculateMacroGoals(dailyCalories, userData.footballGoal);
          setGoals(calculatedGoals);

          setMacros(prev => ({
            calories: { ...prev.calories, goal: calculatedGoals.calories },
            protein: { ...prev.protein, goal: calculatedGoals.protein },
            carbs: { ...prev.carbs, goal: calculatedGoals.carbs },
            fats: { ...prev.fats, goal: calculatedGoals.fats }
          }));
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [user]);

  // Listen for today's meals in real-time
  useEffect(() => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const mealsQuery = query(
      collection(db, 'users', user.uid, 'meals'),
      where('timestamp', '>=', today),
      where('timestamp', '<', tomorrow),
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribe = onSnapshot(mealsQuery, (snapshot) => {
      try {
        const meals = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate()
        }));

        setTodaysMeals(meals);

        // Calculate totals from all today's meals
        const totals = meals.reduce((acc, meal) => ({
          calories: acc.calories + (Number(meal.calories) || 0),
          protein: acc.protein + (Number(meal.protein) || 0),
          carbs: acc.carbs + (Number(meal.carbs) || 0),
          fats: acc.fats + (Number(meal.fats) || 0),
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

        // Update macros with current values and preserve goals
        setMacros(prev => ({
          calories: { current: totals.calories, goal: goals.calories },
          protein: { current: totals.protein, goal: goals.protein },
          carbs: { current: totals.carbs, goal: goals.carbs },
          fats: { current: totals.fats, goal: goals.fats }
        }));
      } catch (error) {
        console.error('Error processing meals:', error);
      }
    });

    return () => unsubscribe();
  }, [user, goals]);

  // Debug log for current state
  useEffect(() => {
    console.log('Current macros state:', macros);
  }, [macros]);

  const updateMacros = (newMacros: MacroGoals) => {
    setMacros(prev => ({
      calories: { ...prev.calories, goal: newMacros.calories.goal },
      protein: { ...prev.protein, goal: newMacros.protein.goal },
      carbs: { ...prev.carbs, goal: newMacros.carbs.goal },
      fats: { ...prev.fats, goal: newMacros.fats.goal }
    }));
    setGoals({
      calories: newMacros.calories.goal,
      protein: newMacros.protein.goal,
      carbs: newMacros.carbs.goal,
      fats: newMacros.fats.goal
    });
  };

  if (isLoading) {
    return null;
  }

  return (
    <NutritionContext.Provider value={{ macros, updateMacros, todaysMeals }}>
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition() {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
}

// Add default export
const NutritionModule = {
  NutritionProvider,
  useNutrition,
};

export default NutritionModule;
export type { MacroGoals, NutritionContextType }; 