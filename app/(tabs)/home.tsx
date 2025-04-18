import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, useColorScheme, Dimensions, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import { getDoc, doc, onSnapshot, setDoc, updateDoc, addDoc, increment, serverTimestamp, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { shadowProps } from '../constants/Styles';
import { useNutrition } from '../context/NutritionContext';
import { useIsFocused } from '@react-navigation/native';
import CalorieProgress from '../components/CalorieProgress';
import WorkoutCard from '../components/WorkoutCard';
import StepProgress from '../components/StepProgress';
import ExerciseCard from '../components/ExerciseCard';
import WaterIntakeProgress from '../components/WaterIntakeProgress';
import { useWorkouts } from '../context/WorkoutContext';
import Carousel from 'react-native-reanimated-carousel';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useUserSettings } from '../context/UserSettingsContext';
import { calculateNutritionGoals } from '../utils/nutritionCalculations';
import { format, startOfWeek, addDays, subDays } from 'date-fns';
import { TextInput, ActivityIndicator, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Pressable, Modal, Alert } from 'react-native';
import { askOpenAI } from '../utils/openai';
import Svg, { Circle } from 'react-native-svg';
import SubscriptionStatus from '../components/SubscriptionStatus';
import Animated, { PinwheelIn } from 'react-native-reanimated';
import analytics from '@react-native-firebase/analytics'; // Add analytics import

