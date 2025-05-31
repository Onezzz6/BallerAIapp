import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, StatusBar, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing,
  useAnimatedProps,
  interpolate,
  withRepeat,
  withSequence
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { width: screenWidth } = Dimensions.get('window');

interface FoodAnalysisScreenProps {
  visible: boolean;
  imageUri: string;
  onAnalysisComplete?: () => void;
}

const analysisSteps = [
  { text: "Identifying items...", duration: 2000 },
  { text: "Comparing to our database...", duration: 2500 },
  { text: "Calculating nutrition values...", duration: 2000 },
  { text: "Finalizing results...", duration: 1500 }
];

export default function FoodAnalysisScreen({ visible, imageUri, onAnalysisComplete }: FoodAnalysisScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const progress = useSharedValue(0);
  
  // Animation values for placeholder lines
  const shimmerPosition = useSharedValue(0);
  const lineWidth1 = useSharedValue(0.7);
  const lineWidth2 = useSharedValue(0.5);
  const lineWidth3 = useSharedValue(0.6);
  
  // Total duration for all steps
  const totalDuration = analysisSteps.reduce((sum, step) => sum + step.duration, 0);

  useEffect(() => {
    if (visible) {
      // Reset values
      setCurrentStep(0);
      setDisplayPercentage(0);
      setIsComplete(false);
      progress.value = 0;
      
      // Calculate the interval needed to reach 99% in the total duration
      // We need to go from 0 to 99 in totalDuration milliseconds
      const incrementInterval = totalDuration / 99; // Time per 1% increment
      
      // Percentage counter animation - increment by 1 to match circular progress
      const percentageInterval = setInterval(() => {
        setDisplayPercentage(prev => {
          if (prev >= 99) {
            clearInterval(percentageInterval);
            return 99; // Cap at 99% until analysis is complete
          }
          return prev + 1;
        });
      }, incrementInterval);
      
      // Start shimmer animation
      shimmerPosition.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      );
      
      // Animate line widths
      lineWidth1.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1000 }),
          withTiming(0.6, { duration: 1000 })
        ),
        -1,
        true
      );
      
      lineWidth2.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1200 }),
          withTiming(0.4, { duration: 1200 })
        ),
        -1,
        true
      );
      
      lineWidth3.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 800 }),
          withTiming(0.5, { duration: 800 })
        ),
        -1,
        true
      );
      
      // Animate progress from 0 to 0.99 (99%)
      progress.value = withTiming(0.99, {
        duration: totalDuration,
        easing: Easing.linear
      });
      
      // Cycle through steps
      let currentTime = 0;
      const timeouts: NodeJS.Timeout[] = [];
      
      analysisSteps.forEach((step, index) => {
        const timeout = setTimeout(() => {
          setCurrentStep(index);
        }, currentTime);
        timeouts.push(timeout);
        currentTime += step.duration;
      });
      
      // Call completion callback if provided
      if (onAnalysisComplete) {
        const completionTimeout = setTimeout(() => {
          // Set to 100% right before completion
          setDisplayPercentage(100);
          progress.value = 1;
          setIsComplete(true);
          
          // Small delay to show 100% before closing
          setTimeout(() => {
            onAnalysisComplete();
          }, 200);
        }, totalDuration);
        timeouts.push(completionTimeout);
      }
      
      return () => {
        clearInterval(percentageInterval);
        timeouts.forEach(timeout => clearTimeout(timeout));
      };
    }
  }, [visible, totalDuration, onAnalysisComplete]);

  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(
      progress.value,
      [0, 1],
      [2 * Math.PI * 40, 0]
    );
    
    return {
      strokeDashoffset
    };
  });

  const percentageStyle = useAnimatedStyle(() => {
    const percentage = Math.round(progress.value * 100);
    return {
      opacity: 1
    };
  });
  
  // Animated styles for placeholder lines
  const animatedLine1Style = useAnimatedStyle(() => {
    return {
      width: `${lineWidth1.value * 100}%`,
      opacity: interpolate(shimmerPosition.value, [0, 0.5, 1], [0.5, 1, 0.5])
    };
  });
  
  const animatedLine2Style = useAnimatedStyle(() => {
    return {
      width: lineWidth2.value * 120,
      opacity: interpolate(shimmerPosition.value, [0, 0.5, 1], [0.7, 0.5, 0.7])
    };
  });
  
  const animatedLine3Style = useAnimatedStyle(() => {
    return {
      width: lineWidth3.value * 100,
      opacity: interpolate(shimmerPosition.value, [0, 0.5, 1], [0.6, 0.8, 0.6])
    };
  });

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Position in the logged meals area */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logged Today header */}
        <Text style={styles.loggedTodayTitle}>Analyzing...</Text>
        
        {/* Analysis card positioned where meals get logged */}
        <Animated.View 
          style={styles.analysisCard}
          entering={FadeIn.duration(400)}
        >
          {/* Left side - Greyed out photo with progress */}
          <View style={styles.photoSection}>
            <Image source={{ uri: imageUri }} style={styles.photo} />
            <View style={styles.photoOverlay} />
            
            {/* Circular progress over the photo */}
            <View style={styles.progressContainer}>
              <Svg width={90} height={90} style={styles.progressSvg}>
                {/* Background circle */}
                <Circle
                  cx={45}
                  cy={45}
                  r={40}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth={6}
                  fill="transparent"
                />
                {/* Progress circle */}
                <AnimatedCircle
                  cx={45}
                  cy={45}
                  r={40}
                  stroke="#FFFFFF"
                  strokeWidth={6}
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  animatedProps={animatedCircleProps}
                  transform="rotate(-90 45 45)"
                />
              </Svg>
              <Animated.Text style={[styles.percentageText, percentageStyle]}>
                {`${displayPercentage}%`}
              </Animated.Text>
            </View>
          </View>

          {/* Right side - Content with animated placeholders */}
          <View style={styles.contentSection}>
            {/* Step text */}
            <Animated.Text 
              key={currentStep}
              style={styles.stepText}
              entering={FadeIn.duration(300)}
            >
              {analysisSteps[currentStep]?.text || "Processing..."}
            </Animated.Text>
            
            {/* Animated placeholder lines */}
            <View style={styles.placeholderContainer}>
              <Animated.View style={[styles.placeholderLine, animatedLine1Style]} />
              <Animated.View style={[styles.placeholderLine, styles.secondLine, animatedLine2Style]} />
            </View>

            {/* Animated macro placeholders */}
            <View style={styles.macrosRow}>
              <View style={styles.macroPlaceholder}>
                <View style={styles.macroIcon} />
                <Animated.View style={[styles.placeholderLine, styles.macroLine, animatedLine3Style]} />
              </View>
              <View style={styles.macroPlaceholder}>
                <View style={styles.macroIcon} />
                <Animated.View style={[styles.placeholderLine, styles.macroLine, animatedLine2Style]} />
              </View>
              <View style={styles.macroPlaceholder}>
                <View style={styles.macroIcon} />
                <Animated.View style={[styles.placeholderLine, styles.macroLine, animatedLine1Style]} />
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    zIndex: 1000,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 340, // Position below the nutrition header and stats
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  loggedTodayTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  analysisCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    minHeight: 140,
  },
  photoSection: {
    width: 140,
    height: 140,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSvg: {
    position: 'absolute',
  },
  percentageText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contentSection: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 14,
    color: '#4064F6',
    fontWeight: '600',
    marginBottom: 12,
  },
  placeholderContainer: {
    marginBottom: 16,
  },
  placeholderLine: {
    height: 12,
    backgroundColor: '#E8E8E8',
    borderRadius: 6,
  },
  secondLine: {
    marginTop: 8,
    height: 10,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 16,
  },
  macroPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E8E8E8',
  },
  macroLine: {
    height: 10,
  },
}); 