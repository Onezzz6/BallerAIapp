import { View, Text, TextInput, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState, useEffect, useRef } from 'react';
import analytics from '@react-native-firebase/analytics';
import { colors, typography, spacing } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { Animated as RNAnimated } from 'react-native';
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import analyticsService from '../services/analytics';

export default function UsernameScreen() {
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [username, setUsername] = useState(onboardingData.username || '');
  const headerHeight = useOnboardingHeaderHeight();
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('username');
  
  // Animated value for button bottom position
  const buttonBottomPosition = useRef(new RNAnimated.Value(32)).current;
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleContinue = async () => {
    if (username.trim()) {
      haptics.light();
      await analyticsService.logEvent('AA__09_username_continue');
      await updateOnboardingData({ username: username.trim() });
      // NEW: Use automatic navigation instead of hardcoded route
      goToNext();
    }
  };

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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <SafeAreaView 
          style={{
            flex: 1,
            backgroundColor: colors.backgroundColor,
          }}
        >
          {/* NEW: Automatic step detection */}
          <OnboardingHeader screenId="username" />

          <Animated.View 
            entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
            style={{
              flex: 1,
              backgroundColor: colors.backgroundColor,
            }}
          >
            <View style={{
              flex: 1,
              paddingHorizontal: 24,
              paddingBottom: 24,
            }}>
              {/* Fixed Title Section - Locked at top like reference */}
              <View style={{
                paddingTop: headerHeight,
                paddingBottom: 20,
              }}>
                <Text style={[
                  typography.title,
                  {
                    textAlign: 'left',
                    marginBottom: 8,
                  }
                ]} allowFontScaling={false}>
                  What should we call you?
                </Text>
                <Text style={[
                  typography.subtitle,
                  {
                    fontSize: 16,
                    color: colors.mediumGray,
                  }
                ]}>
                  This will be used to personalize your experience.
                </Text>
              </View>

              {/* Centered Content Section */}
              <View style={{
                flex: 1,
                alignItems: 'center',
              }}>
                <TextInput
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                  }}
                  placeholder="Enter your name"
                  style={{
                    width: '100%',
                    height: 60,
                    borderWidth: 1,
                    borderColor: colors.borderColor,
                    borderRadius: 12,
                    paddingHorizontal: spacing.md,
                    fontSize: 16,
                    backgroundColor: colors.inputBackground,
                  }}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={dismissKeyboard}
                />
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
              disabled={!username.trim()}
            />
          </RNAnimated.View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
} 