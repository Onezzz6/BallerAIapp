import { View, Text, SafeAreaView } from 'react-native';
import Animated, { 
  FadeInRight, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat,
  withSequence
} from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useEffect } from 'react';
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import analyticsService from '../services/analytics';

export default function ProfileGenerationScreen() {
  const haptics = useHaptics();
  const headerHeight = useOnboardingHeaderHeight();
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('profile-generation');
  
  // Animation values for dynamic magic wand
  const wandScale = useSharedValue(1);
  const wandRotation = useSharedValue(0);
  const wandY = useSharedValue(0);
  const sparkleOpacity = useSharedValue(0.8);
  const sparkleRotation = useSharedValue(0);
  const magicPulse = useSharedValue(1);

  useEffect(() => {
    // Immediate dramatic entrance with bounce and multiple spins
    wandScale.value = withSequence(
      withTiming(1.3, { duration: 600 }),
      withTiming(0.8, { duration: 300 }),
      withTiming(1.2, { duration: 400 }),
      withTiming(0.95, { duration: 200 }),
      withTiming(1.1, { duration: 300 }),
      withTiming(1, { duration: 400 }),
      // Then settle into gentle breathing
      withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2000 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        false
      )
    );

    // Immediate dramatic spins then settle
    wandRotation.value = withSequence(
      withTiming(720, { duration: 1200 }), // Two full spins immediately!
      withTiming(1080, { duration: 800 }), // Another full spin
      withTiming(1440, { duration: 1000 }), // One more dramatic spin
      withTiming(1440, { duration: 500 }), // Hold
      // Then settle into gentle rotation
      withRepeat(
        withSequence(
          withTiming(1455, { duration: 3000 }),
          withTiming(1440, { duration: 2000 })
        ),
        -1,
        false
      )
    );

    // Start floating immediately but gently
    wandY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2500 }),
        withTiming(6, { duration: 2500 })
      ),
      -1,
      true
    );

    // Dramatic sparkle show then settle
    sparkleOpacity.value = withSequence(
      // Initial sparkle burst
      withTiming(1, { duration: 200 }),
      withTiming(0.2, { duration: 300 }),
      withTiming(1, { duration: 250 }),
      withTiming(0.4, { duration: 200 }),
      withTiming(1, { duration: 300 }),
      withTiming(0.3, { duration: 400 }),
      withTiming(1, { duration: 250 }),
      // Then settle into gentle twinkling
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 2000 }),
          withTiming(0.5, { duration: 1500 })
        ),
        -1,
        false
      )
    );

    // Fast initial sparkle rotation then slow down
    sparkleRotation.value = withSequence(
      withTiming(1080, { duration: 3000 }), // Three fast spins
      // Then gentle continuous rotation
      withRepeat(
        withTiming(1440, { duration: 8000 }),
        -1,
        false
      )
    );

    // Dramatic pulse then settle
    magicPulse.value = withSequence(
      withTiming(1.3, { duration: 800 }),
      withTiming(0.9, { duration: 400 }),
      withTiming(1.2, { duration: 600 }),
      withTiming(1, { duration: 500 }),
      // Then gentle breathing
      withRepeat(
        withSequence(
          withTiming(1.08, { duration: 2500 }),
          withTiming(1, { duration: 2000 })
        ),
        -1,
        false
      )
    );

    // Haptic feedback for the initial magic show
    haptics.light();
    const hapticTimeout1 = setTimeout(() => haptics.light(), 800);
    const hapticTimeout2 = setTimeout(() => haptics.light(), 1600);
    const hapticTimeout3 = setTimeout(() => haptics.light(), 2400);
    
    return () => {
      clearTimeout(hapticTimeout1);
      clearTimeout(hapticTimeout2);
      clearTimeout(hapticTimeout3);
    };
  }, []);

  const handleContinue = async () => {
    haptics.light();
    await analyticsService.logEvent('A0_29_profile_generation_continue');
    // NEW: Use automatic navigation instead of hardcoded route
    goToNext();
  };

  const wandAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: wandScale.value },
      { rotate: `${wandRotation.value}deg` },
      { translateY: wandY.value }
    ],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
    transform: [{ rotate: `${sparkleRotation.value}deg` }],
  }));

  const magicCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: magicPulse.value }],
  }));

  const dynamicSparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
    transform: [
      { scale: sparkleOpacity.value },
      { rotate: `${sparkleRotation.value * 0.5}deg` }
    ],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="profile-generation" />

      <Animated.View 
        entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{
          flex: 1,
          backgroundColor: colors.backgroundColor,
        }}
      >

        {/* Fixed Title Section - Locked at top like reference */}
        <View style={{
          paddingHorizontal: 24,
          paddingTop: headerHeight,
        }}>
          <Text style={[
            typography.title,
            {
              textAlign: 'center',
              marginBottom: 8,
            }
          ]} allowFontScaling={false}>
            Time to generate{'\n'}your customized profile!
          </Text>
        </View>

        <View style={{
          paddingHorizontal: 24,
          paddingBottom: 64,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Magic Wand Animation */}
          <View style={{
            alignItems: 'center',
            marginBottom: 32,
          }}>
            {/* Magic Animation Circle */}
            <Animated.View style={[
              magicCircleStyle,
              {
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: 'rgba(64, 100, 246, 0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }
            ]}>
              {/* Animated background circles with pulse */}
              <Animated.View style={[
                magicCircleStyle,
                {
                  position: 'absolute',
                  width: 180,
                  height: 180,
                  borderRadius: 90,
                  backgroundColor: 'rgba(64, 100, 246, 0.15)',
                }
              ]} />
              <Animated.View style={[
                magicCircleStyle,
                {
                  position: 'absolute',
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  backgroundColor: 'rgba(64, 100, 246, 0.2)',
                }
              ]} />
              
              {/* Central Magic Wand with dynamic animation */}
              <Animated.View style={[
                wandAnimatedStyle,
                {
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                }
              ]}>
                <Text style={{ fontSize: 80 }}>🪄</Text>
                
                {/* Multiple animated sparkles around the wand */}
                <Animated.View style={[
                  dynamicSparkleStyle,
                  {
                    position: 'absolute',
                    top: -10,
                    right: -5,
                  }
                ]}>
                  <Text style={{ fontSize: 28 }}>✨</Text>
                </Animated.View>
                
                <Animated.View style={[
                  sparkleAnimatedStyle,
                  {
                    position: 'absolute',
                    top: 10,
                    left: -10,
                  }
                ]}>
                  <Text style={{ fontSize: 20 }}>💫</Text>
                </Animated.View>
                
                <Animated.View style={[
                  dynamicSparkleStyle,
                  {
                    position: 'absolute',
                    bottom: -5,
                    right: 5,
                  }
                ]}>
                  <Text style={{ fontSize: 16 }}>⭐</Text>
                </Animated.View>
              </Animated.View>

              {/* Magic sparkles around */}
              {Array.from({ length: 12 }).map((_, index) => {
                const angle = (index * 30) * (Math.PI / 180);
                const radius = 85;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                return (
                  <Animated.View
                    key={index}
                    style={[
                      dynamicSparkleStyle,
                      {
                        position: 'absolute',
                        left: 100 + x - 2,
                        top: 100 + y - 2,
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: colors.brandBlue,
                      }
                    ]}
                  />
                );
              })}

              {/* Additional floating magic elements */}
              {Array.from({ length: 8 }).map((_, index) => {
                const positions = [
                  { x: 30, y: 40, emoji: '✨', size: 18 },
                  { x: 150, y: 30, emoji: '💫', size: 16 },
                  { x: 170, y: 80, emoji: '⭐', size: 14 },
                  { x: 160, y: 140, emoji: '🌟', size: 12 },
                  { x: 40, y: 160, emoji: '✨', size: 15 },
                  { x: 20, y: 120, emoji: '💫', size: 13 },
                  { x: 80, y: 20, emoji: '⭐', size: 11 },
                  { x: 180, y: 180, emoji: '🌟', size: 16 },
                ];
                const item = positions[index];
                
                return (
                  <Animated.View
                    key={`magic-${index}`}
                    style={[
                      sparkleAnimatedStyle,
                      {
                        position: 'absolute',
                        left: item.x,
                        top: item.y,
                      }
                    ]}
                  >
                    <Text style={{ fontSize: item.size }}>{item.emoji}</Text>
                  </Animated.View>
                );
              })}
            </Animated.View>
          </View>

          <Text style={[
            typography.subtitle,
            {
              textAlign: 'center',
              fontSize: 16,
              color: colors.mediumGray,
              lineHeight: 22,
              marginTop: 24,
            }
          ]} allowFontScaling={false}>
            We'll use all your responses to craft{'\n'}the perfect personalized experience{'\n'}just for you!
          </Text>
        </View>
      </Animated.View>

      {/* Static Continue Button - No animation, always in same position */}
      <View style={{
        position: 'absolute',
        bottom: 32,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingTop: 14,
        paddingBottom: 14,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.veryLightGray,
      }}>
        <Button 
          title="Continue" 
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
} 