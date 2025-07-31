import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { auth, db } from '../../../config/firebase';
import firestore from '@react-native-firebase/firestore';

const NutritionProgress = ({ selectedDate }: any) => {
  const [nutritionData, setNutritionData] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // This function fetches nutrition data for the selected date
  const fetchNutritionData = async (date: any) => {
    try {
      setIsLoading(true);
      const user = auth().currentUser;
      
      if (!user) {
        console.error("No user is signed in");
        return;
      }
      
      const userId = user.uid;
      const formattedDate = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      console.log("Fetching nutrition data for date:", formattedDate);
      
      // Method 1: Try to get the nutrition progress document directly
      const nutritionProgressRef = db.collection('users').doc(userId).collection('nutritionProgress').doc(formattedDate);
      const progressSnapshot = await nutritionProgressRef.get();
      
      let dataFound = false;
      
      if (progressSnapshot.exists) {
        // Document exists - use the stored progress data
        const progressData = progressSnapshot.data();
        console.log("Found progress document:", progressData);
        
        setNutritionData({
          calories: progressData.calories || 0,
          protein: progressData.protein || 0,
          carbs: progressData.carbs || 0,
          fat: progressData.fat || 0
        });
        dataFound = true;
      }
      
      // Always calculate from logged meals as a backup or to verify
      const mealsRef = db.collection('users').doc(userId).collection('loggedMeals');
      const mealsQuery = mealsRef.where('date', '==', formattedDate);
      const mealsSnapshot = await mealsQuery.get();
      
      // Log the number of meals found for debugging
      console.log(`Found ${mealsSnapshot.size} meals for date: ${formattedDate}`);
      
      if (mealsSnapshot.size > 0) {
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        
        mealsSnapshot.forEach((mealDoc: any) => {
          const mealData = mealDoc.data();
          console.log("Meal data:", mealData);
          
          // Use Number() to ensure we're dealing with numbers
          totalCalories += Number(mealData.calories) || 0;
          totalProtein += Number(mealData.protein) || 0;
          totalCarbs += Number(mealData.carbs) || 0;
          totalFat += Number(mealData.fat) || 0;
        });
        
        console.log("Calculated totals:", {
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat
        });
        
        // If we didn't find a progress document or the calculated values are different,
        // update with the calculated values
        if (!dataFound || 
            totalCalories !== nutritionData.calories || 
            totalProtein !== nutritionData.protein || 
            totalCarbs !== nutritionData.carbs || 
            totalFat !== nutritionData.fat) {
          
          setNutritionData({
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat
          });
          
          // Also update the progress document to ensure it's in sync
          await nutritionProgressRef.set({
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
            date: formattedDate,
            lastUpdated: firestore.Timestamp.now()
          });
          
          console.log("Updated nutrition progress document with calculated values");
        }
      }
    } catch (error) {
      console.error("Error fetching nutrition data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Run the fetch function whenever the selected date changes
  useEffect(() => {
    if (selectedDate) {
      fetchNutritionData(selectedDate);
    }
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <Text>Loading nutrition data...</Text>
      ) : (
        <>
          <Text style={styles.heading}>Nutrition Progress</Text>
          <View style={styles.progressRow}>
            <Text style={styles.label}>Calories:</Text>
            <Text style={styles.value}>{nutritionData.calories} kcal</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.label}>Protein:</Text>
            <Text style={styles.value}>{nutritionData.protein} g</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.label}>Carbs:</Text>
            <Text style={styles.value}>{nutritionData.carbs} g</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.label}>Fat:</Text>
            <Text style={styles.value}>{nutritionData.fat} g</Text>
          </View>
        </>
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
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default NutritionProgress; 