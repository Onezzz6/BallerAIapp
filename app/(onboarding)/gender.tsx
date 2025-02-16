import { View, Text, Pressable, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import BackButton from '../components/BackButton';
import { useState } from 'react';
import OnboardingHeader from '../components/OnboardingHeader';
import { StyleSheet } from 'react-native';

const GENDERS = [
  {
    id: 'male',
    title: 'Male',
  },
  {
    id: 'female',
    title: 'Female',
  },
  {
    id: 'other',
    title: 'Other',
  },
];

export default function GenderScreen() {
  const router = useRouter();
  const [selectedGender, setSelectedGender] = useState<string | null>(null);

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <OnboardingHeader 
        currentStep={2}
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
          What's your gender?
        </Text>

        <View style={{
          width: '100%',
          gap: 12,
        }}>
          {GENDERS.map((gender) => (
            <Pressable
              key={gender.id}
              onPress={() => setSelectedGender(gender.id)}
              style={({ pressed }) => ({
                width: '100%',
                padding: 20,
                backgroundColor: selectedGender === gender.id ? '#99E86C' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedGender === gender.id ? '#99E86C' : '#E5E5E5',
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
                {gender.title}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button 
          title="Continue" 
          onPress={() => {
            if (selectedGender) {
              router.push('/age');
            }
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
  button: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    alignItems: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderColor: '#2C2C2E',
    borderWidth: 1,
  },
  buttonOutlineText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  selectedOption: {
    backgroundColor: '#99E86C',
    borderColor: '#99E86C',
  },
  selectedText: {
    color: '#000000',
  },
}); 