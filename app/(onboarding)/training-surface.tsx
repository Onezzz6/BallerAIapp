import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useState } from 'react';

const SURFACES = [
  'Grass',
  'Artificial',
  'Indoor',
  'Sand',
];

export default function TrainingSurfaceScreen() {
  const router = useRouter();
  const [selectedSurface, setSelectedSurface] = useState<string | null>(null);

  const handleContinue = () => {
    console.log('Selected surface:', selectedSurface);
    if (selectedSurface) {
      console.log('Attempting navigation to analyzing screen...');
      try {
        router.push('../analyzing');
        console.log('Navigation called');
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 24,
      }}
    >
      <OnboardingHeader 
        currentStep={3}
        totalSteps={5}
      />
      
      <View style={{
        flex: 1,
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
          What kind of surface do you train on most?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {SURFACES.map((surface) => (
            <Pressable
              key={surface}
              onPress={() => setSelectedSurface(surface)}
              style={({ pressed }) => ({
                width: '100%',
                height: 60,
                backgroundColor: selectedSurface === surface ? '#E8F0FE' : '#F8F8F8',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedSurface === surface ? '#007AFF' : '#E5E5E5',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{
                fontSize: 18,
                color: selectedSurface === surface ? '#007AFF' : '#000000',
                fontWeight: '500',
              }}>
                {surface}
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