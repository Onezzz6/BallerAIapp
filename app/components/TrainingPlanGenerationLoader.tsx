import { View, Text, ScrollView } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  FadeIn,
  FadeInDown
} from 'react-native-reanimated';
import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHaptics } from '../utils/haptics';

const GENERATION_STEPS = [
  { text: 'Analyzing your profile and goals', checked: false },
  { text: 'Evaluating your team schedule', checked: false },
  { text: 'Assessing gym access and equipment', checked: false },
  { text: 'Reviewing injury history and limitations', checked: false },
  { text: 'Calculating training load distribution', checked: false },
  { text: 'Designing Monday-Wednesday sessions', checked: false },
  { text: 'Designing Thursday-Sunday sessions', checked: false },
  { text: 'Optimizing recovery periods', checked: false },
  { text: 'Balancing field vs gym training', checked: false },
  { text: 'Finalizing weekly structure', checked: false },
];

const STATUS_MESSAGES = [
  'Reviewing your profile and position...',
  'Analyzing your team training schedule...',
  'Checking available equipment and facilities...',
  'Considering injury history and limitations...',
  'Calculating optimal training load...',
  'Designing early week sessions...',
  'Creating mid-week training...',
  'Planning weekend sessions...',
  'Optimizing recovery periods...',
  'Balancing training types...',
  'Finalizing your personalized plan...',
  'Almost ready...'
];

interface TrainingPlanGenerationLoaderProps {
  onComplete?: () => void;
  isComplete?: boolean;
}

