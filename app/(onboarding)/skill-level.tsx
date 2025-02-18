import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';

const SKILL_LEVELS = [
  {
    id: 'beginner',
    title: 'Starting out',
    description: 'New to football',
  },
  {
    id: 'average',
    title: 'Average',
    description: 'Average for your age group',
  },
  {
    id: 'elite',
    title: 'Elite',
    description: 'Elite for your age group',
  },
];

export default function SkillLevelScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.skillLevel);

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={7}
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
          What's your current level?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {SKILL_LEVELS.map((level) => (
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
              await updateOnboardingData({ skillLevel: selected });
              router.push('/position');
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