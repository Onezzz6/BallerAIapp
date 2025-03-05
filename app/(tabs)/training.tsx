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
  const [timeUntilNextPlan, setTimeUntilNextPlan] = useState<string>('');
  const [canGeneratePlan, setCanGeneratePlan] = useState(true);

  const focusOptions: FocusArea[] = ['technique', 'strength', 'endurance', 'speed', 'overall'];
  const gymOptions: GymAccess[] = ['yes', 'no'];

  useEffect(() => {
    const checkPlanGeneration = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const data = userDoc.data();
        const lastPlanGenerated = data?.lastPlanGenerated?.toDate();

        if (lastPlanGenerated) {
          const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
          const lastPlanWeekStart = startOfWeek(lastPlanGenerated, { weekStartsOn: 1 });

          if (format(currentWeekStart, 'yyyy-MM-dd') === format(lastPlanWeekStart, 'yyyy-MM-dd')) {
            setCanGeneratePlan(false);
          } else {
            setCanGeneratePlan(true);
            clearPlans();
          }
        }
      } catch (error) {
        console.error('Error checking plan generation:', error);
      }
    };

    checkPlanGeneration();
  }, [user]);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const sunday = endOfWeek(now, { weekStartsOn: 1 }); // Set to end of week (Sunday)
      const timeLeft = differenceInMilliseconds(sunday, now);

      if (timeLeft <= 0) {
        setCanGeneratePlan(true);
        setTimeUntilNextPlan('');
        return;
      }

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      setTimeUntilNextPlan(`${days}d ${hours}h ${minutes}m`);
    };

    const timer = setInterval(updateTimer, 60000); // Update every minute
    updateTimer(); // Initial update

    return () => clearInterval(timer);
  }, []);

  const handleGeneratePlan = async () => {
    if (!user || !selectedFocus || !canGeneratePlan) {
      Alert.alert('Cannot generate plan', 'Please wait until next week to generate a new plan');
      return;
    }
    setLoading(true);

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData) throw new Error('User data not found');

      const prompt = `You are BallerAI, an expert in creating personalized football training plans. Create a clear training plan following this format:

MONDAY
1. [Duration] - [Exercise Name]
   Setup: Brief setup instructions
   Exercise: What to do
   Focus: 1 key point to remember

Example of good format:
1. 15 minutes - Cone Dribbling
   Setup: Place 6 cones in a zigzag, 2 meters apart
   Exercise: Dribble through cones and back, then repeat
   Focus: Close control, use both feet, 

2. 15 minutes - Shooting Practice
   Setup: place a few cones on the edge of the box
   Exercise: Take shots aiming for corners 
   Focus: on precision rather then power
3. 10 mins - first touch drills
   Setup: find a wall to practice first touch on
   Exercise: try keeping the ball in the air while passing back n forth with the wall try different variations
   Focus: clean touches and repetition
Player Profile:
Age: ${userData.age}
Current Level: ${userData.skillLevel}
Gender: ${userData.gender}
Goal: ${userData.footballGoal}
Height: ${userData.height}cm
Weight: ${userData.weight}kg
Injury History: ${userData.injuryHistory}
Position: ${userData.position}

Weekly Team Schedule:
${Object.entries(schedule)
  .map(([day, data]) => `${day.charAt(0).toUpperCase() + day.slice(1)}: ${data.type === 'off' ? 'Rest Day' : `${data.duration} minutes of team ${data.type}`}`)
  .join('\n')}

Important Requirements:
1. Focus Area: ${selectedFocus}
2. Equipment Available: ${gymAccess === 'yes' ? 'Gym equipment available' : 'Only ball, pitch, cones and goal'}

Exercise Format:
1. Duration and name should be clear
2. Setup should be specific (distances, equipment)
3. Exercise should explain what to do
4. Focus points should be short and clear (1 point max)
5. For gym exercises, reps/sets

Session Structure:
1. Warm-up (10-15 minutes)
   Setup: Clear space
   Exercise: Light jog, stretches
   Focus: Gradually increase intensity

2. Main exercises (15-20 minutes each)
   - Include 2-3 focused exercises
   - Each with setup, exercise, focus points
   - Rest periods between sets if needed

3. Cool-down (5-10 minutes)
   Setup: Clear space
   Exercise: Light jog, stretches
   Focus: Gradually decrease intensity

Training Rules:
1. Maximum 2 non-football sessions per week
2. Reduce intensity 2 days before game
3. Light session 1 day before game
4. Rest day after game
5. Account for team training load
6. Include at least one full rest day

Remember:
- Keep instructions clear and practical
- Focus points should be observable actions
- If it's a gym day, only include gym exercises
- Consider injury history in exercise selection
- Maintain proper progression throughout the week
- Don't include coaching advice or technical details`;

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
      
      const cleanAndFormatContent = (content: string): string => {
        // Remove markdown symbols and clean up the text
        let cleanContent = content
          .replace(/\*\*/g, '') // Remove bold markers
          .replace(/---/g, '') // Remove horizontal rules
          .replace(/^\s*-\s*/gm, '') // Remove list markers
          .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
          .trim();

        // Split into sections and format as numbered list
        const sections = cleanContent.split(/\d+\.\s+/).filter(Boolean);
        if (sections.length > 0) {
          // If content is already in a numbered format, clean it up
          return sections.map((section, index) => 
            `${index + 1}. ${section.trim()}`
          ).join('\n\n');
        } else {
          // If content is not numbered, split by main sections and number them
          const lines = cleanContent.split('\n').filter(line => line.trim());
          return lines.map((line, index) => 
            `${index + 1}. ${line.trim()}`
          ).join('\n\n');
        }
      };

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
          dailyPlans[day] = cleanAndFormatContent(match[1].trim());
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

      setCanGeneratePlan(false);
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
                  (!canGeneratePlan || loading) && styles.generateButtonDisabled
                ]}
                onPress={handleGeneratePlan}
                disabled={!canGeneratePlan || loading}
              >
                <Text style={styles.generateButtonText}>
                  {loading ? 'Generating Plan...' : 'Generate Training Plan'}
                </Text>
                <Ionicons name="football" size={20} color="#FFFFFF" />
              </Pressable>

              {!canGeneratePlan && timeUntilNextPlan && (
                <Text style={styles.timerText}>
                  Next week's plan available in: {timeUntilNextPlan}
                </Text>
              )}

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