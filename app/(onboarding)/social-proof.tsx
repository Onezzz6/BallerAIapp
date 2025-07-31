import { View, Text, Image, ScrollView, SafeAreaView } from 'react-native';
import Animated, { FadeInRight, FadeInUp } from 'react-native-reanimated';
import { useEffect } from 'react';
import Button from '../components/Button';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import analyticsService from '../services/analytics';

export default function SocialProofScreen() {
  const haptics = useHaptics();
  const headerHeight = useOnboardingHeaderHeight();
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('social-proof');

  const socialProofImages = [
    require('../../assets/images/r1.jpg'),
    require('../../assets/images/r2.jpg'),
    require('../../assets/images/r3.jpg'),
    require('../../assets/images/r4.jpg'),
    require('../../assets/images/r5.jpg'),
    require('../../assets/images/r6.jpg'),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="social-proof" />

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
              marginBottom: 8,
            }
          ]} allowFontScaling={false}>
            See what players are saying about the newest tech!
          </Text>
        </View>

        <View style={{
          paddingHorizontal: 24,
          paddingBottom: 64,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Social Proof Images Stack */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{
              flex: 1,
              width: '100%',
            }}
            contentContainerStyle={{
              paddingVertical: 20,
              gap: 16,
            }}
          >
            {socialProofImages.map((imageSource, index) => (
              <Animated.View
                key={index}
                entering={FadeInUp.duration(400).delay(100 * (index + 1))}
                style={{
                  width: '100%',
                  borderRadius: 20,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 6,
                  },
                  shadowOpacity: 0.2,
                  shadowRadius: 15,
                  elevation: 8,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                }}
              >
                <Image 
                  source={imageSource}
                  style={{
                    width: '100%',
                    height: undefined,
                    aspectRatio: 1.4,
                    resizeMode: 'contain',
                  }}
                />
              </Animated.View>
            ))}
          </ScrollView>
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
          onPress={async () => {
            haptics.light();
            await analyticsService.logEvent('A0_27_social_proof_continue');
            // NEW: Use automatic navigation instead of hardcoded route
            goToNext();
          }}
        />
      </View>
    </SafeAreaView>
  );
} 