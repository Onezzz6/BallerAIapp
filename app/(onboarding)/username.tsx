import { View, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useState } from 'react';

export default function UsernameScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');

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
        paddingBottom: 24,
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
          What's your name?
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
          onPress={() => {
            if (username.trim()) {
              router.push('/gender');
            }
          }}
        />
      </View>
    </Animated.View>
  );
} 