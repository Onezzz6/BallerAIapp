import { View, Text, Pressable, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import imageAnalysis from '../services/imageAnalysis';

type FocusArea = 'technique' | 'strength' | 'endurance' | 'speed' | 'overall';
type GymAccess = 'yes' | 'no';

type FocusOption = {
  value: FocusArea;
  emoji: string;
};

export default function TrainingScreen() {
  const [selectedFocus, setSelectedFocus] = useState<FocusArea | null>(null);
  const [gymAccess, setGymAccess] = useState<GymAccess | null>(null);

  const focusOptions: FocusOption[] = [
    { value: 'technique', emoji: '⚽' },
    { value: 'strength', emoji: '🏋️' },
    { value: 'endurance', emoji: '🏃' },
    { value: 'speed', emoji: '⚡' },
    { value: 'overall', emoji: '💪' },
  ];
    
  const testEnvVariables = async () => {
    try {
      console.log('Testing environment variables...');
      // Use a real image URL for testing
      const testImageUrl = 'https://storage.googleapis.com/cloud-vision-codelab/bonito.jpg';
      const result = await imageAnalysis.analyzeImage(testImageUrl);
      console.log('API Response:', result);
      Alert.alert('Success', 'Environment variables are working!');
    } catch (error: any) {
      console.error('Test failed:', error);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
      }}>
        {/* BallerAI Logo and Text */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: 8,
          marginBottom: 16, // Add space between logo and title
        }}>
          <Image 
            source={require('../../assets/images/BallerAILogo.png')}
            style={{ width: 32, height: 32 }}
            resizeMode="contain"
          />
          <Text style={{ 
            fontSize: 24, 
            fontWeight: '600', 
            color: '#000000' 
          }}>
            BallerAI
          </Text>
        </View>

        {/* Title */}
        <Text style={{
          fontSize: 32,
          fontWeight: '700',
          color: '#000000',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          Training
        </Text>

        <Pressable
          onPress={testEnvVariables}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            padding: 10,
            backgroundColor: '#007AFF',
            borderRadius: 8,
            marginBottom: 16,
          })}
        >
          <Text style={{ color: '#FFFFFF' }}>Test Env Variables</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Create Training Plan</Text>    
        <Text style={styles.subtitle}>Extra focus for this week</Text>  
        {/* Focus Selection */}
        <View style={styles.section}>   
          <View style={styles.focusOptions}>
            {focusOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.focusOption,
                  selectedFocus === option.value && styles.focusOptionSelected
                ]}
                onPress={() => setSelectedFocus(option.value)}
              >
                <View style={styles.focusContent}>
                  <Text style={{ fontSize: 20 }}>{option.emoji}</Text>
                  <Text style={[
                    styles.focusOptionText,
                    selectedFocus === option.value && styles.focusOptionTextSelected
                  ]}>
                    {option.value === 'overall' ? 'Everything' :
                      option.value.charAt(0).toUpperCase() + option.value.slice(1)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Gym Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Do you have access to a gym?</Text>
          <View style={styles.gymOptions}>
            <Pressable
              style={[
                styles.gymOption,
                gymAccess === 'yes' && styles.gymOptionSelected
              ]}
              onPress={() => setGymAccess('yes')}
            >
              <Ionicons 
                name="time-outline" 
                size={20} 
                color={gymAccess === 'yes' ? '#000000' : '#666666'} 
              />
              <Text style={[
                styles.gymOptionText,
                gymAccess === 'yes' && styles.gymOptionTextSelected
              ]}>Yes</Text>
            </Pressable>

            <Pressable
              style={[
                styles.gymOption,
                gymAccess === 'no' && styles.gymOptionSelected
              ]}
              onPress={() => setGymAccess('no')}
            >
              <Ionicons 
                name="close-circle" 
                size={20} 
                color={gymAccess === 'no' ? '#000000' : '#666666'} 
              />
              <Text style={[
                styles.gymOptionText,
                gymAccess === 'no' && styles.gymOptionTextSelected
              ]}>No</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 32,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  focusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  focusOption: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    minWidth: '45%',
  },
  focusOptionSelected: {
    backgroundColor: '#99E86C',
  },
  focusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  focusOptionText: {
    fontSize: 16,
    color: '#666666',
  },
  focusOptionTextSelected: {
    color: '#000000',
    fontWeight: '600',
  },
  gymOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  gymOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  gymOptionSelected: {
    backgroundColor: '#99E86C',
    borderColor: '#99E86C',
  },
  gymOptionText: {
    fontSize: 16,
    color: '#666666',
  },
  gymOptionTextSelected: {
    color: '#000000',
    fontWeight: '500',
  },
}); 