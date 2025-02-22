import { View, Text, Pressable, StyleSheet, Image, ScrollView, Modal, TextInput, Button, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, G } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, getDoc, collection, addDoc, deleteDoc, query, orderBy, onSnapshot, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNutrition } from '../context/NutritionContext';
import imageAnalysis from '../services/imageAnalysis';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type MacroGoals = {
  calories: { current: number; goal: number };
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fats: { current: number; goal: number };
};

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';

function calculateDailyCalories(
  weight: number,  // in kg
  height: number,  // in cm
  age: number,
  gender: string,
  activityLevel: ActivityLevel
): number {
  // Harris-Benedict BMR Formula
  let bmr;
  if (gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }

  // Activity Multipliers
  const activityMultipliers = {
    sedentary: 1.2,    // Little or no exercise
    light: 1.375,      // Light exercise/sports 1-3 days/week
    moderate: 1.55,    // Moderate exercise/sports 3-5 days/week
    very: 1.725,       // Hard exercise/sports 6-7 days/week
    extra: 1.9         // Very hard exercise/sports & physical job or training
  };

  return Math.round(bmr * activityMultipliers[activityLevel]);
}

function calculateMacroGoals(dailyCalories: number, goal: string) {
  // Different macro ratios based on goals
  const macroRatios = {
    'maintain': {
      protein: 0.25, // 25% of calories from protein
      fats: 0.25,    // 25% of calories from fat
      carbs: 0.50    // 50% of calories from carbs
    },
    'lose': {
      protein: 0.30, // Higher protein for muscle preservation
      fats: 0.25,
      carbs: 0.45
    },
    'gain': {
      protein: 0.25,
      fats: 0.20,
      carbs: 0.55    // Higher carbs for muscle gain
    }
  };

  const ratios = macroRatios[goal as keyof typeof macroRatios] || macroRatios.maintain;

  return {
    calories: dailyCalories,
    protein: Math.round((dailyCalories * ratios.protein) / 4), // 4 calories per gram of protein
    fats: Math.round((dailyCalories * ratios.fats) / 9),      // 9 calories per gram of fat
    carbs: Math.round((dailyCalories * ratios.carbs) / 4)     // 4 calories per gram of carbs
  };
}

function CircularProgress({ progress }: { progress: number }) {
  const size = 140;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  
  // Calculate the path for a semi-circle starting from left
  const startAngle = -180;
  const endAngle = 0;
  const angleRange = endAngle - startAngle;
  const progressAngle = startAngle + (angleRange * progress);
  
  // Convert angles to radians and calculate coordinates
  const startRad = (startAngle * Math.PI) / 180;
  const progressRad = (progressAngle * Math.PI) / 180;
  
  // Calculate points
  const startX = center + radius * Math.cos(startRad);
  const startY = center + radius * Math.sin(startRad);
  const progressX = center + radius * Math.cos(progressRad);
  const progressY = center + radius * Math.sin(progressRad);
  
  // Create the arc path
  const largeArcFlag = progress > 0.5 ? 1 : 0;
  const arcPath = `
    M ${startX} ${startY}
    A ${radius} ${radius} 0 ${largeArcFlag} 1 ${progressX} ${progressY}
  `;
  
  return (
    <Svg width={size} height={size / 2} style={{ transform: [{ translateY: -35 }] }}>
      {/* Background Arc */}
      <Path
        d={`
          M ${strokeWidth} ${center}
          A ${radius} ${radius} 0 1 1 ${size - strokeWidth} ${center}
        `}
        stroke="#E5E5E5"
        strokeWidth={strokeWidth}
        fill="none"
      />
      
      {/* Progress Arc */}
      <Path
        d={arcPath}
        stroke="#4A72B2"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Progress Indicator */}
      <Circle
        cx={progressX}
        cy={progressY}
        r={8}
        fill="#4A72B2"
      />
    </Svg>
  );
}

