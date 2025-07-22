import { View, Text, SafeAreaView, Image } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import analyticsService from '../services/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';

export default function AppReviewScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const [canContinue, setCanContinue] = useState(false);
  const [reviewTriggered, setReviewTriggered] = useState(false);
  
  // Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('app-review');

  // Auto-trigger review after 2 seconds
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!reviewTriggered) {
        setReviewTriggered(true);
        await handleAutoReview();
      }
    }, 2000);

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

  const handleReviewRequest = async () => {
    haptics.light();
    
    if (!reviewTriggered) {
      setReviewTriggered(true);
      await handleAutoReview();
    }
    
    await analyticsService.logEvent('AA__review_page_completed');
    
    // Continue to next step
    goToNext();
  };

  const handleSkip = async () => {
    haptics.light();
    await analyticsService.logEvent('AA__review_page_skipped');
    goToNext();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <OnboardingHeader screenId="app-review" />

      <Animated.View 
        entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{
          flex: 1,
          padding: 24,
          backgroundColor: '#ffffff',
          justifyContent: 'center',
        }}
      >
        {/* Main content */}
        <View style={{
          alignItems: 'center',
          marginBottom: 48,
        }}>
          {/* Star icons */}
          <View style={{
            flexDirection: 'row',
            marginBottom: 24,
          }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Text key={star} style={{ fontSize: 32, marginHorizontal: 4 }}>⭐</Text>
            ))}
          </View>

          <Text style={[
            typography.title,
            {
              textAlign: 'center',
              fontSize: 28,
              color: colors.black,
              lineHeight: 34,
              marginBottom: 16,
            }
          ]} allowFontScaling={false}>
            Loving BallerAI so far?
          </Text>
          
          <Text style={[
            typography.body,
            {
              textAlign: 'center',
              fontSize: 16,
              color: '#666666',
              lineHeight: 24,
              paddingHorizontal: 20,
            }
          ]} allowFontScaling={false}>
            Help other players discover their potential by leaving us a quick review on the App Store!
          </Text>
        </View>

        {/* Buttons */}
        <View style={{ gap: 16 }}>
          <Button 
            title={canContinue ? "⭐ Rate BallerAI" : "Loading..."} 
            onPress={handleReviewRequest}
            disabled={!canContinue}
            containerStyle={{
              backgroundColor: canContinue ? '#4064F6' : '#CCCCCC',
            }}
            textStyle={{
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: '600',
            }}
          />
          
          <Button 
            title={canContinue ? "Continue" : "Please wait..."} 
            onPress={handleSkip}
            disabled={!canContinue}
            containerStyle={{
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: canContinue ? '#E5E5E5' : '#CCCCCC',
            }}
            textStyle={{
              color: canContinue ? '#666666' : '#CCCCCC',
              fontSize: 16,
              fontWeight: '500',
            }}
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
} 