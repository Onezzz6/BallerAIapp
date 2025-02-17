import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';

export default function TeamStatusScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<boolean | null>(onboardingData.teamStatus || null);

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
        currentStep={9}
        totalSteps={12}
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
          Do you train with a team?
        </Text>

        <View style={{
          flexDirection: 'row',
          gap: 16,
        }}>
          {[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ].map((option) => (
            <Pressable
              key={option.label}
              onPress={() => setSelected(option.value)}
              style={({ pressed }) => ({
                flex: 1,
                height: 60,
                backgroundColor: selected === option.value ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selected === option.value ? '#99E86C' : '#E5E5E5',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{
                fontSize: 18,
                color: '#000000',
                fontWeight: '500',
              }}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button 
          title="Continue" 
          onPress={async () => {
            if (selected !== null) {
              await updateOnboardingData({ teamStatus: selected });
              router.push('/training-surface');
            }
          }}
          buttonStyle={{
            backgroundColor: '#007AFF',
            opacity: selected === null ? 0.5 : 1,
          }}
          disabled={selected === null}
        />
      </View>
    </Animated.View>
  );
} 