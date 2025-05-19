import { View, Text, TextInput, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState, useEffect } from 'react';
import ScrollIfNeeded from '../components/ScrollIfNeeded';

export default function MotivationReasonScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [motivation, setMotivation] = useState(onboardingData.motivation || '');
  const CHARACTER_LIMIT = 100;

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
      <ScrollIfNeeded 
        style={{
          backgroundColor: '#ffffff',
        }}
      >
        <OnboardingHeader 
          currentStep={20}
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
            gap: 12,
          }}>
            <Text style={{
              fontSize: 28,
              color: '#000000',
              fontWeight: '600',
              textAlign: 'left',
            }} allowFontScaling={false}>
              The most important part of going a pro!
            </Text>

            <Text style={{
              fontSize: 18,
              color: '#000000',
              fontWeight: '500',
              textAlign: 'left',
              marginTop: 32,
            }} allowFontScaling={false}>
              Tell me briefly, what drives you on this journey?
            </Text>

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

            <View style={{ width: '100%' }}>
              <Button 
                title="Continue" 
                onPress={handleContinue}
                buttonStyle={{
                  backgroundColor: '#4064F6',
                }}
                disabled={!motivation.trim()}
              />
            </View>
          </View>
        </Animated.View>
      </ScrollIfNeeded>
    </TouchableWithoutFeedback>
  );
} 