import { 
  View, 
  Text, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import { useState } from 'react';

export default function InjuryHistoryScreen() {
  const router = useRouter();
  const [injuryHistory, setInjuryHistory] = useState('');
  const CHARACTER_LIMIT = 100;

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
            <OnboardingHeader 
              currentStep={3}
              totalSteps={5}
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
                Brief description of your injury history
              </Text>

              <View style={{ width: '100%' }}>
                <TextInput
                  value={injuryHistory}
                  onChangeText={(text) => {
                    if (text.length <= CHARACTER_LIMIT) {
                      setInjuryHistory(text);
                    }
                  }}
                  placeholder="Describe any injuries..."
                  multiline
                  style={{
                    width: '100%',
                    height: 120,
                    borderWidth: 1,
                    borderColor: '#E5E5E5',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    backgroundColor: '#F8F8F8',
                    textAlignVertical: 'top',
                  }}
                />
                <Text style={{
                  fontSize: 14,
                  color: '#666666',
                  textAlign: 'right',
                  marginTop: 8,
                }}>
                  {injuryHistory.length}/{CHARACTER_LIMIT}
                </Text>
              </View>

              <Button 
                title="Continue" 
                onPress={() => {
                  if (injuryHistory.trim()) {
                    router.push('/skill-level');
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