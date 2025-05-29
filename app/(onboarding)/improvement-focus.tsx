import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';
import ScrollIfNeeded from '../components/ScrollIfNeeded';

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

  return (
    <ScrollIfNeeded 
      style={{
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={20}
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
            What do you want to improve most?
          </Text>

          <View style={{
            width: '100%',
            gap: 8,
          }}>
            {IMPROVEMENTS.map((area) => (
              <Pressable
                key={area.id}
                onPress={() => setSelected(area.id)}
                style={({ pressed }) => ({
                  width: '100%',
                  padding: 16,
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
                }} allowFontScaling={false}>
                  {area.title}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button 
            title="Continue" 
            onPress={async () => {
              if (selected) {
                await updateOnboardingData({ improvementFocus: selected });
                router.push('/ambition-transition');
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