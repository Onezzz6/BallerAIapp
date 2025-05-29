import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';
import ScrollIfNeeded from '../components/ScrollIfNeeded';

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
    <ScrollIfNeeded 
      style={{
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={8}
        totalSteps={26}
      />

      <Animated.View 
        entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
        }}
      >

        <View style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 80,
          paddingBottom: 24,
          gap: 48,
        }}>
          <Text style={{
            fontSize: 28,
            color: '#000000',
            fontWeight: '600',
            textAlign: 'left',
          }} allowFontScaling={false}>
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
              backgroundColor: '#4064F6',
            }}
            disabled={!selected}
          />
        </View>
      </Animated.View>
    </ScrollIfNeeded>
  );
} 