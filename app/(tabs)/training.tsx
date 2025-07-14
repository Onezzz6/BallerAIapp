import { View, Text, SafeAreaView, StyleSheet, TextInput, Pressable, ScrollView, Alert, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTraining } from '../context/TrainingContext';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import Constants from 'expo-constants';
import Animated, { FadeIn, FadeInDown, PinwheelIn, SlideInRight, SlideOutLeft, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, getWeek } from 'date-fns';
import analyticsService from '../services/analytics';
import Accordion from '../components/Accordion';

type FocusArea = 'technique' | 'strength' | 'endurance' | 'speed' | 'overall';
type GymAccess = 'yes' | 'no';

type ScheduleType = 'off' | 'game' | 'training';

type DaySchedule = {
  type: ScheduleType;
  duration: string;
};

type Schedule = {
  [key: string]: DaySchedule;
};

type WorkflowStep = 'welcome' | 'focus' | 'gym' | 'schedule' | 'summary' | 'plans';

// Add these lines to access the API keys from Constants
const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;
const DEEPSEEK_API_KEY = Constants.expoConfig?.extra?.deepseekApiKey;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  buttonContainer: {
    gap: 16,
    marginTop: 24,
    marginBottom: 32,
  },
  generateButton: {
    backgroundColor: '#4064F6',
    borderRadius: 100,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  plansButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000022',
  },
  plansButtonDisabled: {
    borderColor: '#CCCCCC',
  },
  plansButtonText: {
    color: '#000022',
    fontSize: 16,
    fontWeight: '600',
  },
  plansButtonTextDisabled: {
    color: '#CCCCCC',
  },
  scrollView: {
    flex: 1,
  },
  sectionBackground: {
    backgroundColor: '#FFDDBB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionBackgroundGray: {
    backgroundColor: '#EEEEEE',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  option: {
    flex: 1,
    minWidth: '45%',
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectedOption: {
    backgroundColor: '#99E86C',
    borderColor: '#99E86C',
  },
  optionText: {
    fontSize: 16,
    color: '#666666',
  },
  selectedOptionText: {
    color: '#000000',
    fontWeight: '500',
  },
  dayContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  dayOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dayOption: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectedDayOption: {
    backgroundColor: '#99E86C',
    borderColor: '#99E86C',
  },
  selectedGameOption: {
    backgroundColor: '#99E86C',
    borderColor: '#99E86C',
  },
  selectedTrainingOption: {
    backgroundColor: '#99E86C',
    borderColor: '#99E86C',
  },
  dayOptionText: {
    fontSize: 14,
    color: '#000000',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  timeInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingLeft: 40,
    height: 50,
    width: '100%',
  },
  subtitleInline: {
    fontSize: 14,
    color: '#666666',
    fontWeight: 'normal',
  },
  clockIcon: {
    position: 'absolute',
    left: 16,
    top: '30%',
    zIndex: 1,
  },
  timerText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  disabledContainer: {
    opacity: 0.8,
  },
  disabledOption: {
    opacity: 0.8,
  },
  disabledInput: {
    backgroundColor: '#F0F0F0',
    color: '#999999',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4064F6',
    padding: 12,
    borderRadius: 100,
    marginTop: 16,
    gap: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4064F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 4
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
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
  loadingIconContainer: {
    width: 100,
    height: 100,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(64, 100, 246, 0.1)',
    borderRadius: 50,
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
  timerContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4064F6',
    marginTop: 4,
    textAlign: 'center',
  },
  // New styles for welcome screen and workflow
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 80,
    backgroundColor: '#FFFFFF',
  },
  welcomeIconContainer: {
    width: 120,
    height: 120,
    marginBottom: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(64, 100, 246, 0.1)',
    borderRadius: 60,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 26,
  },
  getStartedButton: {
    backgroundColor: '#4064F6',
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  welcomeCard: {
    backgroundColor: '#DCF4F5',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    width: '100%',
    maxWidth: 380,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4064F6',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#4064F6',
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  summaryContainer: {
    backgroundColor: '#DCF4F5',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  summaryButtons: {
    gap: 12,
    width: '100%',
  },
  editAnswersButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4064F6',
  },
  editAnswersButtonText: {
    color: '#4064F6',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for plans view
  plansViewContainer: {
    flex: 1,
    padding: 24,
  },
  currentPlanCard: {
    backgroundColor: '#DCF4F5',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  currentPlanTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  viewPlanButton: {
    backgroundColor: '#4064F6',
    borderRadius: 100,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  viewPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createNewPlanButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4064F6',
    flexDirection: 'row',
    gap: 8,
  },
  createNewPlanButtonText: {
    color: '#4064F6',
    fontSize: 16,
    fontWeight: '600',
  },
  planInfoText: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
  },
  plansButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  planButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000022',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    minWidth: 140,
    flexGrow: 1,
    flexDirection: 'row',
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
  selectedPlanButton: {
    backgroundColor: '#4064F6',
    borderColor: '#4064F6',
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  selectedPlanButtonText: {
    color: '#FFFFFF',
  },
  planDetailsContainer: {
    backgroundColor: '#DCF4F5',
    padding: 16,
    marginBottom: 16,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  planContent: {
    backgroundColor: '#F8F8F8',
  },
  planText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333333',
  },
  drillRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  drillIndex: {
    width: 30,
    fontSize: 14,
    fontWeight: '600',
    color: '#4064F6',
    marginRight: 12,
  },
  drillText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
  },
  drillTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  subItemRow: {
    flexDirection: 'row',
    marginBottom: 8,
    marginLeft: 30,
    alignItems: 'flex-start',
  },
  subItemBullet: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  subItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#666666',
  },
  subItemTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  sessionHeader: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  recoveryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  summaryNote: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333333',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  summaryBullet: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  dayHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationBadge: {
    backgroundColor: '#E8F0FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4064F6',
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gymChip: {
    backgroundColor: '#FFE8E8',
  },
  fieldChip: {
    backgroundColor: '#E8FFE8',
  },
  homeChip: {
    backgroundColor: '#FFF8E8',
  },
  gameChip: {
    backgroundColor: '#F0E8FF',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  gymChipText: {
    color: '#FF4444',
  },
  fieldChipText: {
    color: '#44AA44',
  },
  homeChipText: {
    color: '#FFAA00',
  },
  gameChipText: {
    color: '#8844FF',
  },
  infoContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4064F6',
  },
  infoText: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default function TrainingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addPlan, plans, clearPlans, removePlanById } = useTraining();
  const [selectedFocus, setSelectedFocus] = useState<FocusArea | null>(null);
  const [gymAccess, setGymAccess] = useState<GymAccess | null>(null);
  const [schedule, setSchedule] = useState<Schedule>({
    monday: { type: 'off', duration: '' },
    tuesday: { type: 'off', duration: '' },
    wednesday: { type: 'off', duration: '' },
    thursday: { type: 'off', duration: '' },
    friday: { type: 'off', duration: '' },
    saturday: { type: 'off', duration: '' },
    sunday: { type: 'off', duration: '' },
  });
  const [loading, setLoading] = useState(false);
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);
  const [canGeneratePlan, setCanGeneratePlan] = useState(true);
  const [lastGeneratedDate, setLastGeneratedDate] = useState<Date | null>(null);
  const [timeUntilNextGeneration, setTimeUntilNextGeneration] = useState<{ days: number; hours: number; minutes: number; nextDate: Date }>({ days: 0, hours: 0, minutes: 0, nextDate: new Date() });
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('welcome');
  const [hasCheckedPlans, setHasCheckedPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastPlanText, setLastPlanText] = useState<string>('');
  const [completedDrills, setCompletedDrills] = useState<{ [key: string]: boolean }>({});
  
  // Reference to the main ScrollView
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Get the fromTraining param to check if returning from training plans
  const { fromTraining } = useLocalSearchParams<{ fromTraining: string }>();

  // Auto-select the first plan if none is selected and plans are available
  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  // Auto-select newly generated plan when plans array updates
  useEffect(() => {
    if (plans.length > 0) {
      // If we just generated a plan and returned to plans view, select the newest one
      if (currentStep === 'plans') {
        const newestPlan = plans[0]; // Plans are sorted newest first
        if (selectedPlanId !== newestPlan.id) {
          setSelectedPlanId(newestPlan.id);
        }
      }
    }
  }, [plans.length, currentStep]);

  // Function to calculate time until next generation is available
  const calculateTimeUntilNextGeneration = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // TODO: Remove debug code before production
    // DEBUG: Uncomment the line below to simulate timer expiring (force generate button to show)
    // return { days: 0, hours: 0, minutes: 0, nextDate: now }; // Force timer to show as expired
    
    let nextAvailableDate = new Date(now);
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Monday-Friday: next generation available on Saturday (switches to next week)
      const daysUntilSaturday = 6 - dayOfWeek; // 6 = Saturday
      nextAvailableDate.setDate(now.getDate() + daysUntilSaturday);
      nextAvailableDate.setHours(0, 0, 0, 0);
    } else {
      // Saturday-Sunday: next generation available on Monday (switches to current week of that Monday)
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 2; // 0 = Sunday, 6 = Saturday
      nextAvailableDate.setDate(now.getDate() + daysUntilMonday);
      nextAvailableDate.setHours(0, 0, 0, 0);
    }
    
    const timeDiff = nextAvailableDate.getTime() - now.getTime();
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes, nextDate: nextAvailableDate };
  };

  // Update the countdown timer
  useEffect(() => {
    if (!canGeneratePlan && lastGeneratedDate) {
      // Initial calculation
      setTimeUntilNextGeneration(calculateTimeUntilNextGeneration());
      
      // Set up timer to update every minute
      const timer = setInterval(() => {
        setTimeUntilNextGeneration(calculateTimeUntilNextGeneration());
      }, 60000); // Update every minute
      
      return () => clearInterval(timer);
    }
  }, [canGeneratePlan, lastGeneratedDate]);

  // Scroll to bottom when returning from training plans
  useEffect(() => {
    if (fromTraining === 'true' && scrollViewRef.current) {
      // Small delay to ensure the layout is complete
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [fromTraining]);

  // Check if user can generate a new plan
  useEffect(() => {
    const checkPlanGenerationStatus = async () => {
      if (!user) return;

      // TODO: Remove debug code before production
      // DEBUG: Uncomment one of these lines to test different scenarios:
      // setCanGeneratePlan(true); return; // Force allow plan generation (simulate Sunday or no previous plan)
      // setCanGeneratePlan(false); setLastGeneratedDate(new Date()); return; // Force show timer

      try {
        // Get the user document to check when they last generated a plan
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        if (userData?.lastPlanGenerated && userData?.lastPlanWeek !== undefined) {
          const lastGenDate = userData.lastPlanGenerated.toDate ? 
            userData.lastPlanGenerated.toDate() : 
            new Date(userData.lastPlanGenerated);
          
          setLastGeneratedDate(lastGenDate);
          
          const today = new Date();
          const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          
          // Calculate which week we're trying to generate for
          let targetWeek;
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            // Monday-Friday: generate for current week
            targetWeek = getWeek(today);
          } else {
            // Saturday-Sunday: generate for next week
            targetWeek = getWeek(addDays(today, 1));
          }
          
          // If lastPlanWeek equals the week we're trying to generate for, block generation
          if (userData.lastPlanWeek === targetWeek) {
            setCanGeneratePlan(false);
            setTimeUntilNextGeneration(calculateTimeUntilNextGeneration());
          } else {
            setCanGeneratePlan(true);
          }
        } else {
          // No previous plans or no lastPlanWeek field, allow generation
          setCanGeneratePlan(true);
        }
      } catch (error) {
        console.error('Error checking plan generation status:', error);
        // Default to allowing generation on error
        setCanGeneratePlan(true);
      }
    };

    checkPlanGenerationStatus();
  }, [user]);

  // Clean up old plans - only when we have more than 2
  useEffect(() => {
    const cleanUpOldPlans = async () => {
      if (!user) return;

      try {
        // Only clean up if we have more than 2 plans
        if (plans.length > 2) {
          // Sort plans by date (newest first)
          const sortedPlans = [...plans].sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
            const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
          });

          // Keep only the 2 most recent plans
          const plansToDelete = sortedPlans.slice(2);

          // Delete the older plans
          for (const plan of plansToDelete) {
            if (plan.id) {
              await removePlanById(plan.id);
            }
          }
        }
      } catch (error) {
        console.error('Error cleaning up old plans:', error);
      }
    };

    cleanUpOldPlans();
  }, [user, plans, removePlanById]);

  // Add effect to check if user has plans and set initial step accordingly
  useEffect(() => {
    if (user && !hasCheckedPlans) {
      // Small delay to ensure plans are loaded from context
      setTimeout(() => {
        if (plans.length > 0) {
          setCurrentStep('plans');
        } else {
          setCurrentStep('welcome');
        }
        setHasCheckedPlans(true);
      }, 100);
    }
  }, [user, plans, hasCheckedPlans]);

  const focusOptions: FocusArea[] = ['technique', 'strength', 'endurance', 'speed', 'overall'];
  const gymOptions: GymAccess[] = ['yes', 'no'];

  // Handle plan selection with smooth transition
  const handlePlanSelection = (planId: string) => {
    if (planId === selectedPlanId) return; // Don't animate if same plan
    
    setIsTransitioning(true);
    
    // Short delay to show transition feedback
    setTimeout(() => {
      setSelectedPlanId(planId);
      setIsTransitioning(false);
    }, 150); // 150ms - quick but noticeable
  };

  // Load the most recent plan text from Firestore
  const loadLastPlanText = async () => {
    if (!user) return '';
    
    try {
      // Query the plans collection to get the most recent plan
      const plansRef = collection(db, 'users', user.uid, 'plans');
      const q = query(plansRef, orderBy('createdAt', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const lastPlanDoc = querySnapshot.docs[0];
        const planData = lastPlanDoc.data();
        
        // Reconstruct the full plan text from the schedule
        if (planData.schedule) {
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          let fullPlanText = '';
          
          days.forEach(day => {
            if (planData.schedule[day]) {
              fullPlanText += `${day.toUpperCase()}\n${planData.schedule[day]}\n\n`;
            }
          });
          
          return fullPlanText.trim();
        }
      }
      
      return '';
    } catch (error) {
      console.error('Error loading last plan:', error);
      return '';
    }
  };

  const handleGeneratePlan = async () => {
    if (!user || !selectedFocus || !gymAccess || !scheduleConfirmed) {
      Alert.alert('Cannot Generate Plan', 
        'Please select a focus area, answer the gym access question, and confirm your team training schedule.');
      return;
    }

    if (!canGeneratePlan) {
      const nextAvailable = calculateTimeUntilNextGeneration();
      
      Alert.alert(
        'Plan Generation Limit Reached', 
        `You can only generate one plan per week window. You can generate a new plan on ${format(nextAvailable.nextDate, 'EEEE, MMMM d')}.`
      );
      return;
    }

    setLoading(true);

    try {
      // Load the last plan text before generating new one
      const lastPlan = await loadLastPlanText();
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData) throw new Error('User data not found');

      const prompt = `You are BallerAI. Your job is to create a training plan for the user. ${
        (() => {
          const today = new Date();
          const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            // Monday-Friday: plan for rest of current week
            return "It should include the rest of this week until Sunday based on the following information";
          } else {
            // Saturday-Sunday: plan for full upcoming week
            return "It should include the full upcoming week (Monday through Sunday) based on the following information";
          }
        })()
      }
this is an example of a plan for one day for this user.
user onboarding answers:
age ${userData.age}
gender "${userData.gender}"
height ${userData.height}
weight ${userData.weight}
injuryHistory "${userData.injuryHistory}"
position "${userData.position}"

the user ${gymAccess === 'yes' ? 'has' : 'does not have'} access to the gym.
assume the user will train alone.
assume the user only has access to a ball, pitch, cones and a goal ${gymAccess === 'yes' ? 'and gym equipment' : ''}.

Users' extra focus for the week is ${selectedFocus}.

users team training amounts are:
${Object.entries(schedule)
  .map(([day, data]) => ` ${day} ${data.type === 'off' ? '0' : data.type === 'game' ? 'GAME' : data.duration} mins`)
  .join('\n')}

${lastPlan ? `Here is the full plan the user followed last week:
===
${lastPlan}
===

When writing the new week:
• make sure not to change the whole structure if the users situation is very similar and optimal plan would be similar.
• DO adjust at least one or two drills per day (exercise type, duration, intensity, order) so the text is not a verbatim copy.
• Do NOT make arbitrary changes that would reduce training quality. Think progression, variation, or subtle shift in focus—not randomness.` : ''}

IMPORTANT: If the user is 14 years old or younger, do not suggest any weight training exercises. Only use bodyweight exercises for strength training.

IMPORTANT SCHEDULE INTERPRETATION: Only consider a day as a game day if explicitly marked as "GAME" in the schedule. If a day is marked as "0" or has no game specified, assume there is no game on that day. Do not assume or hallucinate any games that aren't explicitly marked in the schedule.

Perfect training plan example for BallerAI based on this user's info.
monday: technique based training. start with a 15 minute warm up, 10 mins jogging then 5 minutes of active stretching. Then start to do wall passes for 15 minutes with different variables switching after 5 mins each.Then he will set up 8 cones and start to dribble through and between them using both feet for 15 mins. After that, finishing inside the box for 15 mins. if with a friend do passes before finishing and one time finishing if alone do game like situations where you get ur foot open and finish with precision. then a light 5 min jog to get the fluids mowing and ur done.
don't copy that, just take the detail and style of the training as a guideline for creating similar training sessions adapting to each user's specific info. When the users awnsers are different make sure you adjust accordingly the most important questions are age and position. This example is just to get an idea of a good plan would be for this specific user, do not copy it just take the style and detail as guidance. The plan should be adjusted if the user has a game for example saturday. 2 days before a game has to frop the load a bit not a lot but noticably. 1 day before game has to be really light so only technical things and recovery based trainings.
Keep the plan simple focus on the amount thats good for the player not so much on specific advice in terms of technique since its not correct from you. also remember if user chooses a focusd area it still dosent mean only that hes always a football player first so maximum 2 trainings unrelated to football per week.

VERY IMPORTANT TRAINING GUIDELINES:
1. IF A DAY IS FOR RECOVERY, WRITE ONLY THIS SINGLE LINE AS THE DAY'S CONTENT:
"Focus on recovery today"
DO NOT ADD DRILLS, NOTES, BULLETS, NUMBERS, OR ANY EXTRA TEXT.
2. If the user has a game scheduled on any day, make the 2 days BEFORE that game much lighter in intensity. The day immediately before a game should be extremely light (technical work only) or recovery.
3. If you include a gym session on any day, that should be the ONLY training for that day. Never mix gym and field work on the same day as users typically don't have access to both facilities at once.
4. When a day is a pure gym session:
   • List each lift on its own numbered line and include exact sets × reps, e.g. "Squats – 3 × 8", "Romanian deadlift – 3 × 10 each leg".
   • Do not hide reps in parentheses or cram multiple lifts into one sentence.
5. Only suggest gym-based training if the user has explicitly stated they have gym access.
6. IF THE USER HAS AN INJURY HISTORY, ADJUST OR SUBSTITUTE EXERCISES AS NEEDED, BUT DO NOT KEEP REMINDING THEM OF THE INJURY INSIDE EVERY DRILL.  
   • Only mention the injury when you are explicitly prescribing a rehab/pre-hab segment (e.g. "Ankle stability series – inversion / eversion with band").  
   • Ordinary drills like passing or dribbling should NOT contain phrases such as "protect ACL" or "watch ankle".

WHEN A DAY IS A PURE GYM SESSION
• Do not pre-face the lifts with any header such as "Gym session", "Strength block", "Lower-body focus", etc.
• Simply begin the list of lifts at 1. and continue:
 1. Back squats – 4 × 6
 2. Romanian deadlifts – 3 × 8 each leg
 …
• Every lift must show exact sets × reps with the multiplication symbol (×) or the letter "x".
• Do not mention ACL/ankle safety, "protect", "pre-hab", or similar inside the lift text. or anything else related to users injury history. take it into account but dont write it out
• Treat the entire block as 60 min by default – you do not need to repeat the duration inside the text.

IMPORTANT FORMAT INSTRUCTIONS:
1. Format each day in FULL CAPS (example: "MONDAY"). Only the day header (MONDAY, TUESDAY…) must be in FULL CAPS. All drill text underneath should be normal sentence case (capitalise just the first letter; no shouting).
2. Write the plan for that day directly below it
3. Separate each day's plan with a line break
4. The plan should be in simple text format, no markdown, bold, or fancy formatting
5. Start with MONDAY and include all 7 days of the week in order
6. WRITE EACH DRILL ON ITS OWN LINE AND NUMBER THEM SEQUENTIALLY:
   "1. 15 min warm-up – light jog …"
   "2. 20 min passing drills …"
   No asterisks, dashes, or circles—just plain numbers and periods.
   EXCEPTION: Do NOT number a recovery day; it must contain only the line above.

${(() => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    // Monday-Friday: show example for rest of week
    return `Example of correct format (for rest of current week):
MONDAY
1. 10 min warm up - light jog and stretching
2. 15 min passing drills - wall passes varying distance
3. 15 min dribbling - cone drills focusing on control
4. 5 min cool down

TUESDAY
1. Gym session: 45 minutes of strength training focused on lower body

WEDNESDAY
Focus on recovery today

THURSDAY (Light training - game in 2 days)
1. 20 min very light technical work - focus on ball control
2. 10 min stretching

FRIDAY (Pre-game day)
Focus on recovery today
Light stretching only

SATURDAY
Game day

SUNDAY
Focus on recovery today`;
  } else {
    // Saturday-Sunday: show example for full week
    return `Example of correct format (for full upcoming week):
MONDAY
1. 10 min warm up - light jog and stretching
2. 15 min passing drills - wall passes varying distance
3. 15 min dribbling - cone drills focusing on control
4. 5 min cool down

TUESDAY
1. Gym session: 45 minutes of strength training focused on lower body

WEDNESDAY
Focus on recovery today

THURSDAY (Light training - game in 2 days)
1. 20 min very light technical work - focus on ball control
2. 10 min stretching

FRIDAY (Pre-game day)
Focus on recovery today
Light stretching only

SATURDAY
Game day

SUNDAY
Focus on recovery today`;
  }
})()}

IMPORTANT: After the last day (Sunday), write a short summary section titled "NOTES:" that explains the weekly plan structure and why certain types of training were scheduled on specific days. This helps users understand the reasoning behind their training program.`;

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{
            role: "user",
            content: prompt
          }],
          max_tokens: 8000,
          temperature: 0.3,
          top_p: 0.9
        }),
      });

      const data = await response.json();
      console.log('Full API Response:', JSON.stringify(data, null, 2));

      // Log token usage for training plan generation
      const usage = data.usage;
      if (usage) {
        console.log('💪 TRAINING PLAN GENERATION TOKEN USAGE:', {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          model: 'deepseek-chat',
          feature: 'training_plan_generation',
          timestamp: new Date().toISOString()
        });
      }

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from API');
      }

      const planText = data.choices[0].message.content;
      const dailyPlans: { [key: string]: string } = {};
      
      console.log('DEBUG - API Response Plan Text:', planText);
      
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      // Simple parse function to extract content between day headers
      days.forEach(day => {
        // Updated regex to handle both plain and markdown formatted day headers (with **DAY**)
        const dayRegex = new RegExp(
          `(?:\\*\\*)?${day.toUpperCase()}(?:\\*\\*)?\\s*(?:\\([^)]+\\))?\\s*\\n([\\s\\S]*?)(?=(?:\\*\\*)?(?:${days.join('|').toUpperCase()})(?:\\*\\*)?\\s*(?:\\([^)]+\\))?\\s*\\n|$|\\n---\\s*\\n|\\n\\*\\*Notes:|$)`,
          'i'
        );
        
        const match = planText.match(dayRegex);
        
        console.log(`DEBUG - Parsing ${day}:`, {
          pattern: dayRegex.toString(),
          matched: !!match,
          content: match ? match[1] : null
        });
        
        if (match && match[1]) {
          // Clean up the training text by removing age-related explanatory notes and markdown
          let cleanedText = match[1].trim()
            .replace(/\(no weights,?\s+as\s+user\s+is\s+under\s+14\)/gi, '')
            .replace(/no weights? training as user is under \d+/gi, '')
            .replace(/bodyweight only as user is under \d+/gi, '')
            .replace(/\(bodyweight exercises? only\)/gi, '')
            .replace(/\*\*/g, '') // Remove markdown formatting
            .replace(/[ \t]{2,}/g, ' ') // Remove extra spaces (but preserve newlines)
            .trim();
          
          dailyPlans[day] = cleanedText;
        } else {
          dailyPlans[day] = `No specific training for ${day}.`;
        }
      });

      console.log('DEBUG - Final Daily Plans:', dailyPlans);

      const now = new Date();
      
      // Get the week number for plan naming
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      let weekNumber;
      
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Monday-Friday: generate plan for current week
        weekNumber = getWeek(now);
      } else {
        // Saturday-Sunday: generate plan for next week
        weekNumber = getWeek(addDays(now, 1));
      }
      
      await addPlan({
        name: `Plan for Week ${weekNumber}`,
        createdAt: now,
        schedule: dailyPlans,
      });

      // Save the raw plan text to Firestore for future reference
      const planDate = format(now, 'yyyy-MM-dd');
      await setDoc(doc(db, 'users', user.uid, 'plans', planDate), {
        planText: planText,
        createdAt: now
      });

      // Update lastPlanGenerated and lastPlanWeek in user document
      await setDoc(doc(db, 'users', user.uid), {
        lastPlanGenerated: now,
        lastPlanWeek: weekNumber,
      }, { merge: true });

      // Update local state
      setCanGeneratePlan(false);
      setLastGeneratedDate(now);

      // Navigate back to training tab plans view
      setCurrentStep('plans');
      
      // The useEffect will automatically select the newly generated plan
    } catch (error) {
      console.error('Error generating plan:', error);
      Alert.alert('Error', 'Failed to generate a training plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const confirmSchedule = () => {
    const missingDurations = Object.entries(schedule).some(([day, { type, duration }]) => 
      (type === 'training') && !duration
    );
    
    if (missingDurations) {
      Alert.alert('Missing Information', 'Please enter duration for all training days.');
      return;
    }
    
    setScheduleConfirmed(true);
    setCurrentStep('summary');
  };

  const editSchedule = () => {
    setScheduleConfirmed(false);
  };

  const updateSchedule = (day: string, type: 'off' | 'game' | 'training') => {
    if (scheduleConfirmed) return;
    
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day as keyof typeof schedule],
        type,
        ...(type === 'off' && { duration: '' })
      },
    });
  };

  const updateDuration = (day: string, duration: string) => {
    if (scheduleConfirmed) return;
    
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day as keyof typeof schedule],
        duration,
      },
    });
  };

  const handleGoToPlans = async () => {
    // Log analytics event before navigating
    try {
      await analyticsService.logEvent('AA__99_view_training_plans');
      console.log("Analytics event 'view_training_plans' logged.");
    } catch (error) {
      console.error("Error logging 'view_training_plans' event:", error);
    }
    
    // Navigate to training plans with only the fromTraining parameter
    router.push({
      pathname: '../training-plans',
      params: { fromTraining: 'true' }
    });
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'focus':
        if (selectedFocus) setCurrentStep('gym');
        break;
      case 'gym':
        if (gymAccess) setCurrentStep('schedule');
        break;
      case 'schedule':
        // This is handled by confirmSchedule
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'focus':
        // If user has plans, go back to plans view, otherwise welcome
        setCurrentStep(plans.length > 0 ? 'plans' : 'welcome');
        break;
      case 'gym':
        setCurrentStep('focus');
        break;
      case 'schedule':
        setCurrentStep('gym');
        break;
      case 'summary':
        setCurrentStep('schedule');
        setScheduleConfirmed(false);
        break;
    }
  };

  const handleEditAnswers = () => {
    setCurrentStep('schedule');
    setScheduleConfirmed(false);
  };

  const handleStartNewPlan = () => {
    // Check if user already has 2 plans
    if (plans.length >= 2) {
      Alert.alert(
        'Plan Limit Reached',
        'You can only have 2 active training plans. If you continue, your oldest plan will be automatically deleted.\n\nMake sure to save or screenshot any information you want to keep before proceeding.',
        [
          {
            text: 'Back',
            style: 'cancel',
          },
          {
            text: 'Continue',
            onPress: () => {
              // Reset all selections when starting a new plan
              setSelectedFocus(null);
              setGymAccess(null);
              setSchedule({
                monday: { type: 'off', duration: '' },
                tuesday: { type: 'off', duration: '' },
                wednesday: { type: 'off', duration: '' },
                thursday: { type: 'off', duration: '' },
                friday: { type: 'off', duration: '' },
                saturday: { type: 'off', duration: '' },
                sunday: { type: 'off', duration: '' },
              });
              setScheduleConfirmed(false);
              setCurrentStep('focus');
            },
          },
        ],
        { cancelable: true }
      );
    } else {
      // If less than 2 plans, proceed directly
      setSelectedFocus(null);
      setGymAccess(null);
      setSchedule({
        monday: { type: 'off', duration: '' },
        tuesday: { type: 'off', duration: '' },
        wednesday: { type: 'off', duration: '' },
        thursday: { type: 'off', duration: '' },
        friday: { type: 'off', duration: '' },
        saturday: { type: 'off', duration: '' },
        sunday: { type: 'off', duration: '' },
      });
      setScheduleConfirmed(false);
      setCurrentStep('focus');
    }
  };

  const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Helper function to safely format day headers
  const formatDayHeader = (day: string): string => {
    if (!day) return '';
    return day.toUpperCase();
  };
  
  // Helper function to safely get plan content
  const getDayContent = (plan: { id: string; name: string; createdAt: Date; schedule: { [key: string]: string } }, day: string): string => {
    if (!plan.schedule || !plan.schedule[day]) {
      return "No content available for this day.";
    }
    return plan.schedule[day];
  };

  // Parse drills from plan text
  const parseDrills = (content: string): { header?: string; drills: { index: number; text: string; subs: string[] }[]; isRecovery?: boolean; isGame?: boolean; isGymDay?: boolean; summaryNotes?: string[] } => {
    const lines = content.split('\n');
    const drills: { index: number; text: string; subs: string[] }[] = [];
    let currentDrill: { index: number; text: string; subs: string[] } | null = null;
    let sessionHeader: string | undefined = undefined;
    let drillIndex = 1;
    let isRecovery = false;
    let isGame = false;
    const summaryNotes: string[] = [];
    let inSummarySection = false;
    let isGymDay = false;
    
    // Check if this is a recovery day first
    const firstNonEmptyLine = lines.find(line => line.trim());
    if (firstNonEmptyLine && firstNonEmptyLine.toLowerCase().includes('focus on recovery')) {
      return {
        drills: [],
        isRecovery: true,
        header: firstNonEmptyLine.trim()
      };
    }
    
    // Check if this is a game day
    if (firstNonEmptyLine && firstNonEmptyLine.toLowerCase().includes('game day')) {
      return {
        drills: [],
        isGame: true,
        header: 'Game day'
      };
    }
    
    // Check if this is a gym day by looking at the first few lines
    const firstFewLines = lines.slice(0, 3).join(' ').toLowerCase();
    if (firstFewLines.includes('gym session')) {
      isGymDay = true;
    }
    
    // Patterns for different line types
    const gymSessionRegex = /^\s*(?:\d+\.\s*)?gym\s+session.*$/i;
    const summaryStartRegex = /^\s*(?:notes|summary|week\s+summary)[:\s]*$/i;
    const topLevelNumberRegex = /^(?:\s{0,1})(\d+)\.\s+(.+)$/;
    const indentedNumberRegex = /^\s{2,}\d+\.\s+(.+)$/;
    const dashBulletRegex = /^\s*[-–•]\s+(.+)$/;
    
    // Regex to detect sets × reps patterns (e.g., 3×8, 4 x 10, 2 × 12)
    const SET_REP_REGEX = /\d+\s*[×xX]\s*\d+/;
    
    // Helper function to strip injury callouts
    const stripInjuryCallouts = (text: string): string => {
      // Remove parenthetical injury mentions
      text = text.replace(/\s*\([^)]*(?:ACL|ankle|injury|prevention|stability|protect)[^)]*\)/gi, '');
      // Remove dash-separated injury mentions at the end
      text = text.replace(/\s*[-–]\s*(?:for\s+)?(?:ACL|ankle|injury|prevention|stability|protect).*$/gi, '');
      return text.trim();
    };
    
    // Track if we find sets × reps in the first drill
    let firstDrillHasSetsReps = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check for summary section start
      if (summaryStartRegex.test(trimmedLine)) {
        inSummarySection = true;
        continue;
      }
      
      // If in summary section, collect all non-empty lines
      if (inSummarySection) {
        if (trimmedLine) {
          // Remove leading bullets or dashes if present
          const cleanedLine = trimmedLine.replace(/^[-–•]\s*/, '');
          summaryNotes.push(cleanedLine);
        }
        continue;
      }
      
      // Check for gym session header and skip it
      if (gymSessionRegex.test(trimmedLine)) {
        // Skip this line entirely - don't store as header or drill
        drillIndex = 1; // Reset numbering for subsequent drills
        continue;
      }
      
      const topLevelMatch = line.match(topLevelNumberRegex);
      const indentedMatch = line.match(indentedNumberRegex);
      const dashMatch = line.match(dashBulletRegex);
      
      if (topLevelMatch) {
        // This is a new top-level drill
        if (currentDrill) {
          // Apply injury stripping before pushing
          if (isGymDay) {
            currentDrill.text = stripInjuryCallouts(currentDrill.text);
          }
          drills.push(currentDrill);
        }
        
        const drillText = topLevelMatch[2].trim();
        
        // Check if this is the first drill and contains sets × reps
        if (drills.length === 0 && !currentDrill && SET_REP_REGEX.test(drillText)) {
          firstDrillHasSetsReps = true;
          isGymDay = true;
        }
        
        currentDrill = {
          index: drillIndex++,
          text: drillText,
          subs: []
        };
      } else if (indentedMatch) {
        // This is an indented numbered item
        if (!currentDrill && sessionHeader) {
          // First drill after session header
          currentDrill = {
            index: drillIndex++,
            text: indentedMatch[1].trim(),
            subs: []
          };
        } else if (currentDrill) {
          // Sub-item of current drill
          currentDrill.subs.push(indentedMatch[1].trim());
        }
      } else if (dashMatch) {
        // This is a dash/bullet item
        if (isGymDay && currentDrill) {
          // For gym days, flatten dash items into the current drill's text
          const dashText = dashMatch[1].trim();
          currentDrill.text += ` – ${dashText}`;
        } else if (currentDrill) {
          // For non-gym days, treat as sub-item
          currentDrill.subs.push(dashMatch[1].trim());
        } else if (!currentDrill && sessionHeader) {
          // First drill after session header (shouldn't happen, but handle gracefully)
          currentDrill = {
            index: drillIndex++,
            text: dashMatch[1].trim(),
            subs: []
          };
        }
      } else if (trimmedLine && !currentDrill && !sessionHeader) {
        // Non-empty line with no current drill or header - start a new one
        drills.push({
          index: drillIndex++,
          text: trimmedLine,
          subs: []
        });
      }
    }
    
    // Don't forget the last drill
    if (currentDrill) {
      // Apply injury stripping before pushing
      if (isGymDay) {
        currentDrill.text = stripInjuryCallouts(currentDrill.text);
      }
      drills.push(currentDrill);
    }
    
    // If no drills were parsed, fallback to simple line split
    if (drills.length === 0 && !sessionHeader && !isRecovery && !isGame) {
      const fallbackDrills = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map((line, idx) => ({
          index: idx + 1,
          text: line,
          subs: []
        }));
      return { drills: fallbackDrills, summaryNotes: summaryNotes.length > 0 ? summaryNotes : undefined };
    }
    
    return { 
      header: sessionHeader, 
      drills, 
      isRecovery,
      isGame,
      isGymDay,
      summaryNotes: summaryNotes.length > 0 ? summaryNotes : undefined
    };
  };

  // Calculate total duration from drills
  const calculateTotalDuration = (parsedContent: { header?: string; drills: { text: string; subs: string[] }[]; isRecovery?: boolean; isGame?: boolean; isGymDay?: boolean }): number => {
    // No duration for recovery days or game days
    if (parsedContent.isRecovery || parsedContent.isGame) {
      return 0;
    }
    
    // Short-circuit for gym days - always 60 minutes
    if (isGymDay(parsedContent)) {
      return 60;
    }
    
    let totalMinutes = 0;
    const durationRegex = /(\d+)\s*min/i;
    
    parsedContent.drills.forEach(drill => {
      // Check main drill text
      const match = drill.text.match(durationRegex);
      if (match) {
        totalMinutes += parseInt(match[1]);
      }
      
      // Also check sub-items
      drill.subs.forEach(sub => {
        const subMatch = sub.match(durationRegex);
        if (subMatch) {
          totalMinutes += parseInt(subMatch[1]);
        }
      });
    });
    
    return totalMinutes;
  };

  // Determine if it's a gym day
  const isGymDay = (parsedContent: { header?: string; drills: { text: string; subs: string[] }[]; isGymDay?: boolean }): boolean => {
    // Check the flag set during parsing (either from "gym session" header or sets × reps pattern)
    return parsedContent.isGymDay === true;
  };

  // Determine if it's a recovery day
  const isRecoveryDay = (drills: { text: string; subs: string[] }[]): boolean => {
    if (drills.length === 0) return false;
    return drills[0].text.toLowerCase().includes('focus on recovery');
  };

  // Determine if it's a game day
  const isGameDay = (drills: { text: string; subs: string[] }[]): boolean => {
    if (drills.length === 0) return false;
    return drills[0].text.toLowerCase().includes('game day');
  };

  // Toggle drill completion
  const toggleDrillCompletion = (day: string, drillIndex: number) => {
    const key = `${day}-${drillIndex}`;
    setCompletedDrills(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'plans':
        // Find the selected plan
        const selectedPlan = plans.find(p => p.id === selectedPlanId);
        
        return (
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 100, // Add padding to ensure bottom content is visible
            }}
          >
            {/* Timer or Generate New Plan Button at the top */}
            <View style={{ marginBottom: 24 }}>
              {!canGeneratePlan && lastGeneratedDate ? (
                <View style={styles.timerContainer}>
                  <Text style={styles.timerText}>
                    Next plan available {format(timeUntilNextGeneration.nextDate, 'EEEE, MMMM d')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: 'center', gap: 5 }}>
                    <Ionicons name="time-outline" size={18} color="#4064F6" />
                    <Text style={styles.countdownText}>
                      {timeUntilNextGeneration.days > 0 && `${timeUntilNextGeneration.days} day${timeUntilNextGeneration.days !== 1 ? 's' : ''}, `}
                      {timeUntilNextGeneration.hours} hour{timeUntilNextGeneration.hours !== 1 ? 's' : ''}, {timeUntilNextGeneration.minutes} min
                    </Text>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.getStartedButton,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={handleStartNewPlan}
                >
                  <Text style={styles.getStartedButtonText}>Generate a New Plan for This Week</Text>
                </Pressable>
              )}
            </View>

            {/* Plan selection buttons */}
            <View style={styles.plansButtonContainer}>
              {plans.map((plan) => (
                <Pressable
                  key={plan.id}
                  style={({ pressed }) => [
                    styles.planButton,
                    selectedPlanId === plan.id && styles.selectedPlanButton,
                    pressed && { opacity: 0.8 },
                    isTransitioning && { opacity: 0.7 }
                  ]}
                  onPress={() => handlePlanSelection(plan.id)}
                  disabled={isTransitioning}
                >
                  <Text 
                    style={[
                      styles.planButtonText, 
                      selectedPlanId === plan.id && styles.selectedPlanButtonText
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {plan.name}
                  </Text>
                  {isTransitioning && selectedPlanId === plan.id && (
                    <ActivityIndicator 
                      size="small" 
                      color={selectedPlanId === plan.id ? "#FFFFFF" : "#4064F6"} 
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </Pressable>
              ))}
            </View>

            {/* Selected plan details section */}
            {selectedPlan && !isTransitioning && (
              <Animated.View 
                key={selectedPlanId} 
                style={styles.planDetailsContainer}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(100)}
              >
                {/* Days of the week */}
                {(() => {
                  let allSummaryNotes: string[] = [];
                  
                  const dayAccordions = DAYS_ORDER.map((day) => {
                    const dayContent = getDayContent(selectedPlan, day);
                    const parsed = parseDrills(dayContent);
                    
                    // Collect summary notes from each day
                    if (parsed.summaryNotes) {
                      allSummaryNotes = [...allSummaryNotes, ...parsed.summaryNotes];
                    }
                    
                    const totalDuration = calculateTotalDuration(parsed);
                    const isGym = isGymDay(parsed);
                    const isRecovery = parsed.isRecovery || isRecoveryDay(parsed.drills);
                    const isGame = parsed.isGame || isGameDay(parsed.drills);
                    
                    return (
                      <Accordion 
                        key={day}
                        title={formatDayHeader(day)}
                        expanded={false}
                      >
                        <View style={styles.planContent}>
                          {/* Day info badges */}
                          {!isRecovery && !isGame && (
                            <View style={[styles.dayHeaderContainer, { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }]}>
                              <View style={styles.dayHeaderLeft}>
                                {totalDuration > 0 && (
                                  <View style={styles.durationBadge}>
                                    <Text style={styles.durationText}>{totalDuration} min</Text>
                                  </View>
                                )}
                              </View>
                              <View style={[
                                styles.typeChip, 
                                isGym ? styles.gymChip : styles.fieldChip
                              ]}>
                                <Text style={[
                                  styles.chipText, 
                                  isGym ? styles.gymChipText : styles.fieldChipText
                                ]}>
                                  {isGym ? 'GYM' : 'FIELD'}
                                </Text>
                              </View>
                            </View>
                          )}
                          
                          {/* Recovery day special rendering */}
                          {isRecovery ? (
                            <>
                              {/* HOME chip for recovery days */}
                              <View style={[styles.dayHeaderContainer, { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 0 }]}>
                                <View style={styles.dayHeaderLeft}>
                                  {/* Empty left side for alignment */}
                                </View>
                                <View style={[styles.typeChip, styles.homeChip]}>
                                  <Text style={[styles.chipText, styles.homeChipText]}>HOME</Text>
                                </View>
                              </View>
                              <Text style={styles.recoveryText}>{parsed.header || 'Focus on recovery today'}</Text>
                            </>
                          ) : isGame ? (
                            <>
                              {/* GAME chip for game days */}
                              <View style={[styles.dayHeaderContainer, { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 0 }]}>
                                <View style={styles.dayHeaderLeft}>
                                  {/* Empty left side for alignment */}
                                </View>
                                <View style={[styles.typeChip, styles.gameChip]}>
                                  <Text style={[styles.chipText, styles.gameChipText]}>GAME</Text>
                                </View>
                              </View>
                              <Text style={styles.recoveryText}>{parsed.header || 'Game day'}</Text>
                            </>
                          ) : (
                            <>
                              {/* Regular drills list */}
                              <ScrollView style={{ maxHeight: 400, paddingHorizontal: 16, paddingBottom: 16 }}>
                                {/* Drill items */}
                                {parsed.drills.map((drill, index) => {
                                  const isCompleted = completedDrills[`${day}-${index}`];
                                  
                                  return (
                                    <View key={index}>
                                      <Pressable
                                        style={styles.drillRow}
                                        onPress={() => toggleDrillCompletion(day, index)}
                                      >
                                        <Text style={styles.drillIndex}>{drill.index}.</Text>
                                        <Text style={[
                                          styles.drillText,
                                          isCompleted && styles.drillTextCompleted
                                        ]}>
                                          {drill.text}
                                        </Text>
                                      </Pressable>
                                      
                                      {/* Render sub-items if any */}
                                      {drill.subs.map((sub, subIndex) => (
                                        <Pressable
                                          key={`sub-${subIndex}`}
                                          style={styles.subItemRow}
                                          onPress={() => toggleDrillCompletion(day, index)}
                                        >
                                          <Text style={styles.subItemBullet}>•</Text>
                                          <Text style={[
                                            styles.subItemText,
                                            isCompleted && styles.subItemTextCompleted
                                          ]}>
                                            {sub}
                                          </Text>
                                        </Pressable>
                                      ))}
                                    </View>
                                  );
                                })}
                              </ScrollView>
                            </>
                          )}
                        </View>
                      </Accordion>
                    );
                  });
                  
                  return (
                    <>
                      {dayAccordions}
                      
                      {/* Summary accordion if notes exist */}
                      {allSummaryNotes.length > 0 && (
                        <Accordion 
                          key="summary"
                          title="SUMMARY"
                          expanded={false}
                        >
                          <View style={styles.planContent}>
                            <View style={{ paddingVertical: 16 }}>
                              {allSummaryNotes.map((note, index) => (
                                <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                  <Text style={styles.summaryBullet}>•</Text>
                                  <Text style={[styles.summaryNote, { flex: 1 }]}>{note}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        </Accordion>
                      )}
                    </>
                  );
                })()}
              </Animated.View>
            )}

            {/* Transition loading state */}
            {isTransitioning && (
              <Animated.View 
                style={[styles.planDetailsContainer, { justifyContent: 'center', alignItems: 'center', minHeight: 200 }]}
                entering={FadeIn.duration(100)}
              >
                <ActivityIndicator size="large" color="#4064F6" />
                <Text style={{ marginTop: 12, color: '#666666', fontSize: 16 }}>Loading plan...</Text>
              </Animated.View>
            )}
          </ScrollView>
        );

      case 'welcome':
        return (
                      <ScrollView 
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              bounces={true}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'center',
                paddingHorizontal: 24,
                paddingTop: 40,
                paddingBottom: 120,
              }}
            >
            <Animated.View 
              style={[styles.welcomeContainer, { paddingHorizontal: 0, paddingTop: 0 }]}
              entering={FadeIn.duration(500)}
            >
              <View style={styles.welcomeCard}>
                <Animated.View 
                  style={styles.welcomeIconContainer}
                  entering={FadeIn.duration(600).delay(200)}
                >
                  <Ionicons name="football" size={60} color="#4064F6" />
                </Animated.View>
                <Text style={styles.welcomeTitle}>Welcome to Training</Text>
                <Text style={styles.welcomeText}>
                  We'll generate customized training plans for you based on your load and preferences. Let's get started!
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.getStartedButton,
                  pressed && { opacity: 0.8 }
                ]}
                onPress={() => setCurrentStep('focus')}
              >
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        );

      case 'focus':
        return (
          <Animated.View 
            style={{ flex: 1 }}
            entering={SlideInRight.duration(300)}
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
                  !selectedFocus && styles.nextButtonDisabled,
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleNext}
                disabled={!selectedFocus}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.content}>
              <View style={[styles.sectionBackgroundGray, { backgroundColor: '#DCF4F5' }]}>
                <Text style={[styles.sectionTitle, { color: canGeneratePlan ? '#000000' : '#666666' }]}>Focus Area</Text>
                <Text style={styles.subtitle}>Select your training focus to get a personalized plan</Text>
                
                <View style={styles.optionsContainer}>
                  {focusOptions.map((focus) => (
                    <Pressable  
                      key={focus}
                      style={({ pressed }) => [
                        styles.option,
                        selectedFocus === focus && styles.selectedOption,
                        pressed && { opacity: 0.8 }
                      ]}
                      onPress={() => setSelectedFocus(focus)}
                      disabled={!canGeneratePlan}
                    >
                      <Text style={[
                        styles.optionText,
                        selectedFocus === focus && styles.selectedOptionText
                      ]}>
                        {focus.charAt(0).toUpperCase() + focus.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>
        );

      case 'gym':
        return (
          <Animated.View 
            style={{ flex: 1 }}
            entering={SlideInRight.duration(300)}
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
                  !gymAccess && styles.nextButtonDisabled,
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleNext}
                disabled={!gymAccess}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.content}>
              <View style={[styles.sectionBackgroundGray, { backgroundColor: '#DCF4F5' }]}>
                <Text style={[styles.sectionTitle, { color: canGeneratePlan ? '#000000' : '#666666' }]}>Gym Access</Text>
                <Text style={styles.subtitle}>Do you have access to a gym?</Text>
                <View style={styles.optionsContainer}>
                  {gymOptions.map((option) => (
                    <Pressable  
                      key={option}
                      style={({ pressed }) => [
                        styles.option,
                        gymAccess === option && styles.selectedOption,
                        pressed && { opacity: 0.8 }
                      ]}
                      onPress={() => setGymAccess(option)}
                      disabled={!canGeneratePlan}
                    >
                      <Text style={[
                        styles.optionText,
                        gymAccess === option && styles.selectedOptionText
                      ]}>
                        {option === 'yes' ? 'Yes' : 'No'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>
        );

      case 'schedule':
        return (
          <Animated.View 
            style={{ flex: 1 }}
            entering={SlideInRight.duration(300)}
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

            <ScrollView 
              style={styles.scrollView} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 100, // Add padding to ensure confirm button is visible
              }}
            >
              <View style={styles.content}>
                <View style={[styles.sectionBackgroundGray, { backgroundColor: '#DCF4F5' }, scheduleConfirmed && { opacity: 0.8 }]}>
                  <Text style={[styles.sectionTitle, { color: canGeneratePlan ? '#000000' : '#666666' }]}>Team Training <Text style={styles.subtitleInline}>(mins/day)</Text></Text>

                  {Object.entries(schedule).map(([day, daySchedule]) => (
                    <View key={day} style={[styles.dayContainer, scheduleConfirmed && styles.disabledContainer]}>
                      <Text style={[styles.dayTitle, { color: canGeneratePlan ? '#000000' : '#666666' }]}>{day.toUpperCase()}</Text>
                      <View style={styles.dayOptions}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.dayOption,
                            daySchedule.type === 'off' && styles.selectedDayOption,
                            scheduleConfirmed && styles.disabledOption,
                            pressed && { opacity: 0.8 }
                          ]}
                          onPress={() => updateSchedule(day, 'off')}
                          disabled={scheduleConfirmed || !canGeneratePlan}
                        >
                          <Text style={[styles.dayOptionText, { color: canGeneratePlan ? '#000000' : '#666666' }]}>Off</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.dayOption,
                            daySchedule.type === 'game' && styles.selectedGameOption,
                            scheduleConfirmed && styles.disabledOption,
                            pressed && { opacity: 0.8 }
                          ]}
                          onPress={() => updateSchedule(day, 'game')}
                          disabled={scheduleConfirmed || !canGeneratePlan}
                        >
                          <Text style={[styles.dayOptionText, { color: canGeneratePlan ? '#000000' : '#666666' }]}>Game</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.dayOption,
                            daySchedule.type === 'training' && styles.selectedTrainingOption,
                            scheduleConfirmed && styles.disabledOption,
                            pressed && { opacity: 0.8 }
                          ]}
                          onPress={() => updateSchedule(day, 'training')}
                          disabled={scheduleConfirmed || !canGeneratePlan}
                        >
                          <Text style={[styles.dayOptionText, { color: canGeneratePlan ? '#000000' : '#666666' }]}>Training</Text>
                        </Pressable>
                      </View>
                      {(daySchedule.type === 'training') && (
                        <View style={styles.timeInputContainer}>
                          <Ionicons 
                            name="time-outline" 
                            size={20} 
                            color="#666666" 
                            style={styles.clockIcon}
                          />
                          <TextInput
                            style={[styles.timeInput, scheduleConfirmed && styles.disabledInput]}
                            placeholder={`Enter ${daySchedule.type} time`}
                            value={daySchedule.duration}
                            onChangeText={(text) => updateDuration(day, text)}
                            keyboardType="numeric"
                            editable={!scheduleConfirmed && canGeneratePlan}
                          />
                        </View>
                      )}
                    </View>
                  ))}
                  
                  {canGeneratePlan && !scheduleConfirmed && (
                    <Pressable 
                      style={styles.confirmButton}
                      onPress={confirmSchedule}
                    >
                      <Text style={styles.confirmButtonText}>Confirm Schedule</Text>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    </Pressable>
                  )}
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        );

      case 'summary':
        return (
          <Animated.View 
            style={{ flex: 1 }}
            entering={SlideInRight.duration(300)}
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

            <View style={styles.content}>
              <View style={styles.summaryContainer}>
                <Animated.View 
                  style={styles.welcomeIconContainer}
                  entering={FadeIn.duration(600).delay(200)}
                >
                  <Ionicons name="checkmark-circle" size={60} color="#99E86C" />
                </Animated.View>
                <Text style={styles.summaryTitle}>Perfect!</Text>
                <Text style={styles.summaryText}>
                  We have everything we need to generate an optimal training plan for you.
                </Text>
                
                <View style={styles.summaryButtons}>
                  {/* Add countdown timer if plan already generated */}
                  {!canGeneratePlan && lastGeneratedDate && (
                    <View style={styles.timerContainer}>
                      <Text style={styles.timerText}>
                        Next plan available {format(timeUntilNextGeneration.nextDate, 'EEEE, MMMM d')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: 'center', gap: 5 }}>
                        <Ionicons name="time-outline" size={18} color="#4064F6" />
                        <Text style={styles.countdownText}>
                          {timeUntilNextGeneration.days > 0 && `${timeUntilNextGeneration.days} day${timeUntilNextGeneration.days !== 1 ? 's' : ''}, `}
                          {timeUntilNextGeneration.hours} hour{timeUntilNextGeneration.hours !== 1 ? 's' : ''}, {timeUntilNextGeneration.minutes} min
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  <Pressable
                    style={({ pressed }) => [
                      styles.generateButton,
                      (loading || !canGeneratePlan) && styles.generateButtonDisabled,
                      pressed && { opacity: 0.8 }
                    ]}
                    onPress={handleGeneratePlan}
                    disabled={loading || !canGeneratePlan}
                  >
                    <Text style={styles.generateButtonText}>
                      {loading 
                        ? 'Generating Plan...' 
                        : !canGeneratePlan 
                          ? 'Weekly Plan Already Generated' 
                          : 'Generate Training Plan'}
                    </Text>
                    <Ionicons name="football" size={20} color="#FFFFFF" />
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.editAnswersButton,
                      pressed && { opacity: 0.8 }
                    ]}
                    onPress={handleEditAnswers}
                  >
                    <Text style={styles.editAnswersButtonText}>Edit Answers</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Animated.View>
        );
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.container}>
          {/* Header - Fixed at top */}
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
                Training
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

          {/* Content */}
          {renderContent()}
        </View>
      </KeyboardAvoidingView>
      
      {loading && (
        <Animated.View 
          style={styles.loadingOverlay}
          entering={FadeIn.duration(300)}
        >
          <Animated.View 
            style={styles.loadingContent}
            entering={FadeInDown.duration(400).springify()}
          >
            <View style={styles.loadingIconContainer}>
              <Ionicons name="football" size={60} color="#4064F6" />
            </View>
            <Text style={styles.loadingTitle}>Generating Plan</Text>
            <Text style={styles.loadingText}>
              Please don't close the app while we generate your training plan.
            </Text>
            <ActivityIndicator size="large" color="#4064F6" />
          </Animated.View>
        </Animated.View>
      )}
    </>
  );
}

// ... rest of your styles ...