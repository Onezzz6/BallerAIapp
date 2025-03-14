import { View, Text, TextInput, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState, useEffect } from 'react';

export default function MotivationReasonScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [motivation, setMotivation] = useState(onboardingData.motivation || '');

  // Update local state when onboardingData changes
  useEffect(() => {
    setMotivation(onboardingData.motivation || '');
  }, [onboardingData.motivation]);

  const handleContinue = async () => {
    if (motivation.trim()) {
      await updateOnboardingData({ motivation: motivation.trim() });
      router.push('/account-ready');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <Animated.View 
        entering={FadeIn.duration(500)}
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
        }}
      >
        <OnboardingHeader 
          currentStep={20}
          totalSteps={20}
        />
        
        <View style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 80,
          paddingBottom: 24,
          justifyContent: 'top',
          alignItems: 'left',
          gap: 48,
        }}>
          <Text style={{
            fontSize: 28,
            color: '#000000',
            fontWeight: '600',
            textAlign: 'left',
          }} allowFontScaling={false}>
            Lastly, the most important part of becoming a pro!
          </Text>

          <Text style={{
            fontSize: 18,
            color: '#000000',
            fontWeight: '500',
            textAlign: 'left',
          }}>
            Tell me briefly, what drives you on this journey?
          </Text>

          <TextInput
            value={motivation}
            onChangeText={setMotivation}
            placeholder="Type your answer here..."
            multiline
            numberOfLines={4}
            style={{
              width: '100%',
              minHeight: 120,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#E5E5E5',
              padding: 16,
              fontSize: 16,
              textAlignVertical: 'top',
            }}
          />

          <Button 
            title="Continue" 
            onPress={handleContinue}
            buttonStyle={{
              backgroundColor: '#4064F6',
              opacity: !motivation.trim() ? 0.5 : 1,
            }}
            disabled={!motivation.trim()}
          />
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
} 