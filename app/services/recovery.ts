import { 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { format, subDays } from 'date-fns';

// Format date for Firebase collection IDs
const formatDateId = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

const recoveryService = {
  // Initialize all recovery data listeners
  async initializeDataListeners(userId: string) {
    console.log("Initializing recovery data listeners for user:", userId);
    
    try {
      // Get today's date and format it
      const today = new Date();
      const todayStr = formatDateId(today);
      
      // Fetch today's recovery data
      await this.fetchTodayRecoveryData(userId, today);
      
      // Get weekly recovery data
      await this.fetchRecoveryHistory(userId);
      
      // Get recovery plan for today
      await this.fetchRecoveryPlan(userId, todayStr);
      
      // Set up real-time listener for recovery data
      this.setupRecoveryListener(userId, todayStr);
      
      console.log("All recovery data listeners initialized");
      return true;
    } catch (error) {
      console.error("Error initializing recovery data listeners:", error);
      // Still return true to allow the app to proceed
      return true;
    }
  },
  
  // Fetch today's recovery data
  async fetchTodayRecoveryData(userId: string, date: Date) {
    try {
      const dateStr = formatDateId(date);
      const recoveryRef = doc(db, 'users', userId, 'recovery', dateStr);
      
      const docSnap = await getDoc(recoveryRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log(`Recovery data found for ${dateStr}:`, data);
        return data;
      } else {
        console.log(`No recovery data found for ${dateStr}`);
        return null;
      }
    } catch (error) {
      console.error("Error fetching recovery data:", error);
      return null;
    }
  },
  
  // Fetch recovery history for the past week
  async fetchRecoveryHistory(userId: string) {
    try {
      console.log("DEBUG - Fetching historical recovery data for adherence calculation");
      
      // Get the date range for the past week (excluding today)
      const today = new Date();
      const pastWeekStart = subDays(today, 7);
      
      console.log(`DEBUG - Date range: ${formatDateId(pastWeekStart)} to ${formatDateId(subDays(today, 1))} (explicitly excluding today ${formatDateId(today)})`);
      
      // Get all recovery documents from the past week
      const recoveryQuery = query(
        collection(db, `users/${userId}/recovery`),
        where('lastUpdated', '>=', pastWeekStart.toISOString()),
        where('lastUpdated', '<', today.toISOString())
      );
      
      const recoverySnapshot = await getDocs(recoveryQuery);
      const validDocs = recoverySnapshot.docs;
      
      if (validDocs.length === 0) {
        console.log("DEBUG - No valid historical recovery data found for adherence calculation");
        return [];
      }
      
      return validDocs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error fetching recovery history:", error);
      return [];
    }
  },
  
  // Fetch recovery plan for a specific date
  async fetchRecoveryPlan(userId: string, dateStr: string) {
    try {
      const planRef = doc(db, 'users', userId, 'recoveryPlans', dateStr);
      const planSnap = await getDoc(planRef);
      
      if (planSnap.exists()) {
        const planData = planSnap.data();
        console.log(`Loaded saved plan for ${dateStr}:`, planData.plan);
        return planData;
      } else {
        console.log(`No plan exists for ${dateStr}`);
        return null;
      }
    } catch (error) {
      console.error('Error loading recovery plan:', error);
      return null;
    }
  },
  
  // Set up real-time listener for recovery data
  setupRecoveryListener(userId: string, dateStr: string) {
    console.log(`Setting up real-time listener for recovery data on ${dateStr}`);
    
    try {
      const recoveryRef = doc(db, 'users', userId, 'recovery', dateStr);
      
      // Set up real-time listener for recovery data
      const unsubscribe = onSnapshot(recoveryRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          console.log(`Real-time update for recovery data on ${dateStr}:`, data);
        } else {
          console.log(`No recovery data exists for ${dateStr}`);
        }
      });
      
      // Return unsubscribe function for cleanup
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up recovery listener:", error);
      return () => {};
    }
  }
};

export default recoveryService; 