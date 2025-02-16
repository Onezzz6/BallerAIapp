import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useState } from 'react';

const POSITIONS = [
  'Goalkeeper',
  'Defender',
  'Midfielder',
  'Attacker',
];

export default function PositionScreen() {
  const router = useRouter();
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

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
          What's your primary position?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {POSITIONS.map((position) => (
            <Pressable
              key={position}
              onPress={() => setSelectedPosition(position)}
              style={({ pressed }) => ({
                width: '100%',
                height: 60,
                backgroundColor: selectedPosition === position ? '#E8F0FE' : '#F8F8F8',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedPosition === position ? '#007AFF' : '#E5E5E5',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{
                fontSize: 18,
                color: selectedPosition === position ? '#007AFF' : '#000000',
                fontWeight: '500',
              }}>
                {position}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button 
          title="Continue" 
          onPress={() => {
            if (selectedPosition) {
              router.push('/team-status');
            }
          }}
        />
      </View>
    </Animated.View>
  );
} 