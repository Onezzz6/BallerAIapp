import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import ScrollIfNeeded from '../components/ScrollIfNeeded';

export default function AgeScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [age, setAge] = useState(onboardingData.age || '18');

  return (
    <ScrollIfNeeded 
      style={{
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={4}
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
          How old are you?
        </Text>

        <View style={{
          width: '100%',
          height: 200,
          backgroundColor: '#F8F8F8',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          <Picker
            selectedValue={age}
            onValueChange={(itemValue) => setAge(itemValue)}
            style={{
              width: '100%',
              height: '100%',
            }}
          >
            {Array.from({ length: 83 }, (_, i) => i + 8).map((num) => (
              <Picker.Item
                key={num}
                label={num.toString()}
                value={num.toString()}
              />
            ))}
          </Picker>
        </View>

        <Button 
          title="Continue" 
          onPress={async () => {
            if (age) {
              await updateOnboardingData({ age });
              router.push('/measurements');
            }
          }}
          buttonStyle={{
            backgroundColor: '#4064F6',
          }}
          disabled={!age}
        />
      </View>
      </Animated.View>
    </ScrollIfNeeded>
  );
} 