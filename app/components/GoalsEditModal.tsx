import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { calculateNutritionGoals } from '../utils/nutritionCalculations';

type GoalsEditModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  currentGoals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
};

export default function GoalsEditModal({ visible, onClose, onSave, currentGoals }: GoalsEditModalProps) {
  const { user } = useAuth();
  const [useCustomGoals, setUseCustomGoals] = useState(false);
  const [goals, setGoals] = useState({
    calories: '',
    protein: '',
    carbs: '',
    fats: ''
  });
  const [suggestedGoals, setSuggestedGoals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load user's current goals and preferences when modal opens
  useEffect(() => {
    if (visible && user) {
      loadUserGoals();
    }
  }, [visible, user]);

  const loadUserGoals = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get user document to calculate suggested goals
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Calculate suggested goals
        const { calorieGoal, macroGoals } = calculateNutritionGoals(userData);
        const suggested = {
          calories: calorieGoal,
          protein: macroGoals.protein,
          carbs: macroGoals.carbs,
          fats: macroGoals.fat
        };
        setSuggestedGoals(suggested);
        
        // Check if user has custom goals saved
        if (userData.customGoals && userData.useCustomGoals) {
          setUseCustomGoals(true);
          setGoals({
            calories: userData.customGoals.calories?.toString() || '',
            protein: userData.customGoals.protein?.toString() || '',
            carbs: userData.customGoals.carbs?.toString() || '',
            fats: userData.customGoals.fats?.toString() || ''
          });
        } else {
          setUseCustomGoals(false);
          setGoals({
            calories: suggested.calories.toString(),
            protein: suggested.protein.toString(),
            carbs: suggested.carbs.toString(),
            fats: suggested.fats.toString()
          });
        }
      }
    } catch (error) {
      console.error('Error loading user goals:', error);
      Alert.alert('Error', 'Failed to load your goals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleChange = (value: boolean) => {
    setUseCustomGoals(value);
    
    if (!value) {
      // Switch to suggested goals - populate with suggested values
      setGoals({
        calories: suggestedGoals.calories.toString(),
        protein: suggestedGoals.protein.toString(),
        carbs: suggestedGoals.carbs.toString(),
        fats: suggestedGoals.fats.toString()
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      // Validate inputs if using custom goals
      if (useCustomGoals) {
        const calories = parseInt(goals.calories);
        const protein = parseInt(goals.protein);
        const carbs = parseInt(goals.carbs);
        const fats = parseInt(goals.fats);
        
        if (isNaN(calories) || calories <= 0) {
          Alert.alert('Invalid Input', 'Please enter a valid calorie goal.');
          return;
        }
        if (isNaN(protein) || protein < 0) {
          Alert.alert('Invalid Input', 'Please enter a valid protein goal.');
          return;
        }
        if (isNaN(carbs) || carbs < 0) {
          Alert.alert('Invalid Input', 'Please enter a valid carbs goal.');
          return;
        }
        if (isNaN(fats) || fats < 0) {
          Alert.alert('Invalid Input', 'Please enter a valid fats goal.');
          return;
        }
      }
      
      // Save to Firebase
      const userDocRef = doc(db, 'users', user.uid);
      
      if (useCustomGoals) {
        // Save custom goals
        const customGoals = {
          calories: parseInt(goals.calories),
          protein: parseInt(goals.protein),
          carbs: parseInt(goals.carbs),
          fats: parseInt(goals.fats)
        };
        
        await updateDoc(userDocRef, {
          useCustomGoals: true,
          customGoals: customGoals
        });
      } else {
        // Use suggested goals - just set the flag
        await updateDoc(userDocRef, {
          useCustomGoals: false
        });
      }
      
      console.log('Goals saved successfully');
      onSave(); // Trigger refresh in parent component
      onClose();
      
    } catch (error) {
      console.error('Error saving goals:', error);
      Alert.alert('Error', 'Failed to save your goals. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <Animated.View 
          style={styles.modalContent}
          entering={FadeInDown.duration(400).springify()}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nutrition Goals</Text>
            <Pressable 
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#666666" />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4064F6" />
              <Text style={styles.loadingText}>Loading your goals...</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Toggle Switch */}
              <View style={styles.toggleContainer}>
                <View style={styles.toggleOption}>
                  <Text style={[styles.toggleText, !useCustomGoals && styles.toggleTextActive]}>
                    Use suggested goals
                  </Text>
                  <Switch
                    value={useCustomGoals}
                    onValueChange={handleToggleChange}
                    trackColor={{ false: '#4064F6', true: '#4064F6' }}
                    thumbColor={useCustomGoals ? '#FFFFFF' : '#FFFFFF'}
                  />
                  <Text style={[styles.toggleText, useCustomGoals && styles.toggleTextActive]}>
                    Customize goals
                  </Text>
                </View>
              </View>

              {/* Goals Input Section */}
              <View style={styles.goalsSection}>
                <View style={styles.goalInput}>
                  <Text style={styles.goalLabel}>🔥 Calories</Text>
                  <TextInput
                    style={[styles.input, !useCustomGoals && styles.inputReadOnly]}
                    value={goals.calories}
                    onChangeText={(text) => setGoals(prev => ({ ...prev, calories: text }))}
                    keyboardType="numeric"
                    editable={useCustomGoals}
                    placeholder="0"
                  />
                  <Text style={styles.goalUnit}>kcal</Text>
                </View>

                <View style={styles.goalInput}>
                  <Text style={styles.goalLabel}>🥩 Protein</Text>
                  <TextInput
                    style={[styles.input, !useCustomGoals && styles.inputReadOnly]}
                    value={goals.protein}
                    onChangeText={(text) => setGoals(prev => ({ ...prev, protein: text }))}
                    keyboardType="numeric"
                    editable={useCustomGoals}
                    placeholder="0"
                  />
                  <Text style={styles.goalUnit}>g</Text>
                </View>

                <View style={styles.goalInput}>
                  <Text style={styles.goalLabel}>🌾 Carbs</Text>
                  <TextInput
                    style={[styles.input, !useCustomGoals && styles.inputReadOnly]}
                    value={goals.carbs}
                    onChangeText={(text) => setGoals(prev => ({ ...prev, carbs: text }))}
                    keyboardType="numeric"
                    editable={useCustomGoals}
                    placeholder="0"
                  />
                  <Text style={styles.goalUnit}>g</Text>
                </View>

                <View style={styles.goalInput}>
                  <Text style={styles.goalLabel}>🧈 Fats</Text>
                  <TextInput
                    style={[styles.input, !useCustomGoals && styles.inputReadOnly]}
                    value={goals.fats}
                    onChangeText={(text) => setGoals(prev => ({ ...prev, fats: text }))}
                    keyboardType="numeric"
                    editable={useCustomGoals}
                    placeholder="0"
                  />
                  <Text style={styles.goalUnit}>g</Text>
                </View>
              </View>

              {/* Info Text */}
              <View style={styles.infoContainer}>
                <Ionicons name="information-circle" size={16} color="#666666" />
                <Text style={styles.infoText}>
                  {useCustomGoals 
                    ? "Enter your custom daily nutrition goals. These will be used throughout the app for tracking your progress."
                    : "These goals are automatically calculated based on your profile information including age, weight, height, activity level, and fitness goals."
                  }
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Save Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.saveButton, (isLoading || isSaving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isLoading || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Goals</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '95%',
    maxWidth: 480,
    maxHeight: '90%',
    minHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    padding: 24,
    paddingTop: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
  },
  toggleContainer: {
    marginBottom: 32,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 16,
    gap: 16,
    minHeight: 60,
  },
  toggleText: {
    fontSize: 18,
    color: '#666666',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#4064F6',
    fontWeight: '700',
  },
  goalsSection: {
    gap: 20,
    marginBottom: 28,
  },
  goalInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  goalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 10,
    fontSize: 18,
    textAlign: 'center',
    minWidth: 100,
    color: '#000000',
    fontWeight: '600',
  },
  inputReadOnly: {
    backgroundColor: '#F8F9FA',
    color: '#666666',
  },
  goalUnit: {
    fontSize: 16,
    color: '#666666',
    minWidth: 40,
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
    flex: 1,
  },
  modalFooter: {
    padding: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  saveButton: {
    backgroundColor: '#4064F6',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: '#4064F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
}); 