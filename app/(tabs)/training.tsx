import { View, Text, SafeAreaView, StyleSheet, TextInput, Pressable, ScrollView, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTraining } from '../context/TrainingContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { OPENAI_API_KEY, DEEPSEEK_API_KEY } from '@env';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { startOfWeek, endOfWeek, differenceInMilliseconds, format } from 'date-fns';

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
    marginTop: 24,
    marginBottom: 32,
  },
  generateButton: {
    backgroundColor: '#4064F6',
    borderRadius: 100,
    padding: 16,
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
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
  sectionBackground: {
    backgroundColor: '#FFDDBB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionBackgroundGray: {
    backgroundColor: '#EEEEEE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  option: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectedOption: {
    backgroundColor: '#99E86C',
    borderColor: '#99E86C',
  },
  optionText: {
    fontSize: 16,
    color: '#666666',
  },
  selectedOptionText: {
    color: '#000000',
    fontWeight: '500',
  },
  dayContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  dayOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dayOption: {
    flex: 1,
    padding: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectedDayOption: {
    backgroundColor: '#99E86C',
    borderColor: '#99E86C',
  },
  selectedGameOption: {
    backgroundColor: '#99E86C',
    borderColor: '#99E86C',
  },
  selectedTrainingOption: {
    backgroundColor: '#99E86C',
    borderColor: '#99E86C',
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
    borderRadius: 100,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingLeft: 40,
  },
  subtitleInline: {
    fontSize: 14,
    color: '#666666',
    fontWeight: 'normal',
  },
  clockIcon: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
    zIndex: 1,
  },
  timerText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
});

