import { 
  View, 
  Text, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';
import analytics from '@react-native-firebase/analytics';
import ScrollIfNeeded from '../components/ScrollIfNeeded';

export default function InjuryHistoryScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [injuryHistory, setInjuryHistory] = useState(onboardingData.injuryHistory || '');
  const CHARACTER_LIMIT = 300;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollIfNeeded 
          style={{
            backgroundColor: '#ffffff',
          }}
        >
          <OnboardingHeader 
            currentStep={6}
            totalSteps={5}
          />

          <Animated.View 
            entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
            }}
          >
            <View style={{
              flex: 1,
              paddingHorizontal: 24,
              paddingTop: 80,
              paddingBottom: 24,
              gap: 48,
              }}>
              <Text style={{
                fontSize: 28,
                color: '#000000',
                fontWeight: '600',
                textAlign: 'left',
              }} allowFontScaling={false}>
                Brief description of your injury history
              </Text>

              <View style={{ width: '100%' }}>
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

              <Button 
                title="Continue" 
                onPress={async () => {
                  if (injuryHistory.trim()) {
                    await analytics().logEvent('onboarding_injury_history_continue');
                    await updateOnboardingData({ injuryHistory: injuryHistory.trim() });
                    router.push('/skill-level');
                  }
                }}
                buttonStyle={{
                  backgroundColor: '#4064F6',
                }}
                disabled={!injuryHistory.trim()}
              />
            </View>
          </Animated.View>
        </ScrollIfNeeded>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
} 