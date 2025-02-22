import { View, Text, Pressable, StyleSheet, Image, ScrollView, Modal, TextInput, Button, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, G } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, getDoc, collection, addDoc, deleteDoc, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNutrition } from '../context/NutritionContext';
import imageAnalysis from '../services/imageAnalysis';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type MacroGoals = {
  calories: { current: number; goal: number };
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fats: { current: number; goal: number };
};

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';

function calculateDailyCalories(
  weight: number,  // in kg
  height: number,  // in cm
  age: number,
  gender: string,
  activityLevel: ActivityLevel
): number {
  // Harris-Benedict BMR Formula
  let bmr;
  if (gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }

  // Activity Multipliers
  const activityMultipliers = {
    sedentary: 1.2,    // Little or no exercise
    light: 1.375,      // Light exercise/sports 1-3 days/week
    moderate: 1.55,    // Moderate exercise/sports 3-5 days/week
    very: 1.725,       // Hard exercise/sports 6-7 days/week
    extra: 1.9         // Very hard exercise/sports & physical job or training
  };

  return Math.round(bmr * activityMultipliers[activityLevel]);
}

function calculateMacroGoals(dailyCalories: number, goal: string) {
  // Different macro ratios based on goals
  const macroRatios = {
    'maintain': {
      protein: 0.25, // 25% of calories from protein
      fats: 0.25,    // 25% of calories from fat
      carbs: 0.50    // 50% of calories from carbs
    },
    'lose': {
      protein: 0.30, // Higher protein for muscle preservation
      fats: 0.25,
      carbs: 0.45
    },
    'gain': {
      protein: 0.25,
      fats: 0.20,
      carbs: 0.55    // Higher carbs for muscle gain
    }
  };

  const ratios = macroRatios[goal as keyof typeof macroRatios] || macroRatios.maintain;

  return {
    calories: dailyCalories,
    protein: Math.round((dailyCalories * ratios.protein) / 4), // 4 calories per gram of protein
    fats: Math.round((dailyCalories * ratios.fats) / 9),      // 9 calories per gram of fat
    carbs: Math.round((dailyCalories * ratios.carbs) / 4)     // 4 calories per gram of carbs
  };
}

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
  // Add debug log
  useEffect(() => {
    console.log(`${type} - Current: ${current}, Goal: ${goal}`);
  }, [type, current, goal]);

  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;

  return (
    <View style={styles.macroItem}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroTitle}>{type}</Text>
        <Text style={styles.macroValue}>
          {current}g / {goal || 0}g
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill,
            { 
              backgroundColor: color,
              width: `${progress * 100}%`
            }
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

// Define the FoodItem type
type FoodItem = {
  name: string;
  quantity: string;
  unit: string;
};

type MacroData = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type FoodItemWithMacros = FoodItem & MacroData;

type LogMealModalProps = {
  visible: boolean;
  onClose: () => void;
  onPhotoAnalysis: (imageUri: string) => Promise<void>;
  onAddMeal: (meal: any) => void;
};

