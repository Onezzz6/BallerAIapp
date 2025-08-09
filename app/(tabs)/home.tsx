import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, useColorScheme, Dimensions, RefreshControl, Platform, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { useNutrition } from '../../context/NutritionContext';
import { useIsFocused } from '@react-navigation/native';
import CalorieProgress, { showCalorieInfoAlert } from '../components/CalorieProgress';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { calculateNutritionGoals } from '../../utils/nutritionCalculations';
import { format, startOfWeek, addDays, subDays } from 'date-fns';
import { TextInput, ActivityIndicator, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Pressable, Modal, Alert, Animated, Linking, NativeModules, ActionSheetIOS } from 'react-native';
import { askOpenAI } from '../../utils/openai';
import Svg, { Circle } from 'react-native-svg';
import ReanimatedAnimated, { PinwheelIn } from 'react-native-reanimated';
import analytics from '@react-native-firebase/analytics'; // Add analytics import
import ViewShot from 'react-native-view-shot';
import { XpHeaderBanner } from '../components/XpHeaderBanner';
import { LevelProgressIndicator } from '../components/LevelProgressIndicator';

// Animated Typing Indicator Component
const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      createAnimation(dot1, 0),
      createAnimation(dot2, 200),
      createAnimation(dot3, 400),
    ]);

    animation.start();

    return () => animation.stop();
  }, [dot1, dot2, dot3]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 }}>
      <Animated.View style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#666666',
        opacity: dot1,
      }} />
      <Animated.View style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#666666',
        opacity: dot2,
      }} />
      <Animated.View style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#666666',
        opacity: dot3,
      }} />
    </View>
  );
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { macros } = useNutrition();
  const [showQuestion, setShowQuestion] = useState(false);
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(10);
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

  // Refs for elements to highlight in the instructions
  const calorieCardRef = useRef<View>(null);
  const readinessCardRef = useRef<View>(null);
  const weeklyProgressRef = useRef<View>(null);
  const nutritionCardRef = useRef<View>(null);
  const recoveryCardRef = useRef<View>(null);
  const askBallzyRef = useRef<View>(null);
  
  // State to track whether the instructions are shown
  const [instructionsComplete, setInstructionsComplete] = useState(false);

  // ViewShot ref for sharing - dedicated ref for the shareable content
  const shareableContentRef = useRef<ViewShot>(null);
  const [shareableContentHeight, setShareableContentHeight] = useState(0);
  
  // Story canvas refs & state for 9:16 sharing
  const storyCanvasRef = useRef<ViewShot>(null);
  const [storyURI, setStoryURI] = useState<string | null>(null);
  const [showSocialEngagementModal, setShowSocialEngagementModal] = useState(false);

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
          
          // Fetch user profile data
          const userDocRef = db.collection('users').doc(user.uid);
          const userDoc = await userDocRef.get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Set profile picture if available
            if (userData?.profilePicture) {
              setProfilePicture(userData.profilePicture);
            }
            
            // Set user profile data for use in other calculations
            setUserProfile(userData);
            
            // IMPORTANT: Calculate nutrition goals based on user data immediately
            // This ensures we don't show default values while waiting for nutrition tab to load
            let calculatedGoals;
            let goalsUpdated = false;
            
            // First check if goals already exist in the user document
            if (userData?.calorieGoal && userData?.macroGoals) {
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
                  await userDocRef.update({
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
      // Set loading state
      setTodayCalories(prev => ({
        ...prev,
        isLoading: true
      }));
      
      const dateStr = format(date, 'yyyy-MM-dd');
      const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
      
      // Use the same path as the nutrition tab to access dailyMacros
      const docRef = db.collection('users').doc(user.uid).collection('dailyMacros').doc(dateStr);
      const docSnap = await docRef.get();
      
      // Get goal from macros context or from Firebase
      let calorieGoal = 0;
      
      // For today, prefer the macros context value as it's most up-to-date
      if (isToday && macros.calories.goal > 0) {
        calorieGoal = macros.calories.goal;
        //console.log(`DEBUG - Using today's calorie goal from context: ${calorieGoal}`);
      } else {
        try {
          // For other days or if context doesn't have the goal, fetch from Firebase
          const userMacrosDoc = await db.collection('users').doc(user.uid).collection('macros').doc('goals').get();
          if (userMacrosDoc.exists) {
            const macrosData = userMacrosDoc.data();
            if (macrosData?.calories && macrosData.calories > 0) {
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
      
      if (docSnap.exists) {
        const data = docSnap.data();
        //console.log(`DEBUG - Found data for ${dateStr}:`, JSON.stringify(data));
        
        setTodayCalories({
          current: data?.calories || 0,
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
    const docRef = db.collection('users').doc(user.uid).collection('dailyMacros').doc(dateStr);
    
          // Set up the listener with error handling
      const unsubscribe = docRef.onSnapshot((docSnap) => {
        //console.log(`DEBUG - Real-time update for date: ${dateStr}`);
        
        // Get goal from macros context for today, or use stored goal for other days
        let calorieGoal;
        
        if (isToday && macros.calories.goal > 0) {
          calorieGoal = macros.calories.goal;
        } else {
          // For non-today dates, use the existing goal or default to 2000
          calorieGoal = todayCalories.goal > 0 ? todayCalories.goal : 2000;
        }
        
        if (docSnap.exists) {
        const data = docSnap.data();
        //console.log(`DEBUG - Document data: ${JSON.stringify(data)}`);
        
        setTodayCalories({
          current: data?.calories || 0,
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
      
      const nutritionRef = db.collection('users').doc(user.uid).collection('nutrition');
      const querySnapshot = await nutritionRef
        .where('date', '>=', format(startDate, 'yyyy-MM-dd'))
        .where('date', '<=', format(endDate, 'yyyy-MM-dd'))
        .orderBy('date', 'desc')
        .get();
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
        const dailyMacrosRef = db.collection('users').doc(user.uid).collection('dailyMacros');
        
        // Get all documents (we'll filter in memory)
        const querySnapshot = await dailyMacrosRef.get();
        
        // Get the user's macro goals document to use as backup if goals aren't stored with daily entries
        const userMacrosDoc = await db.collection('users').doc(user.uid).collection('macros').doc('goals').get();
        let defaultGoals = {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fats: 55
        };
        
        if (userMacrosDoc.exists) {
          const goalsData = userMacrosDoc.data();
          defaultGoals = {
            calories: goalsData?.calories || 2000,
            protein: goalsData?.protein || 150,
            carbs: goalsData?.carbs || 200,
            fats: goalsData?.fats || 55
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
    const dailyMacrosRef = db.collection('users').doc(user.uid).collection('dailyMacros');
    const unsubscribe = dailyMacrosRef.onSnapshot((snapshot) => {
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
    const docRef = db.collection('users').doc(user.uid).collection('dailyMacros').doc(todayStr);
    
    // Set up the listener with error handling
    const unsubscribe = docRef.onSnapshot((docSnap) => {
      // Only process if we're on the today view (not viewing a past date)
      if (!selectedDate) {
        //console.log(`DEBUG - Real-time update for today's nutrition data`);
        
        if (docSnap.exists) {
          const data = docSnap.data();
          //console.log(`DEBUG - Today's data updated: ${JSON.stringify(data)}`);
          
          // If we have macros in the context but they don't match what's in Firebase
          // then update the calorie card (ensures sync with nutrition tab)
          if (data?.calories !== macros.calories.current) {
            //console.log(`DEBUG - Syncing calories: Firebase=${data.calories}, Context=${macros.calories.current}`);
            
            setTodayCalories(prev => ({
              ...prev,
              current: data?.calories || 0,
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
    const recoveryRef = db.collection('users').doc(user.uid).collection('recovery').doc(todayStr);
    
    // Set up the listener
    const unsubscribe = recoveryRef.onSnapshot((doc) => {
      if (doc.exists) {
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
      
      const nutritionRef = db.collection('users').doc(user.uid).collection('nutrition');
      const querySnapshot = await nutritionRef
        .where('date', '>=', sevenDaysAgoStr)
        .where('date', '<=', todayStr)
        .orderBy('date', 'desc')
        .get();
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
      // Set loading state
      setTodayCalories(prev => ({
        ...prev,
        isLoading: true
      }));
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      // Reference to today's dailyMacros document
      const docRef = db.collection('users').doc(user.uid).collection('dailyMacros').doc(todayStr);
      const docSnap = await docRef.get();
      
      // Get goal from macros context or from Firebase
      let calorieGoal = 0;
      
      // Prefer the macros context value as it's most up-to-date
      if (macros.calories.goal > 0) {
        calorieGoal = macros.calories.goal;
        //console.log(`DEBUG - Using today's calorie goal from context: ${calorieGoal}`);
      } else {
        try {
          // If context doesn't have the goal, fetch from Firebase
          const userMacrosDoc = await db.collection('users').doc(user.uid).collection('macros').doc('goals').get();
          if (userMacrosDoc.exists) {
            const macrosData = userMacrosDoc.data();
            if (macrosData?.calories && macrosData.calories > 0) {
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
      
      if (docSnap.exists) {
        const data = docSnap.data();
        //console.log(`DEBUG - Found today's data:`, JSON.stringify(data));
        
        setTodayCalories({
          current: data?.calories || 0,
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
    const docRef = db.collection('users').doc(user.uid).collection('dailyMacros').doc(todayStr);
    
    // Set up the listener
    const unsubscribe = docRef.onSnapshot((docSnap) => {
      //console.log(`DEBUG - Real-time update for today's calories`);
      
      // Get goal from macros context
      let calorieGoal = macros.calories.goal > 0 ? macros.calories.goal : todayCalories.goal;
      
      if (docSnap.exists) {
        const data = docSnap.data();
        //console.log(`DEBUG - Today's data updated: ${JSON.stringify(data)}`);
        
        setTodayCalories({
          current: data?.calories || 0,
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
        const userProfileDoc = await db.collection('users').doc(user.uid).collection('profile').doc('details').get();
        if (userProfileDoc.exists) {
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
          await db.collection('users').doc(user.uid).collection('profile').doc('details').set(defaultProfile);
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
    isLoading?: boolean;
  }>>([]);

  // Helper function to get the current chat session key (based on daily reset at noon)
  const getCurrentChatSession = () => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    
    // If it's before noon, use previous day's session (since last reset was yesterday at noon)
    if (now.getHours() < 12) {
      const yesterday = subDays(now, 1);
      return format(yesterday, 'yyyy-MM-dd');
    }
    
    // If it's after noon, use today's session (reset happened today at noon)
    return today;
  };

  // Modify the checkDailyQuestionLimit function to handle noon reset and missing index
  useEffect(() => {
    const checkDailyQuestionLimit = async () => {
      if (!user) return;
      
      try {
        const currentSession = getCurrentChatSession();
        const questionLimitDoc = await db.collection('users').doc(user.uid).collection('aiQuestions').doc('counter').get();
        
        if (questionLimitDoc.exists) {
          const data = questionLimitDoc.data();
          
          // If data is from current session, use it
          if (data?.sessionKey === currentSession) {
            setQuestionCount(data.count || 0);
          } else {
            // Reset counter for new session (daily at noon)
            await db.collection('users').doc(user.uid).collection('aiQuestions').doc('counter').set({
              count: 0,
              sessionKey: currentSession,
              maxQuestions: 10,
              lastReset: firestore.FieldValue.serverTimestamp()
            });
            setQuestionCount(0);
            // Clear conversation history for new session
            setQuestionHistory([]);
          }
          
          // Set max questions from stored value
          setMaxQuestions(data?.maxQuestions || 10);
        } else {
          // Initialize counter document
          await db.collection('users').doc(user.uid).collection('aiQuestions').doc('counter').set({
            count: 0,
            sessionKey: currentSession,
            maxQuestions: 10,
            lastReset: firestore.FieldValue.serverTimestamp()
          });
          setQuestionCount(0);
        }

        // Try to fetch current session's conversation history - handling the case where index might be missing
        try {
          // First attempt with the optimal query (requires composite index)
          const questionsRef = db.collection(`users/${user.uid}/aiQuestions`);
          const querySnapshot = await questionsRef
            .where('sessionKey', '==', currentSession)
            .orderBy('timestamp', 'asc')
            .get();
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
            // Get all questions for current session without ordering (doesn't require composite index)
            const questionsRef = db.collection(`users/${user.uid}/aiQuestions`);
            const querySnapshot = await questionsRef
              .where('sessionKey', '==', currentSession)
              .get();
            
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
                "collection with fields 'sessionKey' (Ascending) and 'timestamp' (Ascending)"
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

  // Add a periodic check to reset conversation at noon
  useEffect(() => {
    if (!user) return;

    // Check every 5 minutes if we need to reset the conversation
    const checkNoonReset = async () => {
      const currentSession = getCurrentChatSession();
      
      // Get the stored session from Firebase
      try {
        const questionLimitDoc = await db.collection('users').doc(user.uid).collection('aiQuestions').doc('counter').get();
        
        if (questionLimitDoc.exists) {
          const data = questionLimitDoc.data();
          
          // If the current session differs from stored session, it means we've crossed noon
          if (data?.sessionKey !== currentSession) {
            console.log('Noon reset detected, clearing conversation history');
            
            // Reset counter and conversation
            await db.collection('users').doc(user.uid).collection('aiQuestions').doc('counter').set({
              count: 0,
              sessionKey: currentSession,
              maxQuestions: 10,
              lastReset: firestore.FieldValue.serverTimestamp()
            });
            
            // Clear local state
            setQuestionCount(0);
            setQuestionHistory([]);
          }
        }
      } catch (error) {
        console.error('Error checking noon reset:', error);
      }
    };

    // Check immediately
    checkNoonReset();
    
    // Set up interval to check every 5 minutes
    const intervalId = setInterval(checkNoonReset, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [user]);

  // Update askAiQuestion to include conversation context and properly update the counter in Firebase
  const askAiQuestion = async () => {
    if (!question.trim() || questionCount >= maxQuestions) {
      return;
    }

    try {
      // Save the current question to display it immediately
      const currentQuestion = question;
      setQuestion('');

      // Add the user's message to history immediately
      const userMessage = {
        question: currentQuestion,
        response: '', // Empty response initially
        timestamp: new Date().toISOString(),
        isLoading: true // Flag to show loading state
      };
      
      setQuestionHistory(prevHistory => [...prevHistory, userMessage]);
      setIsAiLoading(true);

      // Create context from user profile
      let userContext = '';
      if (userProfile) {
        userContext = `User profile: ${userProfile.age ? `Age: ${userProfile.age}, ` : ''}${userProfile.gender ? `Gender: ${userProfile.gender}, ` : ''}${userProfile.position ? `Position: ${userProfile.position}, ` : ''}${userProfile.dominantFoot ? `Dominant foot: ${userProfile.dominantFoot}, ` : ''}${userProfile.injuryHistory ? `Injury history: ${userProfile.injuryHistory}` : ''}`;
      }

      // Prepare conversation history for AI context (exclude current loading message)
      const conversationContext = questionHistory
        .filter(item => !item.isLoading && item.response) // Only include completed conversations
        .map(item => ({
          question: item.question,
          response: item.response
        }));

      // Call OpenAI API with conversation context
      const response = await askOpenAI(currentQuestion, userContext, conversationContext);
      
      // Update the last message in history with the response
      setQuestionHistory(prevHistory => {
        const updatedHistory = [...prevHistory];
        const lastMessageIndex = updatedHistory.length - 1;
        if (lastMessageIndex >= 0) {
          updatedHistory[lastMessageIndex] = {
            question: currentQuestion,
            response: response,
            timestamp: new Date().toISOString(),
            isLoading: false
          };
        }
        return updatedHistory;
      });

      // After getting a response, save the question and response to Firestore
      if (user) {
        try {
          const currentSession = getCurrentChatSession();
          const questionsRef = db.collection(`users/${user.uid}/aiQuestions`);
          
          await questionsRef.add({
            question: currentQuestion,
            response,
            timestamp: firestore.FieldValue.serverTimestamp(),
            sessionKey: currentSession
          });

          // Update the counter document directly rather than using increment
          // This ensures the count is always accurate
          const counterRef = db.collection('users').doc(user.uid).collection('aiQuestions').doc('counter');
          const newCount = questionCount + 1;
          
          await counterRef.set({
            count: newCount,
            sessionKey: currentSession,
            maxQuestions: maxQuestions,
            lastReset: firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          // Update local state
          setQuestionCount(newCount);
        } catch (error) {
          console.error('Error saving question:', error);
        }
      }
    } catch (error) {
      console.error('Error asking AI:', error);
      
      // Update the last message with error state
      setQuestionHistory(prevHistory => {
        const updatedHistory = [...prevHistory];
        const lastMessageIndex = updatedHistory.length - 1;
        if (lastMessageIndex >= 0) {
          updatedHistory[lastMessageIndex] = {
            ...updatedHistory[lastMessageIndex],
            response: 'Sorry, there was an error processing your question. Please try again later.',
            isLoading: false
          };
        }
        return updatedHistory;
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Function to handle question input change with character limit
  const handleQuestionChange = (text: string) => {
    // Limit to 300 characters
    if (text.length <= 300) {
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
        const recoveryRef = db.collection('users').doc(user.uid).collection('recovery').doc(dateStr);
        const recoverySnap = await recoveryRef.get();
        
        // Get recovery plan for this day to check completion status
        const planRef = db.collection('users').doc(user.uid).collection('recoveryPlans').doc(dateStr);
        const planSnap = await planRef.get();
        
        // Only include days where recovery data was submitted
        if (recoverySnap.exists) {
          const data = recoverySnap.data();
          
          // Get sleep quality (in our app, this is mapped to "Sleep duration last night")
          // Note that in the recovery data it's stored as "mood" due to the UI field mapping
          const sleepQuality = data?.sleep || 0;
          
          // Check if a plan exists and was completed
          const planExists = planSnap.exists;
          const planCompleted = planExists ? planSnap.data()?.completed || false : false;
          
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
      const recoveryCollectionRef = db.collection('users').doc(user.uid).collection('recovery');
      const plansCollectionRef = db.collection('users').doc(user.uid).collection('recoveryPlans');
      
      const unsubscribeRecovery = recoveryCollectionRef.onSnapshot(() => {
        //console.log('DEBUG - Recovery data changed, recalculating adherence');
        fetchRecoveryAdherence();
      });
      
      const unsubscribePlans = plansCollectionRef.onSnapshot(() => {
        //console.log('DEBUG - Recovery plans changed, recalculating adherence');
        fetchRecoveryAdherence();
      });
      
      return () => {
        unsubscribeRecovery();
        unsubscribePlans();
      };
    }
  }, [user, calculateRecoveryAdherence]);

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
      "Your recovery score shows how consistently and well you're performing recovery habits like quality sleep, good nutrition, and completing your recovery plans.\n\nThis score helps you visualize your overall consistency with recovery practices and identify areas where you might have room to improve.\n\nImportant: This score doesn't represent your training readiness, as it doesn't take into account your training load. It simply reflects your recovery habits over the past 7 days.",
      [{ text: "OK" }]
    );
  };  

  // Helper function to capture 9:16 story format with social engagement message
  const captureStory = async (): Promise<string> => {
    if (!shareableContentRef.current?.capture || !storyCanvasRef.current?.capture) {
      throw new Error('ViewShot refs not available');
    }
    
    // 1️⃣ grab the normal screenshot
    const innerURI = await shareableContentRef.current.capture();
    console.log('Inner screenshot captured:', innerURI);
    
    // 2️⃣ feed image into canvas
    setStoryURI(innerURI);
    
    // 3️⃣ wait for the Image to load in the story canvas
    await new Promise(r => setTimeout(r, 250));
    
    // 4️⃣ capture the 9:16 canvas with social engagement message
    const storyURI = await storyCanvasRef.current.capture();
    console.log('Story canvas captured:', storyURI);
    
    return storyURI;
  };

  // App Store URL constant
  const APP_STORE_URL = 'https://apps.apple.com/fi/app/ballerai/id6742112516';

  // Instagram Stories integration with native UIPasteboard
  const shareToInstagramStories = async () => {
        try {
      // Check if Instagram is installed first
      const instagramURL = 'instagram-stories://share';
      const canOpen = await Linking.canOpenURL(instagramURL);
      
      if (!canOpen) {
        throw new Error('Instagram not installed');
      }

      // Capture story for Instagram (with social engagement message)
      const storyImageURI = await captureStory();
      
      // Check if native module is available
      const { IGStoryShare } = NativeModules;
      console.log('Available NativeModules:', Object.keys(NativeModules));
      console.log('IGStoryShare module:', IGStoryShare);
      
      if (IGStoryShare && IGStoryShare.shareToStory) {
        try {
          // Use native module to write to UIPasteboard and open Instagram
          const result = await IGStoryShare.shareToStory(storyImageURI, APP_STORE_URL);
          console.log('Instagram Stories share result:', result);
          
          // Only show success if Instagram actually opened
          Alert.alert(
            'Shared to Instagram Stories!',
            'Your progress has been shared to Instagram Stories with a direct link to download BallerAI.'
          );
        } catch (nativeError: any) {
          console.error('Native module error:', nativeError);
          throw new Error(`Native module failed: ${nativeError?.message || String(nativeError)}`);
        }
      } else {
        // Native module not available, fall back to generic share
        console.log('Native IGStoryShare module not available, falling back to generic share');
        throw new Error('Native module not available');
      }
    } catch (error) {
      console.error('Instagram Stories sharing failed:', error);
      // This function is not used in the current implementation
      Alert.alert('Error', 'Instagram sharing failed. Please try the regular share option.');
    }
  };

  // Helper function to close modal and clean up
  const closeSocialModal = () => {
    setShowSocialEngagementModal(false);
    setStoryURI(null);
  };

  // Removed PanResponder to fix scrolling conflicts

  // Handle sharing progress - capture and show preview modal
  const handleShare = async () => {
    try {
      // Capture the story image first
      const previewURI = await captureStory();
      setStoryURI(previewURI);
      
      // Show social engagement modal with preview
      setShowSocialEngagementModal(true);
    } catch (error) {
      console.error('Error capturing progress:', error);
      Alert.alert('Error', 'Unable to prepare share image. Please try again.');
    }
  };

  // Handle actual sharing after user sees the preview and message
  const proceedWithShare = async () => {
    try {
      if (storyURI) {
        console.log('Starting share process with URI:', storyURI);
          await Share.share({
          url: storyURI,
          message: `Check out my progress on BallerAI! ⚽️🔥\n\nDownload the app: ${APP_STORE_URL}`,
            title: 'My BallerAI Progress'
          });
        
        console.log('Share completed successfully');
        // Close modal and reset only after sharing completes
        setShowSocialEngagementModal(false);
        setStoryURI(null);
      } else {
        console.log('No storyURI available for sharing');
        Alert.alert('Error', 'No image available to share. Please try again.');
        }
    } catch (error) {
      console.error('Error sharing progress:', error);
      Alert.alert('Error', 'Unable to share progress. Please try again.');
      // Close modal on error
      setShowSocialEngagementModal(false);
      setStoryURI(null);
    }
  };

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
        {/* Dedicated shareable content container */}
        <ViewShot
          ref={shareableContentRef}
          options={{ format: 'png', quality: 1, result: 'tmpfile' }}
          style={{
            backgroundColor: '#ffffff',
            width: Dimensions.get('window').width,
            overflow: 'hidden',
          }}
          onLayout={(event) => {
            setShareableContentHeight(event.nativeEvent.layout.height);
          }}
        >
          {/* Header - Exact copy for sharing */}
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

              {/* Level Progress Indicator - New Component */}
              <LevelProgressIndicator />

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}>
                <ReanimatedAnimated.View 
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
                </ReanimatedAnimated.View>
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
              width: '100%',
              justifyContent: 'space-between',
            }}>
              {/* Daily Calories Card */}
              <Pressable
                onPress={showCalorieInfoAlert}
                style={({ pressed }) => ({
                  width: '49%',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View>
                  <CalorieProgress />
                </View>
              </Pressable>

              {/* Readiness Card */}
              <Pressable 
                onPress={showInfoAlertReadiness}
                style={({ pressed }) => ({
                  width: '49%',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{
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
                  minHeight: 340,
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
                  }} allowFontScaling={false}>
                    {readinessScore > 0 
                      ? readinessScore >= 70 
                        ? 'Your body is ready for high intensity training!'
                        : readinessScore >= 40
                        ? 'Your body needs moderate intensity today.'
                        : 'Focus on recovery today, take it easy.'
                      : 'Submit recovery data to see your score'
                    }
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Weekly Progress Section Header */}
            <View 
              ref={weeklyProgressRef}
              style={{ 
              alignItems: 'center',
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5E5',
              }}
            >
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
              <Pressable
                onPress={showInfoAlertNutrition}
                style={({ pressed }) => ({
                  width: '49%',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{
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
                  minHeight: 340,
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
                        fontSize: 18,
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

                  {/* Weekly Nutrition Adherence Circle */}
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
                  }} allowFontScaling={false}>
                    {nutritionAdherence > 0 
                      ? nutritionAdherence >= 80
                        ? 'Excellent nutrition habits this week!'
                        : nutritionAdherence >= 50
                        ? 'Good nutrition habits this week!'
                        : 'Keep working on your nutrition goals!'
                      : 'Start logging meals to improve your score'
                    }
                  </Text>
                </View>
              </Pressable>
              
              {/* Recovery Card */}
              <Pressable
                onPress={showInfoAlertRecovery}
                style={({ pressed }) => ({
                  width: '49%',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{
                  padding: 16,
                  gap: 24,
                  borderRadius: 16,
                  backgroundColor: '#DCF5DC',
                  alignItems: 'center',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 4,
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                  minHeight: 340,
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
                        fontSize: 18,
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
                        stroke="#99E86C"
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
                  }} allowFontScaling={false}>
                    {recoveryAdherence > 0 
                      ? recoveryAdherence >= 80
                        ? 'Excellent recovery habits this week!'
                        : recoveryAdherence >= 50
                        ? 'Good recovery routine. Keep it consistent!'
                        : 'Focus on improving your sleep and recovery plans!'
                      : 'Submit recovery data to see your score'
                    }
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </ViewShot>

        {/* Share Progress Button - Outside shareable content so it doesn't appear in screenshot */}
        <View style={{ padding: 16 }}>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => ({
              backgroundColor: '#4064F6',
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 25,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            <Text style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#FFFFFF',
            }}>
              Share Progress
            </Text>
          </Pressable>
        </View>

        <View style={{ padding: 16, gap: 24 }}>
          {/* Ask AI Section */}
          <View 
            ref={askBallzyRef}
            style={{
            backgroundColor: '#4064F6',
            borderRadius: 24,
            padding: 24,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
            borderWidth: 1,
            borderColor: '#E5E5E5',
            justifyContent: 'center',
            alignItems: 'center',
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={{
                fontSize: 24,
                fontWeight: '600',
                color: '#FFFFFF',
                marginBottom: 8,
                textAlign: 'center',
              }}>
                Got questions about football?
              </Text>
              <Text style={{
                fontSize: 16,
                color: '#FFFFFF',
                opacity: 0.9,
                marginBottom: 16,
                textAlign: 'center',
              }}>
                Get personalized advice on training, nutrition, recovery, and more
              </Text>
              <Pressable
                onPress={() => setShowQuestion(true)}
                style={({ pressed }) => ({
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 32,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#4064F6',
                }}>
                  Ask AI Coach
                </Text>
              </Pressable>
            </View>
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
                  Ask AI Coach
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
                            color="#4064F6"
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
                            {item.isLoading ? (
                              // Typing indicator for embedded chat
                              <TypingIndicator />
                            ) : (
                              <Text style={{
                                fontSize: 16,
                                color: '#000000',
                                lineHeight: 24,
                              }}>
                                {item.response}
                              </Text>
                            )}
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
                  backgroundColor: !question.trim() || questionCount >= maxQuestions ? '#CCCCCC' : '#4064F6',
                  paddingVertical: 12,
                  borderRadius: 36,
                  alignItems: 'center',
                  opacity: questionCount >= maxQuestions ? 0.5 : pressed ? 0.8 : 1,
                })}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                }}>
                  {questionCount >= maxQuestions ? 'Limit Reached' : 'Get Answer'}
                </Text>
              </Pressable>

              {/* Remove the old loading display since we handle it in messages now */}
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
                    opacity: pressed ? 0.8 : 1,
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

            {/* Social Engagement Modal with Preview */}
      <Modal
        visible={showSocialEngagementModal}
        transparent
        animationType="slide"
        onRequestClose={closeSocialModal}
      >
        <View style={{ flex: 1 }}>
          {/* Backdrop - only this closes the modal */}
          <TouchableWithoutFeedback onPress={closeSocialModal}>
            <View style={{ 
              flex: 1, 
              backgroundColor: 'rgba(0,0,0,0.4)' 
            }} />
          </TouchableWithoutFeedback>

          {/* Modal content - completely separate from backdrop */}
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            height: '85%',
            overflow: 'hidden',
          }}>
                {/* Swipe Handle */}
                <View 
                  style={{
                    alignItems: 'center',
                    paddingTop: 8,
                    paddingBottom: 4,
                  }}
                >
                  <View style={{
                    width: 40,
                    height: 4,
                    backgroundColor: '#E0E0E0',
                    borderRadius: 2,
                  }} />
                </View>

                {/* Header */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f0f0f0',
                }}>
                  <Pressable
                    onPress={closeSocialModal}
                    style={{ padding: 8 }}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </Pressable>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: '#000',
                  }}>
                    Share Progress
                  </Text>
                  <View style={{ width: 40 }} />
                </View>

                {/* Scrollable Content - Everything in one ScrollView */}
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ 
                    paddingBottom: 200, // Even more padding to ensure scroll access
                  }}
                  bounces={true}
                  alwaysBounceVertical={true}
                  showsVerticalScrollIndicator={true}
                >
                  {/* Large Vertical Preview Container */}
                  {storyURI && (
                    <View style={{
                      marginHorizontal: 4, // Even smaller margins to really hug the sides
                      marginTop: 8,
                      marginBottom: 16,
                      borderRadius: 20,
                      overflow: 'hidden',
                      backgroundColor: '#ffffff', // White background for the preview
                      height: Dimensions.get('window').height * 0.65, // 65% of screen height for truly big preview
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 12,
                      elevation: 8,
                      borderWidth: 1,
                      borderColor: '#e0e0e0',
                    }}>
                      <Image
                        source={{ uri: storyURI }}
                        style={{
                          width: '100%',
                          height: '100%',
                          resizeMode: 'contain',
                        }}
                      />
                    </View>
                  )}

                  {/* Message and Share Section */}
                  <View style={{
                    paddingHorizontal: 20,
                    paddingTop: 8, // Reduced top padding
                    paddingBottom: 120, // Much more padding within the section
                    backgroundColor: '#f8f9fa', // Matching background
                    gap: 20,
                  }}>
                    {/* Main Feature Card */}
                    <View style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 20,
                      padding: 24,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 12,
                      elevation: 6,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                    }}>
                      {/* Header with Icons */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 20,
                        gap: 12,
                      }}>
                        <View style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: '#4064F6',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <Ionicons name="trending-up" size={24} color="#FFFFFF" />
                        </View>
                        <Text style={{
                          fontSize: 22,
                          fontWeight: '800',
                          color: '#000000',
                        }}>
                          Get Featured!
                        </Text>
                        <Text style={{ fontSize: 22 }}>⚽️🔥</Text>
                      </View>

                      {/* Instagram Section */}
                      <View style={{
                        backgroundColor: '#F7F3FF',
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 20,
                        borderWidth: 2,
                        borderColor: '#E1D5FF',
                      }}>
                        {/* Instagram Header */}
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 16,
                          gap: 10,
                        }}>
                          <View style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: '#E4405F',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}>
                            <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
                          </View>
                          <Text style={{
                            fontSize: 18,
                            fontWeight: '700',
                            color: '#000000',
                          }}>
                            Share on Instagram
                          </Text>
                        </View>

                        {/* Tag Instructions */}
                        <View style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 12,
                        }}>
                          <Text style={{
                            fontSize: 16,
                            color: '#374151',
                            textAlign: 'center',
                            lineHeight: 24,
                          }}>
                            Post your progress and tag
                          </Text>
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 8,
                            gap: 8,
                          }}>
                            <Image 
                              source={require('../../assets/images/BallerAILogo.png')}
                              style={{
                                width: 24,
                                height: 24,
                              }}
                              resizeMode="contain"
                            />
                            <Text style={{
                              fontSize: 18,
                              fontWeight: '800',
                              color: '#4064F6',
                              letterSpacing: 0.5,
                            }}>
                              @ballerai_official
                            </Text>
                          </View>
                          <Text style={{
                            fontSize: 14,
                            color: '#059669',
                            textAlign: 'center',
                            marginTop: 8,
                            fontWeight: '600',
                          }}>
                            We'll repost your story to thousands!
                          </Text>
                        </View>
                      </View>
                      {/* Benefits List */}
                      <View style={{
                        backgroundColor: '#F0F9FF',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 20,
                      }}>
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '700',
                          color: '#0369A1',
                          marginBottom: 12,
                          textAlign: 'center',
                        }}>
                          Why Share Your Progress?
                        </Text>
                        <View style={{ gap: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 16 }}>⚽️</Text>
                            <Text style={{ fontSize: 14, color: '#374151', flex: 1 }}>
                              Connect with like-minded ballers
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 16 }}>🌟</Text>
                            <Text style={{ fontSize: 14, color: '#374151', flex: 1 }}>
                              Get featured on our official account
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 16 }}>👥</Text>
                            <Text style={{ fontSize: 14, color: '#374151', flex: 1 }}>
                              Inspire thousands of footballers
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 16 }}>🤝</Text>
                            <Text style={{ fontSize: 14, color: '#374151', flex: 1 }}>
                              Be part of the community
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Share Button */}
                    <Pressable
                      onPress={() => {
                        console.log('Share button pressed');
                        proceedWithShare();
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: '#4064F6',
                        paddingVertical: 18,
                        borderRadius: 16,
                        alignItems: 'center',
                        shadowColor: '#4064F6',
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 8,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      })}
                    >
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <Ionicons name="share" size={20} color="#FFFFFF" />
                        <Text style={{
                          color: '#FFFFFF',
                          fontSize: 18,
                          fontWeight: '700',
                        }}>
                          Share Progress
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                </ScrollView>
              </View>
           </View>
         </Modal>

      {/* Off-screen 9:16 Story Canvas - Always rendered but off-screen */}
      <ViewShot
        ref={storyCanvasRef}
        options={{ format: 'png', quality: 1, result: 'tmpfile' }}
        style={{
          position: 'absolute',
          left: -9999,
          width: Dimensions.get('window').width,
          height: Math.round(Dimensions.get('window').width * 16 / 9),
          backgroundColor: '#ffffff',
        }}
      >
        {storyURI ? (
          <>
            <Image
              source={{ uri: storyURI }}
              style={{
                width: '100%',
                height: '100%',
                resizeMode: 'contain',
              }}
            />

          </>
        ) : (
          <View style={{ flex: 1, backgroundColor: '#ffffff' }} />
        )}
      </ViewShot>

      {/* Chat Modal */}
      <Modal
        visible={showQuestion}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowQuestion(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }} // Ensure KAV takes full height
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Adjust as needed, start with 0
        >
          <View style={{
            flex: 1,
            backgroundColor: '#F8F9FA',
          }}>
            {/* Chat Header */}
            <View style={{
              backgroundColor: '#4064F6',
              paddingTop: Platform.OS === 'ios' ? 60 : 20, // Adjusted padding for Android status bar
              paddingBottom: 16,
              paddingHorizontal: 20,
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
              alignItems: 'center', // Center header content
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%', // Ensure full width for space-between
              }}>
                {/* Empty view for spacing to allow mascot and title to center */}
                <View style={{ width: 40 }} /> 
                
                <View style={{ alignItems: 'center' }}> 
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}>
                    <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
                  </View>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: '#FFFFFF',
                  }}>
                    AI Coach
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#FFFFFF',
                    opacity: 0.8,
                  }}>
                    Your football training assistant
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  {questionCount >= 8 && (
                    <Text style={{
                      color: questionCount >= maxQuestions ? '#FFB3B3' : '#FFE6B3', 
                      fontSize: 14,
                      opacity: 0.9,
                    }}>
                      {maxQuestions - questionCount} left
                    </Text>
                  )}
                  <Pressable
                    onPress={() => setShowQuestion(false)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      padding: 4,
                    })}
                  >
                    <Ionicons name="close" size={28} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Messages Container */}
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }} // Takes remaining space
              contentContainerStyle={{
                paddingVertical: 20,
                paddingHorizontal: 16,
                paddingBottom: Platform.OS === 'ios' ? 60 : 40, // Increased bottom padding for scroll content
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {/* Welcome Message */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginBottom: 24,
                gap: 12,
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#4064F6',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
                </View>
                <View style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 20,
                  borderTopLeftRadius: 4,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 2,
                }}>
                  <Text style={{
                    fontSize: 16,
                    color: '#000000',
                    lineHeight: 22,
                  }}>
                    Hi! I'm your AI football coach. I can help you with questions about training, nutrition, recovery, mental preparation, tactics, and anything else football-related. What would you like to know?
                  </Text>
                </View>
              </View>

              {/* Conversation History */}
              {questionHistory
                .filter(item => item && item.question && item.question.trim() !== '') // Filter out empty or invalid items
                .map((item, index) => (
                <View key={index} style={{ marginBottom: 24 }}>
                  {/* User Message */}
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    marginBottom: 12,
                  }}>
                    <View style={{
                      maxWidth: '80%',
                      backgroundColor: '#4064F6',
                      padding: 16,
                      borderRadius: 20,
                      borderBottomRightRadius: 4,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 2,
                    }}>
                      <Text style={{
                        fontSize: 16,
                        color: '#FFFFFF',
                        lineHeight: 22,
                      }}>
                        {item.question}
                      </Text>
                    </View>
                  </View>

                  {/* AI Response or Loading */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#4064F6',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
                    </View>
                    <View style={{
                      flex: 1,
                      backgroundColor: '#FFFFFF',
                      padding: 16,
                      borderRadius: 20,
                      borderTopLeftRadius: 4,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 2,
                    }}>
                      {item.isLoading ? (
                        // Typing indicator for the main chat modal
                        <TypingIndicator />
                      ) : (
                        // Actual response
                        <Text style={{
                          fontSize: 16,
                          color: '#000000',
                          lineHeight: 22,
                        }}>
                          {item.response}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}

              {/* Remove the old loading animation since we now handle it per message */}
            </ScrollView>

            {/* Input Container - This will be pushed up by KAV */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: '#E5E5E5',
              paddingHorizontal: 16,
              paddingTop: 16, // Increased top padding for a bit more space
              paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Increased bottom padding to lift the input area
            }}>
              {/* Question Count Indicator */}
              {questionCount >= maxQuestions && (
                <View style={{
                  backgroundColor: '#FFF5F5',
                  borderColor: '#FFB3B3',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                }}>
                  <Text style={{
                    color: '#FF3B30',
                    fontSize: 14,
                    textAlign: 'center',
                    fontWeight: '500',
                  }}>
                    You've reached your daily limit of {maxQuestions} questions. Come back tomorrow!
                  </Text>
                </View>
              )}

              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 12,
              }}>
                <View style={{ flex: 1, position: 'relative' }}>
                  <TextInput
                    ref={questionInputRef}
                    value={question}
                    onChangeText={handleQuestionChange}
                    placeholder={questionCount >= maxQuestions ? "Daily limit reached..." : "Ask about football, nutrition, recovery..."}
                    maxLength={300} // Increased character limit
                    multiline
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 16,
                      maxHeight: 100,
                      minHeight: 44,
                      backgroundColor: questionCount >= maxQuestions ? '#F5F5F5' : '#FFFFFF',
                      color: questionCount >= maxQuestions ? '#999999' : '#000000',
                    }}
                    editable={questionCount < maxQuestions}
                    onFocus={handleQuestionInputFocus}
                  />
                  {questionCount < maxQuestions && question.length > 280 && ( // Show only after 280 characters
                    <Text style={{
                      position: 'absolute',
                      bottom: 6,
                      right: 12,
                      fontSize: 12,
                      color: question.length >= 295 ? '#FF3B30' : '#999999', // Warning color after 295 characters
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 4,
                    }}>
                      {question.length}/300
                    </Text>
                  )}
                </View>

                <Pressable
                  onPress={askAiQuestion}
                  disabled={!question.trim() || questionCount >= maxQuestions || isAiLoading}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: (!question.trim() || questionCount >= maxQuestions) ? '#CCCCCC' : '#4064F6',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Ionicons 
                    name="send" 
                    size={20} 
                    color="#FFFFFF" 
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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