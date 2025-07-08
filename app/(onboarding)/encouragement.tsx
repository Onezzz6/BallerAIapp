/*****************************************************************************************
 * (onboarding)/encouragement.tsx
 * Thank you screen with clapping hands animation – BallerAI onboarding step
 *****************************************************************************************/

import { View, Text, SafeAreaView } from 'react-native';
import Animated, {
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import Svg, { Path, G, Circle } from 'react-native-svg';

import Button from '../components/Button';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import analyticsService from '../services/analytics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';

/*─────────────────────  Elite Partnership Animation  ─────────────────────*/
function ElitePartnership() {
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);
  const ripple1Scale = useSharedValue(0);
  const ripple2Scale = useSharedValue(0);
  const ripple3Scale = useSharedValue(0);
  const particlesOpacity = useSharedValue(0);
  const iconsOpacity = useSharedValue(0);

  useEffect(() => {
    // Professional achievement animation sequence
    const startAnimation = () => {
      // 1. Checkmark appears (achievement unlocked)
      checkmarkOpacity.value = withTiming(1, { duration: 300 });
      checkmarkScale.value = withSpring(1, { damping: 12, stiffness: 120 });
      
      // 2. Power ripples emanate outward
      setTimeout(() => {
        ripple1Scale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) });
      }, 200);
      
      setTimeout(() => {
        ripple2Scale.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) });
      }, 400);
      
      setTimeout(() => {
        ripple3Scale.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) });
      }, 600);
      
      // 3. Geometric particles burst
      setTimeout(() => {
        particlesOpacity.value = withTiming(1, { duration: 600 });
      }, 300);
      
      // 4. Pro icons appear
      setTimeout(() => {
        iconsOpacity.value = withTiming(1, { duration: 800 });
      }, 500);
      
      // 5. Power pulse
      setTimeout(() => {
        checkmarkScale.value = withSpring(1.15, { damping: 8, stiffness: 60 });
        setTimeout(() => {
          checkmarkScale.value = withSpring(1, { damping: 8, stiffness: 60 });
        }, 400);
      }, 800);
    };

    const timer = setTimeout(startAnimation, 300);
    return () => clearTimeout(timer);
  }, []);

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkmarkOpacity.value,
    transform: [{ scale: checkmarkScale.value }],
  }));

  const ripple1Style = useAnimatedStyle(() => ({
    opacity: interpolate(ripple1Scale.value, [0, 0.5, 1], [0.8, 0.4, 0]),
    transform: [{ scale: ripple1Scale.value }],
  }));

  const ripple2Style = useAnimatedStyle(() => ({
    opacity: interpolate(ripple2Scale.value, [0, 0.5, 1], [0.6, 0.3, 0]),
    transform: [{ scale: ripple2Scale.value }],
  }));

  const ripple3Style = useAnimatedStyle(() => ({
    opacity: interpolate(ripple3Scale.value, [0, 0.5, 1], [0.4, 0.2, 0]),
    transform: [{ scale: ripple3Scale.value }],
  }));

  const particlesStyle = useAnimatedStyle(() => ({
    opacity: particlesOpacity.value,
  }));

  const iconsStyle = useAnimatedStyle(() => ({
    opacity: iconsOpacity.value,
  }));

  return (
    <View style={{
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: 'rgba(0, 0, 0, 0.02)',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      shadowColor: '#1E40AF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 30,
    }}>
      
      {/* Professional background circles */}
      <View style={{
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
      }} />
      <View style={{
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(34, 197, 94, 0.06)',
      }} />
      <View style={{
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
      }} />

      {/* Power ripples */}
      <Animated.View style={[
        ripple1Style,
        {
          position: 'absolute',
          width: 80,
          height: 80,
          borderRadius: 40,
          borderWidth: 3,
          borderColor: '#1E40AF',
        }
      ]} />
      
      <Animated.View style={[
        ripple2Style,
        {
          position: 'absolute',
          width: 120,
          height: 120,
          borderRadius: 60,
          borderWidth: 2,
          borderColor: '#3B82F6',
        }
      ]} />
      
      <Animated.View style={[
        ripple3Style,
        {
          position: 'absolute',
          width: 160,
          height: 160,
          borderRadius: 80,
          borderWidth: 2,
          borderColor: '#60A5FA',
        }
      ]} />

      {/* Central checkmark (achievement unlocked) */}
      <Animated.View style={[checkmarkStyle, { position: 'absolute' }]}>
        <Svg width="60" height="60" viewBox="0 0 24 24">
          <Path
            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
            fill="#22C55E"
            stroke="#16A34A"
            strokeWidth="1"
          />
          {/* Add a circle background for more impact */}
          <Circle
            cx="12"
            cy="12"
            r="11"
            fill="none"
            stroke="#1E40AF"
            strokeWidth="2"
          />
        </Svg>
      </Animated.View>

      {/* Geometric particles burst */}
      <Animated.View style={[particlesStyle, { position: 'absolute', width: '100%', height: '100%' }]}>
        {Array.from({ length: 8 }).map((_, index) => {
          const angle = (index * 45) * (Math.PI / 180);
          const radius = 75 + (index % 2) * 20;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const size = 6 + (index % 2) * 2;
          
          return (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: 120 + x - size/2,
                top: 120 + y - size/2,
                width: size,
                height: size,
                backgroundColor: index % 3 === 0 ? '#1E40AF' : index % 3 === 1 ? '#22C55E' : '#6B7280',
                borderRadius: 1,
                transform: [{ rotate: `${index * 45}deg` }],
                shadowColor: '#1E40AF',
                shadowOpacity: 0.6,
                shadowRadius: 2,
              }}
            />
          );
        })}
      </Animated.View>

      {/* Professional achievement icons */}
      <Animated.View style={[iconsStyle, { position: 'absolute', width: '100%', height: '100%' }]}>
        {['⚽', '🏆', '💪', '🎯'].map((icon, index) => {
          const angle = (index * 90 + 45) * (Math.PI / 180);
          const radius = 95;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <Text
              key={index}
              style={{
                position: 'absolute',
                left: 120 + x - 12,
                top: 120 + y - 12,
                fontSize: 20,
                textAlign: 'center',
                opacity: 0.9,
              }}
            >
              {icon}
            </Text>
          );
        })}
      </Animated.View>

      {/* Elite geometric accents */}
      {Array.from({ length: 16 }).map((_, index) => {
        const angle = (index * 22.5) * (Math.PI / 180);
        const radius = 110 + (index % 2) * 8;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              left: 120 + x - 2,
              top: 120 + y - 2,
              width: 3,
              height: 3,
              backgroundColor: index % 2 === 0 ? 'rgba(30, 64, 175, 0.6)' : 'rgba(107, 114, 128, 0.4)',
              borderRadius: 0.5,
              opacity: 0.8,
            }}
          />
        );
      })}
    </View>
  );
}

