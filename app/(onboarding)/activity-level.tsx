import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
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
    description: 'Excercise 1-2 days/week',
  },
  {
    id: 'moderate',
    title: 'Moderately Active',
    description: 'Excercise 3-5 days/week',
  },
  {
    id: 'very',
    title: 'Very Active',
    description: 'Excercise 6-7 days/week',
  },
  {
    id: 'extra',
    title: 'Extra Active',
    description: 'Excercise 2x per day',
  },
];

export default function ActivityLevelScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.activityLevel);

  return (
    <View 
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
    <OnboardingHeader 
      currentStep={12}
      totalSteps={5}
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
        justifyContent: 'top',
        alignItems: 'left',
        gap: 24,
      }}>
        <Text style={{
          fontSize: 28,
          color: '#000000',
          fontWeight: '600',
          textAlign: 'left',
        }} allowFontScaling={false}>
          What's your activity level?
        </Text>

        <View style={{
          width: '100%',
          gap: 8,
        }}>
          {ACTIVITY_LEVELS.map((level) => (
            <Pressable
              key={level.id}
              onPress={() => setSelected(level.id)}
              style={({ pressed }) => ({
                width: '100%',
                padding: 12,
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
              }} allowFontScaling={false}>
                {level.title}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#666666',
              }} allowFontScaling={false}>
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
            backgroundColor: '#4064F6',
          }}
          disabled={!selected}
        />
      </View>
    </Animated.View>
    </View>
  );
} 