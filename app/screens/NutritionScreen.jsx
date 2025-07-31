import { calculateNutritionGoals } from '../../utils/nutritionCalculator';
import { useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';

const NutritionScreen = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [calorieGoal, setCalorieGoal] = useState(null);
  const [macros, setMacros] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const currentUser = auth().currentUser;
        const userId = currentUser?.uid;
        
        if (!userId) {
          setLoading(false);
          return;
        }
        
        const db = database();
        const userRef = db.ref(`users/${userId}`);
        
        userRef.on('value', (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setUserData(data);
            
            // Calculate nutrition goals using the shared utility function
            const { calorieGoal, macros } = calculateNutritionGoals(data);
            
            setCalorieGoal(calorieGoal);
            setMacros(macros);
            
            // Get today's tracked nutrition if available
            // ... existing code for fetching today's tracked nutrition ...
          }
          setLoading(false);
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default NutritionScreen; 