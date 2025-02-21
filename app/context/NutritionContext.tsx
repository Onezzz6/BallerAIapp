import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
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
  todaysMeals: Array<any>;
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
  todaysMeals: []
});

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [macros, setMacros] = useState<MacroGoals>(defaultMacros);
  const [todaysMeals, setTodaysMeals] = useState<Array<any>>([]);

  // Reset state when user logs out
  useEffect(() => {
    if (!user) {
      setMacros(defaultMacros);
      setTodaysMeals([]);
    }
  }, [user]);

  const updateMacros = (newMacros: MacroGoals) => {
    setMacros(newMacros);
  };

  return (
    <NutritionContext.Provider value={{ 
      macros, 
      updateMacros, 
      todaysMeals 
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