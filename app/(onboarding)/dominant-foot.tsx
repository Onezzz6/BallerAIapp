import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';

export default function DominantFootScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selectedFoot, setSelectedFoot] = useState(onboardingData.dominantFoot || '');

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
        currentStep={5}
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
          Which is your dominant foot?
        </Text>

        <View style={{
          flexDirection: 'row',
          gap: 16,
        }}>
          {[
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ].map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setSelectedFoot(option.value)}
              style={({ pressed }) => ({
                flex: 1,
                height: 60,
                backgroundColor: selectedFoot === option.value ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedFoot === option.value ? '#99E86C' : '#E5E5E5',
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
            if (selectedFoot) {
              await updateOnboardingData({ dominantFoot: selectedFoot });
              router.push('/injury-history');
            }
          }}
        />
      </View>
    </Animated.View>
  );
} 