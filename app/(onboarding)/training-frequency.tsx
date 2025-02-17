import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
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
  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(null);

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={6}
        totalSteps={7}
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
          How many days per week do you train football currently?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {FREQUENCY_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setSelectedFrequency(option.id)}
              style={({ pressed }) => ({
                width: '100%',
                padding: 20,
                backgroundColor: selectedFrequency === option.id ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedFrequency === option.id ? '#99E86C' : '#E5E5E5',
                opacity: pressed ? 0.9 : 1,
                shadowColor: '#000000',
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
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
          onPress={() => {
            if (selectedFrequency) {
              router.push('/gym-access');
            }
          }}
        />
      </View>
    </Animated.View>
  );
} 