function LogMealModal({ visible, onClose, onPhotoAnalysis }: LogMealModalProps) {
  const [method, setMethod] = useState<'manual' | 'gallery' | 'camera' | null>(null);
  const [manualEntry, setManualEntry] = useState({
    name: '',
    portion: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: ''
  });

  const handleGallerySelect = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        onPhotoAnalysis(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleCameraCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        onPhotoAnalysis(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleMethodSelect = (selectedMethod: 'manual' | 'gallery' | 'camera') => {
    setMethod(selectedMethod);
    if (selectedMethod === 'gallery') {
      handleGallerySelect();
    } else if (selectedMethod === 'camera') {
      handleCameraCapture();
    }
  };

  const handleManualSubmit = async () => {
    try {
      const mealItem = {
        name: manualEntry.name,
        portion: manualEntry.portion || '1 serving',
        macros: {
          calories: parseInt(manualEntry.calories) || 0,
          protein: parseInt(manualEntry.protein) || 0,
          carbs: parseInt(manualEntry.carbs) || 0,
          fats: parseInt(manualEntry.fats) || 0
        }
      };

      await logMealToFirestore([mealItem]);
      setManualEntry({ name: '', portion: '', calories: '', protein: '', carbs: '', fats: '' });
      setMethod(null);
      onClose();
      Alert.alert('Success', 'Meal logged successfully!');
    } catch (error) {
      console.error('Error logging manual meal:', error);
      Alert.alert('Error', 'Failed to log meal. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Meal</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#000000" />
            </Pressable>
          </View>

          {method === 'manual' ? (
            <ScrollView style={styles.manualForm}>
              <TextInput
                style={styles.input}
                placeholder="Food name"
                value={manualEntry.name}
                onChangeText={(text) => setManualEntry(prev => ({ ...prev, name: text }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Portion (e.g., 1 cup)"
                value={manualEntry.portion}
                onChangeText={(text) => setManualEntry(prev => ({ ...prev, portion: text }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Calories"
                keyboardType="numeric"
                value={manualEntry.calories}
                onChangeText={(text) => setManualEntry(prev => ({ ...prev, calories: text }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Protein (g)"
                keyboardType="numeric"
                value={manualEntry.protein}
                onChangeText={(text) => setManualEntry(prev => ({ ...prev, protein: text }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Carbs (g)"
                keyboardType="numeric"
                value={manualEntry.carbs}
                onChangeText={(text) => setManualEntry(prev => ({ ...prev, carbs: text }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Fats (g)"
                keyboardType="numeric"
                value={manualEntry.fats}
                onChangeText={(text) => setManualEntry(prev => ({ ...prev, fats: text }))}
              />
              <Button
                title="Log Meal"
                onPress={handleManualSubmit}
                containerStyle={{ marginTop: 16 }}
              />
            </ScrollView>
          ) : (
            <View style={styles.methodSelection}>
              <Pressable
                style={styles.methodButton}
                onPress={() => handleMethodSelect('manual')}
              >
                <Ionicons name="create-outline" size={32} color="#000000" />
                <Text style={styles.methodButtonText}>Log{'\n'}Manually</Text>
              </Pressable>

              <Pressable
                style={styles.methodButton}
                onPress={() => handleMethodSelect('gallery')}
              >
                <Ionicons name="images-outline" size={32} color="#000000" />
                <Text style={styles.methodButtonText}>Pick from{'\n'}Gallery</Text>
              </Pressable>

              <Pressable
                style={styles.methodButton}
                onPress={() => handleMethodSelect('camera')}
              >
                <Ionicons name="camera-outline" size={32} color="#000000" />
                <Text style={styles.methodButtonText}>Take{'\n'}Photo</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function LoggedMeals({ meals }: { meals: any[] }) {
  return (
    <View style={styles.loggedMealsContainer}>
      <Text style={styles.loggedMealsTitle}>Recent Meals</Text>
      {meals.map((meal) => (
        <View key={meal.id} style={styles.mealItem}>
          <View style={styles.mealInfo}>
            <Text style={styles.mealName}>{meal.items[0].name}</Text>
            <Text style={styles.mealTime}>
              {format(new Date(meal.timestamp), 'h:mm a')}
            </Text>
          </View>
          <View style={styles.mealMacros}>
            <Text style={styles.mealCalories}>{meal.totalMacros.calories} kcal</Text>
            <View style={styles.macroDetails}>
              <Text style={styles.macroDetail}>P: {meal.totalMacros.protein}g</Text>
              <Text style={styles.macroDetail}>C: {meal.totalMacros.carbs}g</Text>
              <Text style={styles.macroDetail}>F: {meal.totalMacros.fats}g</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

type LabelAnnotation = {
  description: string;
  mid: string;
  score: number;
  topicality: number;
};

export default function NutritionScreen() {
  const { user } = useAuth();
  const { macros, updateMacros, todaysMeals } = useNutrition();
  const [isLogMealModalVisible, setIsLogMealModalVisible] = useState(false);
  const [selectedLoggingMethod, setSelectedLoggingMethod] = useState<'manual' | 'photo' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [loggedMeals, setLoggedMeals] = useState<any[]>([]);

  // Debug logs
  useEffect(() => {
    console.log('NutritionScreen mounted');
    console.log('Current macros:', macros);
    console.log('Current user:', user);
  }, []);

  useEffect(() => {
    if (user) {
      // Load user profile and calculate initial goals
      const loadUserProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User data loaded:', userData);
            
            const weight = parseFloat(userData.weight);
            const height = parseFloat(userData.height);
            const age = parseInt(userData.age);
            
            const dailyCalories = calculateDailyCalories(
              weight,
              height,
              age,
              userData.gender.toLowerCase(),
              userData.activityLevel as ActivityLevel
            );

            const goals = calculateMacroGoals(dailyCalories, userData.footballGoal);
            console.log('Calculated goals:', goals);

            // Update the goals in context
            updateMacros({
              calories: { current: macros.calories.current, goal: goals.calories },
              protein: { current: macros.protein.current, goal: goals.protein },
              carbs: { current: macros.carbs.current, goal: goals.carbs },
              fats: { current: macros.fats.current, goal: goals.fats }
            });
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      };

      loadUserProfile();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'meals'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLoggedMeals(meals);
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
        userId: user.uid,
      };
      
      await addDoc(collection(db, 'users', user.uid, 'meals'), mealData);
      setIsLogMealModalVisible(false);
    } catch (error) {
      console.error('Error adding meal:', error);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'meals', mealId));
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  };

  // Debug log
  useEffect(() => {
    console.log('NutritionScreen macros:', macros);
  }, [macros]);

  const handlePhotoAnalysis = async (imageUri: string) => {
    try {
      setIsLoading(true);
      
      // Upload to Firebase Storage
      const { downloadURL } = await uploadImageToStorage(imageUri);
      
      // Analyze the image
      const analysisResult = await imageAnalysis.analyzeImage(downloadURL);
      console.log('Analysis Result:', analysisResult);

      if (analysisResult.items && analysisResult.items.length > 0) {
        // Log the meal to Firestore
        await logMealToFirestore(analysisResult.items);
        
        Alert.alert('Success', 'Meal logged successfully!');
        setIsLogMealModalVisible(false);
      } else {
        Alert.alert('No food detected', 'Please try another photo or log manually');
      }
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      Alert.alert('Error', error.message || 'Failed to analyze image');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImageToStorage = async (uri: string): Promise<{ downloadURL: string }> => {
    if (!user) throw new Error('Must be logged in to upload images');

    const response = await fetch(uri);
    const blob = await response.blob();
    
    const storage = getStorage();
    const filename = `food_images/${user.uid}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    
    return { downloadURL };
  };

  const fetchNutritionData = async (foodName: string): Promise<MacroData> => {
    try {
      const response = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-id': process.env.NUTRITIONIX_APP_ID!,
          'x-app-key': process.env.NUTRITIONIX_API_KEY!,
        },
        body: JSON.stringify({
          query: foodName,
        }),
      });

      const data = await response.json();
      
      if (data.foods && data.foods.length > 0) {
        const food = data.foods[0];
        return {
          calories: Math.round(food.nf_calories),
          protein: Math.round(food.nf_protein),
          carbs: Math.round(food.nf_total_carbohydrate),
          fats: Math.round(food.nf_total_fat)
        };
      }
      
      throw new Error('No nutrition data found');
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
      // Return default values if API fails
      return {
        calories: 100,
        protein: 5,
        carbs: 20,
        fats: 2
      };
    }
  };

  const logMealToFirestore = async (items: any[]) => {
    if (!user) {
      throw new Error('Must be logged in to log meals');
    }

    try {
      const mealData = {
        userId: user.uid,
        timestamp: new Date().toISOString(),
        items: items,
        totalMacros: items.reduce((acc: any, item: any) => ({
          calories: acc.calories + item.macros.calories,
          protein: acc.protein + item.macros.protein,
          carbs: acc.carbs + item.macros.carbs,
          fats: acc.fats + item.macros.fats
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 })
      };

      await addDoc(collection(db, 'meals'), mealData);
      console.log('Meal logged successfully:', mealData);
    } catch (error) {
      console.error('Error logging meal:', error);
      throw error;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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

        {/* Centered Nutrition Title */}
        <Text style={{
          fontSize: 32,
          fontWeight: '700',
          color: '#000000',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          Nutrition
        </Text>
      </View>

      <ScrollView>
        <View style={styles.calorieCard}>
          <CalorieProgress 
            eaten={macros.calories.current}
            burned={0}
            goal={macros.calories.goal}
          />
        </View>

        <View style={styles.macrosCard}>
          <MacroProgress
            type="Protein"
            current={macros.protein.current}
            goal={macros.protein.goal}
            color="#FF6B6B"
          />
          <MacroProgress
            type="Carbs"
            current={macros.carbs.current}
            goal={macros.carbs.goal}
            color="#4ECDC4"
          />
          <MacroProgress
            type="Fats"
            current={macros.fats.current}
            goal={macros.fats.goal}
            color="#FFD93D"
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

        <LoggedMeals meals={loggedMeals} />
      </ScrollView>

      <LogMealModal
        visible={isLogMealModalVisible}
        onClose={() => setIsLogMealModalVisible(false)}
        onPhotoAnalysis={handlePhotoAnalysis}
        onAddMeal={handleAddMeal}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4A72B2" />
          <Text style={styles.loadingText}>Analyzing image...</Text>
        </View>
      )}
    </SafeAreaView>
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
  macroItem: {
    gap: 8,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  macroValue: {
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
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    gap: 8,
  },
  methodButtonText: {
    fontSize: 14,
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
    marginTop: 16,
    paddingHorizontal: 24,
  },
  loggedMealsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
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
  loggingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  loggingOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
  },
}); 