/*──────────────────  Screen  ──────────────────*/
export default function EncouragementScreen() {
  const haptics = useHaptics();
  const headerHeight = useOnboardingHeaderHeight() + 20;
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('encouragement');

  /* Caption fade-in */
  const captionOpacity = useSharedValue(0);
  const captionStyle   = useAnimatedStyle(() => ({
    opacity: captionOpacity.value,
    transform: [{ translateY: interpolate(captionOpacity.value, [0, 1], [12, 0]) }],
  }));

  useEffect(() => {
    // Show caption after hands animation starts
    const timer = setTimeout(() => {
      captionOpacity.value = withTiming(1, { duration: 600 });
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="encouragement" />

      <Animated.View
        entering={FadeInRight.duration(250).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{ flex: 1 }}
      >
                 {/* Elite partnership animation centered on screen */}
         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: headerHeight }}>
           <ElitePartnership />
         </View>

        {/* Title and messages */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 120, alignItems: 'center' }}>
          <Text style={[
            typography.title, 
            { 
              textAlign: 'center', 
              marginTop: 24,
              marginBottom: 12,
              fontSize: 32,
              fontWeight: '700'
            }
          ]} allowFontScaling={false}>
            Thank you for{'\n'}trusting us
          </Text>

          <Animated.Text
            style={[
              typography.body,
              { 
                textAlign: 'center', 
                color: colors.mediumGray, 
                lineHeight: 22,
                marginBottom: 24,
                fontSize: 16
              },
              captionStyle,
            ]}
            allowFontScaling={false}
          >
            Let's start to customize everything up just for you!
          </Animated.Text>

          {/* Privacy section */}
          <Animated.View style={[
            { alignItems: 'center', marginBottom: 12 },
            captionStyle
          ]}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(99, 179, 237, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 6,
            }}>
              <Text style={{ fontSize: 24 }} allowFontScaling={false}>🔒</Text>
            </View>
            
            <Text style={[
              typography.body,
              {
                textAlign: 'center',
                color: colors.mediumGray,
                lineHeight: 20,
                fontSize: 14,
              }
            ]} allowFontScaling={false}>
              Your privacy and security matter to us. We promise to always keep your personal information private and secure.
            </Text>
          </Animated.View>
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
          title="Let's Do This!"
          onPress={async () => {
            haptics.light();
            await analyticsService.logEvent('AA__10_thank_you_for_trusting_us_continue');
            // NEW: Use automatic navigation instead of hardcoded route
            goToNext();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
