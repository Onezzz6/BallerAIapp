import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';

const ACTIVITY_LEVELS = [
  {
    id: 'sedentary',
    title: 'Sedentary',
    description: 'No exercise, desk job',
  },
  {
    id: 'light',
    title: 'Lightly Active',
    description: '1-3 days/week',
  },
  {
    id: 'moderate',
    title: 'Moderately Active',
    description: '3-5 days/week',
  },
  {
    id: 'very',
    title: 'Very Active',
    description: '6-7 days/week',
  },
  {
    id: 'extra',
    title: 'Extra Active',
    description: 'Training 2x per day',
  },
];

export default function ActivityLevelScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState(onboardingData.activityLevel || '');

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
        currentStep={12}
        totalSteps={12}
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
          What's your activity level?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {ACTIVITY_LEVELS.map((level) => (
            <Pressable
              key={level.id}
              onPress={() => setSelected(level.id)}
              style={({ pressed }) => ({
                width: '100%',
                padding: 20,
                backgroundColor: selected === level.id ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selected === level.id ? '#99E86C' : '#E5E5E5',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{
                fontSize: 18,
                color: '#000000',
                fontWeight: '600',
                marginBottom: 4,
              }}>
                {level.title}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#666666',
              }}>
                {level.description}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button 
          title="Continue" 
          onPress={async () => {
            if (selected) {
              await updateOnboardingData({ activityLevel: selected });
              router.push('/sleep-hours');
            }
          }}
          buttonStyle={{
            backgroundColor: '#007AFF',
            opacity: !selected ? 0.5 : 1,
          }}
          disabled={!selected}
        />
      </View>
    </Animated.View>
  );
} 