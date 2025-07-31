import { View, Text, SafeAreaView } from 'react-native';
import Animated, { 
  FadeInRight, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';

import analyticsService from '../../services/analytics';
import { colors, typography } from '../../utils/theme';
import { useHaptics } from '../../utils/haptics';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';

const GENERATION_STEPS = [
  { text: 'Creating your macro goals', checked: false },
  { text: 'Setting up recovery plan generation', checked: false },
  { text: 'Customizing your weekly training plans', checked: false },
  { text: 'Setting up your Home Tab for all personalized metrics', checked: false },
];

const STATUS_MESSAGES = [
  'Applying BMR formula...',
  'Estimating your metabolic age...',
  'Calculating daily requirements...',
  'Finalizing results...',
  'Almost ready...'
];

export default function GeneratingProfileScreen() {
  const haptics = useHaptics();
  
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('generating-profile');
  
  const progress = useSharedValue(0);
  const [currentPercentage, setCurrentPercentage] = useState(0);
  const [currentStatus, setCurrentStatus] = useState(STATUS_MESSAGES[0]);
  const [steps, setSteps] = useState(GENERATION_STEPS);

  useEffect(() => {
    const startGeneration = async () => {
      // Total duration: 8 seconds (much slower like reference)
      const totalDuration = 8000;
      
             // Start progress animation
       progress.value = withTiming(100, { 
         duration: totalDuration,
       });

       // Navigate when animation completes
       setTimeout(async () => {
         await analyticsService.logEvent('A0_30_generating_profile');
         // NEW: Use automatic navigation instead of hardcoded route
         goToNext();
       }, totalDuration + 200);

             // Update percentage display every 100ms
       const percentageInterval = setInterval(() => {
         const currentProgress = progress.value;
         const displayPercentage = Math.min(100, Math.floor(currentProgress));
         
         // Ensure progress only moves forward
         setCurrentPercentage(prev => Math.max(prev, displayPercentage));
         
         // Update status message based on progress
         if (currentProgress >= 0 && currentProgress < 25) {
           setCurrentStatus(STATUS_MESSAGES[0]); // Applying BMR formula...
         } else if (currentProgress >= 25 && currentProgress < 45) {
           setCurrentStatus(STATUS_MESSAGES[1]); // Estimating metabolic age...
         } else if (currentProgress >= 45 && currentProgress < 70) {
           setCurrentStatus(STATUS_MESSAGES[2]); // Calculating daily requirements...
         } else if (currentProgress >= 70 && currentProgress < 90) {
           setCurrentStatus(STATUS_MESSAGES[3]); // Finalizing results...
         } else if (currentProgress >= 90) {
           setCurrentStatus(STATUS_MESSAGES[4]); // Almost ready...
         }
         
         if (currentProgress >= 100) {
           clearInterval(percentageInterval);
         }
       }, 100);

             // Check off items at specific percentage thresholds
       setTimeout(() => {
         // Check "Creating your macro goals" at ~25%
         haptics.light();
         setSteps(prev => prev.map((step, index) => 
           index === 0 ? { ...step, checked: true } : step
         ));
       }, 2000);

       setTimeout(() => {
         // Check "Setting up recovery plan generation" at ~45%
         haptics.light();
         setSteps(prev => prev.map((step, index) => 
           index === 1 ? { ...step, checked: true } : step
         ));
       }, 3600);

       setTimeout(() => {
         // Check "Customizing your weekly training plans" at ~70%
         haptics.light();
         setSteps(prev => prev.map((step, index) => 
           index === 2 ? { ...step, checked: true } : step
         ));
       }, 5600);

       setTimeout(() => {
         // Check "Setting up your Home Tab..." at ~90%
         haptics.light();
         setSteps(prev => prev.map((step, index) => 
           index === 3 ? { ...step, checked: true } : step
         ));
       }, 7200);


    };

    const timer = setTimeout(startGeneration, 500);
    return () => clearTimeout(timer);
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <Animated.View 
        entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{
          flex: 1,
          backgroundColor: colors.backgroundColor,
          paddingHorizontal: 24,
          paddingTop: 60, // Extra padding to replace header space
        }}
      >

        {/* Large Percentage Display */}
        <Text style={{
          fontSize: 80,
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#000',
          marginBottom: 20,
        }} allowFontScaling={false}>
          {currentPercentage}%
        </Text>

        {/* Main Title */}
        <Text style={[
          typography.title,
          {
            textAlign: 'center',
            marginBottom: 50,
            fontSize: 24,
          }
        ]} allowFontScaling={false}>
          We're setting everything{'\n'}up for you
        </Text>

        {/* Colorful Progress Bar */}
        <View style={{
          width: '100%',
          height: 8,
          backgroundColor: '#E5E5E5',
          borderRadius: 4,
          marginBottom: 24,
          overflow: 'hidden',
        }}>
          <Animated.View style={[
            progressStyle,
            {
              height: '100%',
              borderRadius: 4,
              backgroundColor: colors.brandBlue, // Brand blue to match header
            }
          ]} />
        </View>

        {/* Status Message */}
        <Text style={{
          fontSize: 18,
          textAlign: 'center',
          color: '#666',
          marginBottom: 24,
        }} allowFontScaling={false}>
          {currentStatus}
        </Text>

                 {/* Company Blue Box with Setup Progress */}
         <View style={{
           backgroundColor: colors.brandBlue,
           borderRadius: 16,
           padding: 24,
           marginBottom: 50,
         }}>
           <Text style={{
             fontSize: 18,
             fontWeight: '600',
             color: '#FFFFFF',
             marginBottom: 20,
           }} allowFontScaling={false}>
             Setting up your personalized experience
           </Text>

          {steps.map((step, index) => (
            <View 
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: index === steps.length - 1 ? 0 : 16,
              }}
            >
              <Text style={{
                fontSize: 16,
                color: '#FFFFFF',
                marginRight: 8,
              }} allowFontScaling={false}>
                •
              </Text>
              
              <Text style={{
                fontSize: 16,
                color: '#FFFFFF',
                flex: 1,
              }} allowFontScaling={false}>
                {step.text}
              </Text>

                             {/* Checkmark */}
               <View style={{
                 width: 24,
                 height: 24,
                 borderRadius: 12,
                 backgroundColor: step.checked ? '#22C55E' : 'transparent',
                 borderWidth: step.checked ? 0 : 2,
                 borderColor: 'rgba(255, 255, 255, 0.5)',
                 justifyContent: 'center',
                 alignItems: 'center',
               }}>
                {step.checked && (
                  <Text style={{
                    fontSize: 16,
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                  }} allowFontScaling={false}>
                    ✓
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Message */}
        <View style={{
          flex: 1,
          justifyContent: 'flex-end',
          paddingBottom: 40,
          alignItems: 'center',
        }}>
          <Text style={[
            typography.subtitle,
            {
              textAlign: 'center',
              fontSize: 14,
              color: colors.mediumGray,
            }
          ]}>
            This may take a moment...
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
} 