export default function TrainingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addPlan, plans, clearPlans } = useTraining();
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
      Alert.alert('Cannot generate plan', 'Please select a focus area');
      return;
    }
    setLoading(true);

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData) throw new Error('User data not found');

      const prompt = `You are BallerAI. Your job is to create a training plan for the user. It should include rest of the week until sunday based on the following information
this is an example of a plan for one day for this user.
user onboarding answers:
age ${userData.age}
current level ${userData.skillLevel}
gender "${userData.gender}"
goal "${userData.footballGoal}"
height ${userData.height}
weight ${userData.weight}
injuryHistory "${userData.injuryHistory}"
position "${userData.position}"

the user does not have access to the gym.
assume the user will train alone.
assume the user only has access to a ball, pitch, cones and a goal.

Users' extra focus for the week is ${selectedFocus}.

users team training amounts are:
${Object.entries(schedule)
  .map(([day, data]) => ` ${day} ${data.type === 'off' ? '0' : data.duration} mins`)
  .join('\n')}

Perfect training plan example for BallerAI based on this user's info.
monday: technique based training. start with a 15 minute warm up, 10 mins jogging then 5 minutes of active stretching. Then start to do wall passes for 15 minutes with different variables switching after 5 mins each.Then he will set up 8 cones and start to dribble through and between them using both feet for 15 mins. After that, finishing inside the box for 15 mins. if with a friend do passes before finishing and one time finishing if alone do game like situations where you get ur foot open and finish with precision. then a light 5 min jog to get the fluids mowing and ur done.
don't copy that, just take the detail and style of the training as a guideline for creating similar training sessions adapting to each user's specific info. When the users awnsers are different make sure you adjust accordingly the most important questions are age, current level and goal as a footballer. This example is just to get an idea of a good plan would be for this specific user, do not copy it just take the style and detail as guidance. The plan should be adjusted if the user has a game for example saturday. 2 days before a game has to frop the load a bit not a lot but noticably. 1 day before game has to be really light so only technical things and recovery based trainings.
Keep the plan simple focus on the amount thats good for the player not so much on specific advice in terms of technique since its not correct from you. also remember if user chooses a focusd area it still dosent mean only that hes always a football player first so maximum 2 trainings unrelated to football per week.

VERY IMPORTANT: For any recovery days, simply tell the user to "Focus on recovery today" without providing specific recovery exercises. The app has a separate recovery page with dedicated recovery instructions.

IMPORTANT FORMAT INSTRUCTIONS:
1. Format each day in FULL CAPS (example: "MONDAY")
2. Write the plan for that day directly below it
3. Separate each day's plan with a line break
4. The plan should be in simple text format, no markdown, bold, or fancy formatting
5. Start with MONDAY and include all 7 days of the week in order

Example of correct format:
MONDAY
10 min warm up - light jog and stretching
15 min passing drills - wall passes varying distance
15 min dribbling - cone drills focusing on control
5 min cool down

TUESDAY
Rest day - team training day 90 mins

WEDNESDAY
Focus on recovery today

[continue for all days]`;

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
      
      console.log('DEBUG - API Response Plan Text:', planText);
      
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      // Simple parse function to extract content between day headers
      days.forEach(day => {
        const dayRegex = new RegExp(
          `${day.toUpperCase()}\\s*\\n([\\s\\S]*?)(?=(?:${days.join('|').toUpperCase()}|$))`,
          'i'
        );
        
        const match = planText.match(dayRegex);
        
        console.log(`DEBUG - Parsing ${day}:`, {
          pattern: dayRegex.toString(),
          matched: !!match,
          content: match ? match[1] : null
        });
        
        if (match && match[1]) {
          dailyPlans[day] = match[1].trim();
        } else {
          dailyPlans[day] = `No specific training for ${day}.`;
        }
      });

      console.log('DEBUG - Final Daily Plans:', dailyPlans);

      const planNumber = plans.length + 1;
      await addPlan({
        name: `Plan ${planNumber}`,
        createdAt: new Date(),
        schedule: dailyPlans,
      });

      await setDoc(doc(db, 'users', user.uid), {
        lastPlanGenerated: new Date(),
      }, { merge: true });

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 90, // Add extra padding at the bottom to prevent content from being hidden behind the navigation bar
    }}>
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            paddingBottom: 90, // Add extra padding at the bottom
          }}
        >
          {/* Header - Scrolls with content */}
          <View style={{
            paddingTop: 48,
            paddingHorizontal: 24,
            backgroundColor: '#ffffff',
          }}>
            {/* Header with Logo */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 92, // Same height as OnboardingHeader
            }}>
              {/* Title */}
              <Text style={{
                fontSize: 28,
                fontWeight: '900',
                color: '#000000',
              }} 
              allowFontScaling={false}
              maxFontSizeMultiplier={1.2}>
                Training
              </Text>

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}>
                <Image 
                  source={require('../../assets/images/BallerAILogo.png')}
                  style={{
                    width: 32,
                    height: 32,
                  }}
                  resizeMode="contain"
                />
                <Text style={{
                  fontSize: 28,
                  fontWeight: '300',
                  color: '#000000',
                }} 
                allowFontScaling={false}
                maxFontSizeMultiplier={1.2}>
                  BallerAI
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.sectionBackgroundGray}>
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
            </View>

            <View style={styles.sectionBackgroundGray}>
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
            </View>

            <View style={styles.sectionBackgroundGray}>
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
                      <View style={{ position: 'relative' }}>
                        <Ionicons 
                          name="time-outline" 
                          size={20} 
                          color="#666666" 
                          style={styles.clockIcon}
                        />
                        <TextInput
                          style={styles.timeInput}
                          placeholder={`Enter ${daySchedule.type} time`}
                          value={daySchedule.duration}
                          onChangeText={(text) => updateDuration(day, text)}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.buttonContainer}>
              <Pressable
                style={[
                  styles.generateButton,
                  loading && styles.generateButtonDisabled
                ]}
                onPress={handleGeneratePlan}
                disabled={loading}
              >
                <Text style={styles.generateButtonText}>
                  {loading ? 'Generating Plan...' : 'Generate Training Plan'}
                </Text>
                <Ionicons name="football" size={20} color="#FFFFFF" />
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
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

// ... rest of your styles ...