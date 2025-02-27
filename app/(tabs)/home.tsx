import { View, Text, Image, ScrollView, Pressable, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TextInput } from 'react-native';
import { format, startOfWeek, addDays, subDays } from 'date-fns';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useNutrition } from '../context/NutritionContext';
import WeeklyOverview from '../components/WeeklyOverview';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

export default function HomeScreen() {
  const { user } = useAuth();
  const { macros } = useNutrition();
  const calorieGoal = 1600;
  const currentCalories = 800;
  const progressPercentage = (currentCalories / calorieGoal) * 100;
  const [showQuestion, setShowQuestion] = useState(false);
  const [question, setQuestion] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [nutritionScore, setNutritionScore] = useState(0);
  const [showNutritionInfo, setShowNutritionInfo] = useState(false);
  const [nutritionAdherence, setNutritionAdherence] = useState(0);
  const [readinessScore, setReadinessScore] = useState(0);
  const [showReadinessInfo, setShowReadinessInfo] = useState(false);
  const [recoveryData, setRecoveryData] = useState<any>(null);
  const [nutritionData, setNutritionData] = useState<any[]>([]);
  
  const [todayCalories, setTodayCalories] = useState({
    current: 0,
    goal: 0,
    lastUpdated: new Date().toISOString(),
    isLoading: true
  });
  
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
  useEffect(() => {
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
  }, [macros, todayCalories.goal]);
  
  // IMPORTANT: Remove the context syncing effect that was causing issues
  // We no longer want to sync with the macros context for current calories
  // as it will show the selected day instead of today
  
  // Fetch user's profile picture and calorie goal immediately
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          // Fetch user profile data
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().profilePicture) {
            setProfilePicture(userDoc.data().profilePicture);
          }
          
          // IMPORTANT: Immediately try to get the user's calorie goal
          // This avoids showing the default 2000 value while context loads
          const userMacrosDoc = await getDoc(doc(db, 'users', user.uid, 'macros', 'goals'));
          if (userMacrosDoc.exists()) {
            const macrosData = userMacrosDoc.data();
            if (macrosData.calories && macrosData.calories > 0) {
              console.log(`DEBUG - Immediately loaded goal from Firebase: ${macrosData.calories} calories`);
              setTodayCalories(prev => ({
                ...prev,
                goal: macrosData.calories
              }));
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [user]);

  // Function to load selected date calories
  const loadSelectedDateCalories = useCallback(async (date: Date) => {
    if (!user) return;
    
    try {
      console.log(`DEBUG - Loading calories for date: ${format(date, 'yyyy-MM-dd')}`);
      
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
        console.log(`DEBUG - Using today's calorie goal from context: ${calorieGoal}`);
      } else {
        try {
          // For other days or if context doesn't have the goal, fetch from Firebase
          const userMacrosDoc = await getDoc(doc(db, 'users', user.uid, 'macros', 'goals'));
          if (userMacrosDoc.exists()) {
            const macrosData = userMacrosDoc.data();
            if (macrosData.calories && macrosData.calories > 0) {
              calorieGoal = macrosData.calories;
              console.log(`DEBUG - Using calorie goal from Firebase: ${calorieGoal}`);
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
        console.log(`DEBUG - Found data for ${dateStr}:`, JSON.stringify(data));
        
        setTodayCalories({
          current: data.calories || 0,
          goal: calorieGoal,
          lastUpdated: new Date().toISOString(),
          isLoading: false
        });
      } else {
        // No data found for the selected date
        console.log(`DEBUG - No data found for ${dateStr}, using zero values`);
        
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
    
    console.log(`DEBUG - Setting up real-time listener for date: ${dateStr} (isToday: ${isToday})`);
    
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
      console.log(`DEBUG - Real-time update for date: ${dateStr}`);
      
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
        console.log(`DEBUG - Document data: ${JSON.stringify(data)}`);
        
        setTodayCalories({
          current: data.calories || 0,
          goal: calorieGoal,
          lastUpdated: new Date().toISOString(),
          isLoading: false
        });
      } else {
        console.log(`DEBUG - No document exists for date: ${dateStr}`);
        
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
      console.log(`DEBUG - Cleaning up listener for date: ${dateStr}`);
      unsubscribe();
    };
  }, [user, selectedDate, macros.calories.goal, todayCalories.goal]);

  // Handle date selection from WeeklyOverview
  const onDateSelect = useCallback((date: Date) => {
    console.log(`DEBUG - Date selected: ${format(date, 'yyyy-MM-dd')}`);
    
    // If the selected date is the same as the currently selected date,
    // deselect it and go back to today's data
    if (selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) {
      console.log('DEBUG - Deselecting date and returning to today');
      setSelectedDate(null);
      
      // Explicitly load today's data
      loadSelectedDateCalories(new Date());
    } else {
      console.log(`DEBUG - Switching to date: ${format(date, 'yyyy-MM-dd')}`);
      setSelectedDate(date);
      
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
    console.log(`DEBUG - Using macros from context:`, JSON.stringify(macros));
    
    // Use macros from the context
    const caloriesScore = Math.min((calories / (macros.calories.goal || 1)) * 100, 100);
    const proteinScore = Math.min((protein / (macros.protein.goal || 1)) * 100, 100);
    const carbsScore = Math.min((carbs / (macros.carbs.goal || 1)) * 100, 100);
    const fatsScore = Math.min((fats / (macros.fats.goal || 1)) * 100, 100);

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

    // Get dates for query - we want yesterday and 7 days before that
    const today = new Date();
    const yesterday = subDays(today, 1);
    const eightDaysAgo = subDays(today, 8); // 7 days before yesterday
    
    // Format dates for query
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    const eightDaysAgoStr = format(eightDaysAgo, 'yyyy-MM-dd');
    
    console.log(`DEBUG - Fetching historical nutrition data for adherence calculation`);
    console.log(`DEBUG - Date range: ${eightDaysAgoStr} to ${yesterdayStr} (excluding today ${format(today, 'yyyy-MM-dd')})`);

    // Get all documents once rather than using a real-time listener
    const fetchNutritionHistory = async () => {
      try {
        // Reference to the dailyMacros collection
        const dailyMacrosRef = collection(db, 'users', user.uid, 'dailyMacros');
        
        // Get all documents (we'll filter in memory)
        const querySnapshot = await getDocs(dailyMacrosRef);
        
        // Include days in the date range, from 7 days before yesterday up to yesterday
        const validDocs = querySnapshot.docs.filter(doc => {
          const dateId = doc.id;
          return dateId >= eightDaysAgoStr && dateId <= yesterdayStr;
        });
        
        console.log(`DEBUG - Found ${validDocs.length} dailyMacros documents in date range: ${eightDaysAgoStr} to ${yesterdayStr}`);
        
        // Only process documents with actual nutrition data (at least one meal logged)
        const docsWithData = validDocs.filter(doc => {
          const data = doc.data();
          // Only count days where at least one macro has been recorded
          return (data.calories > 0 || data.protein > 0 || data.carbs > 0 || data.fats > 0);
        });
        
        console.log(`DEBUG - Found ${docsWithData.length} documents with actual nutrition data (at least one meal logged)`);
        
        // Array to hold valid adherence scores
        const validScores: number[] = [];
        
        // Process each day's nutrition data
        docsWithData.forEach(doc => {
          const data = doc.data();
          console.log(`DEBUG - Processing dailyMacros doc for ${doc.id}:`, JSON.stringify(data));
          
          // Calculate this day's adherence score
          const dayScore = calculateDayScore(data);
          console.log(`DEBUG - Day ${doc.id} adherence score: ${dayScore.toFixed(1)}%`);
          
          // Only include non-zero scores
          if (dayScore > 0) {
            validScores.push(dayScore);
          }
        });
        
        // Calculate average adherence from valid days only
        if (validScores.length > 0) {
          const averageAdherence = Math.round(
            validScores.reduce((sum, score) => sum + score, 0) / validScores.length
          );
          console.log(`DEBUG - Final adherence from ${validScores.length} days: ${averageAdherence}%`);
          setNutritionAdherence(averageAdherence);
        } else {
          // No valid historical data found
          console.log('DEBUG - No valid historical nutrition data found for adherence calculation');
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
    // that should trigger a recalculation
    const dailyMacrosRef = collection(db, 'users', user.uid, 'dailyMacros');
    const unsubscribe = onSnapshot(dailyMacrosRef, () => {
      console.log('DEBUG - Daily macros collection changed, recalculating adherence');
      fetchNutritionHistory();
    });
    
    return () => {
      console.log('DEBUG - Cleaning up nutrition adherence recalculation listener');
      unsubscribe();
    };
  }, [user, calculateDayScore]);

  // Add a specific listener for today's data to ensure real-time updates from the nutrition tab
  useEffect(() => {
    if (!user) return;
    
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    console.log(`DEBUG - Setting up dedicated listener for today's data: ${todayStr}`);
    
    // Reference to today's dailyMacros document
    const docRef = doc(db, 'users', user.uid, 'dailyMacros', todayStr);
    
    // Set up the listener with error handling
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      // Only process if we're on the today view (not viewing a past date)
      if (!selectedDate) {
        console.log(`DEBUG - Real-time update for today's nutrition data`);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log(`DEBUG - Today's data updated: ${JSON.stringify(data)}`);
          
          // If we have macros in the context but they don't match what's in Firebase
          // then update the calorie card (ensures sync with nutrition tab)
          if (data.calories !== macros.calories.current) {
            console.log(`DEBUG - Syncing calories: Firebase=${data.calories}, Context=${macros.calories.current}`);
            
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
      console.log('DEBUG - Cleaning up today\'s nutrition data listener');
      unsubscribe();
    };
  }, [user, selectedDate, macros.calories.current]);

  // Helper to sync with today's data in context when the tab becomes active
  useEffect(() => {
    // If we're viewing today and have fresh context data, update the calorie card
    if (!selectedDate && macros.calories.current >= 0) {
      console.log(`DEBUG - Syncing from nutrition context: ${macros.calories.current} calories`);
      
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
    
    console.log('DEBUG - Setting up main data listeners');
    
    // Keep track of active listeners
    const subscriptions: (() => void)[] = [];
    
    // Only set up the specific listeners we need
    // 1. Listener for today's calories (already set up elsewhere)
    // 2. Listener for recovery data (already set up elsewhere)
    
    // Clean up ALL subscriptions when component unmounts
    return () => {
      console.log(`DEBUG - Cleaning up ${subscriptions.length} global subscriptions`);
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [user]);

  // Calculate readiness score based on recovery data
  const calculateReadinessScore = useCallback((data: any) => {
    if (!data) {
      setReadinessScore(0);
      return;
    }
    
    // Extract recovery metrics
    const trainingIntensity = data.soreness || 5; // Default to middle value if not set
    const soreness = data.fatigue || 5; // Note: In the UI, this is mapped to "How sore are you?"
    const fatigue = data.sleep || 5; // Note: In the UI, this is mapped to "How tired do you feel overall?"
    const sleepAmount = data.mood || 5; // Note: In the UI, this is mapped to "Sleep duration"
    
    // Calculate score components
    // 1. For training intensity, soreness, and fatigue: Higher values mean lower score (inverse relationship)
    // Scale is 1-10, so 11-value gives us the inverse (e.g., 8 becomes 3)
    const intensityComponent = ((11 - trainingIntensity) / 10) * 100;
    const sorenessComponent = ((11 - soreness) / 10) * 100;
    const fatigueComponent = ((11 - fatigue) / 10) * 100;
    
    // 2. For sleep: Higher values mean higher score (direct relationship)
    // Bonus for sleep 9 or above
    let sleepComponent = (sleepAmount / 10) * 100;
    if (sleepAmount >= 9) {
      sleepComponent *= 1.2; // 20% bonus for excellent sleep
    }
    
    // Calculate final score with equal weighting (can be adjusted)
    const finalScore = Math.round(
      (intensityComponent * 0.25) +
      (sorenessComponent * 0.25) +
      (fatigueComponent * 0.25) +
      (sleepComponent * 0.25)
    );
    
    // Ensure score is within 0-100 range
    setReadinessScore(Math.min(Math.max(finalScore, 0), 100));
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
      console.log(`DEBUG - Loading today's calories specifically for the calorie card`);
      
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
        console.log(`DEBUG - Using today's calorie goal from context: ${calorieGoal}`);
      } else {
        try {
          // If context doesn't have the goal, fetch from Firebase
          const userMacrosDoc = await getDoc(doc(db, 'users', user.uid, 'macros', 'goals'));
          if (userMacrosDoc.exists()) {
            const macrosData = userMacrosDoc.data();
            if (macrosData.calories && macrosData.calories > 0) {
              calorieGoal = macrosData.calories;
              console.log(`DEBUG - Using calorie goal from Firebase: ${calorieGoal}`);
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
        console.log(`DEBUG - Found today's data:`, JSON.stringify(data));
        
        setTodayCalories({
          current: data.calories || 0,
          goal: calorieGoal,
          lastUpdated: new Date().toISOString(),
          isLoading: false
        });
      } else {
        // No data found for today
        console.log(`DEBUG - No data found for today, using zero values`);
        
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
    console.log(`DEBUG - Setting up real-time listener for today's calories: ${todayStr}`);
    
    // Reference to today's dailyMacros document
    const docRef = doc(db, 'users', user.uid, 'dailyMacros', todayStr);
    
    // Set up the listener
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      console.log(`DEBUG - Real-time update for today's calories`);
      
      // Get goal from macros context
      let calorieGoal = macros.calories.goal > 0 ? macros.calories.goal : todayCalories.goal;
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log(`DEBUG - Today's data updated: ${JSON.stringify(data)}`);
        
        setTodayCalories({
          current: data.calories || 0,
          goal: calorieGoal,
          lastUpdated: new Date().toISOString(),
          isLoading: false
        });
      } else {
        console.log(`DEBUG - No document exists for today`);
        
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
      console.log(`DEBUG - Cleaning up listener for today's calories`);
      unsubscribe();
    };
  }, [user, macros.calories.goal, todayCalories.goal]);

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: '#FFFFFF',  // Keep white background
    }}>
      {/* Header */}
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
          marginBottom: 16, // Add space between logo and title
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

        {/* Title */}
        <Text style={{
          fontSize: 32,
          fontWeight: '700',
          color: '#000000',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          Home
        </Text>
      </View>

      <ScrollView 
        style={{ 
          flex: 1,
          backgroundColor: '#FFFFFF',
        }}
        contentContainerStyle={{
          padding: 8,
          gap: 16,
        }}
      >
        <View style={{ padding: 16, gap: 24 }}>
          {/* Overview Section */}
          <View style={{ 
            alignItems: 'center',
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5',
          }}>
            <Text style={{ 
              fontSize: 32, 
              fontWeight: '600',
              color: '#000000',
            }}>
              Todays Progress
            </Text>
          </View>
                      
          {/* First Row of Cards */}
          <View style={{ 
            flexDirection: 'row', 
            gap: 8,
          }}>
            {/* Daily Calories Card - ALWAYS shows today's calories */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="flame-outline" size={24} color="#000000" />
                    <Text style={styles.sectionTitle}>
                      Calories
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => console.log('Calories info pressed')}>
                  <Ionicons name="information-circle-outline" size={24} color="#666666" />
                </Pressable>
              </View>

              {todayCalories.isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading data...</Text>
                </View>
              ) : (
                <View style={styles.calorieContainerHome}>
                  <View style={{ 
                    width: 200,
                    height: 200,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Svg width="200" height="200" style={{
                      position: 'absolute',
                      transform: [{ rotate: '-90deg' }],
                    }}>
                      <Circle
                        cx="100"
                        cy="100"
                        r="80"
                        stroke="#ffffff"
                        strokeWidth="12"
                        fill="none"
                      />
                      <Circle
                        cx="100"
                        cy="100"
                        r="80"
                        stroke="#4064F6"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 80}`}
                        strokeDashoffset={2 * Math.PI * 80 * (1 - Math.min(todayCalories.current / todayCalories.goal, 1))}
                      />
                    </Svg>

                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ 
                        fontSize: 40, 
                        fontWeight: '700', 
                        color: '#000000',
                      }}>
                        {Math.round(todayCalories.current)}
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: '#666666',
                        marginTop: -2,
                      }}>
                        consumed
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.calorieDetails}>
                    <Text style={styles.calorieInfoText}>
                      {Math.round(todayCalories.goal - todayCalories.current)} calories left
                    </Text>
                    <Text style={styles.calorieTargetText}>
                      Goal: {Math.round(todayCalories.goal)} calories
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Readiness Card */}
            <View style={{
              flex: 1,
              padding: 16,
              gap: 24,
              borderRadius: 24,
              backgroundColor: '#99E86C',
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
                    fontSize: 20,
                    fontWeight: '600',
                    color: '#000000',
                  }}>
                    Readiness 
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowReadinessInfo(true)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="information-circle-outline" size={24} color="#000000" />
                </Pressable>
              </View>

              {/* Progress Circle Container */}
              <View style={{ 
                width: 200,
                height: 200,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Svg width="200" height="200" style={{
                  position: 'absolute',
                  transform: [{ rotate: '-90deg' }],
                }}>
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#ffffff"
                    strokeWidth="12"
                    fill="none"
                  />
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#4064F6"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={2 * Math.PI * 80 * (1 - readinessScore / 100)}
                  />
                </Svg>

                <Text style={{ 
                  fontSize: 40, 
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
              fontSize: 32, 
              fontWeight: '600',
              color: '#000000',
            }}>
              Weekly Progress
            </Text>
          </View>

          {/* Second Row of Cards */}
          <View style={{ 
            flexDirection: 'row', 
            gap: 8,
          }}>
            {/* Nutrition Adherence Card */}
            <View style={{
              flex: 1,
              padding: 16,
              gap: 24,
              borderRadius: 24,
              backgroundColor: '#99E86C',
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
                  }}>
                    Nutrition
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowNutritionInfo(true)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="information-circle-outline" size={24} color="#000000" />
                </Pressable>
              </View>

              <View style={{ 
                width: 200,
                height: 200,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Svg width="200" height="200" style={{
                  position: 'absolute',
                  transform: [{ rotate: '-90deg' }],
                }}>
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#ffffff"
                    strokeWidth="12"
                    fill="none"
                  />
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#4064F6"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={2 * Math.PI * 80 * (1 - nutritionAdherence / 100)}
                  />
                </Svg>

                <Text style={{ 
                  fontSize: 40, 
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

            {/* Recovery Card */}
            <View style={{
              flex: 1,
              padding: 16,
              gap: 24,
              borderRadius: 24,
              backgroundColor: '#99E86C',
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
                justifyContent: 'center',
                width: '100%',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="pulse-outline" size={24} color="#000000" />
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '600',
                    color: '#000000',
                  }}>
                    Recovery
                  </Text>
                </View>
              </View>
              
              {/* Progress Circle Container */}
              <View style={{ 
                width: 200,
                height: 200,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Svg width="200" height="200">
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#ffffff"
                    strokeWidth="12"
                    fill="none"
                  />
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#4064F6"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={2 * Math.PI * 80 * (1 - 90 / 100)}
                    transform="rotate(-90 100 100)"
                  />
                </Svg>

                {/* Center Text */}
                <Text style={{ 
                  position: 'absolute',
                  fontSize: 40, 
                  fontWeight: '700', 
                  color: '#000000',
                }}>
                  90%
                </Text>
              </View>

              <Text style={{ 
                fontSize: 14, 
                color: '#666666',
                textAlign: 'center',
              }}>
                Awesome! You did{'\n'}excellent recovery level.
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
                Ask me a question.
              </Text>
              <Pressable
                onPress={() => setShowQuestion(!showQuestion)}
                style={({ pressed }) => ({
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 12,
                  alignSelf: 'flex-start',
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#4A3AFF',
                }}>
                  {showQuestion ? 'Close' : 'Ask a question'}
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
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 24,
              gap: 16,
              borderWidth: 1,
              borderColor: '#E5E5E5',
            }}>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask anything about football..."
                multiline
                numberOfLines={3}
                style={{
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  textAlignVertical: 'top',
                  minHeight: 100,
                }}
              />

              {question && (
                <View style={{ gap: 16 }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}>
                    <Image 
                      source={require('../../assets/images/mascot.png')}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                      }}
                    />
                    <View style={{
                      flex: 1,
                      backgroundColor: '#F5F5FF',
                      padding: 16,
                      borderRadius: 12,
                    }}>
                      <Text style={{
                        fontSize: 16,
                        color: '#000000',
                        lineHeight: 24,
                      }}>
                        Based on your profile and goals, here's my recommendation: Focus on incorporating more explosive exercises in your training routine. This will help improve your speed and agility on the field. Try adding box jumps and plyometric exercises 2-3 times per week.{'\n\n'}Remember to maintain proper form and gradually increase intensity!
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Weekly Overview Section */}
          <View style={{ gap: 16 }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#000000',
            }}>
              Weekly Overview
            </Text>

            {/* Replace Calendar Days with WeeklyOverview */}
            <WeeklyOverview 
              selectedDate={selectedDate || new Date()}
              onDateSelect={onDateSelect}
            />

            {/* Day Details - update to use selectedDate instead of selectedDay */}
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
                  {/* Nutrition Score */}
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
                      {nutritionAdherence}%
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
                  How to Get Your Nutrition Score
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: '#666666',
                  lineHeight: 24,
                }}>
                  Your nutrition score shows how well you're meeting your daily macro goals.{'\n\n'}
                  To start seeing your score:{'\n'}
                  1. Go to the Nutrition tab{'\n'}
                  2. Log your meals daily{'\n'}
                  3. Track your progress over time{'\n\n'}
                  The adherence score is calculated from your past 7 days of nutrition data (excluding today). Higher scores indicate better adherence to your macro goals.
                </Text>
                <Pressable
                  onPress={() => setShowNutritionInfo(false)}
                  style={({ pressed }) => ({
                    backgroundColor: '#007AFF',
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
                  How Your Readiness Score Works
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: '#666666',
                  lineHeight: 24,
                }}>
                  Your readiness score indicates how prepared your body is for training today.{'\n\n'}
                  The score is calculated from:{'\n'}
                  • Training intensity - higher intensity lowers your score{'\n'}
                  • Muscle soreness - more soreness lowers your score{'\n'}
                  • Overall fatigue - more fatigue lowers your score{'\n'}
                  • Sleep duration - more sleep improves your score{'\n\n'}
                  Getting 9+ hours of sleep gives you a significant boost to your readiness!
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    flex: 1,
    backgroundColor: '#99E86C',
    borderRadius: 24,
    padding: 16,
    gap: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 280,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  dateIndicator: {
    backgroundColor: '#E0E7FF',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  dateIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A72B2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  calorieContainerHome: {
    alignItems: 'center',
    gap: 16,
  },
  calorieDetails: {
    alignItems: 'center',
    gap: 4,
  },
  calorieInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  calorieTargetText: {
    fontSize: 14,
    color: '#666666',
  },
}); 