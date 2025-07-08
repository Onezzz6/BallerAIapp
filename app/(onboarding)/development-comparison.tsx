import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, SafeAreaView } from 'react-native';
import Animated, { 
  FadeInRight, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withDelay,
  runOnJS,
  Easing,
  cancelAnimation
} from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import analyticsService from '../services/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import { useFocusEffect } from '@react-navigation/native';

export default function DevelopmentComparisonScreen() {
  const haptics = useHaptics();
  const headerHeight = useOnboardingHeaderHeight();
  // NEW: Use the onboarding step hook - automatically handles step numbers and navigation!
  const { goToNext } = useOnboardingStep('development-comparison');
  
  // Create a unique key for this component instance
  const [componentKey] = useState(() => Math.random().toString());
  
  // Animation values
  const withoutProgress = useSharedValue(0);
  const withProgress = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Cancel any ongoing animations immediately
    cancelAnimation(withoutProgress);
    cancelAnimation(withProgress);
    cancelAnimation(textOpacity);
    
    // Force reset all animation values to initial state
    withoutProgress.value = 0;
    withProgress.value = 0;
    textOpacity.value = 0;
    
    // Start animations after component mounts
    const timer = setTimeout(() => {
      // Animate both bars simultaneously - starts slow then accelerates
      withoutProgress.value = withTiming(0.2, { 
        duration: 800, 
        easing: Easing.in(Easing.cubic) 
      });
      withProgress.value = withTiming(1, { 
        duration: 1000, 
        easing: Easing.in(Easing.cubic) 
      });
      
      // Add haptic feedback when blocks finish filling
      setTimeout(() => {
        haptics.light();
      }, 1000);
      
      // Show text as animations are almost finished
      textOpacity.value = withDelay(900, withTiming(1, { duration: 300 }));
    }, 500);

    return () => {
      clearTimeout(timer);
      // Cancel animations when component unmounts
      cancelAnimation(withoutProgress);
      cancelAnimation(withProgress);
      cancelAnimation(textOpacity);
    };
  }, [componentKey]); // Depend on componentKey to ensure fresh start

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
      await analyticsService.logEvent('AA__25_development_comparison_continue', {
        screen_name: 'development_comparison'
      });
    } catch (error) {
      console.log('Analytics error:', error);
    }
    
    // NEW: Use the automatic navigation instead of hardcoded route!
    goToNext();
  };

  return (
    <SafeAreaView key={`development-comparison-${componentKey}`} style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection - no need to manually specify numbers! */}
      <OnboardingHeader screenId="development-comparison" />

      <Animated.View 
        key="comparison-content"
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
              textAlign: 'left',
              marginBottom: 8,
            }
          ]} allowFontScaling={false}>
            Develop twice as fast with BallerAI
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
            backgroundColor: '#F8F8F8',
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
                  <Animated.Text key="without-text" style={[
                    {
                      fontSize: 18,
                      fontWeight: '700',
                      color: colors.black,
                      zIndex: 1,
                    },
                    textStyle
                  ]}>
                    20%
                  </Animated.Text>
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
                      backgroundColor: 'rgba(153, 232, 108, 1)',
                      borderRadius: 12,
                      maxHeight: 110, // Doesn't cover logo area
                    },
                    withBarStyle
                  ]} />
                  
                  {/* Percentage text */}
                  <Animated.Text key="with-text" style={[
                    {
                      fontSize: 18,
                      fontWeight: '700',
                      color: colors.black,
                      zIndex: 1,
                    },
                    textStyle
                  ]}>
                    2X
                  </Animated.Text>
                </View>
              </View>
            </View>

            {/* Bottom Text Inside Box */}
            <Animated.Text key="bottom-text" style={[
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