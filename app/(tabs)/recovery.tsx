import { View, Text, Pressable, StyleSheet, Image, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import { format, addDays, startOfWeek } from 'date-fns';
import { doc, getDoc, setDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import WeeklyOverview from '../components/WeeklyOverview';
import { OPENAI_API_KEY } from '@env';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

type RecoveryData = {
  soreness: number;
  fatigue: number;
  sleep: number;
  mood: number;
  submitted?: boolean;
  tools?: RecoveryTool[];
};

type RecoveryTool = 'Cold Exposure' | 'Foam Roller' | 'Cycling' | 'Swimming' | 'Compression' | 'Massage Gun' | 'Sauna' | 'Resistance Bands' | 'None';

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
  const [loading, setLoading] = useState(false);
  const [todaysPlan, setTodaysPlan] = useState<string | null>(null);
  const [todaysData, setTodaysData] = useState<{
    soreness: number;
    fatigue: number;
    sleep: number;
    mood: number;
  } | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [isToday, setIsToday] = useState(true);
  const [planExists, setPlanExists] = useState(false);

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
      // First, get the current document to preserve any existing tools data
      const docSnap = await getDoc(recoveryRef);
      let currentTools: RecoveryTool[] | undefined = undefined;
      
      // If document exists, extract the tools field
      if (docSnap.exists()) {
        const currentData = docSnap.data();
        currentTools = currentData.tools;
      }
      
      // Get the current slider values from local state
      // These will be the exact positions where the user has set the sliders
      const updatedData = {
        soreness: recoveryData.soreness,
        fatigue: recoveryData.fatigue,
        sleep: recoveryData.sleep,
        mood: recoveryData.mood,
        submitted: true,
        lastUpdated: new Date().toISOString(),
      };
      
      // Only add tools if they exist and are not empty
      if (currentTools && currentTools.length > 0) {
        updatedData.tools = currentTools;
      }
      
      console.log("Saving recovery data:", updatedData);
      await setDoc(recoveryRef, updatedData);
      
      // Update local state to reflect submitted status
      setRecoveryData(prev => ({
        ...prev,
        submitted: true
      }));
      
      setIsEditing(false);
      
      // Do NOT modify toolsConfirmed state here
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
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      const planRef = doc(db, 'users', user.uid, 'recoveryPlans', dateStr);
      const planSnap = await getDoc(planRef);
      
      if (planSnap.exists()) {
        const planData = planSnap.data();
        setTodaysPlan(planData.plan);
        setPlanExists(true);
        console.log(`Loaded saved plan for ${dateStr}:`, planData.plan);
      } else {
        setTodaysPlan(null);
        setPlanExists(false);
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
    
    if (!recoveryData.submitted) {
      Alert.alert('Error', 'Please submit your recovery data first');
      return;
    }
    
    if (!toolsConfirmed) {
      Alert.alert('Error', 'Please confirm your recovery tools first');
      return;
    }
    
    // Warn user about not being able to edit data after generating a plan
    Alert.alert(
      'Confirm Plan Generation',
      'Once you generate a recovery plan, you will no longer be able to edit this day\'s recovery data. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Generate Plan',
          onPress: () => {
            // If plan already exists for the day, ask for confirmation
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
  
  const generatePlan = async () => {
    setLoading(true);

    try {
      const toolsAvailable = selectedTools.length > 0 
        ? `Available recovery tools: ${selectedTools.join(', ')}`
        : "No special recovery tools available. Suggest only bodyweight movements, walking, jogging, and other equipment-free activities.";

      const prompt = `Create a short, focused recovery plan based on these metrics:

Muscle Soreness Level: ${recoveryData.soreness}/10
Overall Fatigue: ${recoveryData.fatigue}/10
Sleep Quality: ${recoveryData.sleep}/10
Mood: ${recoveryData.mood}/10

${toolsAvailable}

The plan MUST:
1. Be no longer than 5 lines total
2. Include ONLY specific recovery exercises to perform today
3. Do NOT include any nutrition, hydration, or sleep advice
4. Focus only on physical recovery activities/exercises
5. Be direct and easy to follow
6. Only utilize the tools listed as available (if none selected, only suggest bodyweight exercises)`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a professional sports recovery specialist focused on providing concise, exercise-only recovery plans. Keep your response under 5 lines and focus only on recovery exercises.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 300
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

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
        date: dateStr
      });

      setPlanExists(true);
      console.log(`Recovery plan saved to Firebase for ${dateStr}`);

    } catch (error) {
      console.error('Error generating recovery plan:', error);
      Alert.alert('Error', 'Failed to generate recovery plan. Please try again.');
    } finally {
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

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: 90, // Add extra padding at the bottom to prevent content from being hidden behind the navigation bar
      }}>
      <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{
              paddingBottom: 90, // Add extra padding at the bottom
            }}
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
                  <Image 
                    source={require('../../assets/images/BallerAILogo.png')}
                    style={{
                      width: 32,
                      height: 32,
                    }}
                    resizeMode="contain"
                  />
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

              {/* Recovery Inputs */}
              <View style={styles.inputsContainer}>
                <View style={{alignItems: 'center'}}>
                  <Text style={styles.loadText}>Recovery Query</Text>
                </View>
                {recoveryData.submitted && !isEditing ? (
                  // Show submitted data with edit button if plan doesn't exist
                  <>
                    <View style={styles.submittedHeader}>
                      <Text style={styles.submittedText}>Submitted</Text>
                      {!planExists && (
                        <Pressable
                          style={styles.editButton}
                          onPress={() => setIsEditing(true)}
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
                ) : (
                  // Show editable sliders
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
                      style={[styles.submitButton, {marginTop: 16}]}
                      onPress={handleSubmit}
                    >
                      <Text style={styles.submitButtonText}>
                        {isEditing ? 'Update Recovery Data' : 'Submit Recovery Data'}
                      </Text>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    </Pressable>
                  </>
                )}
              </View>

              {/* Recovery Tools Selection Card */}
              <View style={[
                styles.inputsContainer, 
                planExists && styles.disabledContainer,
                (toolsConfirmed && !planExists) && styles.confirmedContainer
              ]}>
                <View style={{alignItems: 'center'}}>
                  <Text style={[
                    styles.loadText,
                    planExists && {color: '#999999'},
                    (toolsConfirmed && !planExists) && {color: '#4064F6'}
                  ]}>Recovery Tools</Text>
                </View>
                
                {toolsConfirmed && !planExists ? (
                  // Show confirmed header with edit button
                  <View style={styles.submittedHeader}>
                    <Text style={styles.submittedText}>Tools Confirmed</Text>
                    <Pressable
                      style={styles.editButton}
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
                    (toolsConfirmed && !planExists) && {color: '#999999'}
                  ]}>
                    Select the recovery tools you have access to:
                  </Text>
                )}
                
                <View style={styles.toolsGrid}>
                  <RecoveryToolButton 
                    icon="snow-outline" 
                    label="Cold Exposure" 
                    selected={selectedTools.includes("Cold Exposure")}
                    onPress={() => toggleTool("Cold Exposure")} 
                    disabled={planExists || (toolsConfirmed && !isEditing)}
                  />
                  <RecoveryToolButton 
                    icon="heart-outline" 
                    label="Foam Roller" 
                    selected={selectedTools.includes("Foam Roller")}
                    onPress={() => toggleTool("Foam Roller")} 
                    disabled={planExists || (toolsConfirmed && !isEditing)}
                  />
                  <RecoveryToolButton 
                    icon="bicycle-outline" 
                    label="Cycling" 
                    selected={selectedTools.includes("Cycling")}
                    onPress={() => toggleTool("Cycling")} 
                    disabled={planExists || (toolsConfirmed && !isEditing)}
                  />
                  <RecoveryToolButton 
                    icon="water-outline" 
                    label="Swimming" 
                    selected={selectedTools.includes("Swimming")}
                    onPress={() => toggleTool("Swimming")} 
                    disabled={planExists || (toolsConfirmed && !isEditing)}
                  />
                  <RecoveryToolButton 
                    icon="pulse-outline" 
                    label="Compression" 
                    selected={selectedTools.includes("Compression")}
                    onPress={() => toggleTool("Compression")} 
                    disabled={planExists || (toolsConfirmed && !isEditing)}
                  />
                  <RecoveryToolButton 
                    icon="flash-outline" 
                    label="Massage Gun" 
                    selected={selectedTools.includes("Massage Gun")}
                    onPress={() => toggleTool("Massage Gun")} 
                    disabled={planExists || (toolsConfirmed && !isEditing)}
                  />
                  <RecoveryToolButton 
                    icon="flame-outline" 
                    label="Sauna" 
                    selected={selectedTools.includes("Sauna")}
                    onPress={() => toggleTool("Sauna")} 
                    disabled={planExists || (toolsConfirmed && !isEditing)}
                  />
                  <RecoveryToolButton 
                    icon="barbell-outline" 
                    label="Resistance Bands" 
                    selected={selectedTools.includes("Resistance Bands")}
                    onPress={() => toggleTool("Resistance Bands")} 
                    disabled={planExists || (toolsConfirmed && !isEditing)}
                  />
                </View>
                <View style={styles.noneToolContainer}>
                  <RecoveryToolButton 
                    icon="close-circle-outline" 
                    label="None" 
                    selected={selectedTools.includes("None")}
                    onPress={() => toggleTool("None")} 
                    disabled={planExists || (toolsConfirmed && !isEditing)}
                  />
                </View>
                
                {!planExists && !toolsConfirmed && (
                  <Pressable 
                    style={styles.submitButton}
                    onPress={handleConfirmTools}
                  >
                    <Text style={styles.submitButtonText}>
                      Confirm Tools
                    </Text>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  </Pressable>
                )}
                
                {toolsConfirmed && !planExists && (
                  <Text style={[styles.toolsConfirmedText]}>
                    Your selection has been saved
                  </Text>
                )}
                
                {!toolsConfirmed && !planExists && selectedTools.length === 0 && (
                  <Text style={styles.toolsHelperText}>
                    Please select at least one option
                  </Text>
                )}
                
                {planExists && (
                  <Text style={[styles.toolsHelperText, {color: '#999999'}]}>
                    Recovery plan already generated
                  </Text>
                )}
              </View>

              {/* Generate Plan Button or Status */}
              {!planExists ? (
                <>
                  <Pressable
                    style={[
                      styles.generateButton, 
                      (loading || !recoveryData.submitted || !toolsConfirmed) && styles.generateButtonDisabled
                    ]}
                    onPress={handleGeneratePlan}
                    disabled={loading || !recoveryData.submitted || !toolsConfirmed}
                  >
                    <Text style={styles.generateButtonText}>
                      {loading ? 'Generating Plan...' : 'Generate Recovery Plan'}
                    </Text>
                    <Ionicons name="fitness" size={20} color="#FFFFFF" />
                  </Pressable>
                  
                  {(!recoveryData.submitted || !toolsConfirmed) && (
                    <View style={styles.infoMessageContainer}>
                      <Text style={styles.infoMessageText}>
                        {!recoveryData.submitted && !toolsConfirmed 
                          ? 'Submit your recovery data and confirm your tools to generate a plan'
                          : !recoveryData.submitted 
                            ? 'Submit your recovery data to generate a plan'
                            : 'Confirm your recovery tools to generate a plan'}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Pressable
                  style={[
                    styles.generateButton, 
                    styles.generateButtonDisabled
                  ]}
                  disabled={true}
                >
                  <Text style={styles.generateButtonText}>
                    Plan Already Generated
                  </Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </Pressable>
              )}

              {/* Plan Holder - Always visible with different states */}
              <View style={{
                marginHorizontal: 24,
              }}>
                <View style={[
                  styles.planHolderContainer,
                  !todaysPlan && !planLoading && styles.planHolderEmpty
                ]}>
                  <View style={styles.planHolderHeader}>
                    <Text style={styles.planHolderTitle} allowFontScaling={false}>
                      {isToday ? 'Your Plan for Today' : `Plan For ${format(selectedDate, 'MMM d')}`}
                    </Text>
                    {todaysPlan && (
                      <View style={[
                        styles.planStatusBadge,
                        !isToday && styles.historicalBadge
                      ]}>
                        <Text style={styles.planStatusText}>
                          {isToday ? 'Active' : 'Historical'}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {planLoading ? (
                    <View style={styles.planLoadingContainer}>
                      <Ionicons name="hourglass-outline" size={24} color="#999999" />
                      <Text style={styles.planLoadingText}>Loading plan...</Text>
                    </View>
                  ) : todaysPlan ? (
                    <View style={styles.planContentContainer}>
                      <Text style={styles.planText}>{todaysPlan}</Text>
                      <Text style={styles.planDateText}>
                        Generated on {format(selectedDate, 'MMMM d, yyyy')}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emptyPlanContainer}>
                      <Ionicons name="fitness-outline" size={32} color="#CCCCCC" />
                      <Text style={styles.emptyPlanText}>
                        {recoveryData.submitted 
                          ? 'No plan generated yet'
                          : 'Submit recovery data first'}
                      </Text>
                      {recoveryData.submitted ? (
                        <Text style={styles.emptyPlanSubtext}>
                          {isToday 
                            ? 'Click the generate button to create your recovery plan'
                            : 'Click the generate button to create a recovery plan for this day'}
                        </Text>
                      ) : (
                        <Text style={styles.emptyPlanSubtext}>
                          Submit your recovery data using the form above
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScrollView>
      
      {loading && (
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
            <Text style={styles.loadingTitle}>Generating Plan</Text>
            <Text style={styles.loadingText}>
              Please don't close the app while I generate the plan for you
            </Text>
            <ActivityIndicator size="large" color="#4064F6" />
          </Animated.View>
        </Animated.View>
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
      style={[
        styles.toolButton,
        selected && styles.toolButtonSelected,
        disabled && styles.toolButtonDisabled
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
    padding: 8,
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
    gap: 24,
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
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666666',
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
    borderRadius: 16,
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
    marginTop: 24,
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#F5F9FF',
    borderRadius: 16,
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
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  planHolderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
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
    paddingVertical: 24,
    gap: 12,
  },
  planLoadingText: {
    fontSize: 16,
    color: '#999999',
  },
  planContentContainer: {
    padding: 12,
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
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  toolButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toolButtonSelected: {
    backgroundColor: '#99E86C',
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
    marginTop: 8,
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
}); 