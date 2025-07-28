import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Dimensions,
  useColorScheme,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  runOnJS,
  useDerivedValue,
  interpolate,
  withDelay,
  FadeInRight,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Path,
  Rect,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Mask,
} from 'react-native-svg';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import Button from '../components/Button';
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import analyticsService from '../services/analytics';

const { width: SCREEN_W } = Dimensions.get('window');

// Removed path length estimation - using coordinate-based clipping instead

/*─────────────────────  Development Chart  ─────────────────────*/
function DevelopmentChart({
  width,
  height,
  onAnimationComplete,
}: {
  width: number;
  height: number;
  onAnimationComplete: () => void;
}) {
  const startY = height - 40;
  const endY = height * 0.2;
  const endLineX = width - 15; // End line position

  // Calculate milestone positions on the exponential curve
  const getMilestoneOnCurve = (xPercent: number) => {
    const x = 20 + (endLineX - 20) * xPercent; // Use endLineX for consistency
    const t = (x - 20) / (endLineX - 20); // normalize to 0-1 using endLineX
    const k = 3; // same steepness as the curve
    const totalHeight = startY - endY;
    const exponentialProgress = (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
    const y = startY - totalHeight * exponentialProgress;
    return { x, y };
  };

  const milestone1 = getMilestoneOnCurve(0.35); // 3 days
  const milestone2 = getMilestoneOnCurve(0.65); // 7 days
  const milestone3 = getMilestoneOnCurve(0.9);  // 30 days

  // Create simple exponential curve - no waves, just gets steeper and steeper
  const buildProgressPath = () => {
    const samples = 29; // Use 29 samples so the 30th point is exactly at endLineX
    const step = (endLineX - 20) / samples;
    let d = `M20,${startY}`;
    
    for (let i = 1; i <= samples; i++) {
      const t = i / samples; // 0 to 1
      const x = 20 + step * i;
      // Exponential curve: y = start - (totalHeight * (e^(k*t) - 1) / (e^k - 1))
      const k = 3; // steepness factor
      const totalHeight = startY - endY;
      const exponentialProgress = (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
      const y = startY - totalHeight * exponentialProgress;
      d += ` L${x.toFixed(2)},${y.toFixed(2)}`;
    }
    // Final point exactly at the end line position to eliminate gap
    d += ` L${endLineX},${endY}`;
    return d;
  };

  const progressPath = buildProgressPath();
  
  const progress = useSharedValue(0);
  const hasCompleted = useSharedValue(false); // Guard to prevent multiple calls

  // Use animated values for everything to avoid React re-renders during animation
  const startLabelOpacity = useSharedValue(0.001);
  const label3DaysOpacity = useSharedValue(0.001);
  const label7DaysOpacity = useSharedValue(0.001);
  const label30DaysOpacity = useSharedValue(0.001);
  const ball1Opacity = useSharedValue(0.001);
  const ball2Opacity = useSharedValue(0.001);
  const ball3Opacity = useSharedValue(0.001);

  // Animated components
  const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);
  const AnimatedRect = Animated.createAnimatedComponent(Rect);
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  // Animated clipping that advances with the line (perfectly synchronized)
  const animatedClipWidth = useAnimatedProps(() => ({
    width: (endLineX - 20) * progress.value, // Grows from 0 to full width
  }));

  // Use same coordinate-based clipping for the path to ensure perfect sync
  const animatedPathClipWidth = useAnimatedProps(() => ({
    width: (endLineX - 20) * progress.value, // Same as curtain clipping
  }));

  // Calculate exact progress values for when line reaches each milestone
  const milestone1Progress = 0.35; // milestone1 is at 35% of the total line
  const milestone2Progress = 0.65; // milestone2 is at 65% of the total line  
  const milestone3Progress = 0.9;  // milestone3 is at 90% of the total line

  // Use delays with animated values to avoid any React re-renders
  useEffect(() => {
    // Calculate timing based on animation duration and milestones
    const animationDuration = 1750; // Same as progress animation
    const delayStart = 200; // Same as progress animation delay
    
    // Account for Easing.in(Easing.quad) - need to find inverse of t^2
    // For milestone at progress p, actual time t where t^2 = p, so t = sqrt(p)
    const startTime = delayStart + (Math.sqrt(0.05) * animationDuration);
    const milestone1Time = delayStart + (Math.sqrt(milestone1Progress) * animationDuration);
    const milestone2Time = delayStart + (Math.sqrt(milestone2Progress) * animationDuration);
    const milestone3Time = delayStart + (Math.sqrt(milestone3Progress) * animationDuration);
    
    // Use timeouts to animate opacity values instead of changing React state
    const startTimer = setTimeout(() => {
      startLabelOpacity.value = withTiming(1, { duration: 200 });
    }, startTime);
    const timer1 = setTimeout(() => {
      label3DaysOpacity.value = withTiming(1, { duration: 200 });
      ball1Opacity.value = withTiming(1, { duration: 200 });
    }, milestone1Time);
    const timer2 = setTimeout(() => {
      label7DaysOpacity.value = withTiming(1, { duration: 200 });
      ball2Opacity.value = withTiming(1, { duration: 200 });
    }, milestone2Time);
    const timer3 = setTimeout(() => {
      label30DaysOpacity.value = withTiming(1, { duration: 200 });
      ball3Opacity.value = withTiming(1, { duration: 200 });
    }, milestone3Time);
    
    return () => {
      clearTimeout(startTimer);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // Signal completion (only once)
  useDerivedValue(() => {
    if (progress.value >= 0.95 && !hasCompleted.value) {
      hasCompleted.value = true;
      runOnJS(onAnimationComplete)();
    }
  });

  // Start animation with accelerating speed for dramatic effect
  useEffect(() => {
    // Start slow then accelerate - matches the exponential curve concept
    progress.value = withDelay(200, withTiming(1, { 
      duration: 1750, // About half the previous duration for faster overall
      easing: Easing.in(Easing.quad) // Starts slow, accelerates toward end
    }));
  }, []);

  const cardBg = '#F8F8F8';

  return (
    <Svg width={width} height={height}>
      {/* Card background */}
      <Rect x="0" y="0" width={width} height={height} rx="16" fill={cardBg} />
      
      {/* Title */}
      <SvgText x="20" y="35" fontSize="18" fontWeight="600" fill={colors.black}>
        Your Progress
      </SvgText>

             {/* Defs for gradients and clipping */}
       <Defs>
         <LinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
           <Stop offset="0%" stopColor="rgba(153, 232, 108, 0.6)" />
           <Stop offset="100%" stopColor={colors.brandGreen} />
         </LinearGradient>
         
         {/* Gradient for curtain 1 with soft edges */}
         <LinearGradient id="curtain1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
           <Stop offset="0%" stopColor="rgba(255, 107, 107, 0.4)" />
           <Stop offset="80%" stopColor="rgba(255, 107, 107, 0.3)" />
           <Stop offset="100%" stopColor="rgba(255, 150, 120, 0.2)" />
         </LinearGradient>
         
         {/* Gradient for curtain 2 with blended edges */}
         <LinearGradient id="curtain2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
           <Stop offset="0%" stopColor="rgba(255, 150, 120, 0.2)" />
           <Stop offset="20%" stopColor="rgba(255, 193, 7, 0.35)" />
           <Stop offset="80%" stopColor="rgba(255, 193, 7, 0.35)" />
           <Stop offset="100%" stopColor="rgba(150, 200, 50, 0.25)" />
         </LinearGradient>
         
         {/* Gradient for curtain 3 with smooth transition */}
         <LinearGradient id="curtain3Grad" x1="0%" y1="0%" x2="100%" y2="0%">
           <Stop offset="0%" stopColor="rgba(150, 200, 50, 0.25)" />
           <Stop offset="30%" stopColor="rgba(153, 232, 108, 0.35)" />
           <Stop offset="100%" stopColor="rgba(153, 232, 108, 0.3)" />
         </LinearGradient>

         {/* Mask that advances with progress - more reliable on Android */}
         <Mask id="progressMask">
           <Rect x="0" y="0" width={width} height={height} fill="black" />
           <AnimatedRect x="20" y="0" height={height} fill="white" animatedProps={animatedClipWidth} />
         </Mask>
         
         {/* Separate mask for the line (same progression) */}
         <Mask id="lineMask">
           <Rect x="0" y="0" width={width} height={height} fill="black" />
           <AnimatedRect x="20" y="0" height={height} fill="white" animatedProps={animatedPathClipWidth} />
         </Mask>
       </Defs>

       {/* Bottom baseline - black line level with start */}
       <Path
         d={`M20,${startY} L${endLineX},${startY}`}
         stroke="#000000"
         strokeWidth="2"
         fill="none"
       />

       {/* End line - vertical black line */}
       <Path
         d={`M${endLineX},${startY} L${endLineX},${endY}`}
         stroke="#000000"
         strokeWidth="2"
         fill="none"
       />

       {/* Curtain sections under the curve */}
       {/* Section 1: Start to 3 Days - Foundation phase (red gradient) */}
       <Path
         d={(() => {
           const bottomY = startY;
           let path = `M20,${bottomY} L20,${startY}`;
           const samples = 10;
           const endX = milestone1.x;
           const step = (endX - 20) / samples;
           for (let i = 1; i <= samples; i++) {
             const x = 20 + step * i;
             const t = (x - 20) / (endLineX - 20);
             const k = 3;
             const totalHeight = startY - endY;
             const exponentialProgress = (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
             const y = startY - totalHeight * exponentialProgress;
             path += ` L${x.toFixed(2)},${y.toFixed(2)}`;
           }
           path += ` L${endX},${bottomY} L20,${bottomY} Z`;
           return path;
         })()}
         fill="url(#curtain1Grad)"
         stroke="none"
         mask="url(#progressMask)"
       />
       
       {/* Section 2: 3 Days to 7 Days - Building momentum (blended gradient) */}
       <Path
         d={(() => {
           const bottomY = startY;
           const startX = milestone1.x;
           const endX = milestone2.x;
           let path = `M${startX},${bottomY} L${startX},${milestone1.y}`;
           const samples = 8;
           const step = (endX - startX) / samples;
           for (let i = 1; i <= samples; i++) {
             const x = startX + step * i;
             const t = (x - 20) / (endLineX - 20);
             const k = 3;
             const totalHeight = startY - endY;
             const exponentialProgress = (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
             const y = startY - totalHeight * exponentialProgress;
             path += ` L${x.toFixed(2)},${y.toFixed(2)}`;
           }
           path += ` L${endX},${bottomY} L${startX},${bottomY} Z`;
           return path;
         })()}
         fill="url(#curtain2Grad)"
         stroke="none"
         mask="url(#progressMask)"
       />
       
       {/* Section 3: 7 Days to End - Exponential growth (smooth green gradient) */}
       <Path
         d={(() => {
           const bottomY = startY;
           const startX = milestone2.x;
           let path = `M${startX},${bottomY} L${startX},${milestone2.y}`;
           
           // Continue the curve from milestone2 to milestone3
           const samples1 = 6;
           const step1 = (milestone3.x - startX) / samples1;
           for (let i = 1; i <= samples1; i++) {
             const x = startX + step1 * i;
             const t = (x - 20) / (endLineX - 20);
             const k = 3;
             const totalHeight = startY - endY;
             const exponentialProgress = (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
             const y = startY - totalHeight * exponentialProgress;
             path += ` L${x.toFixed(2)},${y.toFixed(2)}`;
           }
           
           // Continue from milestone3 to end line (flat at endY level)
           path += ` L${endLineX},${endY}`;
           path += ` L${endLineX},${bottomY} L${startX},${bottomY} Z`;
           return path;
         })()}
         fill="url(#curtain3Grad)"
         stroke="none"
         mask="url(#progressMask)"
       />

      {/* Grid lines */}
      {[height * 0.3, height * 0.5, height * 0.7].map((y, i) => (
        <Path
          key={i}
          d={`M20,${y} L${width - 20},${y}`}
          stroke={colors.lightGray}
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      ))}

       {/* Animated progress path */}
       <Path
         d={progressPath}
         stroke="#000000"
         strokeWidth="2"
         fill="none"
         strokeLinecap="butt"
         mask="url(#lineMask)"
       />

       {/* Start point */}
       <Circle cx="20" cy={startY} r="5" fill={colors.white} stroke="#000000" strokeWidth="2" />

       {/* Progressive milestone markers - animated opacity */}
       <AnimatedCircle 
         cx={milestone1.x} 
         cy={milestone1.y} 
         r="4" 
         fill={colors.white} 
         stroke="#000000" 
         strokeWidth="2"
         animatedProps={useAnimatedProps(() => ({ opacity: ball1Opacity.value }))}
       />
       <AnimatedCircle 
         cx={milestone2.x} 
         cy={milestone2.y} 
         r="4" 
         fill={colors.white} 
         stroke="#000000" 
         strokeWidth="2"
         animatedProps={useAnimatedProps(() => ({ opacity: ball2Opacity.value }))}
       />
       <AnimatedCircle 
         cx={milestone3.x} 
         cy={milestone3.y} 
         r="5" 
         fill={colors.white} 
         stroke="#000000" 
         strokeWidth="2"
         animatedProps={useAnimatedProps(() => ({ opacity: ball3Opacity.value }))}
       />

                    {/* Labels below the baseline - animated opacity */}
       <AnimatedSvgText
         x="15"
         y={startY + 20}
         fontSize="12"
         fontWeight="500"
         fill={colors.mediumGray}
         animatedProps={useAnimatedProps(() => ({ opacity: startLabelOpacity.value }))}
       >
         Start
       </AnimatedSvgText>
       <AnimatedSvgText
         x={milestone1.x - 12}
         y={startY + 20}
         fontSize="12"
         fontWeight="500"
         fill={colors.mediumGray}
         animatedProps={useAnimatedProps(() => ({ opacity: label3DaysOpacity.value }))}
       >
         3 Days
       </AnimatedSvgText>
       <AnimatedSvgText
         x={milestone2.x - 12}
         y={startY + 20}
         fontSize="12"
         fontWeight="500"
         fill={colors.mediumGray}
         animatedProps={useAnimatedProps(() => ({ opacity: label7DaysOpacity.value }))}
       >
         7 Days
       </AnimatedSvgText>
       <AnimatedSvgText
         x={milestone3.x - 15}
         y={startY + 20}
         fontSize="12"
         fontWeight="500"
         fill={colors.mediumGray}
         animatedProps={useAnimatedProps(() => ({ opacity: label30DaysOpacity.value }))}
       >
         30 Days
       </AnimatedSvgText>


     </Svg>
  );
}

/*──────────────────  Screen  ──────────────────*/
export default function DevelopmentTransition() {
  const haptics = useHaptics();
  const { goToNext } = useOnboardingStep('development-transition');
  const headerHeight = useOnboardingHeaderHeight();
  // Caption fade-in
  const captionOpacity = useSharedValue(0);
  const captionStyle = useAnimatedStyle(() => ({
    opacity: captionOpacity.value,
    transform: [{ translateY: interpolate(captionOpacity.value, [0, 1], [12, 0]) }],
  }));

  const CHART_W = Math.min(SCREEN_W - 48, 340);
  const CHART_H = 200; // Back to original height

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <OnboardingHeader screenId="development-transition" />

      <Animated.View
        entering={FadeInRight.duration(250).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{ flex: 1 }}
      >
        {/* Title */}
        <View style={{ paddingHorizontal: 24, paddingTop: headerHeight }}>
          <Text style={[typography.title, { marginBottom: 12 }]} allowFontScaling={false}>
            If you're consistent, you have great potential to crush your goal
          </Text>
        </View>

        {/* Chart centered on screen */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <DevelopmentChart
            width={CHART_W}
            height={CHART_H}
            onAnimationComplete={() => {
              haptics.light(); // Consistent with app's standard feedback
              captionOpacity.value = withTiming(1, { duration: 300 });
            }}
          />
        </View>

        {/* Caption below chart */}
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120, alignItems: 'center' }}>
          <Animated.Text
            style={[
              typography.body,
              { textAlign: 'center', color: colors.mediumGray, lineHeight: 24 },
              captionStyle,
            ]}
            allowFontScaling={false}
          >
            Based on BallerAI's data, players who stay consistent see exponential improvement after the first week. Stick with it and watch your development take off!
          </Animated.Text>
        </View>
      </Animated.View>

      {/* Bottom CTA */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 32,
          paddingHorizontal: 24,
          paddingTop: 14,
          paddingBottom: 14,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.veryLightGray,
        }}
      >
        <Button
          title="Continue"
          onPress={async () => {
            haptics.light();
            await analyticsService.logEvent('A0_14_development_transition_continue');
            // NEW: Use automatic navigation instead of hardcoded route
            goToNext();
          }}
        />
      </View>
    </SafeAreaView>
  );
} 