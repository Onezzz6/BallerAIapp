import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { auth, db } from '../../../config/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons'; // Make sure this is imported

const MealLogger: React.FC = () => {
  const [meal, setMeal] = useState({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  const handleLogMeal = async (meal) => {
    try {
      // Get the current user
      const user = auth.currentUser;
      if (!user) {
        console.error("No user is signed in");
        return;
      }

      const userId = user.uid;
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      // First, log the meal to the logged meals collection
      const mealRef = collection(db, 'users', userId, 'loggedMeals');
      await addDoc(mealRef, {
        ...meal,
        timestamp: serverTimestamp(),
        date: today
      });

      // Then, update the nutrition progress for today
      const nutritionProgressRef = doc(db, 'users', userId, 'nutritionProgress', today);
      
      // Get the current progress document if it exists
      const progressSnapshot = await getDoc(nutritionProgressRef);
      
      if (progressSnapshot.exists()) {
        // Update existing progress
        const currentProgress = progressSnapshot.data();
        await updateDoc(nutritionProgressRef, {
          calories: (currentProgress.calories || 0) + (meal.calories || 0),
          protein: (currentProgress.protein || 0) + (meal.protein || 0),
          carbs: (currentProgress.carbs || 0) + (meal.carbs || 0),
          fat: (currentProgress.fat || 0) + (meal.fat || 0),
          lastUpdated: serverTimestamp()
        });
      } else {
        // Create new progress document for today
        await setDoc(nutritionProgressRef, {
          calories: meal.calories || 0,
          protein: meal.protein || 0,
          carbs: meal.carbs || 0,
          fat: meal.fat || 0,
          date: today,
          lastUpdated: serverTimestamp()
        });
      }

      // Show success message using Alert instead of toast
      Alert.alert("Success", "Meal logged successfully.");
      
      // Reset form or close modal if needed
      // ... existing code ...
      
    } catch (error) {
      console.error("Error logging meal:", error);
      Alert.alert("Error", "Failed to log meal. Please try again.");
    }
  };

  return (
    <View>
      <TouchableOpacity style={styles.logMealButton} onPress={handleLogMeal}>
        <Text style={styles.buttonText}>Log Meal</Text>
        <FontAwesome name="plus-circle" size={20} color="#fff" style={styles.icon} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  logMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50', // Green color matching the image
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25, // Rounded corners
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  icon: {
    marginLeft: 4,
  },
});

export default MealLogger; 