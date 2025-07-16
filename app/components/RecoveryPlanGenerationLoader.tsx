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
  { text: 'Analyzing your recovery metrics', checked: false },
  { text: 'Evaluating soreness and fatigue levels', checked: false },
  { text: 'Assessing available recovery tools', checked: false },
  { text: 'Considering sleep quality and mood', checked: false },
  { text: 'Calculating optimal recovery duration', checked: false },
  { text: 'Selecting most effective tools', checked: false },
  { text: 'Designing recovery sequence', checked: false },
  { text: 'Optimizing tool compatibility', checked: false },
  { text: 'Finalizing recovery protocol', checked: false },
];

const STATUS_MESSAGES = [
  'Reviewing your recovery metrics...',
  'Analyzing soreness and fatigue levels...',
  'Checking available recovery tools...',
  'Considering sleep quality and mood...',
  'Calculating optimal recovery duration...',
  'Selecting most effective tools...',
  'Designing recovery sequence...',
  'Optimizing tool compatibility...',
  'Finalizing recovery protocol...',
  'Almost ready...'
];

interface RecoveryPlanGenerationLoaderProps {
  onComplete?: () => void;
  isComplete?: boolean;
}

export default function RecoveryPlanGenerationLoader({ onComplete, isComplete }: RecoveryPlanGenerationLoaderProps) {
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
      // Start with 0% → 1% in 0.5 seconds, then continue to 99% over 30 seconds
      progress.value = withTiming(1, { 
        duration: 500, // 0.5 seconds to reach 1%
      }, () => {
        // After reaching 1%, continue to 99% over 30 seconds
        progress.value = withTiming(99, { 
          duration: 30000, // 30 seconds to reach 99%
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
        
        // Update status message based on progress (10 messages total)
        if (currentProgress >= 0 && currentProgress < 11) {
          setCurrentStatus(STATUS_MESSAGES[0]); // Reviewing your recovery metrics...
        } else if (currentProgress >= 11 && currentProgress < 22) {
          setCurrentStatus(STATUS_MESSAGES[1]); // Analyzing soreness and fatigue levels...
        } else if (currentProgress >= 22 && currentProgress < 33) {
          setCurrentStatus(STATUS_MESSAGES[2]); // Checking available recovery tools...
        } else if (currentProgress >= 33 && currentProgress < 44) {
          setCurrentStatus(STATUS_MESSAGES[3]); // Considering sleep quality and mood...
        } else if (currentProgress >= 44 && currentProgress < 55) {
          setCurrentStatus(STATUS_MESSAGES[4]); // Calculating optimal recovery duration...
        } else if (currentProgress >= 55 && currentProgress < 66) {
          setCurrentStatus(STATUS_MESSAGES[5]); // Selecting most effective tools...
        } else if (currentProgress >= 66 && currentProgress < 77) {
          setCurrentStatus(STATUS_MESSAGES[6]); // Designing recovery sequence...
        } else if (currentProgress >= 77 && currentProgress < 88) {
          setCurrentStatus(STATUS_MESSAGES[7]); // Optimizing tool compatibility...
        } else if (currentProgress >= 88 && currentProgress < 99) {
          setCurrentStatus(STATUS_MESSAGES[8]); // Finalizing recovery protocol...
        } else if (currentProgress >= 99) {
          setCurrentStatus(STATUS_MESSAGES[9]); // Almost ready...
        }
      }, 100);

      // Check off items at specific time intervals (every 3.3 seconds) with auto-scroll
      setTimeout(() => {
        // Step 1: Analyzing your recovery metrics
        haptics.light();
        scrollToStep(0);
        setSteps(prev => prev.map((step, index) => 
          index === 0 ? { ...step, checked: true } : step
        ));
      }, 3300);

      setTimeout(() => {
        // Step 2: Evaluating soreness and fatigue levels
        haptics.light();
        scrollToStep(1);
        setSteps(prev => prev.map((step, index) => 
          index === 1 ? { ...step, checked: true } : step
        ));
      }, 6600);

      setTimeout(() => {
        // Step 3: Assessing available recovery tools
        haptics.light();
        scrollToStep(2);
        setSteps(prev => prev.map((step, index) => 
          index === 2 ? { ...step, checked: true } : step
        ));
      }, 9900);

      setTimeout(() => {
        // Step 4: Considering sleep quality and mood
        haptics.light();
        scrollToStep(3);
        setSteps(prev => prev.map((step, index) => 
          index === 3 ? { ...step, checked: true } : step
        ));
      }, 13200);

      setTimeout(() => {
        // Step 5: Calculating optimal recovery duration
        haptics.light();
        scrollToStep(4);
        setSteps(prev => prev.map((step, index) => 
          index === 4 ? { ...step, checked: true } : step
        ));
      }, 16500);

      setTimeout(() => {
        // Step 6: Selecting most effective tools
        haptics.light();
        scrollToStep(5);
        setSteps(prev => prev.map((step, index) => 
          index === 5 ? { ...step, checked: true } : step
        ));
      }, 19800);

      setTimeout(() => {
        // Step 7: Designing recovery sequence
        haptics.light();
        scrollToStep(6);
        setSteps(prev => prev.map((step, index) => 
          index === 6 ? { ...step, checked: true } : step
        ));
      }, 23100);

      setTimeout(() => {
        // Step 8: Optimizing tool compatibility
        haptics.light();
        scrollToStep(7);
        setSteps(prev => prev.map((step, index) => 
          index === 7 ? { ...step, checked: true } : step
        ));
      }, 26400);
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
      // Complete the final step (step 9: Finalizing recovery protocol)
      setTimeout(() => {
        haptics.light();
        scrollToStep(8);
        setSteps(prev => prev.map((step, index) => 
          index === 8 ? { ...step, checked: true } : step
        ));
      }, 500);
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
      setCurrentStatus(STATUS_MESSAGES[9]); // Almost ready...
      
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
        {/* Recovery Icon - Removed the refresh icon */}
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
          Generating Your Recovery Plan
        </Text>

        {/* Warning Message */}
        <Text style={{
          fontSize: 14,
          textAlign: 'center',
          color: '#666',
          marginBottom: 24,
        }} allowFontScaling={false}>
          This may take a moment
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
            Creating your personalized recovery plan
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