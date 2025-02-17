import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';

const IMPROVEMENTS = [
  {
    id: 'speed',
    title: 'Speed',
  },
  {
    id: 'strength',
    title: 'Strength',
  },
  {
    id: 'endurance',
    title: 'Endurance',
  },
  {
    id: 'technical',
    title: 'Technical skills',
  },
  {
    id: 'everything',
    title: 'Everything',
  },
];

export default function ImprovementFocusScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.improvementFocus);

  const handleContinue = async () => {
    if (selected) {
      await updateOnboardingData({ improvementFocus: selected });
      router.push('/training-frequency');
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
        currentStep={3}
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
          What do you want to improve most?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {IMPROVEMENTS.map((area) => (
            <Pressable
              key={area.id}
              onPress={() => setSelected(area.id)}
              style={({ pressed }) => ({
                width: '100%',
                padding: 20,
                backgroundColor: selected === area.id ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selected === area.id ? '#99E86C' : '#E5E5E5',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{
                fontSize: 18,
                color: '#000000',
                fontWeight: '600',
              }}>
                {area.title}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button 
          title="Continue" 
          onPress={handleContinue}
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