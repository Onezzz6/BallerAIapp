import { 
  View, 
  Text, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView
} from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Animated as RNAnimated } from 'react-native';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState, useEffect, useRef } from 'react';
import analyticsService from '../services/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { useOnboardingStep } from '../hooks/useOnboardingStep';

export default function InjuryHistoryScreen() {
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [injuryHistory, setInjuryHistory] = useState(onboardingData.injuryHistory || '');
  const CHARACTER_LIMIT = 300;
  
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('injury-history');
  
  // Animated value for button bottom position
  const buttonBottomPosition = useRef(new RNAnimated.Value(32)).current;

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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
          {/* NEW: Automatic step detection */}
          <OnboardingHeader screenId="injury-history" />

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
                Brief description of your injury history
              </Text>
            </View>

            <View style={{
              paddingHorizontal: 24,
              paddingBottom: 64,
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <TextInput
                value={injuryHistory}
                onChangeText={(text) => {
                  if (text.length <= CHARACTER_LIMIT) {
                    setInjuryHistory(text);
                  }
                }}
                placeholder="Describe any injuries..."
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
                {injuryHistory.length}/{CHARACTER_LIMIT}
              </Text>
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
              onPress={async () => {
                if (injuryHistory.trim()) {
                  haptics.light();
                  await analyticsService.logEvent('AA_18_injury_history_continue');
                  await updateOnboardingData({ injuryHistory: injuryHistory.trim() });
                  // NEW: Use automatic navigation instead of hardcoded route
                  goToNext();
                }
              }}
              disabled={!injuryHistory.trim()}
            />
          </RNAnimated.View>
         </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
} 