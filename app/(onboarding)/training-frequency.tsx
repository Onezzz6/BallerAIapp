import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';

const FREQUENCY_OPTIONS = [
  {
    id: '1-2',
    title: '1-2 days',
  },
  {
    id: '2-4',
    title: '2-4 days',
  },
  {
    id: '4-6',
    title: '4-6 days',
  },
  {
    id: '7+',
    title: '7+ days',
  },
];

export default function TrainingFrequencyScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.trainingFrequency);

  const handleContinue = async () => {
    if (selected) {
      await updateOnboardingData({ trainingFrequency: selected });
      router.push('/gym-access');
    }
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={18}
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
          How many days a week do you train football?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {FREQUENCY_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setSelected(option.id)}
              style={({ pressed }) => ({
                width: '100%',
                padding: 20,
                backgroundColor: selected === option.id ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selected === option.id ? '#99E86C' : '#E5E5E5',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{
                fontSize: 18,
                color: '#000000',
                fontWeight: '600',
              }}>
                {option.title}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button 
          title="Continue" 
          onPress={handleContinue}
          buttonStyle={{
            backgroundColor: '#4064F6',
            opacity: !selected ? 0.5 : 1,
          }}
          disabled={!selected}
        />
      </View>
    </Animated.View>
  );
} 