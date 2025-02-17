import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
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
  const [selectedImprovement, setSelectedImprovement] = useState<string | null>(null);

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={5}
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
          What do you want to improve most?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {IMPROVEMENTS.map((improvement) => (
            <Pressable
              key={improvement.id}
              onPress={() => setSelectedImprovement(improvement.id)}
              style={({ pressed }) => ({
                width: '100%',
                padding: 20,
                backgroundColor: selectedImprovement === improvement.id ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedImprovement === improvement.id ? '#99E86C' : '#E5E5E5',
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
                {improvement.title}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button 
          title="Continue" 
          onPress={() => {
            if (selectedImprovement) {
              router.push('/motivation');
            }
          }}
        />
      </View>
    </Animated.View>
  );
} 