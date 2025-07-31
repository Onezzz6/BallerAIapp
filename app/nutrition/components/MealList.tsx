import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { auth, db } from '../../../config/firebase';
import firestore from '@react-native-firebase/firestore';

// If you're using any additional imports, keep them here

const MealList = ({ selectedDate, refreshTrigger, onDataChange }: any) => {
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch meals for the selected date
  const fetchMeals = async () => {
    try {
      setLoading(true);
      const user = auth().currentUser;
      
      if (!user) {
        console.error("No user is signed in");
        return;
      }
      
      const userId = user.uid;
      const formattedDate = selectedDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      const mealsRef = db.collection('users').doc(userId).collection('loggedMeals');
      const q = mealsRef
        .where('date', '==', formattedDate)
        .orderBy('timestamp', 'desc');
      
      const querySnapshot = await q.get();
      const fetchedMeals: any[] = [];
      
      querySnapshot.forEach((doc) => {
        fetchedMeals.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setMeals(fetchedMeals);
      
      // Notify parent component if needed
      if (onDataChange) {
        onDataChange(fetchedMeals);
      }
    } catch (error) {
      console.error("Error fetching meals:", error);
      Alert.alert("Error", "Failed to load meals. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Function to update nutrition progress after meal deletion
  const updateNutritionProgress = async (formattedDate: any, mealData: any) => {
    try {
      const user = auth().currentUser;
      if (!user) return;
      
      const userId = user.uid;
      const nutritionProgressRef = db.collection('users').doc(userId).collection('nutritionProgress').doc(formattedDate);
      const progressSnapshot = await nutritionProgressRef.get();
      
      if (progressSnapshot.exists) {
        const progressData = progressSnapshot.data();
        
        // Subtract the deleted meal's nutrients from the progress
        await nutritionProgressRef.update({
          calories: Math.max(0, (progressData.calories || 0) - (mealData.calories || 0)),
          protein: Math.max(0, (progressData.protein || 0) - (mealData.protein || 0)),
          carbs: Math.max(0, (progressData.carbs || 0) - (mealData.carbs || 0)),
          fat: Math.max(0, (progressData.fat || 0) - (mealData.fat || 0))
        });
        
        console.log("Updated nutrition progress after meal deletion");
      }
    } catch (error) {
      console.error("Error updating nutrition progress:", error);
    }
  };

  // Function to delete a meal
  const deleteMeal = async (mealId: any) => {
    try {
      const user = auth().currentUser;
      if (!user) return;
      
      const userId = user.uid;
      
      // Get the meal data before deleting it (to update nutrition progress)
      const mealRef = db.collection('users').doc(userId).collection('loggedMeals').doc(mealId);
      const mealSnapshot = await mealRef.get();
      
      if (mealSnapshot.exists) {
        const mealData = mealSnapshot.data();
        const formattedDate = selectedDate.toISOString().split('T')[0];
        
        // Delete the meal
        await mealRef.delete();
        
        // Update the nutrition progress to reflect the deleted meal
        await updateNutritionProgress(formattedDate, mealData);
        
        // Update the UI
        setMeals(meals.filter((meal: any) => meal.id !== mealId));
        
        // Trigger a refresh of other components if needed
        if (onDataChange) {
          onDataChange(meals.filter((meal: any) => meal.id !== mealId));
        }
        
        Alert.alert("Success", "Meal deleted successfully.");
      }
    } catch (error) {
      console.error("Error deleting meal:", error);
      Alert.alert("Error", "Failed to delete meal. Please try again.");
    }
  };

  // Confirm deletion dialog
  const confirmDelete = (mealId: any, mealName: any) => {
    Alert.alert(
      "Delete Meal",
      `Are you sure you want to delete ${mealName || 'this meal'}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          onPress: () => deleteMeal(mealId),
          style: "destructive" 
        }
      ]
    );
  };

  // Fetch meals when the selected date changes or when refreshTrigger changes
  useEffect(() => {
    if (selectedDate) {
      fetchMeals();
    }
  }, [selectedDate, refreshTrigger]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Logged Meals</Text>
      
      {loading ? (
        <Text>Loading meals...</Text>
      ) : meals.length === 0 ? (
        <Text>No meals logged for this day</Text>
      ) : (
        meals.map((meal: any) => (
          <View key={meal.id} style={styles.mealItem}>
            <View style={styles.mealInfo}>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Text>{meal.calories} kcal | P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fat}g</Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmDelete(meal.id, meal.name)}
              style={styles.deleteButton}
            >
              <FontAwesome name="trash" size={20} color="red" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  deleteButton: {
    padding: 8,
  },
});

export default MealList; 