export default function HomeScreen() {
  const { user } = useAuth();
  const { macros } = useNutrition();
  const [showQuestion, setShowQuestion] = useState(false);
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(5);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [nutritionScore, setNutritionScore] = useState(0);
  const [showNutritionInfo, setShowNutritionInfo] = useState(false);
  const [nutritionAdherence, setNutritionAdherence] = useState(0); // Weekly average nutrition adherence
  const [selectedDayAdherence, setSelectedDayAdherence] = useState(0); // NEW: Selected day's adherence
  const [readinessScore, setReadinessScore] = useState(0);
  const [showReadinessInfo, setShowReadinessInfo] = useState(false);
  const [recoveryData, setRecoveryData] = useState<any>(null);
  const [nutritionData, setNutritionData] = useState<any[]>([]);
  // New state variables for recovery score
  const [recoveryAdherence, setRecoveryAdherence] = useState(0); // Weekly average recovery adherence
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);
  
  const [todayCalories, setTodayCalories] = useState({
    current: 0,
    goal: 0,
    lastUpdated: new Date().toISOString(),
    isLoading: true
  });

  const showInfoAlertReadiness = () => {
    Alert.alert(
      "Readiness Score",
      "Your readiness score indicates how prepared your body is for training today.\n\nThis score is calculated based on the physical load your body has endured recently and represents your approximate recovery level for the day. The readiness score helps you visualize your body's current state and can guide you in taking preventive measures to manage your training load if needed.\n\nListen to your body - a lower score might suggest you need more recovery time before intense training.",
      [{ text: "OK" }]
    );
  };  

  const showInfoAlertNutrition = () => {
    Alert.alert(
      "Nutrition Score",
      "Your nutrition score is a percentage that shows how closely you've followed your macro goals in the last week.\n\nThis score is meant to give you an idea of how consistent you've been with your nutrition recently, helping you identify patterns and make adjustments if needed.\n\nThe score is calculated from your past 7 days of nutrition data (excluding today). Higher scores indicate better adherence to your macro goals.",
      [{ text: "OK" }]
    );
  };  

  const showInfoAlertRecovery = () => {
    Alert.alert(
      "Recovery Score",
      "Your recovery score shows how consistently and well you're performing recovery habits like quality sleep, good nutrition, and completing your recovery plans.\n\nThis score helps you visualize your overall consistency with recovery practices and identify areas where you might have room to improve.\n\nImportant: This score doesn't represent your training readiness, as it doesn't take into account your training load. It simply reflects how good your recovery habits have been over the past 7 days.",
      [{ text: "OK" }]
    );
  };  

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const updateCaloriesWithDebounce = (newCaloriesData: any) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setTodayCalories(newCaloriesData);
      debounceTimerRef.current = null;
    }, 300); // 300ms debounce time
  };
  
  // Debug effect for nutrition adherence
  /*useEffect(() => {
    console.log(`DEBUG - NUTRITION ADHERENCE UPDATED TO: ${nutritionAdherence}%`);
  }, [nutritionAdherence]);
  
  // Debug effect for today's calories
  useEffect(() => {
    console.log(`DEBUG - Today's calories state updated: ${JSON.stringify(todayCalories)}`);
  }, [todayCalories]);
  
  // Debug effect for macros context
  useEffect(() => {
    console.log('DEBUG - Nutrition Context Macros:', JSON.stringify(macros));
    
    // IMPORTANT: Immediately update the goal from macros context when it becomes available
    // This ensures we don't show the default goal when a real goal exists
    if (macros.calories.goal > 0 && todayCalories.goal !== macros.calories.goal) {
      console.log(`DEBUG - Updating goal from macros context: ${macros.calories.goal} calories`);
      setTodayCalories(prev => ({
        ...prev,
        goal: macros.calories.goal
      }));
    }
  }, [macros, todayCalories.goal]);*/
  
  // IMPORTANT: Remove the context syncing effect that was causing issues
  // We no longer want to sync with the macros context for current calories
  // as it will show the selected day instead of today
  
  // Fetch user's profile picture and calorie goal immediately
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          // Set loading state at the beginning
          setTodayCalories(prev => ({
            ...prev,
            isLoading: true
          }));
          
          //console.log('DEBUG - Starting to fetch user data for calorie goal calculation');
          
          // Fetch user profile data
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Set profile picture if available
            if (userData.profilePicture) {
              setProfilePicture(userData.profilePicture);
            }
            
            // Set user profile data for use in other calculations
            setUserProfile(userData);
            
            // IMPORTANT: Calculate nutrition goals based on user data immediately
            // This ensures we don't show default values while waiting for nutrition tab to load
            let calculatedGoals;
            let goalsUpdated = false;
            
            // First check if goals already exist in the user document
            if (userData.calorieGoal && userData.macroGoals) {
              //console.log('DEBUG - Using existing calorie goal from user document:', userData.calorieGoal);
              calculatedGoals = {
                calorieGoal: userData.calorieGoal,
                macroGoals: userData.macroGoals
              };
            } else {
              // Calculate using the utility function if no goals exist
              console.log('DEBUG - Calculating nutrition goals from user data');
              calculatedGoals = calculateNutritionGoals(userData);
              console.log('DEBUG - Calculated goals:', calculatedGoals);
              
              // IMPORTANT: Save the calculated goals to the user document
              // This will trigger the NutritionContext listener to update
              if (calculatedGoals && calculatedGoals.calorieGoal > 0) {
                try {
                  //console.log('DEBUG - Saving calculated goals to user document');
                  await updateDoc(userDocRef, {
                    calorieGoal: calculatedGoals.calorieGoal,
                    macroGoals: calculatedGoals.macroGoals
                  });
                  goalsUpdated = true;
                  //console.log('DEBUG - Goals saved successfully');
                } catch (error) {
                  console.error('Error saving calculated goals:', error);
                }
              }
            }
            
            // Update today's calories state with the calculated goal
            if (calculatedGoals && calculatedGoals.calorieGoal > 0) {
              setTodayCalories({
                current: 0, // Assume 0 calories consumed for new accounts
                goal: calculatedGoals.calorieGoal,
                lastUpdated: new Date().toISOString(),
                isLoading: !goalsUpdated // Keep loading if goals were just updated (context needs time to sync)
              });
            } else {
              // If we couldn't calculate the goal, set isLoading to false but keep goal as 0
              setTodayCalories(prev => ({
                ...prev,
                isLoading: false
              }));
            }
          } else {
            // Fall back to default values if user document doesn't exist
            //console.log('DEBUG - User document not found, using default goals');
            const defaultGoals = { 
              calorieGoal: 2000, 
              macroGoals: { protein: 150, carbs: 200, fat: 55 } 
            };
            
            setTodayCalories({
              current: 0,
              goal: defaultGoals.calorieGoal,
              lastUpdated: new Date().toISOString(),
              isLoading: false
            });
          }
        } catch (error) {
          //console.error('Error fetching user data:', error);
          setTodayCalories({
            current: 0,
            goal: 2000, // Default fallback
            lastUpdated: new Date().toISOString(),
            isLoading: false
          });
        }
      }
    };

    fetchUserData();
  }, [user]);

  // Function to load selected date calories
  const loadSelectedDateCalories = useCallback(async (date: Date) => {
    if (!user) return;
    
    try {
      //console.log(`DEBUG - Loading calories for date: ${format(date, 'yyyy-MM-dd')}`);
      
      // Set loading state
      setTodayCalories(prev => ({
        ...prev,
        isLoading: true
      }));
      
      const dateStr = format(date, 'yyyy-MM-dd');
      const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
      
      // Use the same path as the nutrition tab to access dailyMacros
      const docRef = doc(db, 'users', user.uid, 'dailyMacros', dateStr);
      const docSnap = await getDoc(docRef);
      
      // Get goal from macros context or from Firebase
      let calorieGoal = 0;
      
      // For today, prefer the macros context value as it's most up-to-date
      if (isToday && macros.calories.goal > 0) {
        calorieGoal = macros.calories.goal;
        //console.log(`DEBUG - Using today's calorie goal from context: ${calorieGoal}`);
      } else {
        try {
          // For other days or if context doesn't have the goal, fetch from Firebase
          const userMacrosDoc = await getDoc(doc(db, 'users', user.uid, 'macros', 'goals'));
          if (userMacrosDoc.exists()) {
            const macrosData = userMacrosDoc.data();
            if (macrosData.calories && macrosData.calories > 0) {
              calorieGoal = macrosData.calories;
              //console.log(`DEBUG - Using calorie goal from Firebase: ${calorieGoal}`);
            }
          }
        } catch (error) {
          console.error('Error fetching user macros goals:', error);
        }
      }
      
      // Default goal if nothing found
      if (calorieGoal <= 0) {
        calorieGoal = 2000;
        console.log(`DEBUG - Using default calorie goal: ${calorieGoal}`);
      }
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        //console.log(`DEBUG - Found data for ${dateStr}:`, JSON.stringify(data));
        
        setTodayCalories({
          current: data.calories || 0,
          goal: calorieGoal,
          lastUpdated: new Date().toISOString(),
          isLoading: false
        });
      } else {
        // No data found for the selected date
        //console.log(`DEBUG - No data found for ${dateStr}, using zero values`);
        
        setTodayCalories({
          current: 0,
          goal: calorieGoal,
          lastUpdated: new Date().toISOString(),
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error loading selected date calories:', error);
      setTodayCalories(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }, [user, macros.calories.goal]);
  
  // Set up a real-time listener for the selected date with improved error handling
  useEffect(() => {
    if (!user) return;
    
    // Whether a date is selected or not, always set up a listener
    // If no date is selected, use today's date
    const dateToUse = selectedDate || new Date();
    const dateStr = format(dateToUse, 'yyyy-MM-dd');
    const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
    
    //console.log(`DEBUG - Setting up real-time listener for date: ${dateStr} (isToday: ${isToday})`);
    
    // Set loading state only if not already loading
    if (!todayCalories.isLoading) {
      setTodayCalories(prev => ({
        ...prev,
        isLoading: true
      }));
    }
    
    // Reference to the dailyMacros document for the selected date
    const docRef = doc(db, 'users', user.uid, 'dailyMacros', dateStr);
    
    // Set up the listener with error handling
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      //console.log(`DEBUG - Real-time update for date: ${dateStr}`);
      
      // Get goal from macros context for today, or use stored goal for other days
      let calorieGoal;
      
      if (isToday && macros.calories.goal > 0) {
        calorieGoal = macros.calories.goal;
      } else {
        // For non-today dates, use the existing goal or default to 2000
        calorieGoal = todayCalories.goal > 0 ? todayCalories.goal : 2000;
      }
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        //console.log(`DEBUG - Document data: ${JSON.stringify(data)}`);
        
        setTodayCalories({
          current: data.calories || 0,
          goal: calorieGoal,
          lastUpdated: new Date().toISOString(),
          isLoading: false
        });
      } else {
        //console.log(`DEBUG - No document exists for date: ${dateStr}`);
        
        setTodayCalories({
          current: 0,
          goal: calorieGoal,
          lastUpdated: new Date().toISOString(),
          isLoading: false
        });
      }
    }, (error) => {
      console.error(`ERROR - Failed to listen to data for date ${dateStr}:`, error);
      
      // On error, still update state to non-loading but mark the error
      setTodayCalories(prev => ({
        ...prev,
        isLoading: false,
        error: true
      }));
    });
    
    // Cleanup function
    return () => {
      //console.log(`DEBUG - Cleaning up listener for date: ${dateStr}`);
      unsubscribe();
    };
  }, [user, selectedDate, macros.calories.goal, todayCalories.goal]);

  // Handle date selection from WeeklyOverview
  const onDateSelect = useCallback((date: Date, adherenceScore?: number | null) => {
    //console.log(`DEBUG - Date selected: ${format(date, 'yyyy-MM-dd')} with adherence: ${adherenceScore}`);
    
    // If the selected date is the same as the currently selected date,
    // deselect it and go back to today's data
    if (selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) {
      //console.log('DEBUG - Deselecting date and returning to today');
      setSelectedDate(null);
      setSelectedDayAdherence(0); // Clear selected day adherence when deselecting
      
      // Explicitly load today's data
      loadSelectedDateCalories(new Date());
    } else {
      console.log(`DEBUG - Switching to date: ${format(date, 'yyyy-MM-dd')}`);
      setSelectedDate(date);
      
      // If we have an adherence score for this date, update the SELECTED DAY adherence
      // but NOT the weekly adherence
      if (adherenceScore !== undefined && adherenceScore !== null) {
        setSelectedDayAdherence(adherenceScore);
      } else {
        setSelectedDayAdherence(0); // No data for this day
      }
      
      // Load the selected date's data
      loadSelectedDateCalories(date);
    }
  }, [selectedDate, loadSelectedDateCalories]);

  // Generate week days
  const today = new Date();
  const startOfTheWeek = startOfWeek(today);
  const weekDays = [...Array(7)].map((_, i) => {
    const date = addDays(startOfTheWeek, i);
    return {
      date,
      dayLetter: format(date, 'E')[0],
      dayNumber: format(date, 'd'),
      isToday: format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
    };
  });

  // Modify the calculation function
  const calculateNutritionScore = useCallback(async () => {
    if (!user) return;

    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 10);
      
      const nutritionRef = collection(db, 'users', user.uid, 'nutrition');
      const q = query(
        nutritionRef,
        where('date', '>=', format(startDate, 'yyyy-MM-dd')),
        where('date', '<=', format(endDate, 'yyyy-MM-dd')),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const dailyScores: number[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        // Only calculate score if user has logged any macros for the day
        if (data.calories || data.protein || data.carbs || data.fats) {
          const dayMacros = {
            calories: data.calories || 0,
            protein: data.protein || 0,
            carbs: data.carbs || 0,
            fats: data.fats || 0,
          };

          const caloriesScore = Math.min(dayMacros.calories / macros.calories.goal * 100, 100);
          const proteinScore = Math.min(dayMacros.protein / macros.protein.goal * 100, 100);
          const carbsScore = Math.min(dayMacros.carbs / macros.carbs.goal * 100, 100);
          const fatsScore = Math.min(dayMacros.fats / macros.fats.goal * 100, 100);

          const dailyScore = (
            caloriesScore * 0.4 +
            proteinScore * 0.3 +
            carbsScore * 0.15 +
            fatsScore * 0.15
          );

          dailyScores.push(dailyScore);
        }
      });

      // Calculate average score only from days with data
      const averageScore = dailyScores.length > 0
        ? Math.round(dailyScores.reduce((a, b) => a + b, 0) / dailyScores.length)
        : 0;

      setNutritionScore(averageScore);
    } catch (error) {
      console.error('Error calculating nutrition score:', error);
      setNutritionScore(0);
    }
  }, [user, macros]);

  // Add this useEffect to calculate score when component mounts
  useEffect(() => {
    calculateNutritionScore();
  }, [calculateNutritionScore]);

  // Helper function to calculate daily score
  const calculateDayScore = useCallback((data: any) => {
    const { calories = 0, protein = 0, carbs = 0, fats = 0 } = data;
    
    console.log(`DEBUG - calculateDayScore called with:`, JSON.stringify(data));
    
    // IMPORTANT: Use the goals that were stored with this day's data if available
    // This ensures consistent scoring even if current goals change
    const calorieGoal = data.calorieGoal || macros.calories.goal || 2000;
    const proteinGoal = data.proteinGoal || macros.protein.goal || 150;
    const carbsGoal = data.carbsGoal || macros.carbs.goal || 200;
    const fatsGoal = data.fatsGoal || macros.fats.goal || 55;
    
    console.log(`DEBUG - Using goals for calculation: calories=${calorieGoal}, protein=${proteinGoal}, carbs=${carbsGoal}, fats=${fatsGoal}`);
    
    // Calculate scores using the appropriate goals for this specific day
    const caloriesScore = Math.min((calories / (calorieGoal || 1)) * 100, 100);
    const proteinScore = Math.min((protein / (proteinGoal || 1)) * 100, 100);
    const carbsScore = Math.min((carbs / (carbsGoal || 1)) * 100, 100);
    const fatsScore = Math.min((fats / (fatsGoal || 1)) * 100, 100);

    console.log(`DEBUG - Scores: calories=${caloriesScore.toFixed(1)}%, protein=${proteinScore.toFixed(1)}%, carbs=${carbsScore.toFixed(1)}%, fats=${fatsScore.toFixed(1)}%`);

    const score = (
      caloriesScore * 0.4 +
      proteinScore * 0.3 +
      carbsScore * 0.15 +
      fatsScore * 0.15
    );
    
    console.log(`DEBUG - Final day score: ${score.toFixed(1)}%`);
    return score;
  }, [macros]);

  // Modify the function to calculate adherence from current macros if no data is found
  const calculateCurrentAdherence = useCallback(() => {
    // Only calculate if we have current values
    if (macros.calories.current > 0 || macros.protein.current > 0 || macros.carbs.current > 0 || macros.fats.current > 0) {
      console.log(`DEBUG - Calculating adherence from current macros:`, JSON.stringify(macros));
      
      // Calculate score for current macros
      const caloriesScore = Math.min((macros.calories.current / (macros.calories.goal || 1)) * 100, 100);
      const proteinScore = Math.min((macros.protein.current / (macros.protein.goal || 1)) * 100, 100);
      const carbsScore = Math.min((macros.carbs.current / (macros.carbs.goal || 1)) * 100, 100);
      const fatsScore = Math.min((macros.fats.current / (macros.fats.goal || 1)) * 100, 100);
      
      console.log(`DEBUG - Current scores: calories=${caloriesScore.toFixed(1)}%, protein=${proteinScore.toFixed(1)}%, carbs=${carbsScore.toFixed(1)}%, fats=${fatsScore.toFixed(1)}%`);
      
      // Calculate weighted score
      const score = Math.round(
        caloriesScore * 0.4 +
        proteinScore * 0.3 +
        carbsScore * 0.15 +
        fatsScore * 0.15
      );
      
      console.log(`DEBUG - Current adherence score: ${score}%`);
      return score;
    }
    return 0;
  }, [macros]);

  // Fix the filter logic in the nutrition adherence calculation
  useEffect(() => {
    if (!user) return;

    // Get dates for query - we want the last 7 completed days (excluding today)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    const yesterday = subDays(today, 1);
    const eightDaysAgo = subDays(today, 8); // 7 days before yesterday
    
    // Format dates for query
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    const eightDaysAgoStr = format(eightDaysAgo, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');
    
    //console.log(`DEBUG - Fetching historical nutrition data for adherence calculation`);
    //console.log(`DEBUG - Date range: ${eightDaysAgoStr} to ${yesterdayStr} (explicitly excluding today ${todayStr})`);

    // Get all documents once rather than using a real-time listener
    const fetchNutritionHistory = async () => {
      try {
        // Reference to the dailyMacros collection
        const dailyMacrosRef = collection(db, 'users', user.uid, 'dailyMacros');
        
        // Get all documents (we'll filter in memory)
        const querySnapshot = await getDocs(dailyMacrosRef);
        
        // Get the user's macro goals document to use as backup if goals aren't stored with daily entries
        const userMacrosDoc = await getDoc(doc(db, 'users', user.uid, 'macros', 'goals'));
        let defaultGoals = {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fats: 55
        };
        
        if (userMacrosDoc.exists()) {
          const goalsData = userMacrosDoc.data();
          defaultGoals = {
            calories: goalsData.calories || 2000,
            protein: goalsData.protein || 150,
            carbs: goalsData.carbs || 200,
            fats: goalsData.fats || 55
          };
        }
        
        //console.log(`DEBUG - Default goals if needed:`, JSON.stringify(defaultGoals));
        
        // Include days in the date range, from 7 days before yesterday up to yesterday
        // EXPLICITLY exclude today
        const validDocs = querySnapshot.docs.filter(doc => {
          const dateId = doc.id;
          return dateId >= eightDaysAgoStr && 
                 dateId <= yesterdayStr && 
                 dateId !== todayStr; // Extra check to ensure today is excluded
        });
        
        //console.log(`DEBUG - Found ${validDocs.length} dailyMacros documents in date range: ${eightDaysAgoStr} to ${yesterdayStr}`);
        
        // Only process documents with actual nutrition data (at least one meal logged)
        // This ensures we only count days where the user has logged something
        const docsWithData = validDocs.filter(doc => {
          const data = doc.data();
          // Only count days where at least one macro has been recorded
          // This is how we identify days with logged meals
          return (data.calories > 0 || data.protein > 0 || data.carbs > 0 || data.fats > 0);
        });
        
        //console.log(`DEBUG - Found ${docsWithData.length} documents with actual nutrition data (at least one meal logged)`);
        
        // Array to hold valid adherence scores
        const validScores: number[] = [];
        
        // Process each day's nutrition data
        for (const doc of docsWithData) {
          const data = doc.data();
          //console.log(`DEBUG - Processing dailyMacros doc for ${doc.id}:`, JSON.stringify(data));
          
          // If goals are not stored with this day's data, add the default goals
          if (!data.calorieGoal) {
            data.calorieGoal = defaultGoals.calories;
            data.proteinGoal = defaultGoals.protein;
            data.carbsGoal = defaultGoals.carbs;
            data.fatsGoal = defaultGoals.fats;
          }
          
          // Calculate this day's adherence score
          const dayScore = calculateDayScore(data);
          //console.log(`DEBUG - Day ${doc.id} adherence score: ${dayScore.toFixed(1)}%`);
          
          // Only include non-zero scores
          if (dayScore > 0) {
            validScores.push(dayScore);
          }
        }
        
        // Calculate average adherence from valid days only
        if (validScores.length > 0) {
          const averageAdherence = Math.round(
            validScores.reduce((sum, score) => sum + score, 0) / validScores.length
          );
          //console.log(`DEBUG - Final adherence from ${validScores.length} days: ${averageAdherence}%`);
          
          // Cache the result to avoid excessive recalculations
          setNutritionAdherence(averageAdherence);
        } else {
          // No valid historical data found
          //console.log('DEBUG - No valid historical nutrition data found for adherence calculation');
          setNutritionAdherence(0);
        }
      } catch (error) {
        console.error('Error calculating nutrition adherence:', error);
        setNutritionAdherence(0);
      }
    };
    
    // Execute the fetch function
    fetchNutritionHistory();
    
    // Also set up a listener for any changes to the dailyMacros collection
    // that should trigger a recalculation, but only when documents in our date range change
    const dailyMacrosRef = collection(db, 'users', user.uid, 'dailyMacros');
    const unsubscribe = onSnapshot(dailyMacrosRef, (snapshot) => {
      // Check if any of the changed documents are within our date range (excluding today)
      const needsRecalculation = snapshot.docChanges().some(change => {
        const dateId = change.doc.id;
        return dateId >= eightDaysAgoStr && 
               dateId <= yesterdayStr && 
               dateId !== todayStr;
      });
      
      if (needsRecalculation) {
        console.log('DEBUG - Historical dailyMacros documents changed, recalculating adherence');
        fetchNutritionHistory();
      } else {
        //console.log('DEBUG - Changes detected but not to historical documents, skipping recalculation');
      }
    });
    
    return () => {
      //console.log('DEBUG - Cleaning up nutrition adherence recalculation listener');
      unsubscribe();
    };
  }, [user, calculateDayScore]);

  // Add a specific listener for today's data to ensure real-time updates from the nutrition tab
  useEffect(() => {
    if (!user) return;
    
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    //console.log(`DEBUG - Setting up dedicated listener for today's data: ${todayStr}`);
    
    // Reference to today's dailyMacros document
    const docRef = doc(db, 'users', user.uid, 'dailyMacros', todayStr);
    
    // Set up the listener with error handling
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      // Only process if we're on the today view (not viewing a past date)
      if (!selectedDate) {
        //console.log(`DEBUG - Real-time update for today's nutrition data`);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          //console.log(`DEBUG - Today's data updated: ${JSON.stringify(data)}`);
          
          // If we have macros in the context but they don't match what's in Firebase
          // then update the calorie card (ensures sync with nutrition tab)
          if (data.calories !== macros.calories.current) {
            //console.log(`DEBUG - Syncing calories: Firebase=${data.calories}, Context=${macros.calories.current}`);
            
            setTodayCalories(prev => ({
              ...prev,
              current: data.calories || 0,
              lastUpdated: new Date().toISOString()
            }));
          }
        }
      }
    }, (error) => {
      console.error('Error listening to today\'s nutrition data:', error);
    });
    
    return () => {
      //console.log('DEBUG - Cleaning up today\'s nutrition data listener');
      unsubscribe();
    };
  }, [user, selectedDate, macros.calories.current]);

  // Helper to sync with today's data in context when the tab becomes active
  useEffect(() => {
    // If we're viewing today and have fresh context data, update the calorie card
    if (!selectedDate && macros.calories.current >= 0) {
      //console.log(`DEBUG - Syncing from nutrition context: ${macros.calories.current} calories`);
      
      // Only update if different to avoid render loops
      if (todayCalories.current !== macros.calories.current) {
        setTodayCalories(prev => ({
          ...prev,
          current: macros.calories.current,
          goal: macros.calories.goal > 0 ? macros.calories.goal : prev.goal,
          lastUpdated: new Date().toISOString()
        }));
      }
    }
  }, [selectedDate, macros.calories, todayCalories.current]);

  // Modify your Firebase listener setup to avoid duplicate listeners:
  useEffect(() => {
    if (!user) return;
    
    //console.log('DEBUG - Setting up main data listeners');
    
    // Keep track of active listeners
    const subscriptions: (() => void)[] = [];
    
    // Only set up the specific listeners we need
    // 1. Listener for today's calories (already set up elsewhere)
    // 2. Listener for recovery data (already set up elsewhere)
    
    // Clean up ALL subscriptions when component unmounts
    return () => {
      //console.log(`DEBUG - Cleaning up ${subscriptions.length} global subscriptions`);
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [user]);

  // Calculate readiness score based on recovery data
  const calculateReadinessScore = useCallback((data: any) => {
    if (!data) {
      setReadinessScore(0);
      return;
    }
    
    // Extract recovery metrics with correct mapping to the UI sliders
    // Slider 1: "How intense was the training yesterday?" maps to data.fatigue
    // Slider 2: "How sore are you?" maps to data.soreness
    // Slider 3: "How tired do you feel overall?" maps to data.mood
    // Slider 4: "Sleep duration last night" maps to data.sleep
    const trainingIntensity = data.fatigue || 5; // How intense was the training
    const soreness = data.soreness || 5; // How sore are you
    const fatigue = data.mood || 5; // How tired do you feel overall
    const sleepAmount = data.sleep || 5; // Sleep duration last night
    
    // Calculate the load average (intensity, soreness, fatigue)
    const loadAverage = (trainingIntensity + soreness + fatigue) / 3;
    
    // Base score calculation (non-linear relationship with load)
    let baseScore;
    if (loadAverage <= 1) {
      // Very low load: maximum score
      baseScore = 100; // 100% at 1 or below
    } else if (loadAverage <= 2) {
      // Low load: high baseline score
      baseScore = 100 - ((loadAverage - 1) * 20); // 100% at 1, 80% at 2
    } else if (loadAverage <= 5) {
      // Moderate load: medium-high baseline
      baseScore = 80 - ((loadAverage - 2) * 5); // 80% at 2, 65% at 5
    } else if (loadAverage <= 8) {
      // High load: faster decrease
      baseScore = 65 - ((loadAverage - 5) * 16.7); // 65% at 5, 15% at 8
    } else {
      // Very high load: minimal score
      baseScore = 15 - ((loadAverage - 8) * 5); // 15% at 8, 0% at 11
    }
    
    // Sleep adjustment
    let sleepMultiplier = 1.0;
    if (sleepAmount >= 9) {
      // Excellent sleep bonus
      sleepMultiplier = 1.225; // 22.5% bonus for excellent sleep
    } else if (sleepAmount >= 7) {
      // Good sleep - slight bonus
      sleepMultiplier = 1.1; // 10% bonus for good sleep
    } else if (sleepAmount <= 5) {
      // Poor sleep penalty
      sleepMultiplier = 0.8; // 20% penalty for poor sleep
    } else if (sleepAmount <= 3) {
      // Very poor sleep severe penalty
      sleepMultiplier = 0.6; // 40% penalty for very poor sleep
    }
    
    // Apply sleep multiplier to base score
    let finalScore = Math.round(baseScore * sleepMultiplier);
    
    // Special case handling for extreme scenarios
    if (loadAverage >= 10 && sleepAmount <= 7) {
      finalScore = 5; // Extreme load with inadequate sleep = 5%
    }
    
    // Ensure consistency at all load levels - lower load should always mean higher score
    // This additional check prevents any inversions in the scoring
    if (loadAverage <= 2 && sleepAmount >= 9) {
      // For load average of 2 with excellent sleep, ensure around 98%
      finalScore = Math.max(finalScore, 98);
    }
    
    // Ensure score is within 0-100 range
    finalScore = Math.min(Math.max(finalScore, 0), 100);
    
    setReadinessScore(finalScore);
  }, []);

  // Set up real-time listener for recovery data
  useEffect(() => {
    if (!user) return;

    // Get today's date in yyyy-MM-dd format
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Reference to today's recovery document
    const recoveryRef = doc(db, 'users', user.uid, 'recovery', todayStr);
    
    // Set up the listener
    const unsubscribe = onSnapshot(recoveryRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setRecoveryData(data);
        calculateReadinessScore(data);
      } else {
        // No recovery data for today
        setRecoveryData(null);
        setReadinessScore(0);
      }
    }, (error) => {
      console.error('Error listening to recovery data:', error);
    });
    
    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, [user, calculateReadinessScore]);

  // Add a function to fetch nutrition data if needed for UI purposes
  const fetchNutritionData = useCallback(async () => {
    if (!user) return;
    
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      
      const todayStr = format(today, 'yyyy-MM-dd');
      const sevenDaysAgoStr = format(sevenDaysAgo, 'yyyy-MM-dd');
      
      const nutritionRef = collection(db, 'users', user.uid, 'nutrition');
      const q = query(
        nutritionRef,
        where('date', '>=', sevenDaysAgoStr),
        where('date', '<=', todayStr),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setNutritionData(data);
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
    }
  }, [user]);

  // Call it when component mounts
  useEffect(() => {
    fetchNutritionData();
  }, [fetchNutritionData]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Add function to load today's calories specifically
  const loadTodayCalories = useCallback(async () => {
    if (!user) return;
    
    try {
      //console.log(`DEBUG - Loading today's calories specifically for the calorie card`);
      
      // Set loading state
      setTodayCalories(prev => ({
        ...prev,
        isLoading: true
      }));
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      // Reference to today's dailyMacros document
      const docRef = doc(db, 'users', user.uid, 'dailyMacros', todayStr);
      const docSnap = await getDoc(docRef);
      
      // Get goal from macros context or from Firebase
      let calorieGoal = 0;
      
      // Prefer the macros context value as it's most up-to-date
      if (macros.calories.goal > 0) {
        calorieGoal = macros.calories.goal;
        //console.log(`DEBUG - Using today's calorie goal from context: ${calorieGoal}`);
      } else {
        try {
          // If context doesn't have the goal, fetch from Firebase
          const userMacrosDoc = await getDoc(doc(db, 'users', user.uid, 'macros', 'goals'));
          if (userMacrosDoc.exists()) {
            const macrosData = userMacrosDoc.data();
            if (macrosData.calories && macrosData.calories > 0) {
              calorieGoal = macrosData.calories;
              //console.log(`DEBUG - Using calorie goal from Firebase: ${calorieGoal}`);
            }
          }
        } catch (error) {
          console.error('Error fetching user macros goals:', error);
        }
      }
      
      // Default goal if nothing found
      if (calorieGoal <= 0) {
        calorieGoal = 2000;
        //console.log(`DEBUG - Using default calorie goal: ${calorieGoal}`);
      }
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        //console.log(`DEBUG - Found today's data:`, JSON.stringify(data));
        
        setTodayCalories({
          current: data.calories || 0,
          goal: calorieGoal,
          lastUpdated: new Date().toISOString(),
          isLoading: false
        });
      } else {
        // No data found for today
        //console.log(`DEBUG - No data found for today, using zero values`);
        
        setTodayCalories({
          current: 0,
          goal: calorieGoal,
          lastUpdated: new Date().toISOString(),
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error loading today\'s calories:', error);
      setTodayCalories(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }, [user, macros.calories.goal]);

  // Call loadTodayCalories when component mounts and when macros change
  useEffect(() => {
    loadTodayCalories();
  }, [loadTodayCalories]);
  
  // Set up real-time listener for today's calories specifically
  useEffect(() => {
    if (!user) return;
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    //console.log(`DEBUG - Setting up real-time listener for today's calories: ${todayStr}`);
    
    // Reference to today's dailyMacros document
    const docRef = doc(db, 'users', user.uid, 'dailyMacros', todayStr);
    
    // Set up the listener
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      //console.log(`DEBUG - Real-time update for today's calories`);
      
      // Get goal from macros context
      let calorieGoal = macros.calories.goal > 0 ? macros.calories.goal : todayCalories.goal;
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        //console.log(`DEBUG - Today's data updated: ${JSON.stringify(data)}`);
        
        setTodayCalories({
          current: data.calories || 0,
          goal: calorieGoal,
          lastUpdated: new Date().toISOString(),
          isLoading: false
        });
      } else {
        //console.log(`DEBUG - No document exists for today`);
        
        setTodayCalories({
          current: 0,
          goal: calorieGoal,
          lastUpdated: new Date().toISOString(),
          isLoading: false
        });
      }
    }, (error) => {
      console.error(`ERROR - Failed to listen to today's data:`, error);
      
      setTodayCalories(prev => ({
        ...prev,
        isLoading: false,
        error: true
      }));
    });
    
    // Cleanup function
    return () => {
      //console.log(`DEBUG - Cleaning up listener for today's calories`);
      unsubscribe();
    };
  }, [user, macros.calories.goal, todayCalories.goal]);

  // Fetch user profile data including age, gender, injury history, etc.
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const userProfileDoc = await getDoc(doc(db, 'users', user.uid, 'profile', 'details'));
        if (userProfileDoc.exists()) {
          setUserProfile(userProfileDoc.data());
        } else {
          // Create a default profile if none exists
          const defaultProfile = {
            age: null,
            gender: null,
            height: null,
            weight: null,
            injuryHistory: [],
            fitnessLevel: 'intermediate',
            lastUpdated: new Date().toISOString()
          };
          setUserProfile(defaultProfile);
          
          // Save default profile to Firestore
          await setDoc(doc(db, 'users', user.uid, 'profile', 'details'), defaultProfile);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  // Add conversation history type and state variable after the existing state variables
  const [questionHistory, setQuestionHistory] = useState<Array<{
    question: string;
    response: string;
    timestamp: string;
  }>>([]);

  // Modify the checkDailyQuestionLimit function to handle missing index
  useEffect(() => {
    const checkDailyQuestionLimit = async () => {
      if (!user) return;
      
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const questionLimitDoc = await getDoc(doc(db, 'users', user.uid, 'aiQuestions', 'counter'));
        
        if (questionLimitDoc.exists()) {
          const data = questionLimitDoc.data();
          
          // If data is from today, use it
          if (data.date === today) {
            setQuestionCount(data.count || 0);
          } else {
            // Reset counter for new day
            await setDoc(doc(db, 'users', user.uid, 'aiQuestions', 'counter'), {
              count: 0,
              date: today,
              maxQuestions: 5
            });
            setQuestionCount(0);
            // Clear conversation history for new day
            setQuestionHistory([]);
          }
          
          // Set max questions from stored value
          setMaxQuestions(data.maxQuestions || 5);
        } else {
          // Initialize counter document
          await setDoc(doc(db, 'users', user.uid, 'aiQuestions', 'counter'), {
            count: 0,
            date: today,
            maxQuestions: 5
          });
          setQuestionCount(0);
        }

        // Try to fetch today's conversation history - handling the case where index might be missing
        try {
          // First attempt with the optimal query (requires composite index)
          const questionsRef = collection(db, `users/${user.uid}/aiQuestions`);
          const q = query(
            questionsRef,
            where('date', '==', today),
            orderBy('timestamp', 'asc')
          );
          
          const querySnapshot = await getDocs(q);
          const history = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              question: data.question,
              response: data.response,
              timestamp: data.timestamp ? new Date(data.timestamp.toDate()).toISOString() : new Date().toISOString()
            };
          });
          
          setQuestionHistory(history);
        } catch (indexError) {
          console.log("Index error detected, using fallback method to fetch questions");
          
          // Fallback method if index doesn't exist
          try {
            // Get all questions for today without ordering (doesn't require composite index)
            const questionsRef = collection(db, `users/${user.uid}/aiQuestions`);
            const simpleQuery = query(
              questionsRef,
              where('date', '==', today)
            );
            
            const querySnapshot = await getDocs(simpleQuery);
            
            // Get all documents and sort them in memory
            const history = querySnapshot.docs
              .map(doc => {
                const data = doc.data();
                return {
                  question: data.question,
                  response: data.response,
                  // Convert Firestore timestamp to Date object, or use a default if not available
                  timestamp: data.timestamp ? new Date(data.timestamp.toDate()).toISOString() : new Date().toISOString()
                };
              })
              // Sort by timestamp manually
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
            setQuestionHistory(history);
            
            // Display a message to the user suggesting they create the index
            if (querySnapshot.docs.length > 0) {
              console.warn(
                "Please create the required Firebase index to optimize question loading: " +
                "Go to your Firebase console → Firestore → Indexes and add a composite index on 'aiQuestions' " +
                "collection with fields 'date' (Ascending) and 'timestamp' (Ascending)"
              );
            }
          } catch (fallbackError) {
            console.error("Even fallback query failed:", fallbackError);
            // If all else fails, at least we'll have the question count correct
            // The user can still ask questions up to their limit
          }
        }
        
      } catch (error) {
        console.error('Error checking question limit or fetching history:', error);
      }
    };
    
    checkDailyQuestionLimit();
  }, [user]);

  // Update askAiQuestion to properly update the counter in Firebase
  const askAiQuestion = async () => {
    if (!question.trim() || questionCount >= maxQuestions) {
      return;
    }

    try {
      setIsAiLoading(true);
      
      // Save the current question to display it immediately
      const currentQuestion = question;
      setQuestion('');

      // Create context from user profile
      let userContext = '';
      if (userProfile) {
        userContext = `User profile: ${userProfile.age ? `Age: ${userProfile.age}, ` : ''}${userProfile.gender ? `Gender: ${userProfile.gender}, ` : ''}${userProfile.position ? `Position: ${userProfile.position}, ` : ''}${userProfile.dominantFoot ? `Dominant foot: ${userProfile.dominantFoot}, ` : ''}${userProfile.injuryHistory ? `Injury history: ${userProfile.injuryHistory}` : ''}`;
      }

      // Call OpenAI API using the utility function
      const response = await askOpenAI(currentQuestion, userContext);
      
      // Update the conversation history with a temporary item
      const newHistoryItem = {
        question: currentQuestion,
        response: response,
        timestamp: new Date().toISOString()
      };
      
      // Add to conversation history
      setQuestionHistory(prevHistory => [...prevHistory, newHistoryItem]);

      // After getting a response, save the question and response to Firestore
      if (user) {
        try {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const questionsRef = collection(db, `users/${user.uid}/aiQuestions`);
          
          await addDoc(questionsRef, {
            question: currentQuestion,
            response,
            timestamp: serverTimestamp(),
            date: todayStr
          });

          // Update the counter document directly rather than using increment
          // This ensures the count is always accurate
          const counterRef = doc(db, 'users', user.uid, 'aiQuestions', 'counter');
          const newCount = questionCount + 1;
          
          await setDoc(counterRef, {
            count: newCount,
            date: todayStr,
            maxQuestions: maxQuestions
          }, { merge: true });

          // Update local state
          setQuestionCount(newCount);
        } catch (error) {
          console.error('Error saving question:', error);
        }
      }
    } catch (error) {
      console.error('Error asking AI:', error);
      setAiResponse('Sorry, there was an error processing your question. Please try again later.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Function to handle question input change with character limit
  const handleQuestionChange = (text: string) => {
    // Limit to 60 characters
    if (text.length <= 60) {
      setQuestion(text);
    }
  };
  
  // Reset response when closing question panel
  useEffect(() => {
    if (!showQuestion) {
      setAiResponse('');
      setQuestion('');
    }
  }, [showQuestion]);

  // Add refs for ScrollView and TextInput
  const scrollViewRef = useRef<ScrollView>(null);
  const questionInputRef = useRef<TextInput>(null);

  // Enhanced function to handle smooth auto-scrolling when the text input is focused
  const handleQuestionInputFocus = () => {
    // First quick scroll to roughly the right position
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
    
    // Then wait for the keyboard to fully appear before doing a final precise scroll
    setTimeout(() => {
      if (scrollViewRef.current) {
        // Final scroll with a smooth animation to ensure input is perfectly visible
        scrollViewRef.current.scrollToEnd({ 
          animated: true 
        });
      }
    }, 350); // Slightly longer timeout to ensure keyboard is fully visible
  };

  // Keep the existing effect to show the question section when opened, but don't auto-focus
  useEffect(() => {
    if (showQuestion && scrollViewRef.current) {
      // Make the question section visible when it's opened
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ 
            animated: true 
          });
        }
      }, 100);
    }
  }, [showQuestion]);

  // Add a function to calculate the daily recovery score
  const calculateDailyRecoveryScore = useCallback((sleepQuality: number, planCompleted: boolean) => {
    // Sleep score - 9 hours (sleep quality of 9) is the ideal
    // Scale is 1-10, so we'll calculate as a percentage of ideal (9)
    const sleepScore = Math.min((sleepQuality / 9) * 100, 100);
    
    // Plan completion score - 100% if completed, 0% if not
    const planScore = planCompleted ? 100 : 0;
    
    // Weight sleep as 60% and plan completion as 40% of the total score
    const dailyScore = (sleepScore * 0.6) + (planScore * 0.4);
    
    return Math.round(dailyScore);
  }, []);

  // Add a function to fetch and calculate recovery adherence
  const calculateRecoveryAdherence = useCallback(async () => {
    if (!user) return 0;

    try {
      // Get dates for query - we want the last 7 completed days (excluding today)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
      const yesterday = subDays(today, 1);
      const eightDaysAgo = subDays(today, 8); // 7 days before yesterday
      
      // Format dates for query
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
      const eightDaysAgoStr = format(eightDaysAgo, 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');
      
      //console.log(`DEBUG - Fetching historical recovery data for adherence calculation`);
      //console.log(`DEBUG - Date range: ${eightDaysAgoStr} to ${yesterdayStr} (explicitly excluding today ${todayStr})`);

      // Array to hold valid recovery scores
      const validScores: number[] = [];
      
      // Loop through the last 7 days
      for (let i = 1; i <= 7; i++) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Get recovery data for this day
        const recoveryRef = doc(db, 'users', user.uid, 'recovery', dateStr);
        const recoverySnap = await getDoc(recoveryRef);
        
        // Get recovery plan for this day to check completion status
        const planRef = doc(db, 'users', user.uid, 'recoveryPlans', dateStr);
        const planSnap = await getDoc(planRef);
        
        // Only include days where recovery data was submitted
        if (recoverySnap.exists()) {
          const data = recoverySnap.data();
          
          // Get sleep quality (in our app, this is mapped to "Sleep duration last night")
          // Note that in the recovery data it's stored as "mood" due to the UI field mapping
          const sleepQuality = data.sleep || 0;
          
          // Check if a plan exists and was completed
          const planExists = planSnap.exists();
          const planCompleted = planExists ? planSnap.data().completed || false : false;
          
          // Only calculate score if sleep data exists
          if (sleepQuality > 0) {
            const dailyScore = calculateDailyRecoveryScore(sleepQuality, planCompleted);
            //console.log(`DEBUG - Day ${dateStr} recovery score: ${dailyScore}% (Sleep: ${sleepQuality}, Plan completed: ${planCompleted})`);
            validScores.push(dailyScore);
          }
        }
      }
      
      // Calculate average adherence from valid days only
      if (validScores.length > 0) {
        const averageAdherence = Math.round(
          validScores.reduce((sum, score) => sum + score, 0) / validScores.length
        );
        //console.log(`DEBUG - Final recovery adherence from ${validScores.length} days: ${averageAdherence}%`);
        
        return averageAdherence;
      } else {
        // No valid historical data found
        //console.log('DEBUG - No valid historical recovery data found for adherence calculation');
        return 0;
      }
    } catch (error) {
      console.error('Error calculating recovery adherence:', error);
      return 0;
    }
  }, [user, calculateDailyRecoveryScore]);

  // Effect to calculate and set recovery adherence
  useEffect(() => {
    const fetchRecoveryAdherence = async () => {
      const adherence = await calculateRecoveryAdherence();
      setRecoveryAdherence(adherence);
    };
    
    fetchRecoveryAdherence();
    
    // Set up a listener for changes to recovery data or plans
    if (user) {
      const recoveryCollectionRef = collection(db, 'users', user.uid, 'recovery');
      const plansCollectionRef = collection(db, 'users', user.uid, 'recoveryPlans');
      
      const unsubscribeRecovery = onSnapshot(recoveryCollectionRef, () => {
        //console.log('DEBUG - Recovery data changed, recalculating adherence');
        fetchRecoveryAdherence();
      });
      
      const unsubscribePlans = onSnapshot(plansCollectionRef, () => {
        //console.log('DEBUG - Recovery plans changed, recalculating adherence');
        fetchRecoveryAdherence();
      });
      
      return () => {
        unsubscribeRecovery();
        unsubscribePlans();
      };
    }
  }, [user, calculateRecoveryAdherence]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 40}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Platform.OS === 'ios' ? 180 : 140,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        bounces={true}
        overScrollMode="auto"
        alwaysBounceVertical={true}
      >
        {/* Header - Scrolls with content */}
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
              Home
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

        <View style={{ padding: 16, gap: 24 }}>
          {/* Subscription Status Component */}
          <SubscriptionStatus showExpirationAlert={true} />

          {/* Overview Section */}
          <View style={{ 
            alignItems: 'center',
            marginTop: -16,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5',
          }}>
            <Text style={{ 
              fontSize: 28, 
              fontWeight: '600',
              color: '#000000',
            }} allowFontScaling={false}>
              Today's Progress
            </Text>
          </View>
                  
          {/* First Row of Cards */}
          <View style={{ 
            flexDirection: 'row', 
            gap: 8,
            width: '100%', // Ensure full container width
            justifyContent: 'space-between',
          }}>
            {/* Daily Calories Card - Now using CalorieProgress component */}
            <View style={{ 
              width: '49%', // Slightly less than 50% to account for the gap
            }}>
              <CalorieProgress />
            </View>

            {/* Readiness Card */}
            <View style={{
              width: '49%', // Slightly less than 50% to account for the gap
              padding: 16,
              gap: 24,
              borderRadius: 16,
              backgroundColor: '#DCF4F5',
              alignItems: 'center',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
              borderWidth: 1,
              borderColor: '#E5E5E5',
              minHeight: 280,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="trending-up" size={24} color="#000000" />
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: '#000000',
                  }} allowFontScaling={false}>
                    Readiness 
                  </Text>
                </View>
                <Pressable
                  onPress={showInfoAlertReadiness}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="information-circle-outline" size={24} color="#000000" />
                </Pressable>
              </View>

              {/* Progress Circle Container */}
              <View style={{ 
                width: 180,
                height: 180,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Svg width="180" height="180" style={{
                  position: 'absolute',
                  transform: [{ rotate: '-90deg' }],
                }}>
                  <Circle
                    cx="90"
                    cy="90"
                    r="70"
                    stroke="#ffffff"
                    strokeWidth="12"
                    fill="none"
                  />
                  <Circle
                    cx="90"
                    cy="90"
                    r="70"
                    stroke="#17B3BB"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={2 * Math.PI * 70 * (1 - readinessScore / 100)}
                  />
                </Svg>

                <Text style={{ 
                  fontSize: 34, 
                  fontWeight: '700', 
                  color: '#000000',
                }}>
                  {readinessScore}%
                </Text>
              </View>

              <Text style={{ 
                fontSize: 14, 
                color: '#666666',
                textAlign: 'center',
              }}>
                {readinessScore > 0 
                  ? readinessScore >= 70 
                    ? 'Your body is ready\nfor high intensity training!'
                    : readinessScore >= 40
                    ? 'Your body needs\nmoderate intensity today.'
                    : 'Focus on recovery\ntoday, take it easy.'
                  : 'Submit recovery data\nto see your score'
                }
              </Text>
            </View>
          </View>

          {/* Weekly Progress Section Header */}
          <View style={{ 
            alignItems: 'center',
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5',
          }}>
            <Text style={{ 
              fontSize: 28, 
              fontWeight: '600',
              color: '#000000',
            }} allowFontScaling={false}>
              Weekly Progress
            </Text>
          </View>

          {/* Second Row of Cards */}
          <View style={{ 
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            {/* Nutrition Adherence Card */}
            <View style={{
              width: '49%', // Slightly less than 50% to account for the gap
              padding: 16,
              gap: 24,
              borderRadius: 16,
              backgroundColor: '#FFDDBB',
              alignItems: 'center',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
              borderWidth: 1,
              borderColor: '#E5E5E5',
              minHeight: 280,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="nutrition-outline" size={24} color="#000000" />
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '600',
                    color: '#000000',
                  }} allowFontScaling={false}>
                    Nutrition
                  </Text>
                </View>
                <Pressable
                  onPress={showInfoAlertNutrition}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="information-circle-outline" size={24} color="#000000" />
                </Pressable>
              </View>

              {/* Weekly Nutrition Adherence Circle - Keeps showing the WEEKLY average */}
              <View style={{ 
                width: 180,
                height: 180,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Svg width="180" height="180" style={{
                  position: 'absolute',
                  transform: [{ rotate: '-90deg' }],
                }}>
                  <Circle
                    cx="90"
                    cy="90"
                    r="70"
                    stroke="#ffffff"
                    strokeWidth="12"
                    fill="none"
                  />
                  <Circle
                    cx="90"
                    cy="90"
                    r="70"
                    stroke="#ED7E1C"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={2 * Math.PI * 70 * (1 - nutritionAdherence / 100)}
                  />
                </Svg>

                <Text style={{ 
                  fontSize: 34, 
                  fontWeight: '700', 
                  color: '#000000',
                }}>
                  {nutritionAdherence}%
                </Text>
              </View>

              <Text style={{ 
                fontSize: 14, 
                color: '#666666',
                textAlign: 'center',
              }}>
                {nutritionAdherence > 0 
                  ? nutritionAdherence >= 80
                    ? 'Excellent nutrition habits\nthis week!'
                    : nutritionAdherence >= 50
                    ? 'Good nutrition habits\nthis week!'
                    : 'Keep working on your\nnutrition goals!'
                  : 'Start logging meals\nto improve your score'
                }
              </Text>
            </View>
            
            {/* New Recovery Card */}
            <View style={{
              width: '49%', // Slightly less than 50% to account for the gap
              padding: 16,
              gap: 24,
              borderRadius: 16,
              backgroundColor: '#DCF5DC', // Light green background
              alignItems: 'center',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
              borderWidth: 1,
              borderColor: '#E5E5E5',
              minHeight: 280,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="fitness-outline" size={24} color="#000000" />
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '600',
                    color: '#000000',
                  }} allowFontScaling={false}>
                    Recovery
                  </Text>
                </View>
                <Pressable
                  onPress={showInfoAlertRecovery}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="information-circle-outline" size={24} color="#000000" />
                </Pressable>
              </View>

              {/* Recovery Progress Circle */}
              <View style={{ 
                width: 180,
                height: 180,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Svg width="180" height="180" style={{
                  position: 'absolute',
                  transform: [{ rotate: '-90deg' }],
                }}>
                  <Circle
                    cx="90"
                    cy="90"
                    r="70"
                    stroke="#ffffff"
                    strokeWidth="12"
                    fill="none"
                  />
                  <Circle
                    cx="90"
                    cy="90"
                    r="70"
                    stroke="#99E86C" // Green progress color
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={2 * Math.PI * 70 * (1 - recoveryAdherence / 100)}
                  />
                </Svg>

                <Text style={{ 
                  fontSize: 34, 
                  fontWeight: '700', 
                  color: '#000000',
                }}>
                  {recoveryAdherence}%
                </Text>
              </View>

              <Text style={{ 
                fontSize: 14, 
                color: '#666666',
                textAlign: 'center',
              }}>
                {recoveryAdherence > 0 
                  ? recoveryAdherence >= 80
                    ? 'Excellent recovery habits\nthis week!'
                    : recoveryAdherence >= 50
                    ? 'Good recovery routine.\nKeep it consistent!'
                    : 'Focus on improving your\nsleep and recovery plans!'
                  : 'Submit recovery data\nto see your score'
                }
              </Text>
            </View>
          </View>

          {/* Ask AI Section */}
          <View style={{
            backgroundColor: '#4A3AFF',
            borderRadius: 24,
            padding: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 24,
                fontWeight: '600',
                color: '#FFFFFF',
                marginBottom: 8,
              }}>
                Ask me a question!
              </Text>
              <Pressable
                onPress={() => setShowQuestion(!showQuestion)}
                style={({ pressed }) => ({
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 32,
                  alignSelf: 'flex-start',
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#4A3AFF',
                }}>
                  {showQuestion ? 'Close' : 'Ask Ballzy'}
                </Text>
              </Pressable>
            </View>

            <Image 
              source={require('../../assets/images/mascot.png')}
              style={{
                width: 120,
                height: 120,
                marginRight: -24,
                marginBottom: -24,
              }}
              resizeMode="contain"
            />
          </View>

          {/* Question Interface */}
          {showQuestion && (
            <View style={{
              padding: 24,
              gap: 16,
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: '#000000',
            }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '600',
                  color: '#000000',
                }} allowFontScaling={false}>
                  Ask Ballzy
                </Text>
                <Text style={{
                  color: questionCount >= maxQuestions ? '#FF3B30' : '#666666', 
                  fontSize: 14
                }}>
                  {questionCount}/{maxQuestions} questions
                </Text>
              </View>

              {questionHistory.length > 0 && (
                <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
                  <View style={{ gap: 24 }}>
                    {questionHistory.map((item, index) => (
                      <View key={index} style={{ gap: 8 }}>
                        <View style={{
                          flexDirection: 'row',
                          justifyContent: 'flex-end',
                          gap: 8,
                        }}>
                          <View style={{
                            backgroundColor: '#000000',
                            padding: 16,
                            borderRadius: 12,
                            borderBottomRightRadius: 4,
                            maxWidth: '80%',
                          }}>
                            <Text style={{
                              fontSize: 16,
                              color: '#FFFFFF',
                            }}>
                              {item.question}
                            </Text>
                          </View>
                        </View>
                        <View style={{
                          flexDirection: 'row',
                          gap: 8,
                        }}>
                          <Ionicons
                            name="football"
                            size={32}
                            color="#4A3AFF"
                            style={{
                              backgroundColor: '#F5F5FF',
                              padding: 8,
                              borderRadius: 16,
                            }}
                          />
                          <View style={{
                            flex: 1,
                            backgroundColor: '#F5F5FF',
                            padding: 16,
                            borderRadius: 12,
                            borderTopLeftRadius: 4,
                          }}>
                            <Text style={{
                              fontSize: 16,
                              color: '#000000',
                              lineHeight: 24,
                            }}>
                              {item.response}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
              
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    ref={questionInputRef}
                    value={question}
                    onChangeText={handleQuestionChange}
                    placeholder={questionCount >= maxQuestions ? "Daily limit reached. Try again tomorrow." : "Type your football question here..."}
                    maxLength={60}
                    multiline
                    numberOfLines={2}
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                      borderRadius: 12,
                      padding: 16,
                      fontSize: 16,
                      textAlignVertical: 'top',
                      minHeight: 80,
                      backgroundColor: questionCount >= maxQuestions ? '#F5F5F5' : '#FFFFFF',
                      color: questionCount >= maxQuestions ? '#999999' : '#000000',
                    }}
                    editable={questionCount < maxQuestions}
                    onFocus={handleQuestionInputFocus}
                  />
                  {questionCount < maxQuestions && (
                    <Text style={{ 
                      position: 'absolute',
                      bottom: 4,
                      right: 8,
                      fontSize: 12,
                      color: question.length >= 50 ? '#FF3B30' : '#666666',
                    }}>
                      {question.length}/60
                    </Text>
                  )}
                </View>
              </TouchableWithoutFeedback>
              
              <Pressable
                onPress={askAiQuestion}
                disabled={!question.trim() || questionCount >= maxQuestions || isAiLoading}
                style={({ pressed }) => ({
                  backgroundColor: !question.trim() || questionCount >= maxQuestions ? '#CCCCCC' : pressed ? '#3A2AEE' : '#4A3AFF',
                  paddingVertical: 12,
                  borderRadius: 36,
                  alignItems: 'center',
                  opacity: questionCount >= maxQuestions ? 0.6 : pressed ? 0.9 : 1,
                })}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                }}>
                  {isAiLoading ? 'Thinking...' : questionCount >= maxQuestions ? 'Limit Reached' : 'Get Answer'}
                </Text>
              </Pressable>

              {isAiLoading && (
                <View style={{ 
                  marginTop: 16, 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <ActivityIndicator size="large" color="#4A3AFF" />
                  <Text style={{ marginTop: 8, color: '#666666' }}>
                    BallerAI is thinking...
                  </Text>
                </View>
              )}

              {/* Show limit reached message */}
              {questionCount >= maxQuestions && (
                <View style={{
                  padding: 16,
                  backgroundColor: '#FFF5F5',
                  borderRadius: 12,
                  marginTop: 8,
                }}>
                  <Text style={{ color: '#FF3B30', textAlign: 'center' }}>
                    You've reached your daily limit of {maxQuestions} questions.
                    Come back tomorrow for more!
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Day Details - still preserving this functionality for when a date is selected */}
          {selectedDate && (
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 24,
              gap: 16,
              borderWidth: 1,
              borderColor: '#000000',
            }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#000000',
                }}>
                  {format(selectedDate, 'EEEE, MMMM d')}
                </Text>
                <Pressable
                  onPress={() => setSelectedDate(null)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{
                    fontSize: 16,
                    color: '#000000',
                  }}>
                    Close
                  </Text>
                </Pressable>
              </View>

              {/* Scores Grid */}
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                {/* Nutrition Score in the day details - Now shows the SELECTED DAY's adherence */}
                <View style={{
                  flex: 1,
                  minWidth: '45%',
                  backgroundColor: '#FFF5EB',
                  padding: 16,
                  borderRadius: 16,
                  gap: 8,
                }}>
                  <Text style={{ fontSize: 14, color: '#666666' }}>Nutrition Adherence</Text>
                  <Text style={{ 
                    fontSize: 24, 
                    fontWeight: '600', 
                    color: '#FF9500' 
                  }}>
                    {selectedDayAdherence}%
                  </Text>
                </View>

                {/* Recovery Score */}
                <View style={{
                  flex: 1,
                  minWidth: '45%',
                  backgroundColor: '#F5F5FF',
                  padding: 16,
                  borderRadius: 16,
                  gap: 8,
                }}>
                  <Text style={{ fontSize: 14, color: '#666666' }}>Recovery Score</Text>
                  <Text style={{ fontSize: 24, fontWeight: '600', color: '#4064F6' }}>90%</Text>
                </View>

                {/* Readiness Score */}
                <View style={{
                  flex: 1,
                  minWidth: '45%',
                  backgroundColor: '#F5F5FF',
                  padding: 16,
                  borderRadius: 16,
                  gap: 8,
                }}>
                  <Text style={{ fontSize: 14, color: '#666666' }}>Readiness Score</Text>
                  <Text style={{ fontSize: 24, fontWeight: '600', color: '#4A72B2' }}>{readinessScore}%</Text>
                </View>

                {/* Training Status */}
                <View style={{
                  flex: 1,
                  minWidth: '45%',
                  backgroundColor: '#F5F5FF',
                  padding: 16,
                  borderRadius: 16,
                  gap: 8,
                }}>
                  <Text style={{ fontSize: 14, color: '#666666' }}>Training Status</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons 
                      name={selectedDate > new Date() ? 'time-outline' : 'checkmark-circle'} 
                      size={24} 
                      color={selectedDate > new Date() ? '#666666' : '#99E86C'} 
                    />
                    <Text style={{ 
                      fontSize: 16, 
                      color: selectedDate > new Date() ? '#666666' : '#000000',
                    }}>
                      {selectedDate > new Date() ? 'Upcoming' : 'Completed'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Info Modal */}
      <Modal
        visible={showNutritionInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNutritionInfo(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowNutritionInfo(false)}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}>
            <TouchableWithoutFeedback>
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 24,
                width: '100%',
                maxWidth: 400,
                gap: 16,
              }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '600',
                  color: '#000000',
                }}>
                  Your Nutrition Score
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: '#666666',
                  lineHeight: 24,
                }}>
                  Your nutrition score is a percentage that shows how closely you've followed your macro goals in the last week.{'\n\n'}
                  This score is meant to give you an idea of how consistent you've been with your nutrition recently, helping you identify patterns and make adjustments if needed.{'\n\n'}
                  The score is calculated from your past 7 days of nutrition data (excluding today). Higher scores indicate better adherence to your macro goals.
                </Text>
                <Pressable
                  onPress={() => setShowNutritionInfo(false)}
                  style={({ pressed }) => ({
                    backgroundColor: '#4064F6',
                    padding: 16,
                    borderRadius: 12,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}>
                    Got it
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Readiness Info Modal */}
      <Modal
        visible={showReadinessInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReadinessInfo(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowReadinessInfo(false)}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}>
            <TouchableWithoutFeedback>
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 24,
                width: '100%',
                maxWidth: 400,
                gap: 16,
              }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '600',
                  color: '#000000',
                }}>
                  Understanding Your Readiness Score
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: '#666666',
                  lineHeight: 24,
                }}>
                  Your readiness score indicates how prepared your body is for training today.{'\n\n'}
                  This score is calculated based on the physical load your body has endured recently and represents your approximate recovery level for the day.{'\n\n'}
                  The readiness score helps you visualize your body's current state and can guide you in taking preventive measures to manage your training load if needed.{'\n\n'}
                  Listen to your body - a lower score might suggest you need more recovery time before intense training.
                </Text>
                <Pressable
                  style={{
                    backgroundColor: '#4064F6',
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                  onPress={() => setShowReadinessInfo(false)}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: '600',
                  }}>Got it</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Recovery Info Modal */}
      <Modal
        visible={showRecoveryInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRecoveryInfo(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowRecoveryInfo(false)}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}>
            <TouchableWithoutFeedback>
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 24,
                width: '100%',
                maxWidth: 400,
                gap: 16,
              }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '600',
                  color: '#000000',
                }}>
                  Understanding Your Recovery Score
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: '#666666',
                  lineHeight: 24,
                }}>
                  Your recovery score shows how consistently and well you're performing recovery habits like quality sleep, good nutrition, and completing your recovery plans.{'\n\n'}
                  This score helps you visualize your overall consistency with recovery practices and identify areas where you might have room to improve.{'\n\n'}
                  Important: This score doesn't represent your training readiness, as it doesn't take into account your training load. It simply reflects how good your recovery habits have been over the past 7 days.
                </Text>
                <Pressable
                  style={{
                    backgroundColor: '#4064F6',
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                  onPress={() => setShowRecoveryInfo(false)}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: '600',
                  }}>Got it</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  }
}); 