import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';

const GOALS = [
  {
    id: 'fun',
    title: 'Have fun',
  },
  {
    id: 'friends',
    title: 'Be good among friends',
  },
  {
    id: 'semi-pro',
    title: 'Semi-professional',
  },
  {
    id: 'pro',
    title: 'Professional',
  },
];

export default function FootballGoalScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.footballGoal);

  const handleContinue = async () => {
    if (selected) {
      await updateOnboardingData({ footballGoal: selected });
      router.push('/improvement-focus');
    }
  };

  return (
    <View 
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
    <OnboardingHeader 
      currentStep={16}
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
        gap: 48,
      }}>
        <Text style={{
          fontSize: 28,
          color: '#000000',
          fontWeight: '600',
          textAlign: 'left',
        }} allowFontScaling={false}>
          What's your goal in football?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {GOALS.map((goal) => (
            <Pressable
              key={goal.id}
              onPress={() => setSelected(goal.id)}
              style={({ pressed }) => ({
                width: '100%',
                padding: 20,
                backgroundColor: selected === goal.id ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selected === goal.id ? '#99E86C' : '#E5E5E5',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{
                fontSize: 18,
                color: '#000000',
                fontWeight: '600',
              }}>
                {goal.title}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button 
          title="Continue" 
          onPress={handleContinue}
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