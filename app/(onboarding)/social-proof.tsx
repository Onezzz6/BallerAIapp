import { View, Text, Image, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeInUp } from 'react-native-reanimated';
import { useEffect } from 'react';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import analytics from '@react-native-firebase/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';

export default function SocialProofScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  // Log social proof screen event when screen loads
  useEffect(() => {
    const logSocialProofEvent = async () => {
      try {
        await analytics().logEvent('25proof');
        console.log("Analytics event '25proof' logged.");
      } catch (error) {
        console.error("Error logging '25proof' event:", error);
      }
    };
    logSocialProofEvent();
  }, []);

  const socialProofImages = [
    require('../../assets/images/r1.png'),
    require('../../assets/images/r2.png'),
    require('../../assets/images/r3.png'),
    require('../../assets/images/r4.png'),
    require('../../assets/images/r5.png'),
    require('../../assets/images/r6.png'),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <OnboardingHeader 
        currentStep={26}
        totalSteps={29}
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
            await analytics().logEvent('onboarding_social_proof_continue');
            router.push('/motivation-reason');
          }}
        />
      </View>
    </SafeAreaView>
  );
} 