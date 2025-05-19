import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';
import ScrollIfNeeded from '../components/ScrollIfNeeded';

const SURFACES = [
  {
    id: 'grass',
    title: 'Natural grass',
  },
  {
    id: 'artificial',
    title: 'Artificial grass',
  },
  {
    id: 'indoor',
    title: 'Indoor',
  },
  {
    id: 'mixed',
    title: 'Mixed surfaces',
  },
];

export default function TrainingSurfaceScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.trainingSurface);

  return (
    <ScrollIfNeeded 
      style={{
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={10}
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
          gap: 48,
        }}>
          <Text style={{
            fontSize: 28,
            color: '#000000',
            fontWeight: '600',
            textAlign: 'left',
          }} allowFontScaling={false}>
            What surface do you usually train on?
          </Text>

          <View style={{
            width: '100%',
            gap: 12,
          }}>
            {SURFACES.map((surface) => (
              <Pressable
                key={surface.id}
                onPress={() => setSelected(surface.id)}
                style={({ pressed }) => ({
                  width: '100%',
                  padding: 20,
                  backgroundColor: selected === surface.id ? '#99E86C' : '#FFFFFF',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selected === surface.id ? '#99E86C' : '#E5E5E5',
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{
                  fontSize: 18,
                  color: '#000000',
                  fontWeight: '600',
                }}>
                  {surface.title}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button 
            title="Continue" 
            onPress={async () => {
              if (selected) {
                await updateOnboardingData({ trainingSurface: selected });
                router.push('/analyzing');
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