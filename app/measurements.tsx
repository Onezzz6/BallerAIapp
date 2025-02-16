import { View, Text, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from './components/Button';
import BackButton from './components/BackButton';
import { useState } from 'react';

export default function MeasurementsScreen() {
  const router = useRouter();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

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
                What's your height and weight?
              </Text>

              <View style={{
                width: '100%',
                gap: 16,
              }}>
                <View>
                  <Text style={{
                    fontSize: 16,
                    color: '#666666',
                    marginBottom: 8,
                  }}>
                    Height (cm)
                  </Text>
                  <TextInput
                    value={height}
                    onChangeText={setHeight}
                    placeholder="Enter your height"
                    keyboardType="numeric"
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
                  />
                </View>

                <View>
                  <Text style={{
                    fontSize: 16,
                    color: '#666666',
                    marginBottom: 8,
                  }}>
                    Weight (kg)
                  </Text>
                  <TextInput
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="Enter your weight"
                    keyboardType="numeric"
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
                  />
                </View>
              </View>

              <Button 
                title="Continue" 
                onPress={() => {
                  if (height && weight) {
                    router.push('/dominant-foot'); // Changed from '/next-screen' to '/dominant-foot'
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