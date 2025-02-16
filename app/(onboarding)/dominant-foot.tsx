import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useState } from 'react';

export default function DominantFootScreen() {
  const router = useRouter();
  const [selectedFoot, setSelectedFoot] = useState<'Right' | 'Left' | 'Both' | null>(null);

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
          What's your dominant foot?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {['Right', 'Left', 'Both'].map((foot) => (
            <Pressable
              key={foot}
              onPress={() => setSelectedFoot(foot as 'Right' | 'Left' | 'Both')}
              style={({ pressed }) => ({
                width: '100%',
                height: 60,
                backgroundColor: selectedFoot === foot ? '#E8F0FE' : '#F8F8F8',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedFoot === foot ? '#007AFF' : '#E5E5E5',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{
                fontSize: 18,
                color: selectedFoot === foot ? '#007AFF' : '#000000',
                fontWeight: '500',
              }}>
                {foot}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button 
          title="Continue" 
          onPress={() => {
            if (selectedFoot) {
              router.push('/injury-history');
            }
          }}
        />
      </View>
    </Animated.View>
  );
} 