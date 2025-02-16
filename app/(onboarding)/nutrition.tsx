import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useState } from 'react';

export default function NutritionScreen() {
  const router = useRouter();
  const [focusedOnNutrition, setFocusedOnNutrition] = useState<boolean | null>(null);

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 24,
      }}
    >
      <OnboardingHeader 
        currentStep={3}
        totalSteps={5}
      />
      
      <View style={{
        flex: 1,
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
                backgroundColor: focusedOnNutrition === option.value ? '#E8F0FE' : '#F8F8F8',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: focusedOnNutrition === option.value ? '#007AFF' : '#E5E5E5',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{
                fontSize: 18,
                color: focusedOnNutrition === option.value ? '#007AFF' : '#000000',
                fontWeight: '500',
              }}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button 
          title="Continue" 
          onPress={() => {
            if (focusedOnNutrition !== null) {
              router.push('/smartwatch');
            }
          }}
        />
      </View>
    </Animated.View>
  );
} 