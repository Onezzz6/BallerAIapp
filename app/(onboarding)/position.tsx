import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useState } from 'react';

const POSITIONS = [
  {
    id: 'striker',
    title: 'Striker',
  },
  {
    id: 'midfielder',
    title: 'Midfielder',
  },
  {
    id: 'defender',
    title: 'Defender',
  },
  {
    id: 'goalkeeper',
    title: 'Goalkeeper',
  },
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
          What's your position?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {POSITIONS.map((position) => (
            <Pressable
              key={position.id}
              onPress={() => setSelectedPosition(position.id)}
              style={({ pressed }) => ({
                width: '100%',
                padding: 20,
                backgroundColor: selectedPosition === position.id ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedPosition === position.id ? '#99E86C' : '#E5E5E5',
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
                {position.title}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button 
          title="Continue" 
          onPress={() => {
            if (selectedPosition) {
              router.push('/analyzing');
            }
          }}
        />
      </View>
    </Animated.View>
  );
} 