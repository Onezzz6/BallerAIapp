import { View, Text, SafeAreaView, Image, ScrollView } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import Button from '../components/Button';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import analyticsService from '../services/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';

export default function AppReviewScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const [canContinue, setCanContinue] = useState(false);
  const [reviewTriggered, setReviewTriggered] = useState(false);
  const headerHeight = useOnboardingHeaderHeight();
  
  // Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('app-review');

  // Auto-trigger review after 1.5 seconds
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!reviewTriggered) {
        setReviewTriggered(true);
        await handleAutoReview();
      }
    }, 1500); // Changed to 1500ms (1.5 seconds)

    return () => clearTimeout(timer);
  }, [reviewTriggered]);

  const handleAutoReview = async () => {
    // Request App Store rating automatically
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
        await analyticsService.logEvent('AA__99_app_store_review_requested');
        // Small delay to let review dialog appear
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.log('Store review request failed:', error);
    }
    
    // Enable continue button after review prompt
    setCanContinue(true);
  };

  const handleContinue = async () => {
    haptics.light();
    await analyticsService.logEvent('AA__review_page_completed');
    goToNext();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <OnboardingHeader screenId="app-review" />

      <ScrollView style={{ flex: 1 }}>
        <Animated.View
          entering={FadeInRight.delay(200)}
          style={{
            flex: 1,
            backgroundColor: colors.backgroundColor,
          }}
        >
          {/* Fixed Title Section - Same as referral-code.tsx */}
          <View style={{
            paddingHorizontal: 24,
            paddingTop: headerHeight,
          }}>
            <Text style={[
              typography.title,
              {
                textAlign: 'left',
                marginBottom: 24,
              }
            ]} allowFontScaling={false}>
              Give us a rating!
            </Text>
          </View>

          <View style={{
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 120,
          }}>
            {/* Clean Lottie Animation - No container or text */}
            <View style={{
              alignItems: 'center',
              marginBottom: 40,
            }}>
              <LottieView
                source={require('../../assets/animations/Review.json')}
                autoPlay
                loop
                style={{
                  width: 140,
                  height: 140,
                }}
              />
            </View>

            {/* Social proof section */}
            <Text style={{
              fontSize: 24,
              fontWeight: '600',
              color: colors.black,
              textAlign: 'center',
              marginBottom: 16,
            }}>
              BallerAI was made{'\n'}for people like you
            </Text>

            {/* Profile pictures - young footballers */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 32,
            }}>
              <Image
                source={require('../../assets/images/onni.jpg')}
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  marginRight: -15,
                  borderWidth: 3,
                  borderColor: 'white',
                }}
                resizeMode="cover"
              />
              <Image
                source={require('../../assets/images/girl.png')}
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  marginRight: -15,
                  borderWidth: 3,
                  borderColor: 'white',
                }}
                resizeMode="cover"
              />
              <Image
                source={require('../../assets/images/elkku.jpg')}
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  borderWidth: 3,
                  borderColor: 'white',
                }}
                resizeMode="cover"
              />
            </View>

            {/* Testimonials - Only 2, improved design */}
            <View style={{ marginBottom: 40 }}>
              {/* First Testimonial - Rebecca */}
              <View style={{
                flexDirection: 'row',
                paddingVertical: 20,
                paddingHorizontal: 16,
                backgroundColor: '#F7F7F7',
                borderRadius: 16,
                marginBottom: 16,
                alignItems: 'flex-start',
              }}>
                <Image
                  source={require('../../assets/images/rebe.png')}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 24,
                    marginRight: 12,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}>
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: colors.black,
                    }} allowFontScaling={false}>
                      Rebecca Viljamaa
                    </Text>
                    <View style={{ flexDirection: 'row' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={{ fontSize: 14, color: '#FFD700' }} allowFontScaling={false}>⭐</Text>
                      ))}
                    </View>
                  </View>
                  <Text style={{
                    fontSize: 14,
                    color: '#666',
                    lineHeight: 20,
                  }} allowFontScaling={false}>
                    I’ve been injury-free ever since I started using BallerAI’s load management tools! It’s been amazing so far and I feel better than ever on the pitch. :)
                  </Text>
                </View>
              </View>

              {/* Second Testimonial - Young footballer */}
              <View style={{
                flexDirection: 'row',
                paddingVertical: 20,
                paddingHorizontal: 16,
                backgroundColor: '#F7F7F7',
                borderRadius: 16,
                alignItems: 'flex-start',
              }}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=150&h=150&fit=crop&crop=face' }}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 24,
                    marginRight: 12,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}>
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: colors.black,
                    }} allowFontScaling={false}>
                      Alex Chen
                    </Text>
                    <View style={{ flexDirection: 'row' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={{ fontSize: 14, color: '#FFD700' }} allowFontScaling={false}>⭐</Text>
                      ))}
                    </View>
                  </View>
                  <Text style={{
                    fontSize: 14,
                    color: '#666',
                    lineHeight: 20,
                  }} allowFontScaling={false}>
                    My coach says my performance has improved dramatically since using BallerAI. The training plans are perfect for my level!
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Fixed Bottom Button - Blue like other tabs */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 48,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
      }}>
        <Button 
          title="Continue" 
          onPress={handleContinue}
          disabled={!canContinue}
          buttonStyle={{
            backgroundColor: canContinue ? '#4064F6' : '#CCCCCC',
            borderRadius: 36,
            paddingVertical: 16,
          }}
          textStyle={{
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: '600',
          }}
        />
      </View>
    </SafeAreaView>
  );
} 