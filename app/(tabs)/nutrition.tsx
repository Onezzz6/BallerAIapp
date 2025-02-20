import { View, Text, Pressable, StyleSheet, Image, ScrollView, Modal, TextInput, Button, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, G } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, getDoc, collection, addDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

type MacroGoals = {
  calories: { current: number; goal: number };
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fats: { current: number; goal: number };
};

function CircularProgress({ progress }: { progress: number }) {
  const size = 140;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  
  // Calculate the path for a semi-circle starting from left
  const startAngle = -180;
  const endAngle = 0;
  const angleRange = endAngle - startAngle;
  const progressAngle = startAngle + (angleRange * progress);
  
  // Convert angles to radians and calculate coordinates
  const startRad = (startAngle * Math.PI) / 180;
  const progressRad = (progressAngle * Math.PI) / 180;
  
  // Calculate points
  const startX = center + radius * Math.cos(startRad);
  const startY = center + radius * Math.sin(startRad);
  const progressX = center + radius * Math.cos(progressRad);
  const progressY = center + radius * Math.sin(progressRad);
  
  // Create the arc path
  const largeArcFlag = progress > 0.5 ? 1 : 0;
  const arcPath = `
    M ${startX} ${startY}
    A ${radius} ${radius} 0 ${largeArcFlag} 1 ${progressX} ${progressY}
  `;
  
  return (
    <Svg width={size} height={size / 2} style={{ transform: [{ translateY: -35 }] }}>
      {/* Background Arc */}
      <Path
        d={`
          M ${strokeWidth} ${center}
          A ${radius} ${radius} 0 1 1 ${size - strokeWidth} ${center}
        `}
        stroke="#E5E5E5"
        strokeWidth={strokeWidth}
        fill="none"
      />
      
      {/* Progress Arc */}
      <Path
        d={arcPath}
        stroke="#4A72B2"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Progress Indicator */}
      <Circle
        cx={progressX}
        cy={progressY}
        r={8}
        fill="#4A72B2"
      />
    </Svg>
  );
}

function CalorieProgress({ eaten, burned, goal }: { eaten: number; burned: number; goal: number }) {
  const remaining = goal - eaten;
  const progress = Math.min(Math.max(eaten / goal, 0), 1);

  return (
    <View style={styles.calorieCard}>
      <View style={styles.calorieHeader}>
        <Text style={styles.calorieTitle}>Daily Calories</Text>
        <Text style={styles.calorieGoal}>Target: {goal} kcal</Text>
      </View>

      <View style={styles.calorieCircleContainer}>
        <View style={styles.circleProgress}>
          {/* Circular Progress */}
          <View style={styles.progressCircle}>
            <View style={styles.progressBackground}>
              <View style={styles.progressValue}>
                <Text style={styles.progressNumber}>{eaten}</Text>
                <Text style={styles.progressLabel}>consumed</Text>
              </View>
            </View>
            <Svg width={200} height={200} style={StyleSheet.absoluteFill}>
              {/* Background Circle */}
              <Circle
                cx={100}
                cy={100}
                r={80}
                stroke="#E5E5E5"
                strokeWidth={12}
                fill="transparent"
              />
              {/* Progress Circle */}
              <Circle
                cx={100}
                cy={100}
                r={80}
                stroke="#4A72B2"
                strokeWidth={12}
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 80}`}
                strokeDashoffset={2 * Math.PI * 80 * (1 - progress)}
                transform={`rotate(-90 100 100)`}
              />
            </Svg>
          </View>
        </View>

        {/* Stats below circle */}
        <View style={styles.calorieStats}>
          <View style={styles.calorieStat}>
            <Text style={styles.calorieValue}>{remaining}</Text>
            <Text style={styles.calorieLabel}>Remaining</Text>
          </View>

          <View style={styles.calorieDivider} />

          <View style={styles.calorieStat}>
            <Text style={styles.calorieValue}>{goal}</Text>
            <Text style={styles.calorieLabel}>Goal</Text>
          </View>
        </View>
      </View>

      <View style={styles.dateSelector}>
        <Pressable>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </Pressable>
        <View style={styles.dateDisplay}>
          <Ionicons name="calendar-outline" size={20} color="#666666" />
          <Text style={styles.dateText}>Tuesday, Feb 4</Text>
        </View>
        <Pressable>
          <Ionicons name="chevron-forward" size={24} color="#000000" />
        </Pressable>
      </View>
    </View>
  );
}

function MacroProgress({ type, current, goal, color }: {
  type: string;
  current: number;
  goal: number;
  color: string;
}) {
  const progress = (current / goal) * 100;
  
  return (
    <View style={styles.macroContainer}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroType}>{type}</Text>
        <Text style={styles.macroValues}>{current} / {goal}g</Text>
      </View>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill,
            { width: `${Math.min(progress, 100)}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );
}

