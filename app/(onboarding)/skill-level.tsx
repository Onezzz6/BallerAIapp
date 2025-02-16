import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
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
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedLevel) {
      console.log('Navigating to position screen...');
      router.push('./position');
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
        totalSteps={5}
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
          What's your current level in football?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {SKILL_LEVELS.map((level) => (
            <Pressable
              key={level.id}
              onPress={() => setSelectedLevel(level.id)}
              style={({ pressed }) => ({
                width: '100%',
                padding: 20,
                backgroundColor: selectedLevel === level.id ? '#E8F0FE' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedLevel === level.id ? '#007AFF' : '#E5E5E5',
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
                color: selectedLevel === level.id ? '#007AFF' : '#000000',
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
          onPress={handleContinue}
        />
      </View>
    </Animated.View>
  );
} 