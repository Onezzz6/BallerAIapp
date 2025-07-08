import React, { useEffect } from 'react';
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
  ClipPath,
} from 'react-native-svg';
import OnboardingHeader from '../components/OnboardingHeader';
import Button from '../components/Button';
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import analyticsService from '../services/analytics';

const { width: SCREEN_W } = Dimensions.get('window');

// Simple path length estimation
const estimatePathLength = (path: string) => (path.length + 200) * 2;

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
    const x = width * xPercent;
    const t = (x - 20) / (width - 40); // normalize to 0-1
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
    const samples = 30;
    const step = (width - 40) / samples;
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
    return d;
  };

  const progressPath = buildProgressPath();
  const pathLength = estimatePathLength(progressPath);

  const progress = useSharedValue(0);
  const dotOpacity = useSharedValue(0);

  // Animated components
  const AnimatedPath = Animated.createAnimatedComponent(Path);
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);
  const AnimatedRect = Animated.createAnimatedComponent(Rect);

  // Animated clipping that advances with the line
  const animatedClipWidth = useAnimatedProps(() => ({
    width: (endLineX - 20) * progress.value,
  }));

  // Path animation
  const animatedPath = useAnimatedProps(() => ({
    strokeDasharray: pathLength,
    strokeDashoffset: pathLength * (1 - progress.value),
  }));

  // Progressive milestone appearance (faster timing)
  const animatedMilestone1 = useAnimatedProps(() => ({
    opacity: progress.value > 0.15 ? 1 : 0, // Appears early
  }));
  
  const animatedMilestone2 = useAnimatedProps(() => ({
    opacity: progress.value > 0.35 ? 1 : 0, // Appears before line reaches milestone 3
  }));
  
  const animatedMilestone3 = useAnimatedProps(() => ({
    opacity: progress.value > 0.65 ? 1 : 0, // Appears well before line finishes
  }));

  // Labels fade in
  const labelAnimatedProps = useAnimatedProps(() => ({
    opacity: interpolate(progress.value, [0.7, 0.9], [0, 1]),
  }));

  // Signal completion
  useDerivedValue(() => {
    if (progress.value >= 0.95) runOnJS(onAnimationComplete)();
  });

  // Start animation with variable speed (slower overall, accelerating)
  useEffect(() => {
    // Use easing that starts slow and accelerates (matches the curve steepness)
    progress.value = withDelay(200, withTiming(1, { 
      duration: 3500, // Slower overall
      easing: Easing.in(Easing.cubic) // Starts slow, accelerates toward end
    }));
  }, []);

  const cardBg = '#F8F8F8';

  return (
    <Svg width={width} height={height}>
      {/* Card background */}
      <Rect x="0" y="0" width={width} height={height} rx="16" fill={cardBg} />
      
      {/* Title */}
      <SvgText x="20" y="35" fontSize="18" fontWeight="600" fill={colors.black}>
        Your Development Progression
      </SvgText>

             {/* Defs for gradients and clipping */}
       <Defs>
         <LinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
           <Stop offset="0%" stopColor="#9DFFCE" />
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
           <Stop offset="30%" stopColor="rgba(76, 175, 80, 0.35)" />
           <Stop offset="100%" stopColor="rgba(76, 175, 80, 0.3)" />
         </LinearGradient>

         {/* Clipping path that advances with progress */}
         <ClipPath id="progressClip">
           <AnimatedRect x="20" y="0" height={height} animatedProps={animatedClipWidth} />
         </ClipPath>
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
             const t = (x - 20) / (width - 40);
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
         clipPath="url(#progressClip)"
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
             const t = (x - 20) / (width - 40);
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
         clipPath="url(#progressClip)"
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
             const t = (x - 20) / (width - 40);
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
         clipPath="url(#progressClip)"
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

                    {/* Start point */}
       <Circle cx="20" cy={startY} r="5" fill={colors.white} stroke={colors.brandGreen} strokeWidth="2" />

       {/* Animated progress path */}
       <AnimatedPath
         d={progressPath}
         stroke="url(#progressGrad)"
         strokeWidth="3"
         fill="none"
         strokeLinecap="round"
         animatedProps={animatedPath}
       />

       {/* Progressive milestone markers */}
       <AnimatedCircle 
         cx={milestone1.x} 
         cy={milestone1.y} 
         r="4" 
         fill={colors.brandGreen} 
         stroke={cardBg} 
         strokeWidth="2" 
         animatedProps={animatedMilestone1}
       />
       <AnimatedCircle 
         cx={milestone2.x} 
         cy={milestone2.y} 
         r="4" 
         fill={colors.brandGreen} 
         stroke={cardBg} 
         strokeWidth="2" 
         animatedProps={animatedMilestone2}
       />
       <AnimatedCircle 
         cx={milestone3.x} 
         cy={milestone3.y} 
         r="5" 
         fill={colors.warning} 
         stroke={cardBg} 
         strokeWidth="2" 
         animatedProps={animatedMilestone3}
       />

                    {/* Labels below the baseline */}
       <AnimatedSvgText
         animatedProps={labelAnimatedProps}
         x="15"
         y={startY + 20}
         fontSize="12"
         fontWeight="500"
         fill={colors.mediumGray}
       >
         Start
       </AnimatedSvgText>
       <AnimatedSvgText
         animatedProps={labelAnimatedProps}
         x={milestone1.x - 12}
         y={startY + 20}
         fontSize="12"
         fontWeight="500"
         fill={colors.mediumGray}
       >
         3 Days
       </AnimatedSvgText>
       <AnimatedSvgText
         animatedProps={labelAnimatedProps}
         x={milestone2.x - 12}
         y={startY + 20}
         fontSize="12"
         fontWeight="500"
         fill={colors.mediumGray}
       >
         7 Days
       </AnimatedSvgText>
       <AnimatedSvgText
         animatedProps={labelAnimatedProps}
         x={milestone3.x - 15}
         y={startY + 20}
         fontSize="12"
         fontWeight="500"
         fill={colors.mediumGray}
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
        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
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
            try {
              await analyticsService.logEvent('AA_development_transition_continue');
            } catch (_) {}
            goToNext();
          }}
        />
      </View>
    </SafeAreaView>
  );
} 