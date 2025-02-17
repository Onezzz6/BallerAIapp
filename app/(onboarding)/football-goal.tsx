import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
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
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={4}
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
          What's your goal in football?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {GOALS.map((goal) => (
            <Pressable
              key={goal.id}
              onPress={() => setSelectedGoal(goal.id)}
              style={({ pressed }) => ({
                width: '100%',
                padding: 20,
                backgroundColor: selectedGoal === goal.id ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedGoal === goal.id ? '#99E86C' : '#E5E5E5',
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
          onPress={() => {
            if (selectedGoal) {
              router.push('/improvement-focus');
            }
          }}
        />
      </View>
    </Animated.View>
  );
} 