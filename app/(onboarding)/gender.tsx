import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';

export default function GenderScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selectedGender, setSelectedGender] = useState(onboardingData.gender || '');

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={2}
        totalSteps={5}
      />
      
      <View style={{
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 24,
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
          What's your gender?
        </Text>

        <View style={{
          flexDirection: 'row',
          gap: 16,
        }}>
          {[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ].map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setSelectedGender(option.value)}
              style={({ pressed }) => ({
                flex: 1,
                height: 60,
                backgroundColor: selectedGender === option.value ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedGender === option.value ? '#99E86C' : '#E5E5E5',
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
            if (selectedGender) {
              await updateOnboardingData({ gender: selectedGender });
              router.push('/age');
            }
          }}
        />
      </View>
    </Animated.View>
  );
} 