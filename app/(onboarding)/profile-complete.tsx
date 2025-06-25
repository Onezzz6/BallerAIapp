import { View, Text, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import * as StoreReview from 'expo-store-review';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import analytics from '@react-native-firebase/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';

export default function ProfileCompleteScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const handleGetStarted = async () => {
    haptics.light();
    
    // Request App Store rating instantly
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
        await analytics().logEvent('app_store_review_requested');
        // Small delay to let review dialog appear
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.log('Store review request failed:', error);
    }
    
    await analytics().logEvent('onboarding_profile_complete');
    router.push('/sign-up');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <OnboardingHeader 
        currentStep={28}
        totalSteps={28}
      />

      <Animated.View 
        entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{
          flex: 1,
          backgroundColor: colors.backgroundColor,
        }}
      >

        {/* All done badge */}
        <View style={{
          paddingHorizontal: 24,
          paddingTop: 40,
          alignItems: 'center',
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFF3CD',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            marginBottom: 20,
          }}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>✅</Text>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#856404',
            }}>
              All done!
            </Text>
          </View>
        </View>

        {/* Main content */}
        <View style={{
          paddingHorizontal: 24,
          paddingBottom: 64,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Success illustration - hand with checkmark */}
          <View style={{
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 32,
            position: 'relative',
          }}>
            {/* Gradient background circles */}
            <View style={{
              position: 'absolute',
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
            }} />
            <View style={{
              position: 'absolute',
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
            }} />
            
            {/* Hand with checkmark */}
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 80 }}>🏆</Text>
              <View style={{
                position: 'absolute',
                bottom: 10,
                right: 5,
              }}>
                <Text style={{ fontSize: 24 }}>✅</Text>
              </View>
            </View>

            {/* Success dots around */}
            {Array.from({ length: 8 }).map((_, index) => {
              const angle = (index * 45) * (Math.PI / 180);
              const radius = 85;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              
              return (
                <View
                  key={index}
                  style={{
                    position: 'absolute',
                    left: 100 + x - 3,
                    top: 100 + y - 3,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#22C55E',
                    opacity: 0.8,
                  }}
                />
              );
            })}
          </View>

          {/* Title */}
          <Text style={[
            typography.title,
            {
              textAlign: 'center',
              marginBottom: 16,
              fontSize: 28,
            }
          ]} allowFontScaling={false}>
            Congrats! Your personalized{'\n'}account is ready
          </Text>

          {/* Subtitle */}
          <Text style={[
            typography.subtitle,
            {
              textAlign: 'center',
              fontSize: 18,
              color: colors.mediumGray,
              lineHeight: 24,
            }
          ]}>
            Take the first step towards{'\n'}going pro
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
          title="Let's get started" 
          onPress={handleGetStarted}
        />
      </View>
    </SafeAreaView>
  );
} 