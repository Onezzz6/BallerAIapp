import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Modal, Alert, ActivityIndicator, Pressable, useWindowDimensions, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, Link } from 'expo-router';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { format, subDays, addDays, subMonths, getDay, parseISO, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { Calendar } from 'react-native-calendars';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, getDoc, getDocs, addDoc, deleteDoc, query, where, orderBy, setDoc, updateDoc, Timestamp, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useNutrition } from '../context/NutritionContext';
import { useNutritionDate } from './_layout';
import Animated, { FadeIn, FadeInDown, PinwheelIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import CustomButton from '../components/CustomButton';
import { calculateNutritionGoals } from '../utils/nutritionCalculations';
import * as imageAnalysis from '../services/imageAnalysis';
import WeeklyOverview from '../components/WeeklyOverview';
import analytics from '@react-native-firebase/analytics';

// Type definition for food analysis result
type FoodAnalysisResult = {
  items: Array<{
    name: string;
    portion: string;
    macros: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    }
  }>;
  combinedName?: string;
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }
};

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
  // Ensure remaining never goes below 0
  const remaining = Math.max(goal - eaten, 0);
  // Progress is already capped at 1 (100%)
  const progress = Math.min(Math.max(eaten / goal, 0), 1);

  return (
    <View style={styles.calorieCard}>
      <View style={styles.calorieHeader}>
        <Text style={styles.calorieTitle}>Daily Calories</Text>
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
                stroke="#FFFFFF"
                strokeWidth={12}
                fill="transparent"
              />
              {/* Progress Circle */}
              <Circle
                cx={100}
                cy={100}
                r={80}
                stroke="#4064F6"
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
  isPhotoAnalysisDisabled: boolean;
  dailyAnalysisCount: number;
  dailyAnalysisLimit: number;
  timeUntilReset: string;
};

