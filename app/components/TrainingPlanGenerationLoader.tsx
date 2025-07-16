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
  
  const progress = useSharedValue(0);
  const [currentPercentage, setCurrentPercentage] = useState(0);
  const [currentStatus, setCurrentStatus] = useState(STATUS_MESSAGES[0]);
  const [steps, setSteps] = useState(GENERATION_STEPS);
  const [startTime] = useState(Date.now());
  const [hasReached99, setHasReached99] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [maxPercentageReached, setMaxPercentageReached] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to scroll smartly - only when needed to reveal new steps
  const scrollToRevealStep = (stepIndex: number) => {
    if (scrollViewRef.current) {
      const itemHeight = 26; // Approximate height of each step item (text + margin)
      const containerHeight = 200; // Max height of the scroll container
      const visibleItems = Math.floor(containerHeight / itemHeight); // About 7-8 items visible
      
      // Only scroll if the step is outside the visible area
      if (stepIndex >= visibleItems) {
        const scrollPosition = (stepIndex - visibleItems + 1) * itemHeight;
        scrollViewRef.current.scrollTo({ y: scrollPosition, animated: true });
      }
    }
  };

  useEffect(() => {
    const startGeneration = async () => {
      // Start with 0% → 1% in 0.5 seconds, then continue to 99% over 42 seconds
      progress.value = withTiming(1, { 
        duration: 500, // 0.5 seconds to reach 1%
      }, () => {
        // After reaching 1%, continue to 99% over 42 seconds
        progress.value = withTiming(99, { 
          duration: 42000, // 42 seconds to reach 99%
        });
      });

      // Update percentage display every 100ms
      intervalRef.current = setInterval(() => {
        const currentProgress = progress.value;
        
        // Calculate display percentage (never go backwards)
        const progressPercentage = Math.min(99, Math.floor(currentProgress)); // Cap at 99% during animation
        const newPercentage = Math.max(maxPercentageReached, progressPercentage);
        
        // Only update if we're moving forward
        if (newPercentage > maxPercentageReached) {
          setMaxPercentageReached(newPercentage);
          setCurrentPercentage(newPercentage);
        }
        
        // Track when we reach 99%
        if (currentProgress >= 99 && !hasReached99) {
          setHasReached99(true);
        }
        
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
        } else if (currentProgress >= 80 && currentProgress < 99) {
          setCurrentStatus(STATUS_MESSAGES[10]); // Finalizing your personalized plan...
        } else if (currentProgress >= 99) {
          setCurrentStatus(STATUS_MESSAGES[11]); // Almost ready...
        }
      }, 100);

      // Complete steps in correct order with better timing distribution
      const completeStep = (stepIndex: number, delay: number) => {
        setTimeout(() => {
          haptics.light();
          scrollToRevealStep(stepIndex);
          setSteps(prev => prev.map((step, index) => 
            index === stepIndex ? { ...step, checked: true } : step
          ));
        }, delay);
      };

      // Complete steps in sequence over 42 seconds (0.5s to 42s)
      completeStep(0, 3000);   // Step 1: Analyzing your profile and goals - 3s
      completeStep(1, 6000);   // Step 2: Evaluating your team schedule - 6s
      completeStep(2, 9000);   // Step 3: Assessing gym access and equipment - 9s
      completeStep(3, 13000);  // Step 4: Reviewing injury history and limitations - 13s
      completeStep(4, 17000);  // Step 5: Calculating training load distribution - 17s
      completeStep(5, 22000);  // Step 6: Designing Monday-Wednesday sessions - 22s
      completeStep(6, 27000);  // Step 7: Designing Thursday-Sunday sessions - 27s
      completeStep(7, 32000);  // Step 8: Optimizing recovery periods - 32s
      completeStep(8, 37000);  // Step 9: Balancing field vs gym training - 37s
      completeStep(9, 40000);  // Step 10: Finalizing weekly structure - 40s (last step)
    };

    const timer = setTimeout(startGeneration, 100);
    return () => {
      clearTimeout(timer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle completion when isComplete becomes true
  useEffect(() => {
    if (isComplete) {
      // Final step is already completed by the timed sequence
      // No need to complete it again here
    }
  }, [isComplete]);

  // Handle final completion when both conditions are met
  useEffect(() => {
    if (isComplete && hasReached99 && !isCompleting) {
      // Both conditions met: plan is ready AND we've reached 99%
      // Start the completion phase
      setIsCompleting(true);
      
      // Stop the interval to prevent any conflicts
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Clean transition to 100%
      setCurrentPercentage(100);
      setMaxPercentageReached(100);
      setCurrentStatus(STATUS_MESSAGES[11]); // Almost ready...
      
      // Stay at 100% for exactly 0.7 seconds, then complete
      setTimeout(() => {
        onComplete?.();
      }, 700);
    }
  }, [isComplete, hasReached99, isCompleting, onComplete]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${currentPercentage}%`,
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
        {/* Training Icon - Removed the football icon */}
        <View style={{
          marginBottom: 20,
        }}>
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