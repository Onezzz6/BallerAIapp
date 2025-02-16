import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Button from './components/Button';
import BackButton from './components/BackButton';
import { useState } from 'react';

export default function GenderScreen() {
  const router = useRouter();
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 24,
      }}
    >
      <BackButton />
      
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
          What's your gender?
        </Text>

        <View style={{
          flexDirection: 'row',
          gap: 16,
        }}>
          {['male', 'female'].map((gender) => (
            <Pressable
              key={gender}
              onPress={() => setSelectedGender(gender as 'male' | 'female')}
              style={({ pressed }) => ({
                width: 150,
                height: 180,
                backgroundColor: selectedGender === gender ? '#E8F0FE' : '#F8F8F8',
                borderRadius: 16,
                borderWidth: 2,
                borderColor: selectedGender === gender ? '#007AFF' : '#E5E5E5',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Ionicons 
                name={gender === 'male' ? 'male' : 'female'} 
                size={64} 
                color={selectedGender === gender ? '#007AFF' : '#666666'} 
              />
              <Text style={{
                marginTop: 16,
                fontSize: 18,
                color: selectedGender === gender ? '#007AFF' : '#000000',
                fontWeight: '500',
              }}>
                {gender.charAt(0).toUpperCase() + gender.slice(1)}
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