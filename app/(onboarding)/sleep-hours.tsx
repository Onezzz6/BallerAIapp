import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';
import { Picker } from '@react-native-picker/picker';

export default function SleepHoursScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [sleepHours, setSleepHours] = useState(onboardingData.sleepHours || '8');

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
        currentStep={13}
        totalSteps={14}
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
          How many hours do you sleep per night currently?
        </Text>

        <View style={{
          width: '100%',
          height: 200,
          backgroundColor: '#F8F8F8',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          <Picker
            selectedValue={sleepHours}
            onValueChange={(itemValue) => setSleepHours(itemValue)}
            style={{
              width: '100%',
              height: '100%',
            }}
          >
            {Array.from({ length: 20 }, (_, i) => i + 1).map((hours) => (
              <Picker.Item 
                key={hours} 
                label={`${hours} ${hours === 1 ? 'hour' : 'hours'}`} 
                value={hours.toString()} 
              />
            ))}
          </Picker>
        </View>

        <Button 
          title="Continue" 
          onPress={async () => {
            if (sleepHours) {
              await updateOnboardingData({ sleepHours });
              router.push('/nutrition');
            }
          }}
          buttonStyle={{
            backgroundColor: '#007AFF',
            opacity: !sleepHours ? 0.5 : 1,
          }}
          disabled={!sleepHours}
        />
      </View>
    </Animated.View>
  );
} 