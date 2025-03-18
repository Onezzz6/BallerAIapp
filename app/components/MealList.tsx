import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

type Meal = {
  id: string;
  name: string;
  timestamp: string;
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  items?: any[];
};

type MealListProps = {
  meals: Meal[];
  onMealPress?: (meal: Meal) => void;
};

const MealList = ({ meals, onMealPress }: MealListProps) => {
  if (meals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No meals logged for this day</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={meals}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.mealItem}>
          <View style={styles.mealInfo}>
            <Text style={styles.mealName}>
              {item.items && item.items.length > 0 
                ? item.items.map((food: any, index: number) => (
                    index === item.items!.length - 1 
                      ? food.name 
                      : `${food.name}, `
                  ))
                : 'Unnamed meal'}
            </Text>
          </View>
          <View style={styles.macros}>
            <Text style={styles.calories}>{item.totalMacros.calories} kcal</Text>
          </View>
        </View>
      )}
      style={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    width: '100%',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '500',
  },
  macros: {
    alignItems: 'flex-end',
  },
  calories: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MealList; 