function LogMealModal({ visible, onClose, onPhotoAnalysis, onLogMeal, isPhotoAnalysisDisabled, dailyAnalysisCount, dailyAnalysisLimit, timeUntilReset }: LogMealModalProps) {
  const [method, setMethod] = useState<'manual' | 'gallery' | 'camera' | null>(null);
  const [manualEntry, setManualEntry] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: ''
  });
  const [isLogging, setIsLogging] = useState(false);

  // Reset method when modal becomes visible
  useEffect(() => {
    if (visible) {
      setMethod(null);
      setManualEntry({
        name: '',
        calories: '',
        protein: '',
        carbs: '',
        fats: ''
      });
      setIsLogging(false);
    }
  }, [visible]);

  const handleManualSubmit = async () => {
    try {
      setIsLogging(true);
      // Close the modal immediately when logging begins
      onClose();
      const meal = {
        name: manualEntry.name,
        macros: {
          calories: parseInt(manualEntry.calories) || 0,
          protein: parseInt(manualEntry.protein) || 0,
          carbs: parseInt(manualEntry.carbs) || 0,
          fats: parseInt(manualEntry.fats) || 0
        }
      };
      await onLogMeal([meal]);
      setManualEntry({ name: '', calories: '', protein: '', carbs: '', fats: '' });
      setIsLogging(false);
      // Modal is already closed, so no need to call onClose() here
    } catch (error) {
      console.error('Error logging meal:', error);
      Alert.alert('Error', 'Failed to log a meal. Please try again.');
      setIsLogging(false);
    }
  };

  const handleGallerySelect = async () => {
    try {
      // Update to use newer API syntax with higher quality settings
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images", 
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1.0, // Maximum quality to ensure best analysis
        base64: false, // Let our service handle the base64 conversion
        exif: false,   // Don't need extra metadata
      });
      if (!result.canceled) {
        // Close the modal before starting analysis
        onClose();
        onPhotoAnalysis(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select an image. Please try again.');
    }
  };

  const handleCameraCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant camera permissions to take photos.');
        return;
      }

      // Update to use newer API syntax with higher quality settings
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1.0, // Maximum quality to ensure best analysis
        base64: false, // Let our service handle the base64 conversion
        exif: false,   // Don't need extra metadata
      });
      if (!result.canceled) {
        // Close the modal before starting analysis
        onClose();
        onPhotoAnalysis(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take a photo. Please try again.');
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalKeyboardAvoidingView}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1} 
            onPress={onClose}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {method === 'manual' ? 'Manual Entry' : 'Log Meal'}
              </Text>
              <Pressable onPress={() => {
                if (method === 'manual') {
                  setMethod(null);
                } else {
                  onClose();
                }
              }}>
                <Ionicons name={method === 'manual' ? "arrow-back" : "close"} size={24} color="#000000" />
              </Pressable>
            </View>

            {method === 'manual' ? (
              <ScrollView style={{ padding: 16 }}>
                <TextInput
                  style={styles.input}
                  placeholder="Meal Name"
                  value={manualEntry.name}
                  onChangeText={(text) => setManualEntry(prev => ({ ...prev, name: text }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="kcal"
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
                <Pressable
                  style={[styles.logMealButton, { marginTop: 16 }]}
                  onPress={handleManualSubmit}
                >
                  <Text style={styles.logMealText}>Log Meal</Text>
                </Pressable>
              </ScrollView>
            ) : (
              <View>
                {isPhotoAnalysisDisabled && (
                  <View style={styles.limitWarningContainer}>
                    <Ionicons name="alert-circle" size={24} color="#FF6B6B" />
                    <View style={styles.limitWarningTextContainer}>
                      <Text style={styles.limitWarningText}>
                        Daily limit reached ({dailyAnalysisCount}/{dailyAnalysisLimit}). Please use manual entry until reset.
                      </Text>
                      {timeUntilReset && (
                        <Text style={styles.limitCountdownText}>
                          Resets at midnight in: {timeUntilReset}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                <View style={styles.methodSelection}>
                  <Pressable
                    style={styles.methodButton}
                    onPress={() => setMethod('manual')}
                  >
                    <Ionicons name="create-outline" size={32} color="#000000" />
                    <Text style={styles.methodButtonText}>Log{'\n'}Manually</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.methodButton,
                      isPhotoAnalysisDisabled && styles.disabledButton
                    ]}
                    onPress={() => !isPhotoAnalysisDisabled && handleGallerySelect()}
                    disabled={isPhotoAnalysisDisabled}
                  >
                    <Ionicons name="images-outline" size={32} color={isPhotoAnalysisDisabled ? "#999999" : "#000000"} />
                    <Text style={[styles.methodButtonText, isPhotoAnalysisDisabled && {color: "#999999"}]}>Pick from{'\n'}Gallery</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.methodButton,
                      isPhotoAnalysisDisabled && styles.disabledButton
                    ]}
                    onPress={() => !isPhotoAnalysisDisabled && handleCameraCapture()}
                    disabled={isPhotoAnalysisDisabled}
                  >
                    <Ionicons name="camera-outline" size={32} color={isPhotoAnalysisDisabled ? "#999999" : "#000000"} />
                    <Text style={[styles.methodButtonText, isPhotoAnalysisDisabled && {color: "#999999"}]}>Take{'\n'}Photo</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function LoggedMeals({ meals, onDelete }: { meals: any[]; onDelete: (mealId: string) => Promise<void> }) {
  return (
    <View style={styles.loggedMealsContainer}>
      <Text style={styles.loggedMealsTitle}>Today's Meals</Text>
      {meals.map((meal) => (
        <View key={meal.id} style={styles.mealItem}>
          <View style={styles.mealInfo}>
            {/* Show all food items instead of just the first one */}
            {meal.items && meal.items.length > 0 ? (
              <>
                <Text style={styles.mealName}>
                  {meal.items.map((item: any, index: number) => (
                    index === meal.items.length - 1 
                      ? item.name 
                      : `${item.name}, `
                  ))}
                </Text>
                {meal.items.length > 1 && (
                  <Text style={styles.itemCount}>
                    {meal.items.length} items
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.mealName}>Unnamed meal</Text>
            )}
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
            onPress={() => onDelete(meal.id)}
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
  const result = startOfDay(date);
  return result;
}

function getLocalEndOfDay(date: Date = new Date()) {
  const result = endOfDay(date);
  return result;
}

function formatDateId(date: Date) {
  return format(date, 'yyyy-MM-dd');
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

  // Helper function to get Monday of the week
  const getMondayOfWeek = (date: Date) => {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days, else adjust to previous Monday
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    return monday;
  };

  // Generate week dates starting from Monday
  const weekDates = [...Array(7)].map((_, index) => {
    const monday = getMondayOfWeek(selectedDate);
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    
    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const isFuture = date > new Date();
    
    return {
      date,
      isSelected: format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'),
      isToday,
      isFuture,
      macros: weeklyData.find(d => format(new Date(d.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0
      }
    };
  });

  const days = weekDates.map((day) => {
    const { date, isSelected, isToday, isFuture, macros } = day;

    return (
      <Pressable
        key={format(date, 'yyyy-MM-dd')}
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
            {Math.round(macros.calories)}
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
      <Text style={styles.dateHeader}>
        {format(selectedDate, 'EEEE, MMMM d')}
      </Text>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysScrollContent}
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
    backgroundColor: '#E2E8FE',
    margin: 24,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  calorieHeader: {
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
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#E2E8FE',
    borderRadius: 12,
    marginTop: 16,
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adherenceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  adherenceSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  adherencePercentage: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4064F6',
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
    backgroundColor: '#4064F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginVertical: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  logMealText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  logMealIcon: {
    marginLeft: 4,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
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
    flexShrink: 1,
  },
  itemCount: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  mealTime: {
    fontSize: 14,
    color: '#666666',
  },
  mealMacros: {
    alignItems: 'flex-end',
    minWidth: 100,
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: 24,
    elevation: 10, // Higher elevation for Android
  },
  loadingContent: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    width: '100%',
    maxWidth: 320,
  },
  loadingMascot: {
    width: 100,
    height: 100,
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  weekContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
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
  daysScrollContent: {
    paddingHorizontal: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dayButton: {
    width: 72,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    position: 'relative',
  },
  selectedDay: {
    backgroundColor: '#99E86C',
  },
  todayDay: {
    borderWidth: 2,
    borderColor: '#3F63F6',
  },
  todayIndicator: {
    position: 'absolute',
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3F63F6',
    alignSelf: 'center',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  todayText: {
    color: '#3F63F6',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
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
  futureText: {
    color: '#999999',
  },
  deleteButton: {
    padding: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
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
  modalKeyboardAvoidingView: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666666',
  },
  pastDateError: {
    color: '#FF6B6B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  limitWarningContainer: {
    backgroundColor: '#FFE5E5',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 4,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  limitWarningTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  limitWarningText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginBottom: 4,
  },
  limitCountdownText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
});

export default function NutritionScreen() {
  const { macros, updateMacros } = useNutrition();
  const [loggedMeals, setLoggedMeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const { user } = useAuth();
  const [isLogMealModalVisible, setIsLogMealModalVisible] = useState(false);
  const [selectedLoggingMethod, setSelectedLoggingMethod] = useState<'manual' | 'photo' | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [dailyAnalysisCount, setDailyAnalysisCount] = useState(0);
  const [analysisLimitReached, setAnalysisLimitReached] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const DAILY_ANALYSIS_LIMIT = 8;
  const { 
    selectedDate,
    setSelectedDate,
    isLeavingNutrition,
    setIsLeavingNutrition 
  } = useNutritionDate();
  const [weeklyData, setWeeklyData] = useState<DailyMacros[]>([]);
  const [isLoadingWeek, setIsLoadingWeek] = useState(true);
  const [isUpdatingFromLoad, setIsUpdatingFromLoad] = useState(false);

  // Track the time until midnight (when analysis limit resets)
  useEffect(() => {
    if (!analysisLimitReached) return;
    
    // Function to calculate time until midnight in user's local timezone
    const calculateTimeUntilMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0); // Midnight in user's local timezone
      
      const diffMs = tomorrow.getTime() - now.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      return `${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`;
    };
    
    // Initial calculation
    setTimeUntilReset(calculateTimeUntilMidnight());
    
    // Set up interval to update every second
    const intervalId = setInterval(() => {
      setTimeUntilReset(calculateTimeUntilMidnight());
    }, 1000);
    
    // Clean up interval on unmount or when limit is no longer reached
    return () => clearInterval(intervalId);
  }, [analysisLimitReached]);

  // Listen for tab navigation attempting to leave nutrition tab
  // If isLeavingNutrition is true, reset to today's date
  useEffect(() => {
    if (isLeavingNutrition) {
      console.log('DEBUG - Resetting nutrition tab date to today before navigating away');
      
      // This will reset the selected date to today
      const today = new Date();
      setSelectedDate(today);
      
      // Load today's data to ensure we're showing today's values
      loadSelectedDayData();
    }
  }, [isLeavingNutrition, setSelectedDate]);

  // When this component unmounts, make sure it resets the date
  useEffect(() => {
    return () => {
      // Set date to today when leaving the nutrition tab
      setSelectedDate(new Date());
    };
  }, [setSelectedDate]);

  // Move canLogMeal to component scope
  const canLogMeal = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    // Calculate the date 8 days ago
    const eightDaysAgo = new Date(today);
    eightDaysAgo.setDate(today.getDate() - 8);
    eightDaysAgo.setHours(0, 0, 0, 0);
    
    // Can log meal if selected date is today or in the past, but not more than 8 days ago
    return selected <= today && selected >= eightDaysAgo;
  }, [selectedDate]);

  // Load selected day's macros and meals
  const loadSelectedDayData = async () => {
    if (!user) return;
    try {
      // Only set loading state if we're analyzing or logging a meal
      if (!isUpdatingFromLoad) {
        setIsLoading(true);
      }
      setIsUpdatingFromLoad(true);
      const dateString = formatDateId(selectedDate);
      
      // Get the goals (these stay constant)
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        console.error('User document not found');
        setLoggedMeals([]);
        updateMacros({
          calories: { current: 0, goal: 2000 },
          protein: { current: 0, goal: 150 },
          carbs: { current: 0, goal: 250 },
          fats: { current: 0, goal: 70 }
        });
        return;
      }

      const userData = userDoc.data();
      
      // Get goals from user document if they exist
      let goals;
      if (userData.calorieGoal && userData.macroGoals) {
        goals = {
          calories: userData.calorieGoal,
          protein: userData.macroGoals.protein,
          carbs: userData.macroGoals.carbs,
          fats: userData.macroGoals.fat || userData.macroGoals.fats // Handle different property names
        };
      } else {
        // Use the centralized utility function to calculate nutrition goals
        const { calorieGoal, macroGoals } = calculateNutritionGoals(userData);
        goals = {
          calories: calorieGoal,
          protein: macroGoals.protein,
          carbs: macroGoals.carbs,
          fats: macroGoals.fat
        };
      }

      // Load meals for selected date
      const startOfDay = getLocalStartOfDay(selectedDate);
      const endOfDay = getLocalEndOfDay(selectedDate);

      console.log(`Loading meals for ${dateString} from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
      
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
      
      console.log(`Found ${meals.length} meals for ${dateString}`);
      setLoggedMeals(meals);
      
      // Check if today's date is selected - we should always recompute the daily macros
      // This ensures accuracy across the app after deleting meals
      const isToday = isSameDay(selectedDate, new Date());
      
      // Always recompute the totals from meals to ensure accuracy
      const computedTotals = meals.reduce((acc, meal: any) => ({
        calories: acc.calories + (meal.totalMacros?.calories || 0),
        protein: acc.protein + (meal.totalMacros?.protein || 0),
        carbs: acc.carbs + (meal.totalMacros?.carbs || 0),
        fats: acc.fats + (meal.totalMacros?.fats || 0)
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
      
      // Load macros for selected date - only if there are meals
      if (meals.length > 0) {
        const dailyMacrosRef = doc(db, `users/${user.uid}/dailyMacros/${dateString}`);
        const dailyMacrosDoc = await getDoc(dailyMacrosRef);
        
        // If this is today's date or the dailyMacros document doesn't exist, update it to match our computed totals
        if (isToday || !dailyMacrosDoc.exists()) {
          await setDoc(dailyMacrosRef, {
            ...computedTotals,
            updatedAt: new Date().toISOString(),
            createdAt: dailyMacrosDoc.exists() ? dailyMacrosDoc.data().createdAt : new Date().toISOString()
          });
          
          // Update macros with computed totals
          updateMacros({
            calories: { current: computedTotals.calories, goal: goals.calories },
            protein: { current: computedTotals.protein, goal: goals.protein },
            carbs: { current: computedTotals.carbs, goal: goals.carbs },
            fats: { current: computedTotals.fats, goal: goals.fats }
          });
        } else {
          // For past dates, use the stored values
          updateMacros({
            calories: { current: dailyMacrosDoc.data().calories, goal: goals.calories },
            protein: { current: dailyMacrosDoc.data().protein, goal: goals.protein },
            carbs: { current: dailyMacrosDoc.data().carbs, goal: goals.carbs },
            fats: { current: dailyMacrosDoc.data().fats, goal: goals.fats }
          });
        }
        
        // Calculate and save adherence score directly instead of using setTimeout
        const adherenceScore = calculateTodayAdherence();
        console.log(`Calculated adherence score for ${dateString}: ${adherenceScore}%`);
        await saveAdherenceScoreToFirebase(adherenceScore);
        
      } else {
        // If no meals, set all current values to 0
        updateMacros({
          calories: { current: 0, goal: goals.calories },
          protein: { current: 0, goal: goals.protein },
          carbs: { current: 0, goal: goals.carbs },
          fats: { current: 0, goal: goals.fats }
        });
        
        // Save 0% adherence score if no meals
        await saveAdherenceScoreToFirebase(0);
      }
    } catch (error) {
      console.error('Error loading selected day data:', error);
      setLoggedMeals([]);
      // Set default macros on error
      updateMacros({
        calories: { current: 0, goal: 2000 },
        protein: { current: 0, goal: 150 },
        carbs: { current: 0, goal: 250 },
        fats: { current: 0, goal: 70 }
      });
    } finally {
      // Only clear loading state if we're analyzing or logging a meal
      if (!isUpdatingFromLoad) {
        setIsLoading(false);
      }
      // Reset the flag after a delay to ensure state updates are complete
      setTimeout(() => {
        setIsUpdatingFromLoad(false);
      }, 500);
    }
  };

  // Update the logMealToFirestore function to use selectedDate
  const logMealToFirestore = async (items: any) => {
    if (!user) {
      throw new Error('Must be logged in to log meals');
    }

    if (!canLogMeal()) {
      throw new Error('Cannot log meals for dates older than a week ago');
    }

    try {
      setIsLoggingMeal(true);
      console.log('Logging meal to Firestore:', JSON.stringify(items));
      
      // Handle both the new format with multiple items and the old format
      let mealItems: any[] = [];
      let totalMacros: any = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      
      // Check if this is our new format with already calculated totalMacros
      if (items.totalMacros && items.items && Array.isArray(items.items)) {
        mealItems = items.items;
        totalMacros = items.totalMacros;
        console.log('Using pre-calculated total macros from multiple items');
      } 
      // Handle array of items but without total macros
      else if (Array.isArray(items)) {
        mealItems = items;
        // Calculate totals
        totalMacros = mealItems.reduce((acc: any, item: any) => ({
          calories: acc.calories + (item.macros?.calories || 0),
          protein: acc.protein + (item.macros?.protein || 0),
          carbs: acc.carbs + (item.macros?.carbs || 0),
          fats: acc.fats + (item.macros?.fats || 0)
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
        console.log('Calculated total macros from array of items');
      } 
      // Legacy single item format
      else {
        mealItems = [items];
        totalMacros = {
          calories: items.macros?.calories || 0,
          protein: items.macros?.protein || 0,
          carbs: items.macros?.carbs || 0,
          fats: items.macros?.fats || 0
        };
        console.log('Using single item for macros');
      }

      // Use selected date for the meal timestamp
      const mealDate = new Date(selectedDate);
      mealDate.setHours(new Date().getHours());
      mealDate.setMinutes(new Date().getMinutes());

      const mealData = {
        userId: user.uid,
        timestamp: mealDate.toISOString(),
        items: mealItems,
        totalMacros
      };

      await addDoc(collection(db, 'meals'), mealData);
      
      // Log analytics event after successful logging
      try {
        await analytics().logEvent('log_meal');
        console.log("Analytics event 'log_meal' logged.");
      } catch (error) {
        console.error("Error logging 'log_meal' event:", error);
      }

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
      
      // Refresh data to ensure UI is up-to-date
      await loadSelectedDayData();
    } catch (error) {
      console.error('Error logging meal:', error);
      Alert.alert('Error', 'Failed to log a meal. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoggingMeal(false);
    }
  };

  // Modify the useEffect to not run when isUpdatingFromLoad is true
  useEffect(() => {
    // Skip this effect if we're updating from loadSelectedDayData
    if (isUpdatingFromLoad) {
      console.log('Skipping adherence calculation because data is being loaded');
      return;
    }
    
    // Only update if user is logged in and macros exist
    if (user && 
        macros.calories.goal > 0 && 
        (macros.calories.current > 0 || 
         macros.protein.current > 0 || 
         macros.carbs.current > 0 || 
         macros.fats.current > 0)) {
      const adherenceScore = calculateTodayAdherence();
      console.log(`Macros updated - recalculating adherence score: ${adherenceScore}%`);
      saveAdherenceScoreToFirebase(adherenceScore);
    }
  }, [macros, user, selectedDate, isUpdatingFromLoad]);

  // Update weekly data fetching
  useEffect(() => {
    if (!user) return;

    const fetchWeeklyData = async () => {
      try {
        setIsLoadingWeek(true);
        const today = new Date();
        
        // Get the start of the week (Monday)
        const startOfWeek = new Date(today);
        // Adjust to get Monday (1) as first day instead of Sunday (0)
        const day = today.getDay();
        const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, else adjust to previous Monday
        startOfWeek.setDate(today.getDate() + diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const weekData: DailyMacros[] = [];
        
        // Get 7 days starting from Monday
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
            dayOfWeek: currentDate.getDay()
          });
        }
        
        setWeeklyData(weekData);
      } catch (error) {
        console.error('Error fetching weekly data:', error);
        const today = new Date();
        const startOfWeek = new Date(today);
        const day = today.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        startOfWeek.setDate(today.getDate() + diff);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const emptyWeekData = Array(7).fill(null).map((_, i) => {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          return {
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
            date: formatDateId(date),
            dayOfWeek: date.getDay()
          };
        });
        
        setWeeklyData(emptyWeekData);
      } finally {
        setIsLoadingWeek(false);
      }
    };

    fetchWeeklyData();
  }, [user, selectedDate]);

  // Update the deleteMeal function to recalculate daily totals
  const deleteMeal = async (mealId: string) => {
    if (!user) return;
    try {
      // Get the meal data before deleting it
      const mealRef = doc(db, 'meals', mealId);
      const mealDoc = await getDoc(mealRef);
      
      if (!mealDoc.exists()) {
        console.error('Meal not found');
        throw new Error('Meal not found');
      }
      
      // First delete the meal
      await deleteDoc(mealRef);
      console.log('MEAL DELETED: Document removed from meals collection');

      // Then recalculate daily totals from remaining meals
      const startOfDay = getLocalStartOfDay(selectedDate);
      const endOfDay = getLocalEndOfDay(selectedDate);
      const dateString = formatDateId(selectedDate);

      // Query all meals for the day
      const mealsQuery = query(
        collection(db, 'meals'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', startOfDay.toISOString()),
        where('timestamp', '<=', endOfDay.toISOString())
      );

      const mealsSnapshot = await getDocs(mealsQuery);
      console.log(`Recalculating from ${mealsSnapshot.docs.length} remaining meals`);
      
      // Calculate new totals from remaining meals
      const newTotals = mealsSnapshot.docs.reduce((acc, mealDoc) => {
        const meal = mealDoc.data();
        return {
          calories: acc.calories + (meal.totalMacros?.calories || 0),
          protein: acc.protein + (meal.totalMacros?.protein || 0),
          carbs: acc.carbs + (meal.totalMacros?.carbs || 0),
          fats: acc.fats + (meal.totalMacros?.fats || 0)
        };
      }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

      // Update daily macros document with new totals
      const dailyMacrosRef = doc(db, `users/${user.uid}/dailyMacros/${dateString}`);
      
      if (mealsSnapshot.docs.length > 0) {
        // If there are still meals, update with new totals
        await setDoc(dailyMacrosRef, {
          ...newTotals,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('MEAL DELETED: Updated daily macros with new totals', newTotals);
      } else {
        // If no meals left, delete the daily macros document to avoid showing zeros
        await deleteDoc(dailyMacrosRef);
        console.log('MEAL DELETED: No meals left, removed daily macros document');
      }

      // Update local state
      updateMacros({
        calories: { current: newTotals.calories, goal: macros.calories.goal },
        protein: { current: newTotals.protein, goal: macros.protein.goal },
        carbs: { current: newTotals.carbs, goal: macros.carbs.goal },
        fats: { current: newTotals.fats, goal: macros.fats.goal }
      });

      // Update meals list
      setLoggedMeals(mealsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

    } catch (error) {
      console.error('Error deleting meal:', error);
      throw error;
    }
  };

  // Move these functions inside the component
  const analyzeImage = async (imageUri: string) => {
    try {
      // First check if user is authenticated
      if (!user?.uid) {
        console.error('User not authenticated');
        throw new Error('User must be logged in');
      }

      console.log('Starting food image analysis for user:', user.uid);
      console.log('Local image URI:', imageUri);
      
      // Analyze the image directly using the imageAnalysis service
      // which now handles base64 encoding internally
      try {
        // Call the image analysis service with the local URI
        console.log('Sending image to analysis service...');
        const result = await imageAnalysis.analyzeImage(imageUri);
        
        console.log('Image analysis result:', JSON.stringify(result));
        
        if (!result?.items || !Array.isArray(result.items) || result.items.length === 0) {
          console.error('Analysis result missing expected structure');
          throw new Error('Analysis failed');
        }

        // Calculate total macros for all food items
        const totalMacros = result.items.reduce((total: MacroData, item: any) => {
          return {
            calories: total.calories + item.macros.calories,
            protein: total.protein + item.macros.protein,
            carbs: total.carbs + item.macros.carbs,
            fats: total.fats + item.macros.fats
          };
        }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

        console.log(`Found ${result.items.length} food items with total macros:`, JSON.stringify(totalMacros));

        // Return all detected items along with the combined name
        const combinedName = result.items.map((item: any) => item.name).join(", ");

        // Return the full result with all items
        return {
          items: result.items,
          combinedName: combinedName,
          totalMacros: totalMacros
        };
      } catch (analysisError: any) {
        console.error('Error in image analysis:', analysisError);
        throw analysisError;
      }
    } catch (error: any) {
      console.error('Error processing image:', error);
      
      // Provide more specific user messages based on error type
      if (error.message.includes('Failed to encode image')) {
        Alert.alert('Error', 'This image format is not supported. Please try another image.');
      } else if (error.message.includes('invalid_image')) {
        Alert.alert('Error', 'The image could not be processed. Please ensure it clearly shows food items.');
      } else if (!error.message.includes('Analysis failed')) {
        Alert.alert(
          'Analysis Failed',
          'Please ensure that:\n\n' +
          '• Photo is taken 40-50cm from the food\n' +
          '• Background is clean and clear\n' +
          '• Only the intended food is in the picture'
        );
      }
      
      throw error;
    }
  };
  
  // Track image analyses per day - only fetch when component loads or the date changes to today
  useEffect(() => {
    const fetchAnalysisCount = async () => {
      if (!user) return;
      
      const today = new Date();
      const isTodaySelected = isSameDay(selectedDate, today);
      
      // Only fetch the count if today is selected
      if (isTodaySelected) {
        const todayStr = formatDateId(today);
        const analysisCountRef = doc(db, 'users', user?.uid || '', 'imageAnalysisUsage', todayStr);
        
        try {
          const docSnap = await getDoc(analysisCountRef);
          if (docSnap.exists()) {
            const count = docSnap.data().count || 0;
            setDailyAnalysisCount(count);
            setAnalysisLimitReached(count >= DAILY_ANALYSIS_LIMIT);
          } else {
            // No document means no analyses today
            setDailyAnalysisCount(0);
            setAnalysisLimitReached(false);
          }
        } catch (error) {
          console.error('Error fetching analysis count:', error);
          // In case of error, don't restrict functionality
          setDailyAnalysisCount(0);
          setAnalysisLimitReached(false);
        }
      }
    };
    
    fetchAnalysisCount();
  }, [user, selectedDate]);

  // On photo analysis error handling
  const handlePhotoAnalysis = async (imageUri: string) => {
    try {
      // Check if today is selected
      const today = new Date();
      const isTodaySelected = isSameDay(selectedDate, today);
      
      if (isTodaySelected) {
        // Get the latest count directly from Firestore to avoid race conditions
        const todayStr = formatDateId(today);
        const analysisCountRef = doc(db, 'users', user?.uid || '', 'imageAnalysisUsage', todayStr);
        let currentCount = 0;
        
        try {
          const docSnap = await getDoc(analysisCountRef);
          if (docSnap.exists()) {
            currentCount = docSnap.data().count || 0;
          }
          
          // Check if limit reached based on fresh data
          if (currentCount >= DAILY_ANALYSIS_LIMIT) {
            // Calculate time until midnight for alert message
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0); // Midnight in user's local timezone
            
            const diffMs = tomorrow.getTime() - now.getTime();
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            // Format as "HH hrs MM mins"
            const timeString = `${diffHrs} hr${diffHrs !== 1 ? 's' : ''} ${diffMins} min${diffMins !== 1 ? 's' : ''}`;
            
            Alert.alert(
              'Daily Limit Reached',
              `You've reached your daily limit of ${DAILY_ANALYSIS_LIMIT} image analyses. Please log meals manually.\n\nLimit resets at midnight (local time) in: ${timeString}`
            );
            return;
          }
        } catch (error) {
          console.error('Error checking analysis count:', error);
          // Continue with analysis if we can't check (don't block user)
        }
      }

      setIsLoading(true);
      setIsAnalyzing(true);
      // Close the modal immediately when analysis/logging begins
      setIsLogMealModalVisible(false);
      console.log('Starting photo analysis process for URI:', imageUri);
      
      // Compress and resize the image before analysis to avoid timeouts
      console.log('Compressing and resizing image...');
      let processedUri = imageUri;
      
      try {
        // Use image manipulator to resize the image to a more manageable size
        const manipResult = await manipulateAsync(
          imageUri,
          [{ resize: { width: 800 } }], // Resize to width of 800px (maintain aspect ratio)
          { compress: 0.7, format: SaveFormat.JPEG } // 70% quality JPEG
        );
        
        processedUri = manipResult.uri;
        console.log('Image compressed and resized successfully');
      } catch (manipError) {
        console.warn('Failed to compress image, using original:', manipError);
        // Continue with original image if manipulation fails
      }
      
      // Set a timeout to prevent the app from hanging indefinitely
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Image analysis timed out. Please try again with a clearer photo.')), 60000);
      });
      
      // Race between the normal analysis and the timeout
      const result = await Promise.race([
        analyzeImage(processedUri),
        timeoutPromise
      ]) as FoodAnalysisResult;
      
      if (!result) {
        console.error('Analysis result is undefined or null');
        setIsAnalyzing(false);
        return; // Exit silently if analysis failed
      }
      
      console.log('Successfully analyzed image, logging meal');
      
      // Ensure all macro values are rounded to the nearest whole number
      const roundedResult = {
        ...result,
        items: result.items.map((item: any) => ({
          ...item,
          macros: {
            calories: Math.round(item.macros.calories),
            protein: Math.round(item.macros.protein),
            carbs: Math.round(item.macros.carbs),
            fats: Math.round(item.macros.fats)
          }
        })),
        totalMacros: {
          calories: Math.round(result.totalMacros.calories),
          protein: Math.round(result.totalMacros.protein),
          carbs: Math.round(result.totalMacros.carbs),
          fats: Math.round(result.totalMacros.fats)
        }
      };

      // Increment the analysis count in Firebase using atomic operation
      if (isTodaySelected && user) {
        const todayStr = formatDateId(today);
        const analysisCountRef = doc(db, 'users', user.uid, 'imageAnalysisUsage', todayStr);
        
        try {
          // Use updateDoc with increment for atomic update
          await updateDoc(analysisCountRef, {
            count: increment(1),
            updatedAt: new Date().toISOString()
          }).catch(async (error) => {
            // Document might not exist yet, create it
            if (error.code === 'not-found') {
              await setDoc(analysisCountRef, {
                count: 1,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
              });
            } else {
              throw error;
            }
          });
          
          // Refresh the count after successful update
          const updatedDocSnap = await getDoc(analysisCountRef);
          if (updatedDocSnap.exists()) {
            const newCount = updatedDocSnap.data().count || 1;
            setDailyAnalysisCount(newCount);
            setAnalysisLimitReached(newCount >= DAILY_ANALYSIS_LIMIT);
          }
        } catch (error) {
          console.error('Error updating analysis count:', error);
          // Continue with meal logging even if tracking fails
        }
      }
      
      await logMealToFirestore(roundedResult);
      
      // Refresh the data
      await loadSelectedDayData();
    } catch (error: any) {
      console.error('Photo analysis error:', error);
      
      // Handle timeout error specifically
      if (error.message && error.message.includes('timed out')) {
        Alert.alert(
          'Analysis Timeout',
          'The analysis is taking too long. Please try again with a smaller or clearer photo.'
        );
      } else {
        // Error messaging handled in analyzeImage
        Alert.alert(
          'Image Analysis Failed', 
          'We could not properly analyze this image. Please try again with a clearer photo of your food.'
        );
      }
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };

  // Add useEffect to call loadSelectedDayData
  useEffect(() => {
    if (!user) return;
    loadSelectedDayData();
  }, [user, selectedDate]);

  // Add this function to calculate today's adherence
  const calculateTodayAdherence = () => {
    // Calculate percentage for each macro
    const caloriesScore = Math.min(macros.calories.current / macros.calories.goal * 100, 100);
    const proteinScore = Math.min(macros.protein.current / macros.protein.goal * 100, 100);
    const carbsScore = Math.min(macros.carbs.current / macros.carbs.goal * 100, 100);
    const fatsScore = Math.min(macros.fats.current / macros.fats.goal * 100, 100);

    // Weighted average (same weights as weekly score)
    const todayScore = Math.round(
      caloriesScore * 0.4 + // 40% weight on calories
      proteinScore * 0.3 + // 30% weight on protein
      carbsScore * 0.15 + // 15% weight on carbs
      fatsScore * 0.15    // 15% weight on fats
    );

    return todayScore;
  };

  // Make saveAdherenceScoreToFirebase return a promise
  const saveAdherenceScoreToFirebase = async (score: number) => {
    if (!user) return;
    
    try {
      const dateStr = formatDateId(selectedDate);
      const adherenceRef = doc(db, 'users', user.uid, 'nutritionAdherence', dateStr);
      
      await setDoc(adherenceRef, {
        adherenceScore: score,
        date: dateStr,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Adherence score (${score}%) saved to Firebase for ${dateStr}`);
    } catch (error) {
      console.error('Error saving adherence score to Firebase:', error);
    }
  };

  return (
    <>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 120,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        bounces={true}
        overScrollMode="never"
      >
        {/* Header - Fixed at top when scrolling */}
        <View style={{
          paddingTop: 48,
          paddingHorizontal: 24,
          backgroundColor: '#ffffff',
        }}>
          {/* Header with Logo */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 92,
          }}>
            {/* Title */}
            <Text style={{
              fontSize: 28,
              fontWeight: '900',
              color: '#000000',
            }} 
            allowFontScaling={false}
            maxFontSizeMultiplier={1.2}>
              Nutrition
            </Text>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
              <Animated.View 
                entering={PinwheelIn.duration(500)}
              >
              <Image 
                source={require('../../assets/images/BallerAILogo.png')}
                style={{
                  width: 32,
                  height: 32,
                }}
                resizeMode="contain"
              />
              </Animated.View>
              <Text style={{
                fontSize: 28,
                fontWeight: '300',
                color: '#000000',
              }} 
              allowFontScaling={false}
              maxFontSizeMultiplier={1.2}>
                BallerAI
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Overview */}
        <WeeklyOverview 
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        <CalorieProgress 
          eaten={macros.calories.current}
          burned={0}
          goal={macros.calories.goal}
        />

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
          
          <View style={styles.adherenceContainer}>
            <Text style={styles.adherenceTitle}>Nutrition Adherence</Text>
            <Text style={styles.adherenceSubtitle}>Today's Progress</Text>
            <Text style={styles.adherencePercentage}>{calculateTodayAdherence()}%</Text>
          </View>
        </View>

        <View style={styles.mealsSection}>
          <Pressable
            style={[
              styles.logMealButton,
              !canLogMeal() && styles.disabledButton
            ]}
            onPress={() => {
              if (canLogMeal()) {
                setIsLogMealModalVisible(true);
              }
            }}
            disabled={!canLogMeal()}
          >
            <Text style={styles.logMealText}>Log Meal</Text>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </Pressable>
          {!canLogMeal() && (
            <Text style={styles.pastDateError}>
              Cannot log meals for dates older than a week ago
            </Text>
          )}
        </View>

        <LoggedMeals 
          meals={loggedMeals} 
          onDelete={async (mealId: string) => {
            try {
              setIsLoading(true);
              await deleteMeal(mealId);
              // Show success message
              Alert.alert('Success', 'Meal deleted successfully.');
              // Refresh weekly data to update the overview
              await loadSelectedDayData();
            } catch (error) {
              console.error('Error deleting meal:', error);
              Alert.alert('Error', 'Failed to delete meal. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }} 
        />

        <LogMealModal
          visible={isLogMealModalVisible}
          onClose={() => setIsLogMealModalVisible(false)}
          onPhotoAnalysis={async (imageUri) => {
            try {
              await handlePhotoAnalysis(imageUri);
            } catch (error) {
              console.error('Error in photo analysis:', error);
              Alert.alert('Error', 'Failed to analyze image. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }}
          onLogMeal={async (items) => {
            try {
              await logMealToFirestore(items);
            } catch (error) {
              console.error('Error logging meal:', error);
              Alert.alert('Error', 'Failed to log meal. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }}
          isPhotoAnalysisDisabled={analysisLimitReached}
          dailyAnalysisCount={dailyAnalysisCount}
          dailyAnalysisLimit={DAILY_ANALYSIS_LIMIT}
          timeUntilReset={timeUntilReset}
        />
      </ScrollView>
      
      {/* Image Analysis Loading Overlay - Now outside ScrollView */}
      {isAnalyzing && (
        <Animated.View 
          style={styles.loadingOverlay}
          entering={FadeIn.duration(300)}
        >
          <Animated.View 
            style={styles.loadingContent}
            entering={FadeInDown.duration(400).springify()}
          >
            <Image 
              source={require('../../assets/images/mascot.png')}
              style={styles.loadingMascot}
              resizeMode="contain"
            />
            <Text style={styles.loadingTitle}>Analyzing Image</Text>
            <Text style={styles.loadingText}>
              Please don't close the app while we analyze your meal.
            </Text>
            <ActivityIndicator size="large" color="#4064F6" />
          </Animated.View>
        </Animated.View>
      )}

      {/* Manual Meal Logging Overlay - Now outside ScrollView */}
      {isLoggingMeal && (
        <Animated.View 
          style={styles.loadingOverlay}
          entering={FadeIn.duration(300)}
        >
          <Animated.View 
            style={styles.loadingContent}
            entering={FadeInDown.duration(400).springify()}
          >
            <Image 
              source={require('../../assets/images/mascot.png')}
              style={styles.loadingMascot}
              resizeMode="contain"
            />
            <Text style={styles.loadingTitle}>Logging Meal</Text>
            <Text style={styles.loadingText}>
              Please don't close the app while we log your meal.
            </Text>
            <ActivityIndicator size="large" color="#4064F6" />
          </Animated.View>
        </Animated.View>
      )}
    </>
  );
} 