function WeeklyAdherence({ percentage }: { percentage: number }) {
  return (
    <View style={styles.adherenceContainer}>
      <View style={styles.adherenceHeader}>
        <Text style={styles.adherenceTitle}>Nutrition Goals</Text>
        <Text style={styles.adherencePercentage}>{percentage} / 100%</Text>
      </View>
      <View style={styles.adherenceBar}>
        <View 
          style={[
            styles.adherenceFill,
            { width: `${percentage}%` }
          ]} 
        />
      </View>
      <Text style={styles.adherenceLabel}>Weekly adherence</Text>
    </View>
  );
}

export default function NutritionScreen() {
  const { user } = useAuth();
  const [macros, setMacros] = useState<MacroGoals>({
    calories: { current: 381, goal: 2000 },
    protein: { current: 89, goal: 200 },
    carbs: { current: 87, goal: 224 },
    fats: { current: 30, goal: 60 },
  });

  const [isLogMealModalVisible, setIsLogMealModalVisible] = useState(false);
  const [selectedLoggingMethod, setSelectedLoggingMethod] = useState<'manual' | 'photo' | null>(null);
  const [meals, setMeals] = useState<Array<{
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    timestamp: Date;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'meals'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMeals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }));
      setMeals(fetchedMeals);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddMeal = async (newMeal: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }) => {
    if (!user) return;

    try {
      const mealData = {
        ...newMeal,
        timestamp: new Date(),
      };
      
      // Add to Firebase
      const mealsRef = collection(db, 'users', user.uid, 'meals');
      await addDoc(mealsRef, mealData);

      // Update daily macros in Firebase
      const today = format(new Date(), 'yyyy-MM-dd');
      const macrosRef = doc(db, 'users', user.uid, 'dailyMacros', today);
      
      const currentMacros = await getDoc(macrosRef);
      const updatedMacros = {
        calories: (currentMacros.data()?.calories || 0) + newMeal.calories,
        protein: (currentMacros.data()?.protein || 0) + newMeal.protein,
        carbs: (currentMacros.data()?.carbs || 0) + newMeal.carbs,
        fats: (currentMacros.data()?.fats || 0) + newMeal.fats,
        lastUpdated: new Date(),
      };

      await setDoc(macrosRef, updatedMacros, { merge: true });
    } catch (error) {
      console.error('Error adding meal:', error);
    }
  };

  const handleDeleteMeal = async (mealId: string, mealData: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }) => {
    if (!user) return;

    try {
      // Delete from Firebase
      await deleteDoc(doc(db, 'users', user.uid, 'meals', mealId));

      // Update daily macros in Firebase
      const today = format(new Date(), 'yyyy-MM-dd');
      const macrosRef = doc(db, 'users', user.uid, 'dailyMacros', today);
      
      const currentMacros = await getDoc(macrosRef);
      const updatedMacros = {
        calories: (currentMacros.data()?.calories || 0) - mealData.calories,
        protein: (currentMacros.data()?.protein || 0) - mealData.protein,
        carbs: (currentMacros.data()?.carbs || 0) - mealData.carbs,
        fats: (currentMacros.data()?.fats || 0) - mealData.fats,
        lastUpdated: new Date(),
      };

      await setDoc(macrosRef, updatedMacros, { merge: true });
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Nutrition Tracker</Text>
          <Text style={styles.subtitle}>Monitor your macros</Text>

          <CalorieProgress 
            eaten={macros.calories.current}
            burned={0}
            goal={macros.calories.goal}
          />

          <View style={styles.macrosCard}>
            <MacroProgress 
              type="Fats"
              current={macros.fats.current}
              goal={macros.fats.goal}
              color="#4A72B2"
            />
            <MacroProgress 
              type="Protein"
              current={macros.protein.current}
              goal={macros.protein.goal}
              color="#FF9500"
            />
            <MacroProgress 
              type="Carbs"
              current={macros.carbs.current}
              goal={macros.carbs.goal}
              color="#00BFB3"
            />
            
            <WeeklyAdherence percentage={60} />
          </View>

          <View style={styles.mealsSection}>
            <Pressable 
              style={styles.logMealButton}
              onPress={() => setIsLogMealModalVisible(true)}
            >
              <Text style={styles.logMealText}>Log Meal</Text>
              <View style={styles.logMealIcon}>
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>

          <LoggedMeals meals={meals} onDelete={handleDeleteMeal} />
        </View>
      </ScrollView>

      <LogMealModal
        visible={isLogMealModalVisible}
        onClose={() => setIsLogMealModalVisible(false)}
        onAddMeal={handleAddMeal}
      />
    </SafeAreaView>
  );    
}

