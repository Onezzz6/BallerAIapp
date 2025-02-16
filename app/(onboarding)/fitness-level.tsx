import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useState } from 'react';

const FITNESS_LEVELS = [
  {
    id: 'out-of-shape',
    title: 'Out of shape',
  },
  {
    id: 'average',
    title: 'Average',
  },
  {
    id: 'athletic',
    title: 'Athletic',
  },
  {
    id: 'elite',
    title: 'Elite',
  },
];

export default function FitnessLevelScreen() {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

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
          What's your current fitness level?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {FITNESS_LEVELS.map((level) => (
            <Pressable
              key={level.id}
              onPress={() => setSelectedLevel(level.id)}
              style={({ pressed }) => ({
                width: '100%',
                height: 60,
                backgroundColor: selectedLevel === level.id ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedLevel === level.id ? '#99E86C' : '#E5E5E5',
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
                {level.title}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button 
          title="Continue" 
          onPress={() => {
            if (selectedLevel) {
              router.push('/activity-level');
            }
          }}
        />
      </View>
    </Animated.View>
  );
} 