import { View, Text, Pressable, StyleSheet, Image, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import Slider from '@react-native-community/slider';
import { format, differenceInHours, differenceInMinutes, parseISO, isSameDay, subDays, differenceInCalendarDays } from 'date-fns';
import { doc, getDoc, setDoc, collection, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import WeeklyOverview from '../components/WeeklyOverview';
import Constants from 'expo-constants';
import Animated, { FadeIn, FadeInDown, PinwheelIn, SlideInRight } from 'react-native-reanimated';
import analyticsService from '../services/analytics';
import RecoveryPlanGenerationLoader from '../components/RecoveryPlanGenerationLoader';

// Add this line to get the API key from Constants.expoConfig.extra
const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;

type RecoveryData = {
  soreness: number;
  fatigue: number;
  sleep: number;
  mood: number;
  submitted?: boolean;
  tools?: RecoveryTool[];
  timeAvailable?: string;
};

type RecoveryTool = 'Cold Exposure' | 'Foam Roller' | 'Cycling' | 'Swimming' | 'Compression' | 'Massage Gun' | 'Sauna' | 'Resistance Bands' | 'None';

type TimeOption = '15 mins' | '30 mins' | '45 mins' | '1h+';

type WorkflowStep = 'welcome' | 'tools' | 'time' | 'summary' | 'completed';

export default function RecoveryScreen() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [recoveryData, setRecoveryData] = useState<RecoveryData>({
    soreness: 5,
    fatigue: 5,
    sleep: 5,
    mood: 5,
    submitted: false
  });
  const [selectedTools, setSelectedTools] = useState<RecoveryTool[]>([]);
  const [toolsConfirmed, setToolsConfirmed] = useState(false);
  const [selectedTime, setSelectedTime] = useState<TimeOption | null>(null);
  const [timeConfirmed, setTimeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [todaysPlan, setTodaysPlan] = useState<string | null>(null);
  const [planCompleted, setPlanCompleted] = useState(false);
  const [todaysData, setTodaysData] = useState<{
    soreness: number;
    fatigue: number;
    sleep: number;
    mood: number;
  } | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [isToday, setIsToday] = useState(true);
  const [planExists, setPlanExists] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [hasTodayCompletedPlan, setHasTodayCompletedPlan] = useState(false);
  const [isLoadingStreak, setIsLoadingStreak] = useState(true);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('welcome');
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [hasEverGeneratedPlan, setHasEverGeneratedPlan] = useState(false);
  const [headerOpacity, setHeaderOpacity] = useState(0);
  const [planGenerationComplete, setPlanGenerationComplete] = useState(false);
  
  // Add back the missing refs
  const scrollViewRef = useRef<ScrollView>(null);
  const recoveryTimeRef = useRef<View>(null);
  const generateButtonRef = useRef<View>(null);
  const planHolderRef = useRef<View>(null);

  // Fetch recovery data for selected date
  useEffect(() => {
    const fetchRecoveryData = async () => {
      if (!user) return;
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const recoveryRef = doc(db, 'users', user.uid, 'recovery', dateStr);
      
      try {
        const docSnap = await getDoc(recoveryRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as RecoveryData & { tools?: RecoveryTool[] };
          setRecoveryData(data);
          setSelectedTools(data.tools || []);
          setToolsConfirmed(Boolean(data.tools && data.tools.length > 0));
          if (data.timeAvailable) {
            setSelectedTime(data.timeAvailable as TimeOption);
            setTimeConfirmed(true);
          } else {
            setSelectedTime(null);
            setTimeConfirmed(false);
          }
          setIsEditing(false);
        } else {
          // Reset form for new date with even numbers
          setRecoveryData({
            soreness: 5,
            fatigue: 5,
            sleep: 5,
            mood: 5,
            submitted: false
          });
          setSelectedTools([]);
          setToolsConfirmed(false);
          setSelectedTime(null);
          setTimeConfirmed(false);
          setIsEditing(true);
        }
      } catch (error) {
        console.error('Error fetching recovery data:', error);
      }
    };

    fetchRecoveryData();
    
    // Check if selected date is today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    setIsToday(today.getTime() === selected.getTime());
    
    // Load plan for the selected date
    loadPlanForSelectedDate();
  }, [selectedDate, user]);

  // Check if today's data exists when component mounts
  useEffect(() => {
    if (user) {
      checkTodaysData();
    }
  }, [user]);

  const checkTodaysData = async () => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const dataRef = doc(db, 'users', user.uid, 'recoveryData', today.toISOString().split('T')[0]);
      const dataSnap = await getDoc(dataRef);

      if (dataSnap.exists()) {
        const data = dataSnap.data();
        setRecoveryData({
          soreness: data.soreness || 5,
          fatigue: data.fatigue || 5,
          sleep: data.sleep || 5,
          mood: data.mood || 5,
          submitted: true
        });
      }
    } catch (error) {
      console.error('Error checking today\'s data:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const recoveryRef = doc(db, 'users', user.uid, 'recovery', dateStr);
    
    try {
      // First, get the current document to preserve any existing tools data and time data
      const docSnap = await getDoc(recoveryRef);
      const currentData: Partial<RecoveryData> = docSnap.exists() ? docSnap.data() as RecoveryData : {};
      
      // Create the base data object with required fields that cannot be undefined
      const updatedData: Record<string, any> = {
        soreness: recoveryData.soreness,
        fatigue: recoveryData.fatigue,
        sleep: recoveryData.sleep,
        mood: recoveryData.mood,
        submitted: true,
        lastUpdated: new Date().toISOString(),
      };
      
      // Only add tools if they exist (either from current data or selected)
      if (selectedTools.length > 0) {
        updatedData.tools = selectedTools;
      } else if (currentData.tools && currentData.tools.length > 0) {
        updatedData.tools = currentData.tools;
      }
      
      // Only add timeAvailable if it exists (either from current data or selected)
      if (selectedTime) {
        updatedData.timeAvailable = selectedTime;
      } else if (currentData.timeAvailable) {
        updatedData.timeAvailable = currentData.timeAvailable;
      }
      
      console.log("Saving recovery data:", updatedData);
      await setDoc(recoveryRef, updatedData);
      
      // Update local state to reflect submitted status and ensure it includes the same data we saved
      setRecoveryData({
        soreness: updatedData.soreness,
        fatigue: updatedData.fatigue,
        sleep: updatedData.sleep,
        mood: updatedData.mood,
        submitted: true,
        tools: updatedData.tools,
        timeAvailable: updatedData.timeAvailable
      });
      
      setIsEditing(false);
      
    } catch (error) {
      console.error('Error saving recovery data:', error);
      Alert.alert('Error', 'Failed to save data. Please try again.');
    }
  };

  // Load the plan for the selected date
  const loadPlanForSelectedDate = async () => {
    if (!user) return;
    
    setPlanLoading(true);
    setTodaysPlan(null);
    setPlanExists(false);
    setPlanCompleted(false);
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      const planRef = doc(db, 'users', user.uid, 'recoveryPlans', dateStr);
      const planSnap = await getDoc(planRef);
      
      if (planSnap.exists()) {
        const planData = planSnap.data();
        setTodaysPlan(planData.plan);
        setPlanExists(true);
        setPlanCompleted(planData.completed || false);
        console.log(`Loaded saved plan for ${dateStr}:`, planData.plan);
      } else {
        setTodaysPlan(null);
        setPlanExists(false);
        setPlanCompleted(false);
        console.log(`No plan exists for ${dateStr}`);
      }
    } catch (error) {
      console.error('Error loading recovery plan:', error);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!user) return;
    
    // Don't allow generating plans for past days
    if (!isToday) {
      Alert.alert('Not Available', 'You can only create recovery plans for today.');
      return;
    }
    
    if (!recoveryData.submitted) {
      Alert.alert('Error', 'Please submit your recovery data first.');
      return;
    }
    
    if (!toolsConfirmed) {
      Alert.alert('Error', 'Please confirm your recovery tools first.');
      return;
    }
    
    if (!timeConfirmed || !selectedTime) {
      Alert.alert('Error', 'Please confirm the time you have available.');
      return;
    }
    
    // Warn user about not being able to edit data after generating a plan
    Alert.alert(
      'Confirm Plan Generation',
      'Once you generate a recovery plan, you will no longer be able to edit today\'s recovery data. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Generate Plan',
          onPress: () => {
            if (planExists) {
              Alert.alert(
                'Plan Already Exists',
                'You already have a plan for this day. Generate a new one?',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  },
                  {
                    text: 'Generate New Plan',
                    onPress: () => generatePlan()
                  }
                ]
              );
            } else {
              generatePlan();
            }
          }
        }
      ]
    );
  };
  
  // Function to load last 4 days of recovery plans
  const loadLastRecoveryPlans = async () => {
    if (!user) return [];
    
    try {
      const last4DaysPlans = [];
      const today = new Date();
      
      for (let i = 1; i <= 4; i++) {
        const pastDate = subDays(today, i);
        const dateStr = format(pastDate, 'yyyy-MM-dd');
        
        const planDoc = await getDoc(doc(db, 'users', user.uid, 'recoveryPlans', dateStr));
        if (planDoc.exists()) {
          const planData = planDoc.data();
          last4DaysPlans.push({
            date: dateStr,
            plan: planData.plan,
            metrics: planData.metrics
          });
        }
      }
      
      return last4DaysPlans;
    } catch (error) {
      console.error('Error loading last recovery plans:', error);
      return [];
    }
  };

  const generatePlan = async () => {
    setLoading(true);
    setPlanGenerationComplete(false);

    try {
      const toolsAvailable = selectedTools.length > 0 
        ? `Available recovery tools: ${selectedTools.join(', ')}`
        : "No special recovery tools available. Suggest only bodyweight movements, walking, jogging, and other equipment-free activities.";

      // Load last 4 days of recovery plans for context
      const lastPlans = await loadLastRecoveryPlans();
      const lastPlansContext = lastPlans.length > 0 
        ? `Previous recovery plans (avoid repetition):
${lastPlans.map(p => `${p.date}: ${p.plan}`).join('\n')}` 
        : "No previous recovery plans available.";

      // Add recovery tool guidelines
      const recoveryToolGuidelines = `
Important guidelines for recovery tools:
- If recommending Cold Exposure, NEVER suggest more than 5 minutes in a row
- If recommending Sauna, ALWAYS suggest a minimum of 10 minutes to get the benefits
- If recommending Compression, ALWAYS suggest between 10-30 minutes (no more, no less)
- DO NOT feel obligated to use all available tools - only suggest what is appropriate based on the metrics and time available
      `.trim();

      const prompt = `Create a focused, concise recovery plan based on these metrics:

Current Recovery Status:
- Muscle Soreness Level: ${recoveryData.soreness}/10
- Overall Fatigue: ${recoveryData.fatigue}/10  
- Sleep Quality: ${recoveryData.sleep}/10
- Mood: ${recoveryData.mood}/10

${toolsAvailable}

Time Available: ${selectedTime}

${lastPlansContext}

${recoveryToolGuidelines}

CRITICAL TOOL SELECTION RULES:
- Select ONLY 1-2 tools maximum from available tools
- Choose tools that can be used in the SAME location (don't mix swimming + foam rolling, cycling + massage gun, etc.)
- Prioritize tools based on recovery metrics (high soreness = foam rolling/massage, high fatigue = compression/cold exposure)
- If multiple tools selected, ensure they complement each other

Create a clean, scannable recovery plan with:
1. MAXIMUM 5 activities total
2. Focus on the most impactful recovery methods for today's metrics
3. All activities must be compatible and doable in sequence
4. Progressive structure: light warm-up → main recovery → brief cool-down
5. Fit within ${selectedTime} timeframe
6. Avoid repeating exact activities from previous plans

Format each activity as a clean two-line bullet point:
"• [Activity] [Duration]
[Concise instruction]"

Examples:
• Joint mobility 5min
Gentle circles and stretches
• Foam rolling 10min
Focus on tight areas, slow pressure
• Cold shower 3min
Gradual temperature decrease
• Deep breathing 5min
4-7-8 breathing pattern

Keep instructions brief and actionable, under 8 words each.`;

      console.log('Making recovery plan API request...');
      
      // Validate API key
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not found');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'o3',
          messages: [
            {
              role: 'system',
              content: `You are a professional sports recovery specialist creating focused, concise recovery plans. Your job is to be SELECTIVE and choose only the most impactful tools for each athlete's specific needs.

CRITICAL SELECTION RULES:
- Choose ONLY 1-2 recovery tools maximum per plan
- Tools must be compatible and usable in the same location
- Base selection on recovery metrics (high soreness = foam rolling/massage, high fatigue = compression/cold exposure)
- Create SHORT, focused plans with 4-5 activities maximum

IMPORTANT SAFETY GUIDELINES: 
- Cold exposure must NEVER exceed 5 minutes in a row
- Sauna sessions must ALWAYS be at least 10 minutes to be effective
- Compression must ALWAYS be between 10-30 minutes (no more, no less)

IMPORTANT USAGE GUIDELINES:
- Be highly selective - don't use all available tools
- Prioritize impact over variety
- Keep instructions brief but specific
- Avoid repeating activities from previous plans`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 1,
          max_completion_tokens: 4000
        }),
      });

      console.log('API Response Status:', response.status);
      console.log('API Response Headers:', response.headers);

      // Check if response is OK before parsing
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await response.text();
        console.error('Non-JSON Response:', errorText);
        throw new Error('API returned non-JSON response');
      }

      const data = await response.json();
      console.log('API Response:', data);

      // Check for API errors in the response
      if (data.error) {
        console.error('OpenAI API Error:', data.error);
        throw new Error(`OpenAI API Error: ${data.error.message || 'Unknown error'}`);
      }

      // Log token usage for recovery plan generation
      const usage = data.usage;
      if (usage) {
        console.log('🏃‍♂️ RECOVERY PLAN GENERATION TOKEN USAGE:', {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          model: 'o3',
          feature: 'recovery_plan_generation',
          timestamp: new Date().toISOString()
        });
      }

      // Properly access the message content
      const planText = data.choices?.[0]?.message?.content;
      if (!planText) {
        throw new Error('No plan content in API response');
      }

      setTodaysPlan(planText);

      // Ensure all recovery data fields are present before saving
      const metricsToSave = {
        soreness: recoveryData.soreness || 5,
        fatigue: recoveryData.fatigue || 5,
        sleep: recoveryData.sleep || 5,
        mood: recoveryData.mood || 5
      };

      // Save the plan to Firebase with the current selected date
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      await setDoc(doc(db, 'users', user.uid, 'recoveryPlans', dateStr), {
        plan: planText,
        createdAt: Timestamp.now(),
        metrics: metricsToSave,
        date: dateStr,
        completed: false
      });

      // Log analytics event after successful saving
      try {
        await analyticsService.logEvent('AA__99_generate_recovery_plan');
        console.log("Analytics event 'generate_recovery_plan' logged.");
      } catch (error) {
        console.error("Error logging 'generate_recovery_plan' event:", error);
      }

      setPlanExists(true);
      setHasEverGeneratedPlan(true);
      setPlanGenerationComplete(true);
      console.log(`Recovery plan saved to Firebase for ${dateStr}`);
      // Note: setLoading(false) is handled by the loader's onComplete callback

    } catch (error) {
      console.error('Error generating recovery plan:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to generate a recovery plan. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'API configuration error. Please check your settings.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('OpenAI API Error')) {
          errorMessage = 'AI service error. Please try again in a moment.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid request. Please check your recovery data and try again.';
        }
      }
      
      Alert.alert('Error', errorMessage);
      setPlanGenerationComplete(false);
      setLoading(false);
    }
  };

  const handleConfirmTools = async () => {
    if (!user) return;
    
    if (selectedTools.length === 0) {
      Alert.alert('Error', 'Please select at least one recovery tool or select "None"');
      return;
    }
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const recoveryRef = doc(db, 'users', user.uid, 'recovery', dateStr);
    
    try {
      // Get current data first to avoid overwriting other fields
      const docSnap = await getDoc(recoveryRef);
      let currentData = {};
      if (docSnap.exists()) {
        currentData = docSnap.data();
      }
      
      const updatedData = {
        ...currentData,
        tools: selectedTools,
        lastUpdated: new Date().toISOString(),
      };
      
      await setDoc(recoveryRef, updatedData, { merge: true });
      setToolsConfirmed(true);
      
      // If recovery data is not yet submitted, remind the user
      if (!recoveryData.submitted) {
        Alert.alert('Tools Confirmed', 'Remember to also submit your recovery data to generate a plan.');
      }
    } catch (error) {
      console.error('Error saving tools data:', error);
      Alert.alert('Error', 'Failed to save tools data. Please try again.');
    }
  };

  const handleConfirmTime = async () => {
    if (!user) return;
    
    if (!selectedTime) {
      Alert.alert('Error', 'Please select the time available.');
      return;
    }
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const recoveryRef = doc(db, 'users', user.uid, 'recovery', dateStr);
    
    try {
      // Get current data first to avoid overwriting other fields
      const docSnap = await getDoc(recoveryRef);
      let currentData = {};
      if (docSnap.exists()) {
        currentData = docSnap.data();
      }
      
      const updatedData = {
        ...currentData,
        timeAvailable: selectedTime,
        lastUpdated: new Date().toISOString(),
      };
      
      await setDoc(recoveryRef, updatedData, { merge: true });
      setTimeConfirmed(true);
      
      // If recovery data is not yet submitted, remind the user
      if (!recoveryData.submitted || !toolsConfirmed) {
        Alert.alert('Time Confirmed', 'Remember to also submit your recovery data and tools to generate a plan.');
      }
    } catch (error) {
      console.error('Error saving time data:', error);
      Alert.alert('Error', 'Failed to save time data. Please try again.');
    }
  };

  const toggleTool = (tool: RecoveryTool) => {
    setToolsConfirmed(false); // Reset confirmed state when tools are changed
    setSelectedTools(prev => {
      // If selecting "None", clear all other selections
      if (tool === "None") {
        return prev.includes("None") ? [] : ["None"];
      }
      
      // If selecting any other tool, remove "None" if it's selected
      let newSelection = prev.filter(t => t !== "None");
      
      // Toggle the selected tool
      if (newSelection.includes(tool)) {
        newSelection = newSelection.filter(t => t !== tool);
      } else {
        newSelection = [...newSelection, tool];
      }
      
      return newSelection;
    });
  };

  // Add this useEffect to ensure recovery data is initialized correctly when component loads
  useEffect(() => {
    // Initialize recovery data with default values
    if (!recoveryData.submitted) {
      setRecoveryData({
        soreness: 5,
        fatigue: 5, 
        sleep: 5,
        mood: 5,
        submitted: false
      });
    }
  }, []);

  // Mark a plan as completed and increment streak
  const togglePlanCompletion = async () => {
    if (!user || !planExists || planCompleted) return; // Early return if already completed
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const planRef = doc(db, 'users', user.uid, 'recoveryPlans', dateStr);
    
    try {
      // Always mark as completed (no toggling back to incomplete)
      await setDoc(planRef, {
        completed: true
      }, { merge: true });
      
      // Update local state
      setPlanCompleted(true);
      
      console.log(`Plan marked as completed`);
      
      // Check if this is today's plan
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      
      if (today.getTime() === selected.getTime()) {
        setHasTodayCompletedPlan(true);
        
        // Increment streak by exactly 1
        const newStreak = streakCount + 1;
        setStreakCount(newStreak);
        
        // Save to Firestore with today's date as lastCheckedDate
        const todayStr = format(today, 'yyyy-MM-dd');
        const streakRef = doc(db, 'users', user.uid, 'recoveryStreak', 'current');
        await setDoc(streakRef, {
          count: newStreak,
          lastCheckedDate: todayStr,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log(`Streak incremented to ${newStreak}`);
      }
    } catch (error) {
      console.error('Error updating plan completion status:', error);
      Alert.alert('Error', 'Failed to mark plan as completed. Please try again.');
    }
  };

  // Load streak data and check for missed days when component mounts
  useEffect(() => {
    if (user) {
      // First load the current streak value
      loadStreakFromFirebase().then(() => {
        // After streak is loaded, check for missed days
        checkForMissedDays();
      });
      
      // Check if user has ever generated a plan
      checkIfHasEverGeneratedPlan();
    }
  }, [user]);
  
  // Check if user has ever generated a recovery plan
  const checkIfHasEverGeneratedPlan = async () => {
    if (!user) return;
    
    try {
      const plansRef = collection(db, 'users', user.uid, 'recoveryPlans');
      const plansSnapshot = await getDocs(plansRef);
      
      if (!plansSnapshot.empty) {
        setHasEverGeneratedPlan(true);
      }
    } catch (error) {
      console.error('Error checking for existing plans:', error);
    }
  };

  // Enhanced helper function to format the recovery plan text
  const formatPlanText = (planText: string) => {
    if (!planText) return [];
    
    // Split by lines and clean up
    const rawLines = planText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.toLowerCase().includes('focused') && !line.toLowerCase().includes('recovery plan'));
    
    const processedItems: any[] = [];
    
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      
      // Parse new two-line format: "• [Activity] [Duration]" followed by "[Instruction]"
      const newBulletMatch = line.match(/^[•\-]\s*(.+?)\s+(\d+\s*min?)$/);
      if (newBulletMatch) {
        const [, activity, duration] = newBulletMatch;
        const instruction = i + 1 < rawLines.length ? rawLines[i + 1] : '';
        processedItems.push({
          type: 'bullet',
          activity: activity.trim(),
          duration: duration.trim(),
          instruction: instruction.trim()
        });
        i++; // Skip the next line as it's the instruction
        continue;
      }
      
      // Parse old bullet point format: "• [Activity] – [Duration] – [Instruction]"
      const oldBulletMatch = line.match(/^[•\-]\s*(.+?)\s*[–-]\s*(.+?)\s*[–-]\s*(.+)$/);
      if (oldBulletMatch) {
        const [, activity, duration, instruction] = oldBulletMatch;
        processedItems.push({
          type: 'bullet',
          activity: activity.trim(),
          duration: duration.trim(),
          instruction: instruction.trim()
        });
        continue;
      }
      
      // Parse old structured format: "Activity Name - Duration: Instructions"
      const structuredMatch = line.match(/^(\d+\.\s*)?(.+?)\s*-\s*(.+?):\s*(.+)$/);
      if (structuredMatch) {
        const [, , activityName, duration, instructions] = structuredMatch;
        processedItems.push({
          type: 'bullet',
          activity: activityName.trim(),
          duration: duration.trim(),
          instruction: instructions.trim()
        });
        continue;
      }
      
      // Handle numbered items
      const numberedMatch = line.match(/^(\d+\.\s*)(.+)$/);
      if (numberedMatch) {
        const [, , content] = numberedMatch;
        processedItems.push({
          type: 'simple',
          content: content.trim()
        });
        continue;
      }
      
      // Handle simple bullet points
      const simpleBulletMatch = line.match(/^[•\-]\s*(.+)$/);
      if (simpleBulletMatch) {
        const [, content] = simpleBulletMatch;
        processedItems.push({
          type: 'simple',
          content: content.trim()
        });
        continue;
      }
      
      // Plain text
      processedItems.push({
        type: 'simple',
        content: line
      });
    }
    
    // Filter and re-number the bullets
    const filteredItems = processedItems.filter(item => 
      item.type === 'bullet' || (item.type === 'simple' && item.content && item.content.length > 0)
    );
    
    let bulletNumber = 1;
    return filteredItems.map(item => {
      if (item.type === 'bullet') {
        return {
          ...item,
          number: bulletNumber++
        };
      }
      return item;
    });
  };

  // Add this function to show streak explanation
  const showStreakExplanation = () => {
    Alert.alert(
      'Recovery Streak',
      'Each recovery plan you mark as completed adds one to your streak. If you miss a day, the streak drops by one.',
      [{ text: 'Got it!', style: 'default' }]
    );
  };

  // Update Streak Card with timer logic and loading state
  const renderStreakCard = () => {
    return (
      <Animated.View 
        entering={FadeIn.duration(300)}
        style={styles.streakCardContainer}
      >
        <View style={styles.streakCardContent}>
          <View style={styles.streakMascotContainer}>
            <View style={styles.streakIconContainer}>
              <Ionicons name="flame" size={40} color="#FF6B35" />
            </View>
          </View>
          
          <View style={styles.streakInfoContainer}>
            <View style={styles.streakHeaderContainer}>
              <Text style={styles.streakTitle}>Recovery Streak</Text>
              <Pressable
                onPress={showStreakExplanation}
                style={({ pressed }) => [
                  styles.infoIconButton,
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons name="information-circle-outline" size={24} color="#4064F6" />
              </Pressable>
            </View>
            {isLoadingStreak ? (
              <ActivityIndicator size="small" color="#4064F6" style={{ marginVertical: 8 }} />
            ) : (
              <Text style={styles.streakCount}>{streakCount} {streakCount === 1 ? 'day' : 'days'}</Text>
            )}
            {/* Removed the "Tap for info" text and its container */}
          </View>
        </View>
      </Animated.View>
    );
  };

  // Check for all missed days since the last completed plan
  const checkForMissedDays = async () => {
    if (!user) return;
    
    try {
      const DEBUG = false; // Set to true for verbose logging
      DEBUG && console.log('==== CHECKING FOR MISSED DAYS ====');
      
      // Get the current date (today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = format(today, 'yyyy-MM-dd');
      DEBUG && console.log(`Today: ${todayStr}`);
      
      // Get yesterday's date
      const yesterday = subDays(today, 1);
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
      DEBUG && console.log(`Yesterday: ${yesterdayStr}`);
      
      // Get the streak data from Firestore
      const streakRef = doc(db, 'users', user.uid, 'recoveryStreak', 'current');
      const streakDoc = await getDoc(streakRef);
      
      // Log current streak before any changes
      const currentStreak = streakDoc.exists() ? streakDoc.data().count || 0 : 0;
      DEBUG && console.log(`Current streak before check: ${currentStreak}`);
      
      // If we already checked today, skip checking again
      if (streakDoc.exists()) {
        const { lastCheckedDate } = streakDoc.data();
        DEBUG && console.log(`Last checked date: ${lastCheckedDate}`);
        
        if (lastCheckedDate === todayStr) {
          DEBUG && console.log('Already checked for missed days today, skipping check');
          return;
        }
      }
      
      // Find the most recent completed plan
      const plansRef = collection(db, 'users', user.uid, 'recoveryPlans');
      const plansQuery = query(plansRef, where('completed', '==', true));
      const plansSnapshot = await getDocs(plansQuery);
      
      DEBUG && console.log(`Found ${plansSnapshot.size} completed plans in total`);
      
      // REFINEMENT 1: If no completed plans exist, reset streak to zero
      if (plansSnapshot.empty) {
        DEBUG && console.log('No completed plans found, resetting streak to 0');
        
        // Reset streak to zero
        await setDoc(streakRef, {
          count: 0,
          lastCheckedDate: todayStr,
          updatedAt: new Date().toISOString()
        });
        
        // Update local state
        setStreakCount(0);
        DEBUG && console.log('Streak reset to 0');
        DEBUG && console.log('==== FINISHED CHECKING FOR MISSED DAYS ====');
        return;
      }
      
      // Helper function to normalize and validate plan dates
      const normalizePlanDate = (plan: any): Date | null => {
        let resolvedDate = null;
        
        // Try different possible date fields in order of preference
        if (plan.date) {
          resolvedDate = plan.date;
        } else if (plan.completedAt) {
          resolvedDate = plan.completedAt;
        } else if (plan.timestamp) {
          resolvedDate = plan.timestamp;
        } else {
          // If no date fields found, try using the document ID
          try {
            resolvedDate = parseISO(plan.id);
          } catch (error) {
            DEBUG && console.warn(`Failed to parse date from ID for plan ${plan.id}`);
            return null;
          }
        }
        
        // If already a Date object, use it directly
        if (resolvedDate instanceof Date) {
          // Verify it's a valid date with getTime()
          try {
            const time = resolvedDate.getTime();
            return !isNaN(time) ? resolvedDate : null;
          } catch (error) {
            DEBUG && console.warn(`Invalid Date object for plan ${plan.id}`);
            return null;
          }
        }
        
        // Otherwise, try to convert to Date
        try {
          const dateObj = new Date(resolvedDate);
          // Verify it's a valid date with getTime()
          const time = dateObj.getTime();
          if (isNaN(time)) {
            DEBUG && console.warn(`Invalid date after conversion for plan ${plan.id}: ${resolvedDate}`);
            return null;
          }
          return dateObj;
        } catch (error) {
          DEBUG && console.warn(`Failed to convert to Date for plan ${plan.id}: ${resolvedDate}`);
          return null;
        }
      };
      
      // If plans exist, find the most recent one
      let mostRecentCompletedDate = null;
      
      // Convert to array of plans with dates, filtering out invalid dates
      const completedPlans = plansSnapshot.docs
        .map(doc => {
          const plan = {
            id: doc.id,
            ...doc.data()
          };
          
          // Normalize and validate the date
          const normalizedDate = normalizePlanDate(plan);
          
          if (!normalizedDate) {
            DEBUG && console.warn(`Skipping plan ${plan.id} due to invalid date`);
            // If this is a one-time fix, we could add code here to repair the plan:
            // await setDoc(doc(db, 'users', user.uid, 'recoveryPlans', plan.id), 
            //   { ...plan, date: new Date().toISOString() }, { merge: true });
            return null;
          }
          
          return { ...plan, date: normalizedDate };
        })
        .filter(plan => plan !== null) // Remove plans with invalid dates
        .sort((a, b) => {
          try {
            // Safe sort with fallback
            return b.date.getTime() - a.date.getTime();
          } catch (error) {
            DEBUG && console.warn('Error during date sorting, falling back to default order');
            return 0; // Keep original order
          }
        });
      
      // Get the most recent completed plan date
      if (completedPlans.length > 0) {
        mostRecentCompletedDate = completedPlans[0].date;
        DEBUG && console.log(`Most recent completed plan: ${format(mostRecentCompletedDate, 'yyyy-MM-dd')}`);
      } else {
        // This could happen if all plans had invalid dates
        DEBUG && console.log('No completed plans with valid dates found after processing');
        
        // Reset streak to zero
        await setDoc(streakRef, {
          count: 0,
          lastCheckedDate: todayStr,
          updatedAt: new Date().toISOString()
        });
        
        // Update local state
        setStreakCount(0);
        DEBUG && console.log('Streak reset to 0');
        DEBUG && console.log('==== FINISHED CHECKING FOR MISSED DAYS ====');
        return;
      }
      
      // If most recent plan is from today, no days missed
      // At this point mostRecentCompletedDate is guaranteed to be non-null
      if (isSameDay(mostRecentCompletedDate, today)) {
        DEBUG && console.log('Most recent completion is today, no days missed');
        
        // Update lastCheckedDate to avoid checking again today
        await setDoc(streakRef, {
          count: currentStreak,
          lastCheckedDate: todayStr,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        DEBUG && console.log('Updated lastCheckedDate to today, keeping streak at:', currentStreak);
        DEBUG && console.log('==== FINISHED CHECKING FOR MISSED DAYS ====');
        return;
      }
      
      // Calculate days missed
      let daysMissed = 0;
      
      // REFINEMENT 2: Use date difference instead of per-day Firestore checks
      // At this point mostRecentCompletedDate is guaranteed to be non-null
      if (mostRecentCompletedDate.getTime() < yesterday.getTime()) {
        // Calculate days between most recent completion and yesterday
        daysMissed = differenceInCalendarDays(yesterday, mostRecentCompletedDate);
        DEBUG && console.log(`Last completion was ${daysMissed} days ago (${format(mostRecentCompletedDate, 'yyyy-MM-dd')} to ${yesterdayStr})`);
      } else {
        DEBUG && console.log('Most recent plan was yesterday, no days missed');
      }
      
      // Update streak if days were missed
      if (daysMissed > 0) {
        DEBUG && console.log(`Total days missed: ${daysMissed}`);
        
        // Decrement streak by daysMissed, but never below zero
        const newCount = Math.max(0, currentStreak - daysMissed);
        DEBUG && console.log(`Updating streak: ${currentStreak} - ${daysMissed} = ${newCount}`);
        
        // Update Firebase with new count and lastCheckedDate
        await setDoc(streakRef, {
          count: newCount,
          lastCheckedDate: todayStr,
          updatedAt: new Date().toISOString()
        });
        
        // Update local state
        setStreakCount(newCount);
        DEBUG && console.log(`Streak updated to ${newCount}`);
      } else {
        DEBUG && console.log('No days missed since last completed plan');
        
        // Still update lastCheckedDate to avoid checking again today
        await setDoc(streakRef, {
          count: currentStreak,
          lastCheckedDate: todayStr,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        DEBUG && console.log('Updated lastCheckedDate to today, keeping streak at:', currentStreak);
      }
      
      DEBUG && console.log('==== FINISHED CHECKING FOR MISSED DAYS ====');
    } catch (error) {
      console.error('Error checking for missed days:', error);
    }
  };

  // Load streak count from Firebase
  const loadStreakFromFirebase = async () => {
    if (!user) return;
    
    try {
      setIsLoadingStreak(true);
      console.log('Loading streak count from Firebase');
      const streakRef = doc(db, 'users', user.uid, 'recoveryStreak', 'current');
      const streakDoc = await getDoc(streakRef);
      
      if (streakDoc.exists()) {
        const data = streakDoc.data();
        console.log(`Loaded streak count: ${data.count}`);
        setStreakCount(data.count || 0);
      } else {
        // Initialize with zero for new users
        console.log('No saved streak found, initializing with zero');
        setStreakCount(0);
        await setDoc(streakRef, {
          count: 0,
          lastCheckedDate: format(new Date(), 'yyyy-MM-dd'),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading streak count from Firebase:', error);
      // Default to zero if there's an error
      setStreakCount(0);
    } finally {
      setIsLoadingStreak(false);
    }
  };

  // Check if today's plan exists and set workflow visibility
  useEffect(() => {
    if (isToday && !planExists) {
      setShowWorkflow(true);
      setCurrentStep('welcome');
    } else {
      setShowWorkflow(false);
    }
  }, [isToday, planExists]);

  const handleStartWorkflow = () => {
    // Check if recovery data has been submitted
    if (!recoveryData.submitted) {
      Alert.alert(
        'Submit Recovery Data First',
        'Please submit your recovery query data above before creating a recovery plan.',
        [
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
      return;
    }
    
    // Check if user already has a plan for today
    if (planExists) {
      Alert.alert(
        'Plan Already Exists',
        'Yesterday\'s plan will be automatically deleted when you generate a new one. Are you sure you want to continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Continue',
            onPress: () => {
              setCurrentStep('tools');
              setSelectedTools([]);
              setToolsConfirmed(false);
              setSelectedTime(null);
              setTimeConfirmed(false);
            }
          }
        ]
      );
    } else {
      setCurrentStep('tools');
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'tools':
        if (selectedTools.length > 0) {
          setToolsConfirmed(true);
          setCurrentStep('time');
        } else {
          Alert.alert('Error', 'Please select at least one recovery tool or select "None"');
        }
        break;
      case 'time':
        if (selectedTime) {
          setTimeConfirmed(true);
          setCurrentStep('summary');
        } else {
          Alert.alert('Error', 'Please select the time available');
        }
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'tools':
        setCurrentStep('welcome');
        break;
      case 'time':
        setCurrentStep('tools');
        break;
      case 'summary':
        setCurrentStep('time');
        break;
    }
  };

  const handleGeneratePlanFromSummary = async () => {
    // Save tools and time data first
    if (!user) return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const recoveryRef = doc(db, 'users', user.uid, 'recovery', dateStr);
    
    try {
      // Get current data first to avoid overwriting other fields
      const docSnap = await getDoc(recoveryRef);
      let currentData = {};
      if (docSnap.exists()) {
        currentData = docSnap.data();
      }
      
      const updatedData = {
        ...currentData,
        tools: selectedTools,
        timeAvailable: selectedTime,
        lastUpdated: new Date().toISOString(),
      };
      
      await setDoc(recoveryRef, updatedData, { merge: true });
      
      // Now generate the plan
      await generatePlan();
      
      // After successful generation, hide workflow and show the plan
      setShowWorkflow(false);
      setCurrentStep('completed');
    } catch (error) {
      console.error('Error saving data and generating plan:', error);
      Alert.alert('Error', 'Failed to generate plan. Please try again.');
    }
  };

  const renderWorkflowContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <Animated.View 
            entering={FadeIn.duration(300)}
            style={styles.workflowCard}
          >
            <View style={styles.workflowIconContainer}>
              <Ionicons name="flash" size={60} color="#4064F6" />
            </View>
            <Text style={styles.workflowTitle}>Let's Make a Recovery Plan!</Text>
            <Text style={styles.workflowText}>
              We'll create a personalized recovery plan for today based on your needs and available tools.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.getStartedButton,
                pressed && { opacity: 0.8 }
              ]}
              onPress={handleStartWorkflow}
            >
              <Text style={styles.getStartedButtonText}>Get Started</Text>
            </Pressable>
          </Animated.View>
        );

      case 'tools':
        return (
          <Animated.View 
            entering={SlideInRight.duration(300)}
            style={styles.workflowCard}
          >
            <View style={styles.navigationContainer}>
              <Pressable 
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleBack}
              >
                <Ionicons name="chevron-back" size={24} color="#4064F6" />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.nextButton,
                  selectedTools.length === 0 && styles.nextButtonDisabled,
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleNext}
                disabled={selectedTools.length === 0}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text style={styles.stepTitle}>Recovery Tools</Text>
            <Text style={styles.stepSubtitle}>Select the recovery tools you have access to.</Text>
            
            <View style={styles.toolsGrid}>
              <RecoveryToolButton 
                icon="snow-outline" 
                label="Cold Exposure" 
                selected={selectedTools.includes("Cold Exposure")}
                onPress={() => toggleTool("Cold Exposure")} 
              />
              <RecoveryToolButton 
                icon="heart-outline" 
                label="Foam Roller" 
                selected={selectedTools.includes("Foam Roller")}
                onPress={() => toggleTool("Foam Roller")} 
              />
              <RecoveryToolButton 
                icon="bicycle-outline" 
                label="Cycling" 
                selected={selectedTools.includes("Cycling")}
                onPress={() => toggleTool("Cycling")} 
              />
              <RecoveryToolButton 
                icon="water-outline" 
                label="Swimming" 
                selected={selectedTools.includes("Swimming")}
                onPress={() => toggleTool("Swimming")} 
              />
              <RecoveryToolButton 
                icon="pulse-outline" 
                label="Compression" 
                selected={selectedTools.includes("Compression")}
                onPress={() => toggleTool("Compression")} 
              />
              <RecoveryToolButton 
                icon="flash-outline" 
                label="Massage Gun" 
                selected={selectedTools.includes("Massage Gun")}
                onPress={() => toggleTool("Massage Gun")} 
              />
              <RecoveryToolButton 
                icon="flame-outline" 
                label="Sauna" 
                selected={selectedTools.includes("Sauna")}
                onPress={() => toggleTool("Sauna")} 
              />
              <RecoveryToolButton 
                icon="barbell-outline" 
                label="Resistance Bands" 
                selected={selectedTools.includes("Resistance Bands")}
                onPress={() => toggleTool("Resistance Bands")} 
              />
            </View>
            <View style={styles.noneToolContainer}>
              <RecoveryToolButton 
                icon="close-circle-outline" 
                label="None" 
                selected={selectedTools.includes("None")}
                onPress={() => toggleTool("None")} 
              />
            </View>
          </Animated.View>
        );

      case 'time':
        return (
          <Animated.View 
            entering={SlideInRight.duration(300)}
            style={styles.workflowCard}
          >
            <View style={styles.navigationContainer}>
              <Pressable 
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleBack}
              >
                <Ionicons name="chevron-back" size={24} color="#4064F6" />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.nextButton,
                  !selectedTime && styles.nextButtonDisabled,
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleNext}
                disabled={!selectedTime}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text style={styles.stepTitle}>Recovery Time</Text>
            <Text style={styles.stepSubtitle}>How much time do you have for today's recovery plan?</Text>
            
            <View style={styles.timeOptionsContainer}>
              <View style={styles.timeOptionsRow}>
                <Pressable 
                  style={({ pressed }) => [
                    styles.timeOptionButton,
                    selectedTime === '15 mins' && styles.timeOptionSelected,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => setSelectedTime('15 mins')}
                >
                  <Ionicons name="time-outline" size={24} color={selectedTime === '15 mins' ? "#FFFFFF" : "#666666"} />
                  <Text style={[styles.timeOptionText, selectedTime === '15 mins' && styles.timeOptionTextSelected]}>
                    15 mins
                  </Text>
                </Pressable>
                
                <Pressable 
                  style={({ pressed }) => [
                    styles.timeOptionButton,
                    selectedTime === '30 mins' && styles.timeOptionSelected,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => setSelectedTime('30 mins')}
                >
                  <Ionicons name="time-outline" size={24} color={selectedTime === '30 mins' ? "#FFFFFF" : "#666666"} />
                  <Text style={[styles.timeOptionText, selectedTime === '30 mins' && styles.timeOptionTextSelected]}>
                    30 mins
                  </Text>
                </Pressable>
              </View>
              
              <View style={styles.timeOptionsRow}>
                <Pressable 
                  style={({ pressed }) => [
                    styles.timeOptionButton,
                    selectedTime === '45 mins' && styles.timeOptionSelected,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => setSelectedTime('45 mins')}
                >
                  <Ionicons name="time-outline" size={24} color={selectedTime === '45 mins' ? "#FFFFFF" : "#666666"} />
                  <Text style={[styles.timeOptionText, selectedTime === '45 mins' && styles.timeOptionTextSelected]}>
                    45 mins
                  </Text>
                </Pressable>
                
                <Pressable 
                  style={({ pressed }) => [
                    styles.timeOptionButton,
                    selectedTime === '1h+' && styles.timeOptionSelected,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => setSelectedTime('1h+')}
                >
                  <Ionicons name="time-outline" size={24} color={selectedTime === '1h+' ? "#FFFFFF" : "#666666"} />
                  <Text style={[styles.timeOptionText, selectedTime === '1h+' && styles.timeOptionTextSelected]}>
                    1h+
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        );

      case 'summary':
        return (
          <Animated.View 
            entering={SlideInRight.duration(300)}
            style={styles.workflowCard}
          >
            <View style={styles.navigationContainer}>
              <Pressable 
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleBack}
              >
                <Ionicons name="chevron-back" size={24} color="#4064F6" />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            </View>

            <View style={styles.workflowIconContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#99E86C" />
            </View>
            <Text style={styles.workflowTitle}>Perfect!</Text>
            <Text style={styles.workflowText}>
              We have everything we need to create an optimal recovery plan for today.
            </Text>
            
            <Pressable
              style={({ pressed }) => [
                styles.generateButton,
                loading && styles.generateButtonDisabled,
                pressed && { opacity: 0.8 }
              ]}
              onPress={handleGeneratePlanFromSummary}
              disabled={loading}
            >
              <Text style={styles.generateButtonText}>
                {loading ? 'Generating Plan...' : 'Generate Plan'}
              </Text>
              <Ionicons name="fitness" size={20} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        );

      default:
        return null;
    }
  };



  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    
    // Update header opacity based on scroll position
    const newOpacity = Math.min(offsetY / 100, 1);
    setHeaderOpacity(newOpacity);
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 40}
      >
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={{
          flexGrow: 1,
            paddingBottom: 120,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        bounces={true}
        overScrollMode="never"
        scrollEventThrottle={16} // Update scroll position at ~60fps
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
              height: 92, // Same height as OnboardingHeader
            }}>
              {/* Title */}
              <Text style={{
                fontSize: 28,
                fontWeight: '900',
                color: '#000000',
              }} 
              allowFontScaling={false}
              maxFontSizeMultiplier={1.2}>
                Recovery
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

          <View style={styles.contentContainer}>
            {/* Weekly Overview */}
            <WeeklyOverview 
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />

            {/* Recovery Inputs - Always accessible for all days */}
            <Animated.View 
              entering={FadeIn.duration(300)}
              style={styles.inputsContainer}
            >
              <View style={{alignItems: 'center'}}>
                <Text style={styles.loadText}>Recovery Query</Text>
              </View>
              {recoveryData.submitted && !isEditing ? (
                // Show submitted data with edit button only if it's today
                <>
                  <View style={styles.submittedHeader}>
                    <Text style={styles.submittedText}>Submitted</Text>
                    {isToday && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.editButton,
                          pressed && { opacity: 0.8 }
                        ]}
                        onPress={() => {
                          setIsEditing(true);
                          // Mark data as not submitted when editing
                          setRecoveryData(prev => ({
                            ...prev,
                            submitted: false
                          }));
                        }}
                      >
                        <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                        <Text style={styles.editButtonText}>Edit</Text>
                      </Pressable>
                    )}
                  </View>
                  
                  <RecoverySlider
                    icon="fitness"
                    question="How intense was the training yesterday?"
                    value={recoveryData.fatigue}
                    onValueChange={() => {}}
                    min={1}
                    max={10}
                    disabled={true}
                    type="intensity"
                  />
                  <RecoverySlider
                    icon="medical"
                    question="How sore are you?"
                    value={recoveryData.soreness}
                    onValueChange={() => {}}
                    min={1}
                    max={10}
                    disabled={true}
                    type="soreness"
                  />
                  <RecoverySlider
                    icon="flash"
                    question="How tired do you feel overall?"
                    value={recoveryData.mood}
                    onValueChange={() => {}}
                    min={1}
                    max={10}
                    disabled={true}
                    type="fatigue"
                  />
                  <RecoverySlider
                    icon="moon"
                    question="Sleep duration last night"
                    value={recoveryData.sleep}
                    onValueChange={() => {}}
                    min={1}
                    max={10}
                    disabled={true}
                    type="sleep"
                  />
                </>
              ) : isEditing || !recoveryData.submitted ? (
                // Show editable sliders only if editing or not submitted yet
                <>
                  <RecoverySlider
                    icon="fitness"
                    question="How intense was the training yesterday?"
                    value={recoveryData.fatigue}
                    onValueChange={(value) => setRecoveryData(prev => ({
                      ...prev,
                      fatigue: value
                    }))}
                    min={1}
                    max={10}
                    disabled={false}
                    type="intensity"
                  />
                  <RecoverySlider
                    icon="medical"
                    question="How sore are you?"
                    value={recoveryData.soreness}
                    onValueChange={(value) => setRecoveryData(prev => ({
                      ...prev,
                      soreness: value
                    }))}
                    min={1}
                    max={10}
                    disabled={false}
                    type="soreness"
                  />
                  <RecoverySlider
                    icon="flash"
                    question="How tired do you feel overall?"
                    value={recoveryData.mood}
                    onValueChange={(value) => setRecoveryData(prev => ({
                      ...prev,
                      mood: value
                    }))}
                    min={1}
                    max={10}
                    disabled={false}
                    type="fatigue"
                  />
                  <RecoverySlider
                    icon="moon"
                    question="Sleep duration last night"
                    value={recoveryData.sleep}
                    onValueChange={(value) => setRecoveryData(prev => ({
                      ...prev,
                      sleep: value
                    }))}
                    min={1}
                    max={10}
                    disabled={false}
                    type="sleep"
                  />
                  
                  {/* Submit button inside the Recovery Query card */}
                  <Pressable 
                    style={({ pressed }) => [
                      styles.submitButton,
                      {marginTop: 16},
                      pressed && { opacity: 0.8 }
                    ]}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.submitButtonText}>
                      {isEditing ? 'Update Data' : 'Submit Data'}
                    </Text>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  </Pressable>
                </>
              ) : null}
            </Animated.View>

            {/* Show workflow or old cards based on state */}
            {showWorkflow && isToday && !planExists ? (
              renderWorkflowContent()
            ) : (
              <>
                {/* Recovery Tools Selection Card - Hidden when workflow is active or plan exists or not today */}
                {!showWorkflow && !planExists && isToday && (
                  <Animated.View 
                    entering={FadeIn.duration(300)}
                    style={[
                      styles.inputsContainer, 
                      planExists && styles.disabledContainer,
                      (toolsConfirmed && !planExists) && styles.confirmedContainer,
                      !isToday && styles.pastDayContainer
                    ]}
                  >
                    <View style={{alignItems: 'center'}}>
                      <Text style={[
                        styles.loadText,
                        planExists && {color: '#999999'},
                        (toolsConfirmed && !planExists) && {color: '#4064F6'},
                        !isToday && {color: '#999999'}
                      ]}>Recovery Tools</Text>
                    </View>
                    
                    {toolsConfirmed && !planExists && isToday ? (
                      // Show confirmed header with edit button - only for today
                      <View style={styles.submittedHeader}>
                        <Text style={styles.submittedText}>Confirmed</Text>
                        <Pressable
                          style={({ pressed }) => [
                            styles.editButton,
                            pressed && { opacity: 0.8 }
                          ]}
                          onPress={() => setToolsConfirmed(false)}
                        >
                          <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                          <Text style={styles.editButtonText}>Edit</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={[
                        styles.toolsSelectionText,
                        planExists && {color: '#999999'},
                        (toolsConfirmed && !planExists) && {color: '#999999'},
                        !isToday && {color: '#999999'}
                      ]}>
                        Select the recovery tools you have access to.
                      </Text>
                    )}
                    
                    <View style={styles.toolsGrid}>
                      <RecoveryToolButton 
                        icon="snow-outline" 
                        label="Cold Exposure" 
                        selected={selectedTools.includes("Cold Exposure")}
                        onPress={() => toggleTool("Cold Exposure")} 
                        disabled={planExists || (toolsConfirmed && !isEditing) || !isToday}
                      />
                      <RecoveryToolButton 
                        icon="heart-outline" 
                        label="Foam Roller" 
                        selected={selectedTools.includes("Foam Roller")}
                        onPress={() => toggleTool("Foam Roller")} 
                        disabled={planExists || (toolsConfirmed && !isEditing) || !isToday}
                      />
                      <RecoveryToolButton 
                        icon="bicycle-outline" 
                        label="Cycling" 
                        selected={selectedTools.includes("Cycling")}
                        onPress={() => toggleTool("Cycling")} 
                        disabled={planExists || (toolsConfirmed && !isEditing) || !isToday}
                      />
                      <RecoveryToolButton 
                        icon="water-outline" 
                        label="Swimming" 
                        selected={selectedTools.includes("Swimming")}
                        onPress={() => toggleTool("Swimming")} 
                        disabled={planExists || (toolsConfirmed && !isEditing) || !isToday}
                      />
                      <RecoveryToolButton 
                        icon="pulse-outline" 
                        label="Compression" 
                        selected={selectedTools.includes("Compression")}
                        onPress={() => toggleTool("Compression")} 
                        disabled={planExists || (toolsConfirmed && !isEditing) || !isToday}
                      />
                      <RecoveryToolButton 
                        icon="flash-outline" 
                        label="Massage Gun" 
                        selected={selectedTools.includes("Massage Gun")}
                        onPress={() => toggleTool("Massage Gun")} 
                        disabled={planExists || (toolsConfirmed && !isEditing) || !isToday}
                      />
                      <RecoveryToolButton 
                        icon="flame-outline" 
                        label="Sauna" 
                        selected={selectedTools.includes("Sauna")}
                        onPress={() => toggleTool("Sauna")} 
                        disabled={planExists || (toolsConfirmed && !isEditing) || !isToday}
                      />
                      <RecoveryToolButton 
                        icon="barbell-outline" 
                        label="Resistance Bands" 
                        selected={selectedTools.includes("Resistance Bands")}
                        onPress={() => toggleTool("Resistance Bands")} 
                        disabled={planExists || (toolsConfirmed && !isEditing) || !isToday}
                      />
                    </View>
                    <View style={styles.noneToolContainer}>
                      <RecoveryToolButton 
                        icon="close-circle-outline" 
                        label="None" 
                        selected={selectedTools.includes("None")}
                        onPress={() => toggleTool("None")} 
                        disabled={planExists || (toolsConfirmed && !isEditing) || !isToday}
                      />
                    </View>
                    
                    {!planExists && !toolsConfirmed && isToday && (
                      <Pressable 
                      style={({ pressed }) => [
                        styles.submitButton,
                        pressed && { opacity: 0.8 }
                      ]}
                    onPress={handleConfirmTools}
                      >
                        <Text style={styles.submitButtonText}>
                          Confirm Tools
                        </Text>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      </Pressable>
                    )}
                    
                    {toolsConfirmed && !planExists && isToday && (
                      <Text style={[styles.toolsConfirmedText]}>
                        Your selection has been saved
                      </Text>
                    )}
                    
                    {!toolsConfirmed && !planExists && selectedTools.length === 0 && isToday && (
                      <Text style={styles.toolsHelperText}>
                        Please select at least one option
                      </Text>
                    )}
                    
                    {planExists && (
                      <Text style={[styles.toolsHelperText, {color: '#999999'}]}>
                        Recovery plan already generated
                      </Text>
                    )}
                  </Animated.View>
                )}

                {/* Recovery Time Card - Hidden when workflow is active or plan exists or not today */}
                {!showWorkflow && !planExists && isToday && (
                  <Animated.View 
                    ref={recoveryTimeRef}
                    entering={FadeIn.duration(300)}
                    style={[
                      styles.inputsContainer, 
                      planExists && styles.disabledContainer,
                      (timeConfirmed && !planExists) && styles.confirmedContainer,
                      !isToday && styles.pastDayContainer
                    ]}
                  >
                    <View style={{alignItems: 'center'}}>
                      <Text style={[
                        styles.loadText,
                        planExists && {color: '#999999'},
                        (timeConfirmed && !planExists) && {color: '#4064F6'},
                        !isToday && {color: '#999999'}
                      ]}>Recovery Time</Text>
                    </View>
                    
                    {timeConfirmed && !planExists && isToday ? (
                      // Show confirmed header with edit button - only for today
                      <View style={styles.submittedHeader}>
                        <Text style={styles.submittedText}>Confirmed</Text>
                        <Pressable
                          style={({ pressed }) => [
                            styles.editButton,
                            pressed && { opacity: 0.8 }
                          ]}
                          onPress={() => setTimeConfirmed(false)}
                        >
                          <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                          <Text style={styles.editButtonText}>Edit</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={[
                        styles.toolsSelectionText,
                        planExists && {color: '#999999'},
                        (timeConfirmed && !planExists) && {color: '#999999'},
                        !isToday && {color: '#999999'}
                      ]}>
                        How much time do you have for today's recovery plan?
                      </Text>
                    )}
                    
                    {/* Time Options */}
                    <View style={styles.timeOptionsContainer}>
                      <View style={styles.timeOptionsRow}>
                        <Pressable 
                          style={({ pressed }) => [
                            styles.timeOptionButton,
                            selectedTime === '15 mins' && styles.timeOptionSelected,
                            (planExists || (timeConfirmed && !isToday) || !isToday) && styles.timeOptionDisabled,
                            pressed && { opacity: 0.8 }
                          ]}
                          onPress={() => isToday ? setSelectedTime('15 mins') : null}
                          disabled={planExists || (timeConfirmed && !isEditing) || !isToday}
                        >
                          <Ionicons 
                            name="time-outline" 
                            size={24} 
                            color={
                              planExists || (timeConfirmed && !isEditing) || !isToday
                                ? "#BBBBBB" 
                                : selectedTime === '15 mins'
                                  ? "#FFFFFF" 
                                  : "#666666"
                            } 
                          />
                          <Text 
                            style={[
                              styles.timeOptionText,
                              selectedTime === '15 mins' && styles.timeOptionTextSelected,
                              (planExists || (timeConfirmed && !isEditing) || !isToday) && styles.timeOptionTextDisabled
                            ]}
                          >
                            15 mins
                          </Text>
                        </Pressable>
                        
                        <Pressable 
                          style={({ pressed }) => [
                            styles.timeOptionButton,
                            selectedTime === '30 mins' && styles.timeOptionSelected,
                            (planExists || (timeConfirmed && !isToday) || !isToday) && styles.timeOptionDisabled,
                            pressed && { opacity: 0.8 }
                          ]}
                          onPress={() => isToday ? setSelectedTime('30 mins') : null}
                          disabled={planExists || (timeConfirmed && !isEditing) || !isToday}
                        >
                          <Ionicons 
                            name="time-outline" 
                            size={24} 
                            color={
                              planExists || (timeConfirmed && !isEditing) || !isToday
                                ? "#BBBBBB" 
                                : selectedTime === '30 mins'
                                  ? "#FFFFFF" 
                                  : "#666666"
                            } 
                          />
                          <Text 
                            style={[
                              styles.timeOptionText,
                              selectedTime === '30 mins' && styles.timeOptionTextSelected,
                              (planExists || (timeConfirmed && !isEditing) || !isToday) && styles.timeOptionTextDisabled
                            ]}
                          >
                            30 mins
                          </Text>
                        </Pressable>
                      </View>
                      
                      <View style={styles.timeOptionsRow}>
                        <Pressable 
                          style={({ pressed }) => [
                            styles.timeOptionButton,
                            selectedTime === '45 mins' && styles.timeOptionSelected,
                            (planExists || (timeConfirmed && !isToday) || !isToday) && styles.timeOptionDisabled,
                            pressed && { opacity: 0.8 }
                          ]}
                          onPress={() => isToday ? setSelectedTime('45 mins') : null}
                          disabled={planExists || (timeConfirmed && !isEditing) || !isToday}
                        >
                          <Ionicons 
                            name="time-outline" 
                            size={24} 
                            color={
                              planExists || (timeConfirmed && !isEditing) || !isToday
                                ? "#BBBBBB" 
                                : selectedTime === '45 mins'
                                  ? "#FFFFFF" 
                                  : "#666666"
                            } 
                          />
                          <Text 
                            style={[
                              styles.timeOptionText,
                              selectedTime === '45 mins' && styles.timeOptionTextSelected,
                              (planExists || (timeConfirmed && !isEditing) || !isToday) && styles.timeOptionTextDisabled
                            ]}
                          >
                            45 mins
                          </Text>
                        </Pressable>
                        
                        <Pressable 
                          style={({ pressed }) => [
                            styles.timeOptionButton,
                            selectedTime === '1h+' && styles.timeOptionSelected,
                            (planExists || (timeConfirmed && !isToday) || !isToday) && styles.timeOptionDisabled,
                            pressed && { opacity: 0.8 }
                          ]}
                          onPress={() => isToday ? setSelectedTime('1h+') : null}
                          disabled={planExists || (timeConfirmed && !isEditing) || !isToday}
                        >
                          <Ionicons 
                            name="time-outline" 
                            size={24} 
                            color={
                              planExists || (timeConfirmed && !isEditing) || !isToday
                                ? "#BBBBBB" 
                                : selectedTime === '1h+'
                                  ? "#FFFFFF" 
                                  : "#666666"
                            } 
                          />
                          <Text 
                            style={[
                              styles.timeOptionText,
                              selectedTime === '1h+' && styles.timeOptionTextSelected,
                              (planExists || (timeConfirmed && !isEditing) || !isToday) && styles.timeOptionTextDisabled
                            ]}
                          >
                            1h+
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                    
                    {!planExists && !timeConfirmed && isToday && (
                      <Pressable 
                        style={({ pressed }) => [
                          styles.submitButton,
                          !selectedTime && styles.submitButtonDisabled,
                          pressed && { opacity: 0.8 }
                        ]}
                        onPress={handleConfirmTime}
                        disabled={!selectedTime}
                      >
                        <Text style={styles.submitButtonText}>
                          Confirm Time
                        </Text>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      </Pressable>
                    )}
                    
                    {timeConfirmed && !planExists && isToday && (
                      <Text style={[styles.toolsConfirmedText]}>
                        Your selection has been saved
                      </Text>
                    )}
                    
                    {!timeConfirmed && !planExists && isToday && (
                      <Text style={styles.toolsHelperText}>
                        Please select how much time you have
                      </Text>
                    )}
                    
                    {planExists && (
                      <Text style={[styles.toolsHelperText, {color: '#999999'}]}>
                        Recovery plan already generated
                      </Text>
                    )}
                  </Animated.View>
                )}

                {/* Generate Plan Button or Status - Hidden when workflow is active or plan exists or not today */}
                {!showWorkflow && !planExists && isToday && (
                  <Animated.View 
                    entering={FadeIn.duration(300)}
                  >
                    <Pressable
                      ref={generateButtonRef}
                      style={({ pressed }) => [
                        styles.generateButton, 
                        (loading || !recoveryData.submitted || !toolsConfirmed || !timeConfirmed || !isToday) && styles.generateButtonDisabled
                      ]}
                      onPress={handleGeneratePlan}
                      disabled={loading || !recoveryData.submitted || !toolsConfirmed || !timeConfirmed || !isToday}
                    >
                      <Text style={styles.generateButtonText}>
                        {loading ? 'Generating Plan...' : 'Generate Recovery Plan'}
                      </Text>
                      <Ionicons name="fitness" size={20} color="#FFFFFF" />
                    </Pressable>
                    
                    {(!recoveryData.submitted || !toolsConfirmed || !timeConfirmed) && isToday ? (
                      <View style={styles.infoMessageContainer}>
                        <Text style={styles.infoMessageText}>
                          {!recoveryData.submitted && !toolsConfirmed && !timeConfirmed
                            ? 'Submit your recovery data, confirm your tools, and select available time to generate a plan'
                            : !recoveryData.submitted 
                              ? 'Submit your recovery data to generate a plan'
                              : !toolsConfirmed
                                ? 'Confirm your recovery tools to generate a plan'
                                : 'Confirm your available time to generate a plan'}
                        </Text>
                      </View>
                    ) : !isToday ? (
                      <View style={styles.infoMessageContainer}>
                        <Text style={styles.infoMessageText}>
                          You can only generate recovery plans for today
                        </Text>
                      </View>
                    ) : null}
                  </Animated.View>
                )}
              </>
            )}

            {/* Plan Holder - Always visible for past days, or when plan exists for today */}
            {(planExists || !isToday) && (
              <View 
                ref={planHolderRef}
                style={{
                  marginHorizontal: 24,
                  flex: 1, // Restored flex property
                }}
              >
                <View style={[
                  styles.planHolderContainer,
                  !todaysPlan && !planLoading && styles.planHolderEmpty
                ]}>
                  <View style={styles.planHolderHeader}>
                    <Text style={styles.planHolderTitle} allowFontScaling={false}>
                      {isToday ? 'Your Plan for Today' : `Plan For ${format(selectedDate, 'MMM d')}`}
                    </Text>
                  </View>
                  
                  {planLoading ? (
                    <View style={styles.planLoadingContainer}>
                      <Ionicons name="hourglass-outline" size={24} color="#999999" />
                      <Text style={styles.planLoadingText}>Loading plan...</Text>
                    </View>
                  ) : todaysPlan ? (
                    <View style={styles.planContentContainer}>
                      {formatPlanText(todaysPlan).map((item, index) => (
                        <View key={index} style={styles.recoveryBulletItem}>
                          {item.type === 'bullet' ? (
                            <View style={styles.bulletRow}>
                              <Text style={styles.bulletNumber}>{item.number}.</Text>
                              <View style={styles.bulletContent}>
                                <Text style={styles.bulletHeaderLine}>
                                  <Text style={styles.bulletActivity}>{item.activity}</Text>
                                  <Text style={styles.bulletDuration}> {item.duration}</Text>
                                </Text>
                                <Text style={styles.bulletInstruction}>{item.instruction}</Text>
                              </View>
                            </View>
                          ) : (
                            <Text style={styles.recoveryActivityText}>{item.content}</Text>
                          )}
                        </View>
                      ))}
                      <Text style={styles.planDateText}>
                        Generated on {format(selectedDate, 'MMMM d, yyyy')}
                      </Text>
                      
                      {/* Completion status and button */}
                      {planCompleted && (
                        <View style={styles.completedBadgeContainer}>
                          <View style={styles.completedBadge}>
                            <Ionicons name="checkmark-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.completedBadgeText}>Completed</Text>
                          </View>
                        </View>
                      )}
                      
                      {/* Only show the button if the plan is not completed */}
                      {!planCompleted && (
                        <Pressable
                          style={({ pressed }) => [
                            styles.completionButton,
                            styles.completeButton,
                            pressed && { opacity: 0.8 }
                          ]}
                          onPress={togglePlanCompletion}
                        >
                          <Text style={styles.completionButtonText}>
                            Mark as Completed
                          </Text>
                          <Ionicons 
                            name="checkmark-circle"
                            size={20} 
                            color="#FFFFFF" 
                          />
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptyPlanContainer}>
                      <Ionicons name="fitness-outline" size={32} color="#CCCCCC" />
                      <Text style={styles.emptyPlanText}>
                        {!isToday 
                          ? 'No plan generated for this day'
                          : recoveryData.submitted 
                            ? 'No plan generated yet'
                            : 'Submit recovery data first'}
                      </Text>
                      {isToday && (
                        recoveryData.submitted ? (
                          <Text style={styles.emptyPlanSubtext}>
                            Click the generate button to create your recovery plan
                          </Text>
                        ) : (
                          <Text style={styles.emptyPlanSubtext}>
                            Submit your recovery data using the form above
                          </Text>
                        )
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}

            
            {/* Streak Card - Only show after first plan has been generated and only for today */}
            {hasEverGeneratedPlan && isToday && (
              <View style={{ marginTop: 'auto' }}>
                {renderStreakCard()}
              </View>
            )}
          </View>
      </ScrollView>
      </KeyboardAvoidingView>
      
      {loading && (
        <RecoveryPlanGenerationLoader 
          isComplete={planGenerationComplete}
          onComplete={() => {
            // This will be called when the animation completes
            setLoading(false);
            setPlanGenerationComplete(false);
          }}
        />
      )}

    </>
  );
}

// Custom Track Component for different slider types
function SliderTrack({ 
  type 
}: { 
  type: 'intensity' | 'soreness' | 'fatigue' | 'sleep';
}) {
  const getGradientColors = (): [string, string, string] => {
    switch (type) {
      case 'intensity':
        return ['#99E86C', '#E8B76C', '#E86C6C'];
      case 'soreness':
        return ['#99E86C', '#E8B76C', '#E86C6C'];
      case 'fatigue':
        return ['#99E86C', '#E8B76C', '#E86C6C'];
      case 'sleep':
        return ['#E86C6C', '#E8B76C', '#99E86C'];
      default:
        return ['#99E86C', '#E8B76C', '#E86C6C'];
    }
  };

  return (
    <View style={styles.trackContainer}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientTrack}
      />
    </View>
  );
}

// Update RecoverySlider to use custom track
function RecoverySlider({ 
  icon, 
  question, 
  value, 
  onValueChange, 
  min, 
  max,
  disabled,
  type
}: {
  icon: keyof typeof Ionicons.glyphMap;
  question: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  disabled: boolean;
  type: 'intensity' | 'soreness' | 'fatigue' | 'sleep';
}) {
  return (
    <View style={[
      styles.sliderContainer,
      disabled && styles.disabledSlider
    ]}>
      <View style={styles.questionContainer}>
        <Ionicons name={icon} size={24} color={disabled ? "#999999" : "#666666"} />
        <Text style={[
          styles.question,
          disabled && { color: '#999999' }
        ]}>
          {question}
        </Text>
      </View>
      <View style={styles.sliderWrapper}>
        <SliderTrack type={type} />
        <Slider
          style={[
            { height: 40 },
            { position: 'absolute', width: '100%' }
          ]}
          minimumValue={min}
          maximumValue={max}
          value={value}
          onValueChange={onValueChange}
          minimumTrackTintColor="#99E86C"
          maximumTrackTintColor="transparent"
          thumbTintColor={disabled ? "#CCCCCC" : "#FFFFFF"}
          disabled={disabled}
          step={1}
        />
      </View>
      <View style={styles.sliderLabels}>
        {[...Array(max - min + 1)].map((_, i) => (
          <Text key={i} style={[
            styles.sliderLabel,
            disabled && { color: '#999999' }
          ]}>
            {min + i}
          </Text>
        ))}
      </View>
    </View>
  );
}

// Recovery Tool Button Component
function RecoveryToolButton({
  icon,
  label,
  selected,
  onPress,
  disabled = false
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.toolButton,
        selected && styles.toolButtonSelected,
        pressed && { opacity: 0.8 }
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <Ionicons 
        name={icon} 
        size={24} 
        color={
          disabled 
            ? "#BBBBBB" 
            : selected 
              ? "#FFFFFF" 
              : "#666666"
        } 
      />
      <Text 
        style={[
          styles.toolButtonText,
          selected && styles.toolButtonTextSelected,
          disabled && styles.toolButtonTextDisabled
        ]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000000',
    paddingHorizontal: 24,
    marginTop: 24,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 20,
    color: '#000000',
    paddingHorizontal: 24,
    marginTop: 16,
    textAlign: 'center',
  },
  calendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 24,
  },
  dayButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#3F63F6',
    minWidth: 40,
  },
  selectedDay: {
    backgroundColor: '#99E86C',
  },
  dayLetter: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  inputsContainer: {
    backgroundColor: '#DCF4F5',
    margin: 24,
    padding: 24,
    borderRadius: 24,
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  sliderContainer: {
    gap: 6,
    paddingVertical: 8,
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  question: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  sliderWrapper: {
    height: 40,
    justifyContent: 'center',
  },
  trackContainer: {
    height: 8,
    width: '100%',
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gradientTrack: {
    height: '100%',
    width: '100%',
  },
  slider: {
    height: 50,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
    paddingVertical: 0,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 10,
  },
  helperText: {
    fontSize: 14,
    color: '#666666',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4064F6',
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 24,
    paddingVertical: 12,
    borderRadius: 32,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submittedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadText: {
    fontSize: 20,
    color: '#000000',
    fontWeight: '600',
  },
  submittedText: {
    fontSize: 18,
    color: '#BBBBBB',
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4064F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 36,
  },
  editButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledSlider: {
    opacity: 0.7,
    pointerEvents: 'none',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4064F6',
    marginHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 36,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  bottomPadding: {
    height: 20,
  },
  disabledDay: {
    backgroundColor: '#E5E5E5', // Grey background for disabled days
    opacity: 0.5,
  },
  disabledDayText: {
    color: '#999999', // Grey text for disabled days
  },
  generateButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#666666',
  },
  planContainer: {
    marginTop: 24,
    marginHorizontal: 8,
    padding: 20,
    backgroundColor: '#F0F9FF',
    borderRadius: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#3F63F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3F63F6',
    marginBottom: 12,
  },
  planText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // New styles for plan holder
  planHolderContainer: {
    marginBottom: 24,
    padding: 24, // Increased padding
    backgroundColor: '#F5F9FF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planHolderEmpty: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E5E5E5',
    opacity: 0.9,
  },
  planHolderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20, // Increased margin
    paddingBottom: 16, // Increased padding
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  planHolderTitle: {
    fontSize: 22, // Increased font size
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  planStatusBadge: {
    backgroundColor: '#99E86C',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40, // Increased padding
    gap: 12,
  },
  planLoadingText: {
    fontSize: 16,
    color: '#999999',
  },
  planContentContainer: {
    padding: 0,
  },
  emptyPlanContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyPlanText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999999',
    marginTop: 8,
  },
  emptyPlanSubtext: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  todayIndicator: {
    color: '#3F63F6',
    fontWeight: '600',
  },
  planDateText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 16,
    fontStyle: 'italic',
  },
  historicalBadge: {
    backgroundColor: '#6C99E8',
  },
  infoMessageContainer: {
    marginHorizontal: 24,
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  infoMessageText: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
  },

  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  toolButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toolButtonSelected: {
    backgroundColor: '#99E86C',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  toolButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  toolButtonTextSelected: {
    color: '#FFFFFF',
  },
  toolsSelectionText: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 8,
  },
  noneToolContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 8,
  },
  toolsHelperText: {
    fontSize: 14,
    color: '#F56C6C',
    textAlign: 'center',
    marginTop: 8,
  },
  toolButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#EEEEEE',
    borderWidth: 1,
    opacity: 0.7,
  },
  toolButtonTextDisabled: {
    color: '#BBBBBB',
  },
  disabledContainer: {
    opacity: 0.7,
    backgroundColor: '#F5F5F5',
    borderColor: '#EEEEEE',
  },
  toolsConfirmedText: {
    fontSize: 14,
    color: '#4064F6',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  confirmedContainer: {
    opacity: 0.8,
    backgroundColor: '#F5F9FF',
    borderColor: '#E0E7FF',
  },
  timeOptionsContainer: {
    marginTop: 16,
  },
  timeOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeOptionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timeOptionSelected: {
    backgroundColor: '#99E86C',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  timeOptionDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#EEEEEE',
    borderWidth: 1,
    opacity: 0.7,
  },
  timeOptionText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  timeOptionTextSelected: {
    color: '#FFFFFF',
  },
  timeOptionTextDisabled: {
    color: '#BBBBBB',
  },
  submitButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#999999',
  },
  completionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 36,
  },
  completeButton: {
    backgroundColor: '#4064F6',
  },
  completionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completedBadgeContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#99E86C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  completedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // New styles for streak card
  streakCardContainer: {
    margin: 24,
    marginTop: 0,
    backgroundColor: '#DCF4F5',
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 120, // Make it taller
  },
  streakCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24, // Increased padding
  },
  streakMascotContainer: {
    width: 80, // Larger mascot container
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCF4F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20, // More spacing
  },
  streakIconContainer: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakInfoContainer: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 18, // Larger title
    color: '#000000',
    fontWeight: '700',
    marginBottom: 8, // More spacing
  },
  streakCount: {
    fontSize: 32, // Much larger count
    fontWeight: '900',
    color: '#4064F6',
    marginBottom: 8,
  },
  streakHelperText: {
    fontSize: 12,
    color: '#666666',  // Changed from warning red to neutral gray
    fontWeight: '500',
    marginTop: 8,
    paddingRight: 4,
    lineHeight: 16,
  },
  // Add styles for past days
  pastDayContainer: {
    opacity: 0.8,
    backgroundColor: '#F5F5F5',
    borderColor: '#E5E5E5',
  },
  pastDayText: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  pastDayNotice: {
    fontSize: 12,
    color: '#4064F6',
    fontStyle: 'italic',
    marginTop: 4,
  },
  workflowCard: {
    backgroundColor: '#DCF4F5',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 24,
    marginTop: 0,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  workflowIconContainer: {
    width: 80,
    height: 80,
    marginBottom: 24,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(64, 100, 246, 0.1)',
    borderRadius: 40,
  },
  workflowTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  workflowText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  getStartedButton: {
    backgroundColor: '#4064F6',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 32,
    alignItems: 'center',
    alignSelf: 'center',
  },
  getStartedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4064F6',
  },
  nextButton: {
    backgroundColor: '#4064F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  tapHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  tapHintText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  formattedPlanContainer: {
    padding: 20, // Increased padding
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 200, // Ensure minimum height
    flex: 1, // Allow it to expand
  },
  recoveryDrillRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recoveryDrillIndex: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4064F6',
    backgroundColor: 'rgba(64, 100, 246, 0.1)',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  recoveryDrillText: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 22,
    flex: 1,
  },
  streakHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Positions title left, icon right
    marginBottom: 4, // Optional: adjust spacing under the header
  },
  infoIconButton: {
    padding: 8, // Make it easier to tap
    marginLeft: 8, // Space between title and icon
  },
  recoveryDrillContent: {
    flex: 1,
    marginLeft: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  activityDuration: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4064F6',
    backgroundColor: 'rgba(64, 100, 246, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activityInstructions: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
    marginTop: 2,
  },
  recoveryActivityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#4064F6',
  },
  recoveryActivityText: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 22,
    fontWeight: '500',
  },
  // Clean bullet point styles like training tab
  recoveryBulletItem: {
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4064F6',
    marginRight: 12,
    minWidth: 20,
  },
  bulletContent: {
    flex: 1,
  },
  bulletHeaderLine: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 2,
  },
  bulletActivity: {
    fontWeight: '600',
    color: '#000000',
  },
  bulletDuration: {
    fontWeight: '500',
    color: '#4064F6',
  },
  bulletInstruction: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
    marginLeft: 0,
  },
}); 