function CalorieProgress({ eaten, burned, goal }: { eaten: number; burned: number; goal: number }) {
  const remaining = goal - eaten;
  const progress = Math.min(Math.max(eaten / goal, 0), 1);

  return (
    <View style={styles.calorieCard}>
      <View style={styles.calorieHeader}>
        <Text style={styles.calorieTitle}>Daily Calories</Text>
        <Text style={styles.calorieGoal}>Target: {goal} kcal</Text>
      </View>

      <View style={styles.calorieCircleContainer}>
        <View style={styles.circleProgress}>
          {/* Circular Progress */}
          <View style={styles.progressCircle}>
            <View style={styles.progressBackground}>
              <View style={styles.progressValue}>
                <Text style={styles.progressNumber}>{eaten}</Text>
                <Text style={styles.progressLabel}>consumed</Text>
              </View>
            </View>
            <Svg width={200} height={200} style={StyleSheet.absoluteFill}>
              {/* Background Circle */}
              <Circle
                cx={100}
                cy={100}
                r={80}
                stroke="#E5E5E5"
                strokeWidth={12}
                fill="transparent"
              />
              {/* Progress Circle */}
              <Circle
                cx={100}
                cy={100}
                r={80}
                stroke="#4A72B2"
                strokeWidth={12}
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 80}`}
                strokeDashoffset={2 * Math.PI * 80 * (1 - progress)}
                transform={`rotate(-90 100 100)`}
              />
            </Svg>
          </View>
        </View>

        {/* Stats below circle */}
        <View style={styles.calorieStats}>
          <View style={styles.calorieStat}>
            <Text style={styles.calorieValue}>{remaining}</Text>
            <Text style={styles.calorieLabel}>Remaining</Text>
          </View>

          <View style={styles.calorieDivider} />

          <View style={styles.calorieStat}>
            <Text style={styles.calorieValue}>{goal}</Text>
            <Text style={styles.calorieLabel}>Goal</Text>
          </View>
        </View>
      </View>

      <View style={styles.dateSelector}>
        <Pressable>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </Pressable>
        <View style={styles.dateDisplay}>
          <Ionicons name="calendar-outline" size={20} color="#666666" />
          <Text style={styles.dateText}>Tuesday, Feb 4</Text>
        </View>
        <Pressable>
          <Ionicons name="chevron-forward" size={24} color="#000000" />
        </Pressable>
      </View>
    </View>
  );
}

function MacroProgress({ type, current, goal, color }: {
  type: string;
  current: number;
  goal: number;
  color: string;
}) {
  // Add debug log
  useEffect(() => {
    console.log(`${type} - Current: ${current}, Goal: ${goal}`);
  }, [type, current, goal]);

  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;

  return (
    <View style={styles.macroItem}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroTitle}>{type}</Text>
        <Text style={styles.macroValue}>
          {current}g / {goal || 0}g
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill,
            { 
              backgroundColor: color,
              width: `${progress * 100}%`
            }
          ]} 
        />
      </View>
    </View>
  );
}

function WeeklyAdherence({ percentage }: { percentage: number }) {
  return (
    <View style={styles.adherenceContainer}>
      <View style={styles.adherenceHeader}>
        <Text style={styles.adherenceTitle}>Nutrition Goals</Text>
        <Text style={styles.adherencePercentage}>{percentage} / 100%</Text>
      </View>
      <View style={styles.adherenceBar}>
        <View 
          style={[
            styles.adherenceFill,
            { width: `${percentage}%` }
          ]} 
        />
      </View>
      <Text style={styles.adherenceLabel}>Weekly adherence</Text>
    </View>
  );
}

// Define the FoodItem type
type FoodItem = {
  name: string;
  quantity: string;
  unit: string;
};

type MacroData = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type FoodItemWithMacros = FoodItem & MacroData;

type LogMealModalProps = {
  visible: boolean;
  onClose: () => void;
  onPhotoAnalysis: (imageUri: string) => Promise<void>;
  onLogMeal: (items: any[]) => Promise<void>;
};

function LogMealModal({ visible, onClose, onPhotoAnalysis, onLogMeal }: LogMealModalProps) {
  const [method, setMethod] = useState<'manual' | 'gallery' | 'camera' | null>(null);
  const [manualEntry, setManualEntry] = useState({
    name: '',
    portion: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: ''
  });

  const handleGallerySelect = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        onPhotoAnalysis(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleCameraCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        onPhotoAnalysis(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleMethodSelect = (selectedMethod: 'manual' | 'gallery' | 'camera') => {
    setMethod(selectedMethod);
    if (selectedMethod === 'gallery') {
      handleGallerySelect();
    } else if (selectedMethod === 'camera') {
      handleCameraCapture();
    }
  };

  const handleManualSubmit = async () => {
    try {
      const mealItem = {
        name: manualEntry.name,
        portion: manualEntry.portion || '1 serving',
        macros: {
          calories: parseInt(manualEntry.calories) || 0,
          protein: parseInt(manualEntry.protein) || 0,
          carbs: parseInt(manualEntry.carbs) || 0,
          fats: parseInt(manualEntry.fats) || 0
        }
      };

      await onLogMeal([mealItem]);
      setManualEntry({ name: '', portion: '', calories: '', protein: '', carbs: '', fats: '' });
      setMethod(null);
      onClose();
      Alert.alert('Success', 'Meal logged successfully!');
    } catch (error) {
      console.error('Error logging manual meal:', error);
      Alert.alert('Error', 'Failed to log meal. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Meal</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#000000" />
            </Pressable>
          </View>

          {method === 'manual' ? (
            <ScrollView style={styles.manualForm}>
              <TextInput
                style={styles.input}
                placeholder="Food name"
                value={manualEntry.name}
                onChangeText={(text) => setManualEntry(prev => ({ ...prev, name: text }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Portion (e.g., 1 cup)"
                value={manualEntry.portion}
                onChangeText={(text) => setManualEntry(prev => ({ ...prev, portion: text }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Calories"
                keyboardType="numeric"
                value={manualEntry.calories}
                onChangeText={(text) => setManualEntry(prev => ({ ...prev, calories: text }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Protein (g)"
                keyboardType="numeric"
                value={manualEntry.protein}
                onChangeText={(text) => setManualEntry(prev => ({ ...prev, protein: text }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Carbs (g)"
                keyboardType="numeric"
                value={manualEntry.carbs}
                onChangeText={(text) => setManualEntry(prev => ({ ...prev, carbs: text }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Fats (g)"
                keyboardType="numeric"
                value={manualEntry.fats}
                onChangeText={(text) => setManualEntry(prev => ({ ...prev, fats: text }))}
              />
              <Button
                title="Log Meal"
                onPress={handleManualSubmit}
                style={{ marginTop: 16 }}
              />
            </ScrollView>
          ) : (
            <View style={styles.methodSelection}>
              <Pressable
                style={styles.methodButton}
                onPress={() => handleMethodSelect('manual')}
              >
                <Ionicons name="create-outline" size={32} color="#000000" />
                <Text style={styles.methodButtonText}>Log{'\n'}Manually</Text>
              </Pressable>

              <Pressable
                style={styles.methodButton}
                onPress={() => handleMethodSelect('gallery')}
              >
                <Ionicons name="images-outline" size={32} color="#000000" />
                <Text style={styles.methodButtonText}>Pick from{'\n'}Gallery</Text>
              </Pressable>

              <Pressable
                style={styles.methodButton}
                onPress={() => handleMethodSelect('camera')}
              >
                <Ionicons name="camera-outline" size={32} color="#000000" />
                <Text style={styles.methodButtonText}>Take{'\n'}Photo</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function LoggedMeals({ meals, onDelete }: { meals: any[]; onDelete: (mealId: string, mealMacros: any) => Promise<void> }) {
  return (
    <View style={styles.loggedMealsContainer}>
      <Text style={styles.loggedMealsTitle}>Recent Meals</Text>
      {meals.map((meal) => (
        <View key={meal.id} style={styles.mealItem}>
          <View style={styles.mealInfo}>
            <Text style={styles.mealName}>{meal.items[0].name}</Text>
            <Text style={styles.mealTime}>
              {format(new Date(meal.timestamp), 'h:mm a')}
            </Text>
          </View>
          <View style={styles.mealMacros}>
            <Text style={styles.mealCalories}>{meal.totalMacros.calories} kcal</Text>
            <View style={styles.macroDetails}>
              <Text style={styles.macroDetail}>P: {meal.totalMacros.protein}g</Text>
              <Text style={styles.macroDetail}>C: {meal.totalMacros.carbs}g</Text>
              <Text style={styles.macroDetail}>F: {meal.totalMacros.fats}g</Text>
            </View>
          </View>
          <Pressable
            style={styles.deleteButton}
            onPress={() => onDelete(meal.id, meal.totalMacros)}
          >
            <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

type LabelAnnotation = {
  description: string;
  mid: string;
  score: number;
  topicality: number;
};

function getLocalStartOfDay(date: Date = new Date()) {
  const local = new Date(date);
  local.setHours(0, 0, 0, 0);
  return local;
}

function getLocalEndOfDay(date: Date = new Date()) {
  const local = new Date(date);
  local.setHours(23, 59, 59, 999);
  return local;
}

function formatDateId(date: Date) {
  return date.toISOString().split('T')[0];
}

type DailyMacros = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  date: string;
  dayOfWeek: number;
};

const SELECTED_GREEN = '#99E86C';  // New green color

function WeekOverview({ 
  selectedDate, 
  onSelectDate, 
  weeklyData 
}: { 
  selectedDate: Date; 
  onSelectDate: (date: Date) => void;
  weeklyData: DailyMacros[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sort the weeklyData to ensure Sunday-Saturday order
  const sortedWeekData = [...weeklyData].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getDay() - dateB.getDay();  // Sunday (0) to Saturday (6)
  });

  const days = sortedWeekData.map((day, index) => {
    const date = new Date(day.date);
    const isSelected = formatDateId(date) === formatDateId(selectedDate);
    const isToday = formatDateId(date) === formatDateId(today);
    const isFuture = date > today;

    return (
      <Pressable
        key={day.date}
        style={[
          styles.dayButton,
          isSelected && styles.selectedDay,
          isToday && styles.todayDay,
          isFuture && styles.futureDay
        ]}
        onPress={() => !isFuture && onSelectDate(date)}
        disabled={isFuture}
      >
        {isToday && <View style={styles.todayIndicator} />}
        <Text style={[
          styles.dayName,
          isSelected && styles.selectedText,
          isToday && styles.todayText,
          isFuture && styles.futureText
        ]}>
          {format(date, 'EEE')}
        </Text>
        <Text style={[
          styles.dayDate,
          isSelected && styles.selectedText,
          isToday && styles.todayText,
          isFuture && styles.futureText
        ]}>
          {format(date, 'd')}
        </Text>
        <View style={styles.macroSummary}>
          <Text style={[
            styles.macroValue,
            isSelected && styles.selectedText,
            isToday && styles.todayText,
            isFuture && styles.futureText
          ]}>
            {Math.round(day.calories)}
          </Text>
          <Text style={[
            styles.macroLabel,
            isSelected && styles.selectedText,
            isToday && styles.todayText,
            isFuture && styles.futureText
          ]}>
            kcal
          </Text>
        </View>
      </Pressable>
    );
  });

  return (
    <View style={styles.weekContainer}>
      <Text style={styles.weekTitle}>
        Week of {format(new Date(weeklyData[0].date), 'MMM d')}
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.daysScroll}
      >
        <View style={styles.daysContainer}>
          {days}
        </View>
      </ScrollView>
    </View>
  );
}

// Move styles outside the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  calorieCard: {
    backgroundColor: '#EEF3FB',
    margin: 24,
    borderRadius: 24,
    padding: 24,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  calorieTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  calorieGoal: {
    fontSize: 16,
    color: '#4A72B2',
    fontWeight: '500',
  },
  calorieCircleContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  circleProgress: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  progressCircle: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  progressBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressValue: {
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000000',
  },
  progressLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  calorieStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  calorieStat: {
    alignItems: 'center',
  },
  calorieValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  calorieLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  calorieDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  macrosCard: {
    backgroundColor: '#FFFFFF',
    margin: 24,
    marginTop: 0,
    borderRadius: 24,
    padding: 24,
    gap: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  macroItem: {
    gap: 8,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  macroValue: {
    fontSize: 14,
    color: '#666666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  adherenceContainer: {
    gap: 8,
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adherenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  adherencePercentage: {
    fontSize: 14,
    color: '#666666',
  },
  adherenceBar: {
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  adherenceFill: {
    height: '100%',
    backgroundColor: '#99E86C',
    borderRadius: 4,
  },
  adherenceLabel: {
    fontSize: 14,
    color: '#666666',
    alignSelf: 'flex-end',
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  statsButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  mealsSection: {
    padding: 24,
    paddingTop: 0,
  },
  mealsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mealsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  seeMoreText: {
    fontSize: 16,
    color: '#4A72B2',
  },
  logMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A72B2',
    padding: 16,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  logMealButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  methodSelection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    gap: 8,
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
  },
  manualForm: {
    gap: 16,
    paddingBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#4A72B2',
  },
  photoAnalysis: {
    alignItems: 'center',
    padding: 24,
  },
  modalScroll: {
    maxHeight: '80%',
  },
  loggedMealsContainer: {
    marginTop: 16,
    paddingHorizontal: 24,
  },
  loggedMealsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 14,
    color: '#666666',
  },
  mealMacros: {
    alignItems: 'flex-end',
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  macroDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  macroDetail: {
    fontSize: 14,
    color: '#666666',
  },
  loggingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  loggingOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
  },
  weekContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  daysScroll: {
    marginHorizontal: -16,
  },
  daysContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  dayButton: {
    alignItems: 'center',
    padding: 12,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    minWidth: 80,
    position: 'relative',
  },
  selectedDay: {
    backgroundColor: SELECTED_GREEN,
  },
  todayDay: {
    borderWidth: 2,
    borderColor: '#4A72B2',
  },
  todayIndicator: {
    position: 'absolute',
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A72B2',
    alignSelf: 'center',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  todayText: {
    color: '#4A72B2',
    fontWeight: '700',
  },
  futureDay: {
    opacity: 0.5,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  macroSummary: {
    alignItems: 'center',
  },
  futureWarning: {
    color: '#FF6B6B',
    textAlign: 'center',
    padding: 8,
    backgroundColor: '#FFE5E5',
    marginHorizontal: 16,
    borderRadius: 8,
  },
  topStats: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  dateHeader: {
    marginBottom: 16,
  },
  currentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  macroCircles: {
    // Placeholder for macro circles
  },
  dayContent: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  dailySummary: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  selectedDayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  noMealsText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
    paddingVertical: 24,
  },
  logMealButtonContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
});

export default function NutritionScreen() {
  const { macros, updateMacros } = useNutrition();
  const [loggedMeals, setLoggedMeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const [isLogMealModalVisible, setIsLogMealModalVisible] = useState(false);
  const [selectedLoggingMethod, setSelectedLoggingMethod] = useState<'manual' | 'photo' | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weeklyData, setWeeklyData] = useState<DailyMacros[]>([]);
  const [isLoadingWeek, setIsLoadingWeek] = useState(true);

  // Move canLogMeal to component scope
  const canLogMeal = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected <= today;
  }, [selectedDate]);

  // Load selected day's macros and meals
  useEffect(() => {
    if (!user) return;

    const loadSelectedDayData = async () => {
      try {
        setIsLoading(true);
        const dateString = formatDateId(selectedDate);
        
        // Load macros for selected date
        const dailyMacrosRef = doc(db, `users/${user.uid}/dailyMacros/${dateString}`);
        const dailyMacrosDoc = await getDoc(dailyMacrosRef);
        
        // Get the goals (these stay constant)
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const dailyCalories = calculateDailyCalories(
          parseFloat(userData.weight),
          parseFloat(userData.height),
          parseInt(userData.age),
          userData.gender.toLowerCase(),
          userData.activityLevel as ActivityLevel
        );
        const goals = calculateMacroGoals(dailyCalories, userData.footballGoal);

        // Update macros with selected day's progress
        updateMacros({
          calories: { 
            current: dailyMacrosDoc.exists() ? dailyMacrosDoc.data().calories : 0, 
            goal: goals.calories 
          },
          protein: { 
            current: dailyMacrosDoc.exists() ? dailyMacrosDoc.data().protein : 0, 
            goal: goals.protein 
          },
          carbs: { 
            current: dailyMacrosDoc.exists() ? dailyMacrosDoc.data().carbs : 0, 
            goal: goals.carbs 
          },
          fats: { 
            current: dailyMacrosDoc.exists() ? dailyMacrosDoc.data().fats : 0, 
            goal: goals.fats 
          }
        });

        // Load meals for selected date
        const startOfDay = getLocalStartOfDay(selectedDate);
        const endOfDay = getLocalEndOfDay(selectedDate);

        const q = query(
          collection(db, 'meals'),
          where('userId', '==', user.uid),
          where('timestamp', '>=', startOfDay.toISOString()),
          where('timestamp', '<=', endOfDay.toISOString()),
          orderBy('timestamp', 'desc')
        );

        const mealsSnapshot = await getDocs(q);
        const meals = mealsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setLoggedMeals(meals);
      } catch (error) {
        console.error('Error loading selected day data:', error);
        setLoggedMeals([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSelectedDayData();
  }, [user, selectedDate]); // Reload when selected date changes

  // Update the logMealToFirestore function to use selectedDate
  const logMealToFirestore = async (items: any[]) => {
    if (!user) {
      throw new Error('Must be logged in to log meals');
    }

    if (!canLogMeal()) {
      throw new Error('Cannot log meals for future dates');
    }

    try {
      const totalMacros = items.reduce((acc: any, item: any) => ({
        calories: acc.calories + item.macros.calories,
        protein: acc.protein + item.macros.protein,
        carbs: acc.carbs + item.macros.carbs,
        fats: acc.fats + item.macros.fats
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

      // Use selected date for the meal timestamp
      const mealDate = new Date(selectedDate);
      mealDate.setHours(new Date().getHours());
      mealDate.setMinutes(new Date().getMinutes());

      const mealData = {
        userId: user.uid,
        timestamp: mealDate.toISOString(),
        items,
        totalMacros
      };

      await addDoc(collection(db, 'meals'), mealData);

      // Update daily macros for selected date
      const dateString = formatDateId(selectedDate);
      const dailyMacrosRef = doc(db, `users/${user.uid}/dailyMacros/${dateString}`);
      const dailyMacrosDoc = await getDoc(dailyMacrosRef);

      if (dailyMacrosDoc.exists()) {
        const currentMacros = dailyMacrosDoc.data();
        await setDoc(dailyMacrosRef, {
          calories: currentMacros.calories + totalMacros.calories,
          protein: currentMacros.protein + totalMacros.protein,
          carbs: currentMacros.carbs + totalMacros.carbs,
          fats: currentMacros.fats + totalMacros.fats,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        await setDoc(dailyMacrosRef, {
          calories: totalMacros.calories,
          protein: totalMacros.protein,
          carbs: totalMacros.carbs,
          fats: totalMacros.fats,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      // Update local state
      updateMacros({
        calories: { current: macros.calories.current + totalMacros.calories, goal: macros.calories.goal },
        protein: { current: macros.protein.current + totalMacros.protein, goal: macros.protein.goal },
        carbs: { current: macros.carbs.current + totalMacros.carbs, goal: macros.carbs.goal },
        fats: { current: macros.fats.current + totalMacros.fats, goal: macros.fats.goal }
      });

      console.log('Meal logged successfully:', mealData);
    } catch (error) {
      console.error('Error logging meal:', error);
      throw error;
    }
  };

  // Update weekly data fetching
  useEffect(() => {
    if (!user) return;

    const fetchWeeklyData = async () => {
      try {
        setIsLoadingWeek(true);
        const today = new Date();
        
        // Get the start of the week (Sunday)
        const startOfWeek = new Date(today);
        if (today.getDay() !== 0) { // 0 is Sunday
          startOfWeek.setDate(today.getDate() - today.getDay());
        }
        startOfWeek.setHours(0, 0, 0, 0);

        const weekData: DailyMacros[] = [];
        
        // Get 7 days starting from Sunday
        for (let i = 0; i < 7; i++) {
          const currentDate = new Date(startOfWeek);
          currentDate.setDate(startOfWeek.getDate() + i);
          const dateId = formatDateId(currentDate);
          
          const dailyMacrosRef = doc(db, `users/${user.uid}/dailyMacros/${dateId}`);
          const dailyMacrosDoc = await getDoc(dailyMacrosRef);
          
          weekData.push({
            calories: dailyMacrosDoc.exists() ? dailyMacrosDoc.data().calories : 0,
            protein: dailyMacrosDoc.exists() ? dailyMacrosDoc.data().protein : 0,
            carbs: dailyMacrosDoc.exists() ? dailyMacrosDoc.data().carbs : 0,
            fats: dailyMacrosDoc.exists() ? dailyMacrosDoc.data().fats : 0,
            date: dateId,
            dayOfWeek: i  // Add this to ensure correct sorting
          });
        }
        
        setWeeklyData(weekData);
      } catch (error) {
        console.error('Error fetching weekly data:', error);
        // Initialize with empty data on error
        const today = new Date();
        const startOfWeek = new Date(today);
        if (today.getDay() !== 0) {
          startOfWeek.setDate(today.getDate() - today.getDay());
        }
        startOfWeek.setHours(0, 0, 0, 0);
        
        setWeeklyData(Array(7).fill(null).map((_, i) => {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          return {
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
            date: formatDateId(date),
            dayOfWeek: i
          };
        }));
      } finally {
        setIsLoadingWeek(false);
      }
    };

    fetchWeeklyData();
  }, [user, selectedDate]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={{
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
      }}>
        {/* BallerAI Logo and Text */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: 8,
          marginBottom: 16,
        }}>
          <Image 
            source={require('../../assets/images/BallerAILogo.png')}
            style={{ width: 32, height: 32 }}
            resizeMode="contain"
          />
          <Text style={{ 
            fontSize: 24, 
            fontWeight: '600', 
            color: '#000000' 
          }}>
            BallerAI
          </Text>
        </View>

        {/* Centered Nutrition Title */}
        <Text style={{
          fontSize: 32,
          fontWeight: '700',
          color: '#000000',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          Nutrition
        </Text>
      </View>

      {/* Add Week Overview here */}
      {isLoadingWeek ? (
        <View style={styles.weekContainer}>
          <ActivityIndicator size="large" color="#4A72B2" />
        </View>
      ) : (
        <WeekOverview
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          weeklyData={weeklyData}
        />
      )}

      <ScrollView>
        <View style={styles.calorieCard}>
          <CalorieProgress 
            eaten={macros.calories.current}
            burned={0}
            goal={macros.calories.goal}
          />
        </View>

        <View style={styles.macrosCard}>
          <MacroProgress
            type="Protein"
            current={macros.protein.current}
            goal={macros.protein.goal}
            color="#FF6B6B"
          />
          <MacroProgress
            type="Carbs"
            current={macros.carbs.current}
            goal={macros.carbs.goal}
            color="#4ECDC4"
          />
          <MacroProgress
            type="Fats"
            current={macros.fats.current}
            goal={macros.fats.goal}
            color="#FFD93D"
          />
          
          <WeeklyAdherence percentage={60} />
        </View>

        <View style={styles.mealsSection}>
          <Pressable
            style={styles.logMealButton}
            onPress={() => setIsLogMealModalVisible(true)}
          >
            <Text style={styles.logMealText}>Log Meal</Text>
            <View style={styles.logMealIcon}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>

        <LoggedMeals meals={loggedMeals} onDelete={logMealToFirestore} />
      </ScrollView>

      <LogMealModal
        visible={isLogMealModalVisible}
        onClose={() => setIsLogMealModalVisible(false)}
        onPhotoAnalysis={logMealToFirestore}
        onLogMeal={logMealToFirestore}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4A72B2" />
          <Text style={styles.loadingText}>Analyzing image...</Text>
        </View>
      )}
    </SafeAreaView>
  );
} 