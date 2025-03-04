import { View, Text, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';

export default function MeasurementsScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [height, setHeight] = useState(onboardingData.height || '');
  const [weight, setWeight] = useState(onboardingData.weight || '');

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View 
          entering={FadeIn.duration(500)}
          style={{
            flex: 1,
            backgroundColor: '#ffffff',
          }}
        >
          <OnboardingHeader 
            currentStep={4}
            totalSteps={20}
          />

          <ScrollView 
            contentContainerStyle={{
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
          >
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
                Your measurements?
              </Text>

              <View style={{
                width: '100%',
                gap: 16,
              }}>
                <View>
                  <Text style={{
                    fontSize: 18,
                    color: '#666666',
                    marginBottom: 8,
                  }}>
                    Height (cm)
                  </Text>
                  <TextInput
                    value={height}
                    onChangeText={setHeight}
                    placeholder="Height (cm)"
                    keyboardType="numeric"
                    style={{
                      width: '100%',
                      height: 50,
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      fontSize: 16,
                      backgroundColor: '#F8F8F8',
                    }}
                    maxLength={3}
                  />
                </View>

                <View>
                  <Text style={{
                    fontSize: 18,
                    color: '#666666',
                    marginBottom: 8,
                  }}>
                    Weight (kg)
                  </Text>
                  <TextInput
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="Weight (kg)"
                    keyboardType="numeric"
                    style={{
                      width: '100%',
                      height: 50,
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      fontSize: 16,
                      backgroundColor: '#F8F8F8',
                    }}
                    maxLength={3}
                  />
                </View>
              </View>

              <Button 
                title="Continue" 
                onPress={async () => {
                  if (height && weight) {
                    await updateOnboardingData({ height, weight });
                    router.push('/dominant-foot');
                  }
                }}
              />
            </View>
          </ScrollView>
        </Animated.View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
} 