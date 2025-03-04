import { View, Text, Pressable } from 'react-native';
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
  const [selected, setSelected] = useState<string | null>(onboardingData.sleepHours);

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={13}
        totalSteps={20}
      />
      
      <View style={{
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 80,
        paddingBottom: 24,
        justifyContent: 'top',
        alignItems: 'left',
        gap: 48,
      }}>
        <Text style={{
          fontSize: 28,
          color: '#000000',
          fontWeight: '600',
          textAlign: 'left',
        }} allowFontScaling={false}>
          Sleep duration on average?
        </Text>

        <View style={{
          width: '100%',
          height: 200,
          backgroundColor: '#F8F8F8',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          <Picker
            selectedValue={selected}
            onValueChange={(itemValue) => setSelected(itemValue)}
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
            if (selected) {
              await updateOnboardingData({ sleepHours: selected });
              router.push('/nutrition');
            }
          }}
          buttonStyle={{
            backgroundColor: '#4064F6',
            opacity: !selected ? 0.5 : 1,
          }}
          disabled={!selected}
        />
      </View>
    </Animated.View>
  );
} 