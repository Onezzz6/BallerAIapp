import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  setDoc, 
  where, 
  orderBy, 
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns';

// Format date for Firebase collection IDs
const formatDateId = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

// Get local start of day (midnight) for a given date
const getLocalStartOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

// Get local end of day (23:59:59.999) for a given date
const getLocalEndOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const nutritionService = {
  // Initialize all nutrition data listeners
  async initializeDataListeners(userId: string) {
    console.log("Initializing nutrition data listeners for user:", userId);
    
    try {
      // Get today's date and format it
      const today = new Date();
      const todayStr = formatDateId(today);
      
      // Get today's nutrition data
      await this.fetchTodayNutritionData(userId, today);
      
      // Get weekly nutrition data for adherence calculations
      await this.fetchNutritionHistory(userId);
      
      // Set up real-time listener for today's data
      this.setupTodayNutritionListener(userId, todayStr);
      
      console.log("All nutrition data listeners initialized");
      return true;
    } catch (error) {
      console.error("Error initializing nutrition data listeners:", error);
      // Still return true to allow the app to proceed
      // We don't want this to block app startup
      return true;
    }
  },
  
  // Fetch today's nutrition data
  async fetchTodayNutritionData(userId: string, date: Date) {
    try {
      console.log("Loading today nutrition data automatically on app start");
      
      // Format date
      const dateStr = formatDateId(date);
      
      // Get user's calorie and macro goals
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        console.error('User document not found');
        return null;
      }
      
      const userData = userDoc.data();
      let calorieGoal = userData.calorieGoal || 2000;
      let macroGoals = userData.macroGoals || {
        protein: 150,
        carbs: 200,
        fats: 55
      };
      
      // Get daily macros for today
      const dailyMacrosRef = doc(db, `users/${userId}/dailyMacros/${dateStr}`);
      const dailyMacrosDoc = await getDoc(dailyMacrosRef);
      
      let currentMacros = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0
      };
      
      if (dailyMacrosDoc.exists()) {
        const data = dailyMacrosDoc.data();
        currentMacros = {
          calories: data.calories || 0,
          protein: data.protein || 0,
          carbs: data.carbs || 0,
          fats: data.fats || 0
        };
      }
      
      // Load meals for today
      const startOfDay = getLocalStartOfDay(date);
      const endOfDay = getLocalEndOfDay(date);
      
      const q = query(
        collection(db, 'meals'),
        where('userId', '==', userId),
        where('timestamp', '>=', startOfDay.toISOString()),
        where('timestamp', '<=', endOfDay.toISOString()),
        orderBy('timestamp', 'desc')
      );
      
      const mealsSnapshot = await getDocs(q);
      const meals = mealsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        currentMacros,
        goals: {
          calories: calorieGoal,
          ...macroGoals
        },
        meals
      };
    } catch (error) {
      console.error("Error loading nutrition data:", error);
      return null;
    }
  },
  
  // Fetch nutrition history for adherence calculations
  async fetchNutritionHistory(userId: string) {
    try {
      console.log("DEBUG - Fetching historical nutrition data for adherence calculation");
      
      // Get the date range for the past week (excluding today)
      const today = new Date();
      const pastWeekStart = subDays(today, 7);
      
      console.log(`DEBUG - Date range: ${formatDateId(pastWeekStart)} to ${formatDateId(subDays(today, 1))} (explicitly excluding today ${formatDateId(today)})`);
      
      // Use the default goals if needed
      const defaultGoals = {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fats: 55
      };
      
      // Get all dailyMacros documents from the past week
      const dailyMacrosQuery = query(
        collection(db, `users/${userId}/dailyMacros`),
        where('createdAt', '>=', pastWeekStart.toISOString()),
        where('createdAt', '<', today.toISOString())
      );
      
      const dailyMacrosSnapshot = await getDocs(dailyMacrosQuery);
      const validDocs = dailyMacrosSnapshot.docs;
      
      console.log(`DEBUG - Found ${validDocs.length} dailyMacros documents in date range: ${formatDateId(pastWeekStart)} to ${formatDateId(subDays(today, 1))}`);
      
      // Only process documents with actual nutrition data (at least one meal logged)
      const docsWithData = validDocs.filter(doc => {
        const data = doc.data();
        // Only count days where at least one macro has been recorded
        return (data.calories > 0 || data.protein > 0 || data.carbs > 0 || data.fats > 0);
      });
      
      console.log(`DEBUG - Found ${docsWithData.length} documents with actual nutrition data (at least one meal logged)`);
      
      if (docsWithData.length === 0) {
        console.log("DEBUG - No valid historical nutrition data found for adherence calculation");
        return [];
      }
      
      return docsWithData.map(doc => doc.data());
    } catch (error) {
      console.error("Error fetching nutrition history:", error);
      return [];
    }
  },
  
  // Set up real-time listener for today's nutrition data
  setupTodayNutritionListener(userId: string, dateStr: string) {
    console.log(`DEBUG - Setting up real-time listener for date: ${dateStr} (isToday: true)`);
    
    try {
      const dailyMacrosRef = doc(db, `users/${userId}/dailyMacros/${dateStr}`);
      
      // Set up real-time listener for daily macros
      const unsubscribe = onSnapshot(dailyMacrosRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          console.log(`DEBUG - Real-time update for date: ${dateStr}`, data);
        } else {
          console.log(`DEBUG - No document exists for date: ${dateStr}`);
        }
      });
      
      // Return unsubscribe function for cleanup
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up nutrition listener:", error);
      return () => {};
    }
  }
};

export default nutritionService; 