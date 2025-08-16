import { View, Text, ScrollView, Platform } from 'react-native';
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
import { useHaptics } from '../../utils/haptics';

// Safe animation helper to prevent null pointer crashes in production
const safeAnimation = (animation: any) => {
  try {
    return animation || undefined;
  } catch (error) {
    console.warn('Animation failed safely:', error);
    return undefined;
  }
};

const GENERATION_STEPS = [
  { text: 'Analyzing your recovery metrics', checked: false },
  { text: 'Calculating your training load', checked: false },
  { text: 'Assessing available recovery tools', checked: false },
  { text: 'Considering sleep amount', checked: false },
  { text: 'Calculating recovery duration', checked: false },
  { text: 'Selecting most effective tools', checked: false },
  { text: 'Designing recovery sequence', checked: false },
  { text: 'Optimizing tool compatibility', checked: false },
  { text: 'Finalizing recovery protocol', checked: false },
];

const STATUS_MESSAGES = [
  'Reviewing your recovery metrics...',
  'Calculating your training load...',
  'Analyzing recovery questions...',
  'Checking available equipment...',
  'Considering sleep amount...',
  'Calculating recovery duration...',
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
  
  // Animation gate to prevent Android release crashes
  const isAndroidRelease = Platform.OS === 'android' && !__DEV__;
  const [canAnimate, setCanAnimate] = useState(!isAndroidRelease);

  useEffect(() => {
    if (!isAndroidRelease) return;
    // Two RAFs = after initial layout/measure
    let id1: number, id2: number;
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setCanAnimate(true));
    });
    return () => {
      if (id1) cancelAnimationFrame(id1);
      if (id2) cancelAnimationFrame(id2);
    };
  }, [isAndroidRelease]);

  // Helper to defer animations on Android release
  const enter = (anim: any) => (canAnimate ? safeAnimation(anim) : undefined);
  
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
        
        // Update status message based on progress (11 messages total)
        if (currentProgress >= 0 && currentProgress < 9) {
          setCurrentStatus(STATUS_MESSAGES[0]); // Reviewing your recovery metrics...
        } else if (currentProgress >= 9 && currentProgress < 18) {
          setCurrentStatus(STATUS_MESSAGES[1]); // Calculating your training load...
        } else if (currentProgress >= 18 && currentProgress < 27) {
          setCurrentStatus(STATUS_MESSAGES[2]); // Analyzing soreness and fatigue levels...
        } else if (currentProgress >= 27 && currentProgress < 36) {
          setCurrentStatus(STATUS_MESSAGES[3]); // Checking available recovery tools...
        } else if (currentProgress >= 36 && currentProgress < 45) {
          setCurrentStatus(STATUS_MESSAGES[4]); // Considering sleep amount...
        } else if (currentProgress >= 45 && currentProgress < 54) {
          setCurrentStatus(STATUS_MESSAGES[5]); // Calculating optimal recovery duration...
        } else if (currentProgress >= 54 && currentProgress < 63) {
          setCurrentStatus(STATUS_MESSAGES[6]); // Selecting most effective tools...
        } else if (currentProgress >= 63 && currentProgress < 72) {
          setCurrentStatus(STATUS_MESSAGES[7]); // Designing recovery sequence...
        } else if (currentProgress >= 72 && currentProgress < 81) {
          setCurrentStatus(STATUS_MESSAGES[8]); // Optimizing tool compatibility...
        } else if (currentProgress >= 81 && currentProgress < 99) {
          setCurrentStatus(STATUS_MESSAGES[9]); // Finalizing recovery protocol...
        } else if (currentProgress >= 99) {
          setCurrentStatus(STATUS_MESSAGES[10]); // Almost ready...
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

      // Complete steps in sequence over 30 seconds (0.5s to 30s)
      completeStep(0, 2000);   // Step 1: Analyzing your recovery metrics - 2s
      completeStep(1, 4000);   // Step 2: Calculating your training load - 4s
      completeStep(2, 7000);   // Step 3: Evaluating soreness and fatigue levels - 7s
      completeStep(3, 10000);  // Step 4: Assessing available recovery tools - 10s
      completeStep(4, 13000);  // Step 5: Considering sleep amount - 13s
      completeStep(5, 16000);  // Step 6: Calculating optimal recovery duration - 16s
      completeStep(6, 20000);  // Step 7: Selecting most effective tools - 20s
      completeStep(7, 24000);  // Step 8: Designing recovery sequence - 24s
      completeStep(8, 27000);  // Step 9: Optimizing tool compatibility - 27s
      completeStep(9, 29000);  // Step 10: Finalizing recovery protocol - 29s (last step)
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
      entering={enter(FadeIn.duration(300))}
    >
      <Animated.View 
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 24,
          width: '90%',
          maxWidth: 400,
          alignItems: 'center',
        }}
        entering={enter(FadeInDown.duration(400).springify())}
      >
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
          Generating Plan
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
          maxHeight: 320, // Limit height to prevent overflow
        }}>
          <ScrollView 
            ref={scrollViewRef}
            style={{ maxHeight: 320 }}
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
          This may take a few minutes. Please don't close the app while we generate your recovery plan
        </Text>
      </Animated.View>
    </Animated.View>
  );
} 