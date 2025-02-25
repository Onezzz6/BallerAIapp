import { View, Text, SafeAreaView, StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTraining } from '../context/TrainingContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { OPENAI_API_KEY, DEEPSEEK_API_KEY } from '@env';
import Animated, { FadeIn } from 'react-native-reanimated';

type FocusArea = 'technique' | 'strength' | 'endurance' | 'speed' | 'overall';
type GymAccess = 'yes' | 'no';

type ScheduleType = 'off' | 'game' | 'training';

type DaySchedule = {
  type: ScheduleType;
  duration: string;
};

type Schedule = {
  [key: string]: DaySchedule;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  buttonContainer: {
    gap: 16,
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 32,
  },
  generateButton: {
    backgroundColor: '#000022',
    borderRadius: 100,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  plansButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000022',
  },
  plansButtonDisabled: {
    borderColor: '#CCCCCC',
  },
  plansButtonText: {
    color: '#000022',
    fontSize: 16,
    fontWeight: '600',
  },
  plansButtonTextDisabled: {
    color: '#CCCCCC',
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  option: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#000022',
    borderColor: '#000022',
  },
  optionText: {
    fontSize: 14,
    color: '#000000',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  dayContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  dayOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dayOption: {
    flex: 1,
    padding: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  selectedDayOption: {
    backgroundColor: '#E5E5E5',
    borderColor: '#E5E5E5',
  },
  selectedGameOption: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  selectedTrainingOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayOptionText: {
    fontSize: 14,
    color: '#000000',
  },
  timeInputContainer: {
    marginTop: 8,
  },
  timeInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  subtitleInline: {
    fontSize: 14,
    color: '#666666',
    fontWeight: 'normal',
  },
});

export default function TrainingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addPlan, plans } = useTraining();
  const [selectedFocus, setSelectedFocus] = useState<FocusArea | null>(null);
  const [gymAccess, setGymAccess] = useState<GymAccess | null>(null);
  const [schedule, setSchedule] = useState<Schedule>({
    monday: { type: 'off', duration: '' },
    tuesday: { type: 'off', duration: '' },
    wednesday: { type: 'off', duration: '' },
    thursday: { type: 'off', duration: '' },
    friday: { type: 'off', duration: '' },
    saturday: { type: 'off', duration: '' },
    sunday: { type: 'off', duration: '' },
  });
  const [loading, setLoading] = useState(false);

  const focusOptions: FocusArea[] = ['technique', 'strength', 'endurance', 'speed', 'overall'];
  const gymOptions: GymAccess[] = ['yes', 'no'];

  const handleGeneratePlan = async () => {
    if (!user || !selectedFocus) {
      Alert.alert('Please select a focus area before generating a plan');
      return;
    }
    setLoading(true);

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData) throw new Error('User data not found');

      const prompt = `Create a personal training plan for a footballer with the following information:
        Age: ${userData.age}
        Current Level: ${userData.skillLevel}
        Gender: ${userData.gender}
        Goal: ${userData.footballGoal}
        Height: ${userData.height}cm
        Weight: ${userData.weight}kg
        Injury History: ${userData.injuryHistory}
        Position: ${userData.position}
        
        Important Note: The following team training schedule is provided ONLY to help you understand the player's overall training load each day. DO NOT include or modify any team training sessions in your plan - these are managed by the team's coach.
        
        Current weekly schedule:
        ${Object.entries(schedule)
          .map(([day, data]) => `${day}: ${data.type === 'off' ? 'rest day' : `has ${data.duration} minutes of team ${data.type}`}`)
          .join('\n')}
        
        The plan should:
        - Only include personal training sessions
        - Focus on ${selectedFocus}
        - Be designed for solo training
        - ${gymAccess === 'yes' ? 'Include gym exercises' : 'Only use ball, pitch, cones and goal'}
        - Consider recovery time around team commitments
        - Adjust intensity based on team training load that day`;

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{
            role: "user",
            content: prompt
          }],
          max_tokens: 8000
        }),
      });

      const data = await response.json();
      console.log('Full API Response:', JSON.stringify(data, null, 2));

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from API');
      }

      const planText = data.choices[0].message.content;
      const dailyPlans: { [key: string]: string } = {};
      
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      days.forEach(day => {
        const dayRegex = new RegExp(
          `(?:####\\s*\\*\\*${day}(?:\\s*\\([^)]*\\))?\\*\\*|` +
          `###\\s*\\*\\*${day}(?:\\s*\\([^)]*\\))?\\*\\*|` +
          `\\*\\*${day}(?:\\s*\\([^)]*\\))?\\*\\*|` +
          `${day}:)` +
          `[\\s\\S]*?` +
          `(?=(?:` +
            `####\\s*\\*\\*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\\s*\\([^)]*\\))?\\*\\*|` +
            `###\\s*\\*\\*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\\s*\\([^)]*\\))?\\*\\*|` +
            `\\*\\*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\\s*\\([^)]*\\))?\\*\\*|` +
            `---\\s*\\n|` +
            `$` +
          `))`,
          'i'
        );
        
        const match = planText.match(dayRegex);
        if (match) {
          dailyPlans[day] = match[0].trim();
        } else {
          const sections = planText.split(/(?:###|####)/);
          for (const section of sections) {
            if (section.toLowerCase().includes(day.toLowerCase())) {
              dailyPlans[day] = section.trim();
              break;
            }
          }
          
          if (!dailyPlans[day]) {
            dailyPlans[day] = `No specific training for ${day}.`;
          }
        }
      });

      const planNumber = plans.length + 1;
      await addPlan({
        name: `Plan ${planNumber}`,
        createdAt: new Date(),
        schedule: dailyPlans,
      });

      router.push('/training-plans');
    } catch (error) {
      console.error('Error generating plan:', error);
      Alert.alert('Error', 'Failed to generate training plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = (day: string, type: 'off' | 'game' | 'training') => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day as keyof typeof schedule],
        type,
      },
    });
  };

  const updateDuration = (day: string, duration: string) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day as keyof typeof schedule],
        duration,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        entering={FadeIn.duration(1000)}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Training</Text>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Focus Area</Text>
            <Text style={styles.subtitle}>Select your training focus to get a personalized plan</Text>
            
            <View style={styles.optionsContainer}>
              {focusOptions.map((focus) => (
                <Pressable
                  key={focus}
                  style={[
                    styles.option,
                    selectedFocus === focus && styles.selectedOption
                  ]}
                  onPress={() => setSelectedFocus(focus)}
                >
                  <Text style={[
                    styles.optionText,
                    selectedFocus === focus && styles.selectedOptionText
                  ]}>
                    {focus.charAt(0).toUpperCase() + focus.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Gym Access</Text>
            <Text style={styles.subtitle}>Do you have access to a gym?</Text>
            <View style={styles.optionsContainer}>
              {gymOptions.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.option,
                    gymAccess === option && styles.selectedOption
                  ]}
                  onPress={() => setGymAccess(option)}
                >
                  <Text style={[
                    styles.optionText,
                    gymAccess === option && styles.selectedOptionText
                  ]}>
                    {option === 'yes' ? 'Yes' : 'No'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Team Training schedule <Text style={styles.subtitleInline}>(minutes/day)</Text></Text>
            <Text style={styles.subtitle}>Fill in your team training schedule so BallerAI can take this into consideration when making ur personalized training plan.</Text>

            {Object.entries(schedule).map(([day, daySchedule]) => (
              <View key={day} style={styles.dayContainer}>
                <Text style={styles.dayTitle}>{day.toUpperCase()}</Text>
                <View style={styles.dayOptions}>
                  <Pressable
                    style={[
                      styles.dayOption,
                      daySchedule.type === 'off' && styles.selectedDayOption
                    ]}
                    onPress={() => updateSchedule(day, 'off')}
                  >
                    <Text style={styles.dayOptionText}>Off</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.dayOption,
                      daySchedule.type === 'game' && styles.selectedGameOption
                    ]}
                    onPress={() => updateSchedule(day, 'game')}
                  >
                    <Text style={styles.dayOptionText}>Game</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.dayOption,
                      daySchedule.type === 'training' && styles.selectedTrainingOption
                    ]}
                    onPress={() => updateSchedule(day, 'training')}
                  >
                    <Text style={styles.dayOptionText}>Training</Text>
                  </Pressable>
                </View>
                {(daySchedule.type === 'game' || daySchedule.type === 'training') && (
                  <View style={styles.timeInputContainer}>
                    <TextInput
                      style={styles.timeInput}
                      placeholder={`Enter ${daySchedule.type} time`}
                      value={daySchedule.duration}
                      onChangeText={(text) => updateDuration(day, text)}
                      keyboardType="numeric"
                    />
                  </View>
                )}
              </View>
            ))}

            <View style={styles.buttonContainer}>
              <Pressable
                style={[styles.generateButton, loading && styles.generateButtonDisabled]}
                onPress={handleGeneratePlan}
                disabled={loading}
              >
                <Text style={styles.generateButtonText}>
                  {loading ? 'Generating Plan...' : 'Generate Training Plan 🚀'}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.plansButton,
                  !plans.length && styles.plansButtonDisabled
                ]}
                onPress={() => plans.length > 0 && router.push('../training-plans')}
                disabled={!plans.length}
              >
                <Text style={[
                  styles.plansButtonText,
                  !plans.length && styles.plansButtonTextDisabled
                ]}>
                  Your Training Plans
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// ... rest of your styles ...