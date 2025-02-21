import { View, Text, Pressable, StyleSheet, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import { format, addDays, startOfWeek } from 'date-fns';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';

type RecoveryData = {
  trainingIntensity: number;
  soreness: number;
  fatigue: number;
  sleepDuration: number;
  submitted: boolean;
  lastUpdated: string;
};

export default function RecoveryScreen() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [recoveryData, setRecoveryData] = useState<RecoveryData>({
    trainingIntensity: 6,
    soreness: 4,
    fatigue: 8,
    sleepDuration: 12,
    submitted: false,
    lastUpdated: '',
  });

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
            trainingIntensity: 6,
            soreness: 4,
            fatigue: 8,
            sleepDuration: 12,
            submitted: false,
            lastUpdated: '',
          });
          setIsEditing(true);
        }
      } catch (error) {
        console.error('Error fetching recovery data:', error);
      }
    };

    fetchRecoveryData();
  }, [selectedDate, user]);

  // Generate week dates centered on selected date
  const weekDates = [...Array(7)].map((_, index) => {
    const date = addDays(startOfWeek(selectedDate), index);
    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const isFuture = date > new Date();
    
    return {
      date,
      day: format(date, 'E')[0],
      dayNum: format(date, 'd'),
      isSelected: format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'),
      isDisabled: isToday || isFuture,
    };
  });

  const handleDaySelect = (date: Date) => {
    // Prevent selection of current or future dates
    if (date >= new Date()) return;
    
    setSelectedDate(date);
    setRecoveryData({
      trainingIntensity: 6,
      soreness: 4,
      fatigue: 8,
      sleepDuration: 12,
      submitted: false,
      lastUpdated: '',
    });
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

  return (
    <SafeAreaView style={styles.container}>
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
          Recovery
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <Text style={styles.dateText}>
          {format(selectedDate, 'MMMM do, yyyy')}
        </Text>

        {/* Week Calendar */}
        <View style={styles.calendar}>
          {weekDates.map((item, index) => (
            <Pressable
              key={index}
              style={[
                styles.dayButton,
                item.isSelected && styles.selectedDay,
                item.isDisabled && styles.disabledDay
              ]}
              onPress={() => handleDaySelect(item.date)}
              disabled={item.isDisabled}
            >
              <Text style={[
                styles.dayLetter,
                item.isSelected && styles.selectedDayText,
                item.isDisabled && styles.disabledDayText
              ]}>
                {item.day}
              </Text>
              <Text style={[
                styles.dayNumber,
                item.isSelected && styles.selectedDayText,
                item.isDisabled && styles.disabledDayText
              ]}>
                {item.dayNum}
              </Text>
            </Pressable>
          ))}
        </View>

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
                value={recoveryData.trainingIntensity}
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
                value={recoveryData.fatigue}
                onValueChange={() => {}}
                min={1}
                max={10}
                disabled={true}
                type="fatigue"
              />
              <RecoverySlider
                icon="moon"
                question="Sleep duration"
                value={recoveryData.sleepDuration}
                onValueChange={() => {}}
                min={4}
                max={12}
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
                value={recoveryData.trainingIntensity}
                onValueChange={(value) => setRecoveryData(prev => ({
                  ...prev,
                  trainingIntensity: value
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
                value={recoveryData.fatigue}
                onValueChange={(value) => setRecoveryData(prev => ({
                  ...prev,
                  fatigue: value
                }))}
                min={1}
                max={10}
                disabled={false}
                type="fatigue"
              />
              <RecoverySlider
                icon="moon"
                question="Sleep duration"
                value={recoveryData.sleepDuration}
                onValueChange={(value) => setRecoveryData(prev => ({
                  ...prev,
                  sleepDuration: value
                }))}
                min={4}
                max={12}
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
            !recoveryData.submitted && { opacity: 0.5 }
          ]}
          onPress={handleSubmit}
          disabled={!recoveryData.submitted}
        >
          <Text style={styles.generateButtonText}>Generate Today's Recovery Plan</Text>
          <Ionicons name="fitness" size={20} color="#FFFFFF" />
        </Pressable>

        {/* Add bottom padding to ensure content is above tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
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
}); 