function LogMealModal({ 
  visible, 
  onClose,
  onAddMeal,
}: { 
  visible: boolean; 
  onClose: () => void;
  onAddMeal: (meal: any) => void;
}) {
  const [method, setMethod] = useState<'manual' | 'photo' | null>(null);
  const [manualEntry, setManualEntry] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
  });

  const handleSubmitManual = () => {
    onAddMeal({
      name: manualEntry.name,
      calories: Number(manualEntry.calories),
      protein: Number(manualEntry.protein),
      carbs: Number(manualEntry.carbs),
      fats: Number(manualEntry.fats),
    });
    onClose();
    setMethod(null);
    setManualEntry({ name: '', calories: '', protein: '', carbs: '', fats: '' });
  };

  const handlePhotoAnalysis = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        // Here you would typically send the image to your AI service
        // For now, we'll simulate a response
        const analyzedMeal = {
          name: "Analyzed Meal",
          calories: 350,
          protein: 20,
          carbs: 40,
          fats: 15,
        };
        
        onAddMeal(analyzedMeal);
        onClose();
        setMethod(null);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Log Meal</Text>
                <Pressable onPress={onClose}>
                  <Ionicons name="close" size={24} color="#000000" />
                </Pressable>
              </View>

              <ScrollView 
                style={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
              >
                {!method ? (
                  <View style={styles.methodSelection}>
                    <Pressable 
                      style={styles.methodButton}
                      onPress={() => setMethod('photo')}
                    >
                      <Ionicons name="camera" size={32} color="#4A72B2" />
                      <Text style={styles.methodButtonText}>Analyze Photo</Text>
                    </Pressable>

                    <Pressable 
                      style={styles.methodButton}
                      onPress={() => setMethod('manual')}
                    >
                      <Ionicons name="create" size={32} color="#4A72B2" />
                      <Text style={styles.methodButtonText}>Manual Entry</Text>
                    </Pressable>
                  </View>
                ) : method === 'manual' ? (
                  <View style={styles.manualForm}>
                    <TextInput
                      style={styles.input}
                      placeholder="Meal Name"
                      value={manualEntry.name}
                      onChangeText={text => setManualEntry(prev => ({ ...prev, name: text }))}
                      returnKeyType="next"
                      blurOnSubmit={false}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Calories"
                      keyboardType="numeric"
                      value={manualEntry.calories}
                      onChangeText={text => setManualEntry(prev => ({ ...prev, calories: text }))}
                      returnKeyType="next"
                      blurOnSubmit={false}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Protein (g)"
                      keyboardType="numeric"
                      value={manualEntry.protein}
                      onChangeText={text => setManualEntry(prev => ({ ...prev, protein: text }))}
                      returnKeyType="next"
                      blurOnSubmit={false}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Carbs (g)"
                      keyboardType="numeric"
                      value={manualEntry.carbs}
                      onChangeText={text => setManualEntry(prev => ({ ...prev, carbs: text }))}
                      returnKeyType="next"
                      blurOnSubmit={false}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Fats (g)"
                      keyboardType="numeric"
                      value={manualEntry.fats}
                      onChangeText={text => {
                        setManualEntry(prev => ({ ...prev, fats: text }));
                        Keyboard.dismiss();
                      }}
                      returnKeyType="done"
                    />
                    <Button 
                      title="Log Meal"
                      onPress={handleSubmitManual}
                      buttonStyle={styles.submitButton}
                    />
                  </View>
                ) : (
                  <View style={styles.photoAnalysis}>
                    <Button 
                      title="Select Photo"
                      onPress={handlePhotoAnalysis}
                      buttonStyle={styles.submitButton}
                    />
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function LoggedMeals({ meals, onDelete }: { 
  meals: Array<{
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    timestamp: Date;
  }>;
  onDelete: (id: string, mealData: any) => void;
}) {
  return (
    <View style={styles.loggedMealsContainer}>
      <Text style={styles.loggedMealsTitle}>Logged Meals</Text>
      {meals.map((meal) => (
        <View key={meal.id} style={styles.mealItem}>
          <View style={styles.mealInfo}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <Text style={styles.mealTime}>
              {format(meal.timestamp, 'h:mm a')}
            </Text>
          </View>
          
          <View style={styles.mealMacros}>
            <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
            <View style={styles.macroDetails}>
              <Text style={styles.macroDetail}>P: {meal.protein}g</Text>
              <Text style={styles.macroDetail}>C: {meal.carbs}g</Text>
              <Text style={styles.macroDetail}>F: {meal.fats}g</Text>
            </View>
          </View>

          <Pressable 
            onPress={() => onDelete(meal.id, meal)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              padding: 8,
            })}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  calorieCard: {
    backgroundColor: '#EEF3FB',
    margin: 24,
    borderRadius: 24,
    padding: 24,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  calorieTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  calorieGoal: {
    fontSize: 16,
    color: '#4A72B2',
    fontWeight: '500',
  },
  calorieCircleContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  circleProgress: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  progressCircle: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  progressBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressValue: {
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000000',
  },
  progressLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  calorieStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  calorieStat: {
    alignItems: 'center',
  },
  calorieValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  calorieLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  calorieDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  macrosCard: {
    backgroundColor: '#FFFFFF',
    margin: 24,
    marginTop: 0,
    borderRadius: 24,
    padding: 24,
    gap: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  macroContainer: {
    gap: 8,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  macroValues: {
    fontSize: 14,
    color: '#666666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  adherenceContainer: {
    gap: 8,
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adherenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  adherencePercentage: {
    fontSize: 14,
    color: '#666666',
  },
  adherenceBar: {
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  adherenceFill: {
    height: '100%',
    backgroundColor: '#99E86C',
    borderRadius: 4,
  },
  adherenceLabel: {
    fontSize: 14,
    color: '#666666',
    alignSelf: 'flex-end',
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  statsButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  mealsSection: {
    padding: 24,
    paddingTop: 0,
  },
  mealsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mealsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  seeMoreText: {
    fontSize: 16,
    color: '#4A72B2',
  },
  logMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  logMealText: {
    fontSize: 16,
    color: '#4A72B2',
  },
  logMealIcon: {
    backgroundColor: '#4A72B2',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  methodSelection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
    padding: 24,
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    gap: 12,
  },
  methodButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
  },
  manualForm: {
    gap: 16,
    paddingBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#4A72B2',
  },
  photoAnalysis: {
    alignItems: 'center',
    padding: 24,
  },
  modalScroll: {
    maxHeight: '80%',
  },
  loggedMealsContainer: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  loggedMealsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 14,
    color: '#666666',
  },
  mealMacros: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  macroDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  macroDetail: {
    fontSize: 14,
    color: '#666666',
  },
}); 