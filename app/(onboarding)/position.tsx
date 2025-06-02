import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';
import ScrollIfNeeded from '../components/ScrollIfNeeded';
import analytics from '@react-native-firebase/analytics';

const POSITIONS = [
  {
    id: 'goalkeeper',
    title: 'Goalkeeper',
  },
  {
    id: 'defender',
    title: 'Defender',
  },
  {
    id: 'midfielder',
    title: 'Midfielder',
  },
  {
    id: 'forward',
    title: 'Attacker',
  },
];

export default function PositionScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.position);

  return (
    <ScrollIfNeeded 
      style={{
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={9}
        totalSteps={26}
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
            What's your favorite position?
          </Text>

          <View style={{
            width: '100%',
            gap: 12,
          }}>
            {POSITIONS.map((position) => (
              <Pressable
                key={position.id}
                onPress={() => setSelected(position.id)}
                style={({ pressed }) => ({
                  width: '100%',
                  padding: 20,
                  backgroundColor: selected === position.id ? '#99E86C' : '#FFFFFF',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selected === position.id ? '#99E86C' : '#E5E5E5',
                  opacity: pressed ? 0.9 : 1,
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
            onPress={async () => {
              if (selected) {
                await analytics().logEvent('onboarding_position_continue');
                await updateOnboardingData({ position: selected });
                router.push('/team-status');
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