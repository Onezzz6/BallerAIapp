import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { collection, getDocs, addDoc, query, orderBy, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

type TrainingPlan = {
  id: string;
  name: string;
  createdAt: Date;
  schedule: {
    [key: string]: string;
  };
};

type TrainingContextType = {
  plans: TrainingPlan[];
  setPlans: (plans: TrainingPlan[]) => void;
  addPlan: (plan: Omit<TrainingPlan, 'id'>) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  loading: boolean;
};

const TrainingContext = createContext<TrainingContextType>({
  plans: [],
  setPlans: () => {},
  addPlan: async () => {},
  deletePlan: async () => {},
  loading: false,
});

function TrainingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPlans();
    }
  }, [user]);

  const loadPlans = async () => {
    if (!user) return;
    
    try {
      const plansRef = collection(db, 'users', user.uid, 'trainingPlans');
      const q = query(plansRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const loadedPlans = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          schedule: data.schedule,
          createdAt: data.createdAt instanceof Timestamp ? 
            data.createdAt.toDate() : 
            new Date(data.createdAt)
        };
      }) as TrainingPlan[];
      
      setPlans(loadedPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPlan = async (plan: Omit<TrainingPlan, 'id'>) => {
    if (!user) return;
    
    try {
      const plansRef = collection(db, 'users', user.uid, 'trainingPlans');
      await addDoc(plansRef, {
        ...plan,
        createdAt: Timestamp.fromDate(plan.createdAt)
      });
      await loadPlans();
    } catch (error) {
      console.error('Error adding plan:', error);
      throw error;
    }
  };

  const deletePlan = async (planId: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'trainingPlans', planId));
      await loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      throw error;
    }
  };

  return (
    <TrainingContext.Provider value={{ plans, setPlans, addPlan, deletePlan, loading }}>
      {children}
    </TrainingContext.Provider>
  );
}

export { TrainingProvider };
export const useTraining = () => useContext(TrainingContext);
export default TrainingProvider; 