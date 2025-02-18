import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';

export default function NutritionScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [focusedOnNutrition, setFocusedOnNutrition] = useState<boolean | null>(onboardingData.nutrition === 'true' ? true : onboardingData.nutrition === 'false' ? false : null);

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={14}
        totalSteps={20}
      />
      
      <View style={{
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 32,
      }}>
        <Text style={{
          fontSize: 28,
          color: '#000000',
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: 20,
        }}>
          Have you focused on your nutrition yet?
        </Text>

        <View style={{
          flexDirection: 'row',
          gap: 16,
        }}>
          {[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ].map((option) => (
            <Pressable
              key={option.label}
              onPress={() => setFocusedOnNutrition(option.value)}
              style={({ pressed }) => ({
                flex: 1,
                height: 60,
                backgroundColor: focusedOnNutrition === option.value ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: focusedOnNutrition === option.value ? '#99E86C' : '#E5E5E5',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{
                fontSize: 18,
                color: '#000000',
                fontWeight: '500',
              }}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button 
          title="Continue" 
          onPress={async () => {
            if (focusedOnNutrition !== null) {
              await updateOnboardingData({ nutrition: focusedOnNutrition.toString() });
              router.push('/smartwatch');
            }
          }}
          buttonStyle={{
            backgroundColor: '#007AFF',
            opacity: focusedOnNutrition === null ? 0.5 : 1,
          }}
          disabled={focusedOnNutrition === null}
        />
      </View>
    </Animated.View>
  );
} 