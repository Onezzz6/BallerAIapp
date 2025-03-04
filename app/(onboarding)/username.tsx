import { View, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState } from 'react';

export default function UsernameScreen() {
  const router = useRouter();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [username, setUsername] = useState(onboardingData.username || '');

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={1}
        totalSteps={5}
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
          What should I call you?
        </Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your name"
          style={{
            width: '100%',
            height: 50,
            borderWidth: 1,
            borderColor: '#E5E5E5',
            borderRadius: 12,
            paddingHorizontal: 16,
            fontSize: 16,
            backgroundColor: '#F8F8F8',
          }}
          autoFocus
          autoCapitalize="words"
        />

        <Button 
          title="Continue" 
          onPress={async () => {
            if (username.trim()) {
              await updateOnboardingData({ username: username.trim() });
              router.push('/gender');
            }
          }}
        />
      </View>
    </Animated.View>
  );
} 