import { View, Text, TextInput, TouchableWithoutFeedback, Keyboard, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Animated as RNAnimated } from 'react-native';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState, useEffect, useRef } from 'react';
import analytics from '@react-native-firebase/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';

export default function MotivationReasonScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [motivation, setMotivation] = useState(onboardingData.motivation || '');
  const CHARACTER_LIMIT = 100;
  
  // Animated value for button bottom position
  const buttonBottomPosition = useRef(new RNAnimated.Value(32)).current;

  // Log motivation reason screen event when screen loads
  useEffect(() => {
    const logMotivationReasonEvent = async () => {
      try {
        await analytics().logEvent('26motivation');
        console.log("Analytics event '26motivation' logged.");
      } catch (error) {
        console.error("Error logging '26motivation' event:", error);
      }
    };
    logMotivationReasonEvent();
  }, []);

  // Update local state when onboardingData changes
  useEffect(() => {
    setMotivation(onboardingData.motivation || '');
  }, [onboardingData.motivation]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const duration = Platform.OS === 'ios' ? event.duration : 250;
        RNAnimated.timing(buttonBottomPosition, {
          toValue: 0,
          duration,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (event) => {
        const duration = Platform.OS === 'ios' ? event.duration : 250;
        RNAnimated.timing(buttonBottomPosition, {
          toValue: 32,
          duration,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, [buttonBottomPosition]);

  const handleContinue = async () => {
    if (motivation.trim()) {
      haptics.light();
      await analytics().logEvent('onboarding_motivation_reason_continue');
      await updateOnboardingData({ motivation: motivation.trim() });
      router.push('/profile-generation');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
          <OnboardingHeader 
            currentStep={27}
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
                  textAlign: 'left',
                  marginBottom: 8,
                }
              ]} allowFontScaling={false}>
                What drives you?
              </Text>
              <Text style={[
                typography.subtitle,
                {
                  fontSize: 18,
                  fontWeight: '500',
                  textAlign: 'left',
                  marginTop: 16,
                }
              ]} allowFontScaling={false}>
                Tell us briefly, what drives you on this journey?
              </Text>
            </View>

            <View style={{
              paddingHorizontal: 24,
              paddingBottom: 64,
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <View style={{ width: '100%' }}>
                <TextInput
                  value={motivation}
                  onChangeText={(text) => {
                    if (text.length <= CHARACTER_LIMIT) {
                      setMotivation(text);
                    }
                  }}
                  placeholder="Type your answer here..."
                  multiline
                  style={{
                    width: '100%',
                    height: 120,
                    borderWidth: 1,
                    borderColor: '#E5E5E5',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    backgroundColor: '#F8F8F8',
                    textAlignVertical: 'top',
                  }}
                />
                <Text style={{
                  fontSize: 14,
                  color: '#666666',
                  textAlign: 'right',
                  marginTop: 8,
                }}>
                  {motivation.length}/{CHARACTER_LIMIT}
                </Text>
              </View>
            </View>
          </Animated.View>

          <RNAnimated.View style={{
            position: 'absolute',
            bottom: buttonBottomPosition,
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
              disabled={!motivation.trim()}
            />
          </RNAnimated.View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
} 