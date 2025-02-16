import { View, Text, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from './components/Button';
import BackButton from './components/BackButton';
import { useState } from 'react';
import { Picker } from '@react-native-picker/picker';

export default function AgeScreen() {
  const router = useRouter();
  const [age, setAge] = useState('18');

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View 
          entering={FadeIn.duration(500)}
          style={{
            flex: 1,
            backgroundColor: '#ffffff',
          }}
        >
          <ScrollView 
            contentContainerStyle={{
              flexGrow: 1,
              padding: 24,
            }}
            keyboardShouldPersistTaps="handled"
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
                    <Picker.Item key={num} label={num.toString()} value={num.toString()} />
                  ))}
                </Picker>
              </View>

              <Button 
                title="Continue" 
                onPress={() => {
                  if (age) {
                    router.push('/measurements');
                  }
                }}
              />
            </View>
          </ScrollView>
        </Animated.View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
} 