/*****************************************************************************************
 * (onboarding)/analyzing.tsx
 * Animated comparison chart – BallerAI onboarding step
 *****************************************************************************************/

import { View, Text, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  runOnJS,
  useDerivedValue,
  interpolate,
  withDelay,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import analytics from '@react-native-firebase/analytics';
import Svg, {
  Path,
  Rect,
  Circle,
  Text as SvgText,
  Image as SvgImage,
} from 'react-native-svg';

import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';

const { width: SCREEN_W } = Dimensions.get('window');
const generousLen = (d: string) => (d.length + 200) * 2;

/*─────────────────────  Chart  ─────────────────────*/
function DevelopmentChart({
  width,
  height,
  onLinesComplete,
}: {
  width: number;
  height: number;
  onLinesComplete: () => void;
}) {
  const startY = height - 80;

  /* Green exponential path (sampled line) */
  const buildExpo = (samples = 10) => {
    const a = startY - 20;
    const k = 2.3;
    const step = (width - 40) / samples;
    let d = `M20,${startY}`;
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const x = 20 + step * i;
      const y = startY - (a * (Math.exp(k * t) - 1)) / (Math.exp(k) - 1);
      d += ` L${x.toFixed(2)},${y.toFixed(2)}`;
    }
    return d;
  };
  const greenPath = buildExpo();

  /* Smooth red wave ending downward */
  const redPath = `M20,${startY}
    C${width * 0.25},${startY + 18} ${width * 0.35},${startY - 12} ${width * 0.45},${startY + 4}
    S${width * 0.65},${startY + 26} ${width * 0.78},${startY + 16}
    S${width * 0.9},${startY + 4} ${width - 20},${startY + 20}`;

  /* Pre-compute lengths so we don't call JS in worklet */
  const greenLen = generousLen(greenPath);
  const redLen   = generousLen(redPath);

  const progress = useSharedValue(0);

  /* Animated stroke props */
  const AnimatedPath      = Animated.createAnimatedComponent(Path);
  const AnimatedSvgText   = Animated.createAnimatedComponent(SvgText);
  const AnimatedSvgImage  = Animated.createAnimatedComponent(SvgImage);
  const AnimatedCircle    = Animated.createAnimatedComponent(Circle);

  const animatedGreen = useAnimatedProps(() => ({
    strokeDasharray: greenLen,
    strokeDashoffset: greenLen * (1 - progress.value) + 2,
  }));
  const animatedRed = useAnimatedProps(() => ({
    strokeDasharray: redLen,
    strokeDashoffset: redLen * (1 - progress.value) + 2,
  }));

  /* Green circle that follows the exact tip of the visible stroke */
  const animatedGreenCircle = useAnimatedProps(() => {
    const t = progress.value;
    
    // Calculate position exactly at the visible stroke tip
    const samples = 10;
    const currentStep = t * samples;
    const step = (width - 40) / samples;
    const x = 20 + step * currentStep;
    
    // Use exact same exponential formula as the path
    const a = startY - 20;
    const k = 2.3;
    const y = startY - (a * (Math.exp(k * t) - 1)) / (Math.exp(k) - 1);
    
    return {
      cx: x,
      cy: y,
      opacity: progress.value > 0.02 ? 1 : 0,
    };
  });

  /* Label/logo opacity (start at 75% progress instead of 85% for faster appearance) */
  const labelAnimatedProps = useAnimatedProps(() => ({
    opacity: interpolate(progress.value, [0.75, 0.9], [0, 1]),
  }));

  /* Signal parent when lines essentially done */
  useDerivedValue(() => {
    if (progress.value >= 0.95) runOnJS(onLinesComplete)();
  });

  /* Kick-off line animation (faster duration and shorter delay) */
  useEffect(() => {
    progress.value = withDelay(100, withTiming(1, { duration: 1500 }));
  }, []);

  const cardBg = '#F8F8F8';

  return (
    <Svg width={width} height={height}>
      {/* Card container & title */}
      <Rect x="0" y="0" width={width} height={height} rx="20" fill={cardBg} />
      <SvgText x="20" y="42" fontSize="20" fontWeight="700" fill={colors.black}>
        Your development
      </SvgText>

      {/* Dashed grid lines */}
      {[height * 0.45, height * 0.65, height * 0.85].map((y) => (
        <Path
          key={y}
          d={`M20,${y} L${width - 20},${y}`}
          stroke={colors.lightGray}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}

      {/* Start marker */}
      <Circle cx="20" cy={startY} r="6" fill={colors.white} stroke="#7ED321" strokeWidth="2" />

      {/* Animated line paths */}
      <AnimatedPath 
        d={greenPath} 
        stroke="#7ED321" 
        strokeWidth="5" 
        fill="none" 
        strokeLinecap="round" 
        animatedProps={animatedGreen} 
      />
      <AnimatedPath 
        d={redPath} 
        stroke="#F15B5B" 
        strokeWidth="5" 
        fill="none" 
        strokeLinecap="round" 
        animatedProps={animatedRed} 
      />

      {/* Animated circles at stroke tips */}
      <AnimatedCircle 
        animatedProps={animatedGreenCircle}
        r="6" 
        fill={colors.white} 
        stroke="#7ED321" 
        strokeWidth="2" 
      />

      {/* Labels */}
      <AnimatedSvgText
        animatedProps={labelAnimatedProps}
        x={width * 0.48}
        y="70"
        fontSize="16"
        fontWeight="700"
        fill={colors.black}
      >
        With
      </AnimatedSvgText>
      <AnimatedSvgImage
        animatedProps={labelAnimatedProps}
        href={require('../../assets/images/BallerAILogo.png')}
        x={width * 0.48 + 46}
        y="54"
        width="22"
        height="22"
      />
      <AnimatedSvgText
        animatedProps={labelAnimatedProps}
        x={width * 0.48}
        y={startY + 60}
        fontSize="16"
        fontWeight="700"
        fill={colors.black}
      >
        Without
      </AnimatedSvgText>
      <AnimatedSvgImage
        animatedProps={labelAnimatedProps}
        href={require('../../assets/images/BallerAILogo.png')}
        x={width * 0.48 + 70}
        y={startY + 44}
        width="22"
        height="22"
      />
    </Svg>
  );
}

/*──────────────────  Screen  ──────────────────*/
export default function AnalyzingScreen() {
  const router  = useRouter();
  const haptics = useHaptics();

  /* Caption fade-in */
  const captionOpacity = useSharedValue(0);
  const captionStyle   = useAnimatedStyle(() => ({
    opacity: captionOpacity.value,
    transform: [{ translateY: interpolate(captionOpacity.value, [0, 1], [12, 0]) }],
  }));

  const CHART_W = Math.min(SCREEN_W - 48, 340);
  const CHART_H = 260;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <OnboardingHeader currentStep={6} totalSteps={29} />

      <Animated.View
        entering={FadeInRight.duration(250).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{ flex: 1 }}
      >
        {/* Title */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
          <Text style={[typography.title, { marginBottom: 12 }]} allowFontScaling={false}>
            BallerAI creates{'\n'}long-term results
          </Text>
        </View>

        {/* Chart centred on screen */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <DevelopmentChart
            width={CHART_W}
            height={CHART_H}
            onLinesComplete={() => {
              /* Caption appears faster when lines complete */
              captionOpacity.value = withTiming(1, { duration: 300 });
            }}
          />

          {/* Month labels */}
          <View style={{ width: CHART_W, flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={[typography.subtitle, { color: colors.black }]}>1 month</Text>
            <Text style={[typography.subtitle, { color: colors.black }]}>6 months</Text>
          </View>
        </View>

        {/* Caption under chart */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 120, alignItems: 'center' }}>
          <Animated.Text
            style={[
              typography.body,
              { textAlign: 'center', color: colors.mediumGray, lineHeight: 24 },
              captionStyle,
            ]}
            allowFontScaling={false}
          >
            90% of BallerAI athletes say their development improved exponentially during the first 6 months.
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
            await analytics().logEvent('AA_06_analyzing_continue');
            router.push('/measurements');
          }}
        />
      </View>
    </SafeAreaView>
  );
}
