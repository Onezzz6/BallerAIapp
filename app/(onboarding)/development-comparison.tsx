import React, { useEffect } from 'react';
import { View, Text, Image, ScrollView, SafeAreaView } from 'react-native';
import Animated, { 
  FadeInRight, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withDelay,
  runOnJS,
  Easing
} from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import analyticsService from '../services/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';

export default function DevelopmentComparisonScreen() {
  const haptics = useHaptics();
  
  // NEW: Use the onboarding step hook - automatically handles step numbers and navigation!
  const { currentStep, totalSteps, goToNext } = useOnboardingStep('development-comparison');
  
  // Animation values
  const withoutProgress = useSharedValue(0);
  const withProgress = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Start animations after component mounts
    const timer = setTimeout(() => {
      // Animate both bars simultaneously - fast start, smooth end
      withoutProgress.value = withTiming(0.2, { 
        duration: 1200, 
        easing: Easing.out(Easing.cubic) 
      });
      withProgress.value = withTiming(1, { 
        duration: 1400, 
        easing: Easing.out(Easing.cubic) 
      });
      
      // Show text after bars finish (faster)
      textOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const withoutBarStyle = useAnimatedStyle(() => {
    return {
      height: withoutProgress.value * 200, // 20% of 200px = 40px
    };
  });

  const withBarStyle = useAnimatedStyle(() => {
    return {
      height: withProgress.value * 110, // 100% of 110px = 110px
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
    };
  });

  const handleContinue = async () => {
    haptics.light();
    
    try {
      await analyticsService.logEvent('AA_14_5_development_comparison_continue', {
        screen_name: 'development_comparison'
      });
      console.log('Analytics event logged successfully');
    } catch (error) {
      console.log('Analytics error:', error);
    }
    
    // NEW: Use the automatic navigation instead of hardcoded route!
    goToNext();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection - no need to manually specify numbers! */}
      <OnboardingHeader screenId="development-comparison" />

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
              textAlign: 'left',
              marginBottom: 8,
            }
          ]} allowFontScaling={false}>
            Develop twice as fast with BallerAI vs on your own
          </Text>
        </View>

        {/* Content */}
        <View style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingBottom: 120,
          justifyContent: 'center',
          alignItems: 'center',
        }}>

          {/* Comparison Chart */}
          <View style={{
            width: '100%',
            maxWidth: 320,
            backgroundColor: '#E8E8E8',
            borderRadius: 20,
            padding: 32,
          }}>
            {/* Bar Chart */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'flex-end',
              height: 180,
              marginBottom: 30,
              paddingHorizontal: 20,
              gap: 25,
            }}>
              {/* Without BallerAI Bar */}
              <View style={{ 
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
              }}>
                <View style={{
                  width: 110,
                  height: 180,
                  backgroundColor: colors.white,
                  borderRadius: 12,
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  overflow: 'hidden',
                  paddingTop: 12,
                  paddingBottom: 12,
                }}>
                  {/* Header with text and logo */}
                  <View style={{
                    alignItems: 'center',
                    zIndex: 2,
                  }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.black,
                      marginBottom: 6,
                      textAlign: 'center',
                    }}>
                      Without
                    </Text>
                    <Image 
                      source={require('../../assets/images/BallerAILogo.png')}
                      style={{
                        width: 50,
                        height: 25,
                        resizeMode: 'contain',
                      }}
                    />
                  </View>

                  {/* Animated fill - only fills bottom 60% of bar */}
                  <Animated.View style={[
                    {
                      position: 'absolute',
                      left: 0,
                      bottom: 0,
                      width: '100%',
                      backgroundColor: '#C0C0C0',
                      borderRadius: 12,
                      maxHeight: 200, // Fills higher to center on 20% text
                    },
                    withoutBarStyle
                  ]} />
                  
                  {/* Percentage text */}
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: colors.black,
                    zIndex: 1,
                  }}>
                    20%
                  </Text>
                </View>
              </View>

              {/* With BallerAI Bar */}
              <View style={{ 
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
              }}>
                <View style={{
                  width: 110,
                  height: 180,
                  backgroundColor: colors.white,
                  borderRadius: 12,
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  overflow: 'hidden',
                  paddingTop: 12,
                  paddingBottom: 12,
                }}>
                  {/* Header with text and logo */}
                  <View style={{
                    alignItems: 'center',
                    zIndex: 2,
                  }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.black,
                      marginBottom: 6,
                      textAlign: 'center',
                    }}>
                      With
                    </Text>
                    <Image 
                      source={require('../../assets/images/BallerAILogo.png')}
                      style={{
                        width: 50,
                        height: 25,
                        resizeMode: 'contain',
                      }}
                    />
                  </View>

                  {/* Animated fill - only fills bottom 60% of bar */}
                  <Animated.View style={[
                    {
                      position: 'absolute',
                      left: 0,
                      bottom: 0,
                      width: '100%',
                      backgroundColor: '#000000',
                      borderRadius: 12,
                      maxHeight: 110, // Doesn't cover logo area
                    },
                    withBarStyle
                  ]} />
                  
                  {/* Percentage text */}
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: colors.white,
                    zIndex: 1,
                  }}>
                    2X
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom Text Inside Box */}
            <Animated.Text style={[
              {
                fontSize: 18,
                color: colors.mediumGray,
                textAlign: 'center',
                lineHeight: 26,
                paddingHorizontal: 12,
              },
              textStyle
            ]}>
              BallerAI makes it easy and holds you accountable.
            </Animated.Text>
          </View>
        </View>
      </Animated.View>

      {/* Static Continue Button */}
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