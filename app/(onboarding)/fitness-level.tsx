import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
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
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.fitnessLevel);

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={11}
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
          What's your current fitness level?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {FITNESS_LEVELS.map((level) => (
            <Pressable
              key={level.id}
              onPress={() => setSelected(level.id)}
              style={({ pressed }) => ({
                width: '100%',
                height: 60,
                backgroundColor: selected === level.id ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selected === level.id ? '#99E86C' : '#E5E5E5',
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
          onPress={async () => {
            if (selected) {
              await updateOnboardingData({ fitnessLevel: selected });
              router.push('/activity-level');
            }
          }}
          buttonStyle={{
            backgroundColor: '#4064F6',
          }}
          disabled={!selected}
        />
      </View>
    </Animated.View>
  );
} 