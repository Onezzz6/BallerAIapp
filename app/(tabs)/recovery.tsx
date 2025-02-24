import { View, Text, Pressable, StyleSheet, Image, ScrollView, Alert } from 'react-native';
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
import Animated, { FadeIn } from 'react-native-reanimated';

type RecoveryData = {
  soreness: number;
  fatigue: number;
  sleep: number;
  mood: number;
  submitted?: boolean;
};

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
  const [loading, setLoading] = useState(false);
  const [todaysPlan, setTodaysPlan] = useState<string | null>(null);
  const [todaysData, setTodaysData] = useState<{
    soreness: number;
    fatigue: number;
    sleep: number;
    mood: number;
  } | null>(null);

  // Fetch recovery data for selected date
  useEffect(() => {
    const fetchRecoveryData = async () => {
      if (!user) return;
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const recoveryRef = doc(db, 'users', user.uid, 'recovery', dateStr);
      
      try {
        const docSnap = await getDoc(recoveryRef);
        if (docSnap.exists()) {
          setRecoveryData(docSnap.data() as RecoveryData);
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
          setIsEditing(true);
        }
      } catch (error) {
        console.error('Error fetching recovery data:', error);
      }
    };

    fetchRecoveryData();
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
      const updatedData = {
        ...recoveryData,
        submitted: true,
        lastUpdated: new Date().toISOString(),
      };
      
      await setDoc(recoveryRef, updatedData);
      setRecoveryData(updatedData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving recovery data:', error);
      alert('Failed to save data. Please try again.');
    }
  };

  const handleGeneratePlan = async () => {
    if (!user || !recoveryData.submitted) {
      Alert.alert('Error', 'Please submit today\'s recovery data first');
      return;
    }

    setLoading(true);

    try {
      const prompt = `Create a personalized recovery plan for today based on the following metrics:

Muscle Soreness Level: ${recoveryData.soreness}/10
Overall Fatigue: ${recoveryData.fatigue}/10
Sleep Quality: ${recoveryData.sleep}/10
Mood: ${recoveryData.mood}/10

The plan should:
1. Be specific and actionable
2. Include appropriate recovery techniques based on the metrics
3. Consider both active and passive recovery methods
4. Include approximate durations for each activity
5. Focus on the areas that need the most attention based on the soreness level
6. Adjust intensity based on overall fatigue and sleep quality
7. Include nutrition and hydration recommendations
8. Suggest optimal timing for each recovery activity

Format the response in clear, easy-to-read sections.`;

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
              content: 'You are a professional sports recovery specialist.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
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

      // Save the plan to Firebase
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      await setDoc(doc(db, 'users', user.uid, 'recoveryPlans', today.toISOString().split('T')[0]), {
        plan: planText,
        createdAt: Timestamp.now(),
        metrics: metricsToSave
      });

    } catch (error) {
      console.error('Error generating recovery plan:', error);
      Alert.alert('Error', 'Failed to generate recovery plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        entering={FadeIn.duration(1000)}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.contentContainer}>
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

              {/* Centered Recovery Title */}
              <Text style={{
                fontSize: 32,
                fontWeight: '700',
                color: '#000000',
                textAlign: 'center',
                marginBottom: 8,
              }}>
                Recovery
              </Text>
            </View>

            {/* Weekly Overview */}
            <WeeklyOverview 
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />

            <Text style={styles.dateText}>
              {format(selectedDate, 'MMMM do, yyyy')}
            </Text>

            {/* Recovery Inputs */}
            <View style={styles.inputsContainer}>
              {recoveryData.submitted && !isEditing ? (
                // Show submitted data with edit button
                <>
                  <View style={styles.submittedHeader}>
                    <Text style={styles.submittedText}>Submitted</Text>
                    <Pressable
                      style={styles.editButton}
                      onPress={() => setIsEditing(true)}
                    >
                      <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </Pressable>
                  </View>
                  
                  <RecoverySlider
                    icon="fitness"
                    question="How intensive was the training?"
                    value={recoveryData.soreness}
                    onValueChange={() => {}}
                    min={1}
                    max={10}
                    disabled={true}
                    type="intensity"
                  />
                  <RecoverySlider
                    icon="medical"
                    question="How sore are you?"
                    value={recoveryData.fatigue}
                    onValueChange={() => {}}
                    min={1}
                    max={10}
                    disabled={true}
                    type="soreness"
                  />
                  <RecoverySlider
                    icon="flash"
                    question="How tired do you feel overall?"
                    value={recoveryData.sleep}
                    onValueChange={() => {}}
                    min={1}
                    max={10}
                    disabled={true}
                    type="fatigue"
                  />
                  <RecoverySlider
                    icon="moon"
                    question="Sleep duration"
                    value={recoveryData.mood}
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
                    question="How intensive was the training?"
                    value={recoveryData.soreness}
                    onValueChange={(value) => setRecoveryData(prev => ({
                      ...prev,
                      soreness: value
                    }))}
                    min={1}
                    max={10}
                    disabled={false}
                    type="intensity"
                  />
                  <RecoverySlider
                    icon="medical"
                    question="How sore are you?"
                    value={recoveryData.fatigue}
                    onValueChange={(value) => setRecoveryData(prev => ({
                      ...prev,
                      fatigue: value
                    }))}
                    min={1}
                    max={10}
                    disabled={false}
                    type="soreness"
                  />
                  <RecoverySlider
                    icon="flash"
                    question="How tired do you feel overall?"
                    value={recoveryData.sleep}
                    onValueChange={(value) => setRecoveryData(prev => ({
                      ...prev,
                      sleep: value
                    }))}
                    min={1}
                    max={10}
                    disabled={false}
                    type="fatigue"
                  />
                  <RecoverySlider
                    icon="moon"
                    question="Sleep duration"
                    value={recoveryData.mood}
                    onValueChange={(value) => setRecoveryData(prev => ({
                      ...prev,
                      mood: value
                    }))}
                    min={1}
                    max={10}
                    disabled={false}
                    type="sleep"
                  />
                </>
              )}
            </View>

            {(!recoveryData.submitted || isEditing) && (
              <Pressable 
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Update Recovery Data' : 'Submit Recovery Data'}
                </Text>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </Pressable>
            )}

            <Pressable
              style={[
                styles.generateButton, 
                (!recoveryData.submitted || loading) && styles.generateButtonDisabled
              ]}
              onPress={handleGeneratePlan}
              disabled={!recoveryData.submitted || loading}
            >
              <Text style={styles.generateButtonText}>
                {loading ? 'Generating Plan...' : 
                 !recoveryData.submitted ? 'Submit Today\'s Data First' : 
                 'Generate Today\'s Recovery Plan'}
              </Text>
              <Ionicons name="fitness" size={20} color="#FFFFFF" />
            </Pressable>

            {todaysPlan && (
              <View style={styles.planContainer}>
                <Text style={styles.planTitle}>Your Recovery Plan</Text>
                <Text style={styles.planText}>{todaysPlan}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
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
    padding: 24,
    gap: 24,
  },
  sliderContainer: {
    gap: 12,
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
    height: 50,
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
    backgroundColor: '#000000',
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 24,
    paddingVertical: 16,
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
  submittedText: {
    fontSize: 18,
    color: '#99E86C',
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3F63F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
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
    backgroundColor: '#99E86C',
    marginHorizontal: 24,
    marginTop: 24,
    paddingVertical: 20,
    borderRadius: 32,
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
  },
  planContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  planText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
  },
  contentContainer: {
    padding: 24,
  },
}); 