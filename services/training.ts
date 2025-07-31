import firestore from '@react-native-firebase/firestore';
import { db } from '../config/firebase';
import { format, subDays } from 'date-fns';

// Format date for Firebase collection IDs
const formatDateId = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

const trainingService = {
  // Initialize all training data listeners
  async initializeDataListeners(userId: string) {
    console.log("Initializing training data listeners for user:", userId);
    
    try {
      // Get today's date and format it
      const today = new Date();
      const todayStr = formatDateId(today);
      
      try {
        // Fetch upcoming training sessions
        await this.fetchUpcomingTrainingSessions(userId);
      } catch (error) {
        console.warn("Error fetching upcoming training sessions:", error);
        // Continue despite error
      }
      
      try {
        // Fetch training history
        await this.fetchTrainingHistory(userId);
      } catch (error) {
        console.warn("Error fetching training history:", error);
        // Continue despite error
      }
      
      try {
        // Fetch todays' training session
        await this.fetchTodayTrainingSession(userId, today);
      } catch (error) {
        console.warn("Error fetching today's training session:", error);
        // Continue despite error
      }
      
      try {
        // Set up real-time listener for today's training
        this.setupTrainingListener(userId, todayStr);
      } catch (error) {
        console.warn("Error setting up training listener:", error);
        // Continue despite error
      }
      
      console.log("All training data listeners initialized");
      return true;
    } catch (error) {
      console.error("Error initializing training data listeners:", error);
      // Still return true to allow the app to proceed
      return true;
    }
  },
  
  // Fetch upcoming training sessions
  async fetchUpcomingTrainingSessions(userId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Query for sessions starting from today and in the future
      const sessionsSnapshot = await db
        .collection('trainingSessions')
        .where('userId', '==', userId)
        .where('scheduledDate', '>=', today.toISOString())
        .orderBy('scheduledDate', 'asc')
        .get();
      
      const sessions = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Fetched ${sessions.length} upcoming training sessions`);
      return sessions;
    } catch (error) {
      console.error("Error fetching upcoming training sessions:", error);
      return [];
    }
  },
  
  // Fetch training history
  async fetchTrainingHistory(userId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const pastDays = subDays(today, 30); // Past 30 days
      
      // Query for completed sessions in the past 30 days
      const sessionsSnapshot = await db
        .collection('trainingSessions')
        .where('userId', '==', userId)
        .where('completed', '==', true)
        .where('scheduledDate', '>=', pastDays.toISOString())
        .where('scheduledDate', '<', today.toISOString())
        .orderBy('scheduledDate', 'desc')
        .get();
      
      const sessions = sessionsSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Fetched ${sessions.length} past training sessions`);
      return sessions;
    } catch (error) {
      console.error("Error fetching training history:", error);
      return [];
    }
  },
  
  // Fetch today's training session
  async fetchTodayTrainingSession(userId: string, date: Date) {
    try {
      const dateStr = formatDateId(date);
      
      // Query for session scheduled for today
      const sessionQuery = db.collection('trainingSessions')
        .where('userId', '==', userId)
        .where('dateId', '==', dateStr);
      
      const sessionSnapshot = await sessionQuery.get();
      
      if (sessionSnapshot.empty) {
        console.log(`No training session found for ${dateStr}`);
        return null;
      }
      
      // Should only be one session per day
      const sessionDoc = sessionSnapshot.docs[0];
      const session = {
        id: sessionDoc.id,
        ...sessionDoc.data()
      };
      
      console.log(`Found training session for ${dateStr}:`, session);
      return session;
    } catch (error) {
      console.error("Error fetching today's training session:", error);
      return null;
    }
  },
  
  // Set up real-time listener for training data
  setupTrainingListener(userId: string, dateStr: string) {
    console.log(`Setting up real-time listener for training data on ${dateStr}`);
    
    try {
      // Query for session on specific date
      const sessionQuery = db.collection('trainingSessions')
        .where('userId', '==', userId)
        .where('dateId', '==', dateStr);
      
      // Set up real-time listener for training session
      const unsubscribe = sessionQuery.onSnapshot((querySnapshot) => {
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          console.log(`Real-time update for training session on ${dateStr}:`, data);
        } else {
          console.log(`No training session exists for ${dateStr}`);
        }
      });
      
      // Return unsubscribe function for cleanup
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up training listener:", error);
      return () => {};
    }
  }
};

export default trainingService; 