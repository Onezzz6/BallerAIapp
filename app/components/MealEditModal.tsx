import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

interface MealItem {
  name: string;
  portion: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

interface Meal {
  id: string;
  items: MealItem[];
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  photoUri?: string;
  timestamp: string;
  combinedName?: string;
}

interface MealEditModalProps {
  visible: boolean;
  meal: Meal | null;
  onClose: () => void;
  onSave: (updatedMeal: Meal) => Promise<void>;
}

export default function MealEditModal({ visible, meal, onClose, onSave }: MealEditModalProps) {
  const [editedMeal, setEditedMeal] = useState<Meal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (meal) {
      const mealCopy = JSON.parse(JSON.stringify(meal)); // Deep copy
      
      // Ensure combinedName has a value to prevent undefined errors
      if (!mealCopy.combinedName) {
        mealCopy.combinedName = mealCopy.items?.[0]?.name || 'Meal';
      }
      
      setEditedMeal(mealCopy);
    }
  }, [meal]);

  const updateTotalMacro = (macroType: keyof Meal['totalMacros'], value: string) => {
    if (!editedMeal) return;

    const numValue = parseFloat(value) || 0;
    const updatedMeal = { ...editedMeal };
    updatedMeal.totalMacros[macroType] = numValue;
    setEditedMeal(updatedMeal);
  };

  const updateMealName = (name: string) => {
    if (!editedMeal) return;
    setEditedMeal({ ...editedMeal, combinedName: name });
  };

  const handleSave = async () => {
    if (!editedMeal) return;

    try {
      setIsSaving(true);
      await onSave(editedMeal);
      onClose();
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!visible || !editedMeal) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.modalBackdrop} />
        
        <Animated.View 
          style={styles.modalContent}
          entering={FadeInDown.duration(400)}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666666" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Meal</Text>
            <TouchableOpacity 
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveButton, isSaving && styles.savingButton]}
            >
              <Text style={[styles.saveButtonText, isSaving && styles.savingButtonText]}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Meal Name */}
            <Animated.View 
              style={styles.nameSection}
              entering={FadeIn.duration(400).delay(100)}
            >
              <Text style={styles.sectionTitle}>Meal Name</Text>
              <TextInput
                style={styles.nameInput}
                value={editedMeal.combinedName || editedMeal.items?.[0]?.name || ''}
                onChangeText={updateMealName}
                placeholder="Enter meal name"
                placeholderTextColor="#999"
              />
            </Animated.View>

            {/* Total Section */}
            <Animated.View 
              style={styles.totalSection}
              entering={FadeIn.duration(400).delay(200)}
            >
              <Text style={styles.totalTitle}>Total</Text>
              
              {/* Editable Total Macros */}
              <View style={styles.editableTotalMacros}>
                <View style={styles.totalMacroItem}>
                  <Text style={styles.totalMacroEmoji}>🔥</Text>
                  <TextInput
                    style={styles.totalMacroInput}
                    value={Math.round(editedMeal.totalMacros.calories).toString()}
                    onChangeText={(text) => updateTotalMacro('calories', text)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                  <Text style={styles.totalMacroUnit}>kcal</Text>
                </View>

                <View style={styles.totalMacroItem}>
                  <Text style={styles.totalMacroEmoji}>🥩</Text>
                  <TextInput
                    style={styles.totalMacroInput}
                    value={Math.round(editedMeal.totalMacros.protein).toString()}
                    onChangeText={(text) => updateTotalMacro('protein', text)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                  <Text style={styles.totalMacroUnit}>g</Text>
                </View>

                <View style={styles.totalMacroItem}>
                  <Text style={styles.totalMacroEmoji}>🌾</Text>
                  <TextInput
                    style={styles.totalMacroInput}
                    value={Math.round(editedMeal.totalMacros.carbs).toString()}
                    onChangeText={(text) => updateTotalMacro('carbs', text)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                  <Text style={styles.totalMacroUnit}>g</Text>
                </View>

                <View style={styles.totalMacroItem}>
                  <Text style={styles.totalMacroEmoji}>🧈</Text>
                  <TextInput
                    style={styles.totalMacroInput}
                    value={Math.round(editedMeal.totalMacros.fats).toString()}
                    onChangeText={(text) => updateTotalMacro('fats', text)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                  <Text style={styles.totalMacroUnit}>g</Text>
                </View>
              </View>
            </Animated.View>

            {/* Food Items */}
            <Text style={styles.sectionTitle}>Food Items</Text>
            {editedMeal.items.map((item, index) => (
              <Animated.View 
                key={index}
                style={styles.foodItem}
                entering={FadeIn.duration(400).delay(300 + index * 100)}
              >
                <View style={styles.foodItemHeader}>
                  <View style={styles.foodNameDisplay}>
                    <Text style={styles.foodNameText}>{item.name}</Text>
                  </View>
                  <View style={styles.portionDisplay}>
                    <Text style={styles.portionText}>{item.portion}</Text>
                  </View>
                </View>

                {/* Non-editable macro values */}
                <View style={styles.macroDisplay}>
                  <View style={styles.macroDisplayItem}>
                    <Text style={styles.macroDisplayLabel}>Calories</Text>
                    <Text style={styles.macroDisplayValue}>{Math.round(item.macros.calories)}</Text>
                  </View>

                  <View style={styles.macroDisplayItem}>
                    <Text style={styles.macroDisplayLabel}>Protein</Text>
                    <Text style={styles.macroDisplayValue}>{Math.round(item.macros.protein)}</Text>
                  </View>

                  <View style={styles.macroDisplayItem}>
                    <Text style={styles.macroDisplayLabel}>Carbs</Text>
                    <Text style={styles.macroDisplayValue}>{Math.round(item.macros.carbs)}</Text>
                  </View>

                  <View style={styles.macroDisplayItem}>
                    <Text style={styles.macroDisplayLabel}>Fats</Text>
                    <Text style={styles.macroDisplayValue}>{Math.round(item.macros.fats)}</Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  saveButton: {
    backgroundColor: '#4064F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  savingButton: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  savingButtonText: {
    color: '#666666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  totalSection: {
    marginBottom: 24,
  },
  totalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  editableTotalMacros: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  totalMacroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalMacroEmoji: {
    fontSize: 20,
    width: 28,
  },
  totalMacroInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  totalMacroUnit: {
    fontSize: 16,
    color: '#666666',
    width: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  foodItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  foodItemHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  foodNameDisplay: {
    flex: 2,
    backgroundColor: '#E5E5E5',
    padding: 12,
    borderRadius: 8,
  },
  foodNameText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  portionDisplay: {
    flex: 1,
    backgroundColor: '#E5E5E5',
    padding: 12,
    borderRadius: 8,
  },
  portionText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  macroDisplay: {
    flexDirection: 'row',
    gap: 8,
  },
  macroDisplayItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroDisplayLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  macroDisplayValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    backgroundColor: '#E5E5E5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  nameSection: {
    marginBottom: 24,
  },
  nameInput: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
}); 