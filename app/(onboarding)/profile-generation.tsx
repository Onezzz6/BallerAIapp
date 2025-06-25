import { View, Text, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  FadeInRight, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat,
  withSequence
} from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import analytics from '@react-native-firebase/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useEffect } from 'react';

export default function ProfileGenerationScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  
  // Animation values for magic wand pulse
  const wandScale = useSharedValue(1);
  const sparkleOpacity = useSharedValue(0.8);

  useEffect(() => {
    // Start magic wand pulse animation
    wandScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1, // infinite repeat
      false
    );

    // Sparkle twinkling animation
    sparkleOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1500 }),
        withTiming(0.8, { duration: 1500 })
      ),
      -1,
      false
    );

    // Trigger haptic feedback periodically
    const hapticInterval = setInterval(() => {
      haptics.light();
    }, 3000);
    
    return () => {
      clearInterval(hapticInterval);
    };
  }, []);

  const handleContinue = async () => {
    haptics.light();
    await analytics().logEvent('onboarding_profile_generation_continue');
    router.push('/generating-profile');
  };

  const wandAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wandScale.value }],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <OnboardingHeader 
        currentStep={26}
        totalSteps={28}
      />

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
          paddingTop: 20,
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
            <View style={{
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: 'rgba(64, 100, 246, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
            }}>
              {/* Animated background circles */}
              <Animated.View style={{
                position: 'absolute',
                width: 180,
                height: 180,
                borderRadius: 90,
                backgroundColor: 'rgba(64, 100, 246, 0.15)',
              }} />
              <Animated.View style={{
                position: 'absolute',
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: 'rgba(64, 100, 246, 0.2)',
              }} />
              
              {/* Central Magic Wand with pulse animation */}
              <Animated.View style={[
                wandAnimatedStyle,
                {
                  alignItems: 'center',
                  justifyContent: 'center',
                }
              ]}>
                <Text style={{ fontSize: 80 }}>🪄</Text>
                <Animated.View style={[
                  sparkleAnimatedStyle,
                  {
                    position: 'absolute',
                    top: -5,
                    right: 0,
                  }
                ]}>
                  <Text style={{ fontSize: 24 }}>✨</Text>
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
                      sparkleAnimatedStyle,
                      {
                        position: 'absolute',
                        left: 100 + x - 2,
                        top: 100 + y - 2,
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: colors.brandBlue,
                      }
                    ]}
                  />
                );
              })}

              {/* Additional floating stars */}
              {Array.from({ length: 6 }).map((_, index) => {
                const positions = [
                  { x: 30, y: 40 },
                  { x: 150, y: 30 },
                  { x: 170, y: 80 },
                  { x: 160, y: 140 },
                  { x: 40, y: 160 },
                  { x: 20, y: 120 },
                ];
                const pos = positions[index];
                
                return (
                  <Animated.View
                    key={`star-${index}`}
                    style={[
                      sparkleAnimatedStyle,
                      {
                        position: 'absolute',
                        left: pos.x,
                        top: pos.y,
                      }
                    ]}
                  >
                    <Text style={{ fontSize: 16 }}>⭐</Text>
                  </Animated.View>
                );
              })}
            </View>
          </View>

          <Text style={[
            typography.subtitle,
            {
              textAlign: 'center',
              fontSize: 16,
              color: colors.mediumGray,
              lineHeight: 22,
            }
          ]}>
            We'll use all your responses to craft the perfect{'\n'}personalized experience just for you!
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