export default function TrainingPlanGenerationLoader({ onComplete, isComplete }: TrainingPlanGenerationLoaderProps) {
  const haptics = useHaptics();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const progress = useSharedValue(1);
  const [currentPercentage, setCurrentPercentage] = useState(1);
  const [currentStatus, setCurrentStatus] = useState(STATUS_MESSAGES[0]);
  const [steps, setSteps] = useState(GENERATION_STEPS);

  // Function to scroll to a specific step
  const scrollToStep = (stepIndex: number) => {
    if (scrollViewRef.current) {
      const itemHeight = 26; // Approximate height of each step item (text + margin)
      const scrollPosition = stepIndex * itemHeight;
      scrollViewRef.current.scrollTo({ y: scrollPosition, animated: true });
    }
  };

  useEffect(() => {
    const startGeneration = async () => {
      // Start progress animation immediately - will progress to 95% over 70 seconds, then wait for completion
      progress.value = withTiming(95, { 
        duration: 70000,
      });

      // Update percentage display every 100ms
      const percentageInterval = setInterval(() => {
        const currentProgress = progress.value;
        const displayPercentage = Math.min(100, Math.floor(currentProgress));
        setCurrentPercentage(displayPercentage);
        
        // Update status message based on progress (12 messages total)
        if (currentProgress >= 0 && currentProgress < 8) {
          setCurrentStatus(STATUS_MESSAGES[0]); // Reviewing your profile...
        } else if (currentProgress >= 8 && currentProgress < 16) {
          setCurrentStatus(STATUS_MESSAGES[1]); // Analyzing your team training schedule...
        } else if (currentProgress >= 16 && currentProgress < 24) {
          setCurrentStatus(STATUS_MESSAGES[2]); // Checking available equipment...
        } else if (currentProgress >= 24 && currentProgress < 32) {
          setCurrentStatus(STATUS_MESSAGES[3]); // Considering injury history...
        } else if (currentProgress >= 32 && currentProgress < 40) {
          setCurrentStatus(STATUS_MESSAGES[4]); // Calculating optimal training load...
        } else if (currentProgress >= 40 && currentProgress < 48) {
          setCurrentStatus(STATUS_MESSAGES[5]); // Designing early week sessions...
        } else if (currentProgress >= 48 && currentProgress < 56) {
          setCurrentStatus(STATUS_MESSAGES[6]); // Creating mid-week training...
        } else if (currentProgress >= 56 && currentProgress < 64) {
          setCurrentStatus(STATUS_MESSAGES[7]); // Planning weekend sessions...
        } else if (currentProgress >= 64 && currentProgress < 72) {
          setCurrentStatus(STATUS_MESSAGES[8]); // Optimizing recovery periods...
        } else if (currentProgress >= 72 && currentProgress < 80) {
          setCurrentStatus(STATUS_MESSAGES[9]); // Balancing training types...
        } else if (currentProgress >= 80 && currentProgress < 95) {
          setCurrentStatus(STATUS_MESSAGES[10]); // Finalizing your personalized plan...
        } else if (currentProgress >= 95) {
          setCurrentStatus(STATUS_MESSAGES[11]); // Almost ready...
        }
        
        if (currentProgress >= 100) {
          clearInterval(percentageInterval);
        }
      }, 100);

      // Check off items at specific time intervals (every 7 seconds) with auto-scroll
      setTimeout(() => {
        // Step 1: Analyzing your profile and goals
        haptics.light();
        scrollToStep(0);
        setSteps(prev => prev.map((step, index) => 
          index === 0 ? { ...step, checked: true } : step
        ));
      }, 7000);

      setTimeout(() => {
        // Step 2: Evaluating your team schedule
        haptics.light();
        scrollToStep(1);
        setSteps(prev => prev.map((step, index) => 
          index === 1 ? { ...step, checked: true } : step
        ));
      }, 14000);

      setTimeout(() => {
        // Step 3: Assessing gym access and equipment
        haptics.light();
        scrollToStep(2);
        setSteps(prev => prev.map((step, index) => 
          index === 2 ? { ...step, checked: true } : step
        ));
      }, 21000);

      setTimeout(() => {
        // Step 4: Reviewing injury history and limitations
        haptics.light();
        scrollToStep(3);
        setSteps(prev => prev.map((step, index) => 
          index === 3 ? { ...step, checked: true } : step
        ));
      }, 28000);

      setTimeout(() => {
        // Step 5: Calculating training load distribution
        haptics.light();
        scrollToStep(4);
        setSteps(prev => prev.map((step, index) => 
          index === 4 ? { ...step, checked: true } : step
        ));
      }, 35000);

      setTimeout(() => {
        // Step 6: Designing Monday-Wednesday sessions
        haptics.light();
        scrollToStep(5);
        setSteps(prev => prev.map((step, index) => 
          index === 5 ? { ...step, checked: true } : step
        ));
      }, 42000);

      setTimeout(() => {
        // Step 7: Designing Thursday-Sunday sessions
        haptics.light();
        scrollToStep(6);
        setSteps(prev => prev.map((step, index) => 
          index === 6 ? { ...step, checked: true } : step
        ));
      }, 49000);

      setTimeout(() => {
        // Step 8: Optimizing recovery periods
        haptics.light();
        scrollToStep(7);
        setSteps(prev => prev.map((step, index) => 
          index === 7 ? { ...step, checked: true } : step
        ));
      }, 56000);

      setTimeout(() => {
        // Step 9: Balancing field vs gym training
        haptics.light();
        scrollToStep(8);
        setSteps(prev => prev.map((step, index) => 
          index === 8 ? { ...step, checked: true } : step
        ));
      }, 63000);
    };

    const timer = setTimeout(startGeneration, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle completion when isComplete becomes true
  useEffect(() => {
    if (isComplete) {
      // Complete the final step (step 10: Finalizing weekly structure)
      setTimeout(() => {
        haptics.light();
        scrollToStep(9);
        setSteps(prev => prev.map((step, index) => 
          index === 9 ? { ...step, checked: true } : step
        ));
      }, 500);

      // Complete the progress bar
      setTimeout(() => {
        progress.value = withTiming(100, { duration: 1000 });
        setCurrentPercentage(100);
        setCurrentStatus(STATUS_MESSAGES[11]); // Almost ready...
      }, 700);

      // Call onComplete after animation finishes
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    }
  }, [isComplete, onComplete]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <Animated.View 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      entering={FadeIn.duration(300)}
    >
      <Animated.View 
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 32,
          width: '90%',
          maxWidth: 400,
          alignItems: 'center',
        }}
        entering={FadeInDown.duration(400).springify()}
      >
        {/* Football Icon */}
        <View style={{
          marginBottom: 20,
        }}>
          <Ionicons name="football" size={60} color="#4064F6" />
        </View>

        {/* Large Percentage Display */}
        <Text style={{
          fontSize: 48,
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#000',
          marginBottom: 16,
        }} allowFontScaling={false}>
          {currentPercentage}%
        </Text>

        {/* Main Title */}
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          textAlign: 'center',
          color: '#000',
          marginBottom: 8,
        }} allowFontScaling={false}>
          Generating Your Training Plan
        </Text>

        {/* Warning Message */}
        <Text style={{
          fontSize: 14,
          textAlign: 'center',
          color: '#666',
          marginBottom: 24,
        }} allowFontScaling={false}>
          This may take a few minutes
        </Text>

        {/* Progress Bar */}
        <View style={{
          width: '100%',
          height: 8,
          backgroundColor: '#E5E5E5',
          borderRadius: 4,
          marginBottom: 20,
          overflow: 'hidden',
        }}>
          <Animated.View style={[
            progressStyle,
            {
              height: '100%',
              borderRadius: 4,
              backgroundColor: '#4064F6',
            }
          ]} />
        </View>

        {/* Status Message */}
        <Text style={{
          fontSize: 16,
          textAlign: 'center',
          color: '#666',
          marginBottom: 24,
        }} allowFontScaling={false}>
          {currentStatus}
        </Text>

        {/* Blue Box with Generation Progress */}
        <View style={{
          backgroundColor: '#4064F6',
          borderRadius: 12,
          padding: 20,
          width: '100%',
          marginBottom: 20,
          maxHeight: 280, // Limit height to prevent overflow
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#FFFFFF',
            marginBottom: 16,
            textAlign: 'center',
          }} allowFontScaling={false}>
            Creating your personalized plan
          </Text>

          <ScrollView 
            ref={scrollViewRef}
            style={{ maxHeight: 200 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
          >
            {steps.map((step, index) => (
              <View 
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: index === steps.length - 1 ? 0 : 10,
                }}
              >
                <Text style={{
                  fontSize: 13,
                  color: '#FFFFFF',
                  marginRight: 8,
                }} allowFontScaling={false}>
                  •
                </Text>
                
                <Text style={{
                  fontSize: 13,
                  color: '#FFFFFF',
                  flex: 1,
                  lineHeight: 16,
                }} allowFontScaling={false}>
                  {step.text}
                </Text>

                {/* Checkmark */}
                <View style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: step.checked ? '#22C55E' : 'transparent',
                  borderWidth: step.checked ? 0 : 2,
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 8,
                }}>
                  {step.checked && (
                    <Text style={{
                      fontSize: 11,
                      color: '#FFFFFF',
                      fontWeight: 'bold',
                    }} allowFontScaling={false}>
                      ✓
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Bottom Message */}
        <Text style={{
          fontSize: 14,
          textAlign: 'center',
          color: '#666',
        }} allowFontScaling={false}>
          Please don't close the app while we generate your plan
        </Text>
      </Animated.View>
    </Animated.View>
  );
} 