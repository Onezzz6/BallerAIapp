import { View, Text, TextInput, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useState } from 'react';

export default function MotivationReasonScreen() {
  const router = useRouter();
  const [motivation, setMotivation] = useState('');

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <Animated.View 
        entering={FadeIn.duration(500)}
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
        }}
      >
        <OnboardingHeader 
          currentStep={8}
          totalSteps={9}
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
            Lastly, the most important part of becoming a professional football player!
          </Text>

          <Text style={{
            fontSize: 20,
            color: '#000000',
            fontWeight: '500',
            textAlign: 'center',
          }}>
            Tell me briefly what drives you on this journey?
          </Text>

          <TextInput
            value={motivation}
            onChangeText={setMotivation}
            placeholder="Type your answer here..."
            multiline
            numberOfLines={4}
            style={{
              width: '100%',
              minHeight: 120,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#E5E5E5',
              padding: 16,
              fontSize: 16,
              textAlignVertical: 'top',
            }}
          />

          <Button 
            title="Continue" 
            onPress={() => {
              if (motivation.trim()) {
                router.push('/account-ready');
              }
            }}
          />
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
} 