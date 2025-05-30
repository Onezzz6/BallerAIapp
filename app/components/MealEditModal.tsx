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
      setEditedMeal(JSON.parse(JSON.stringify(meal))); // Deep copy
    }
  }, [meal]);

  const updateItemMacro = (itemIndex: number, macroType: keyof MealItem['macros'], value: string) => {
    if (!editedMeal) return;

    const numValue = parseFloat(value) || 0;
    const updatedMeal = { ...editedMeal };
    updatedMeal.items[itemIndex].macros[macroType] = numValue;

    // Recalculate total macros
    updatedMeal.totalMacros = updatedMeal.items.reduce(
      (total, item) => ({
        calories: total.calories + item.macros.calories,
        protein: total.protein + item.macros.protein,
        carbs: total.carbs + item.macros.carbs,
        fats: total.fats + item.macros.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    setEditedMeal(updatedMeal);
  };

  const updateItemName = (itemIndex: number, name: string) => {
    if (!editedMeal) return;

    const updatedMeal = { ...editedMeal };
    updatedMeal.items[itemIndex].name = name;
    setEditedMeal(updatedMeal);
  };

  const updateItemPortion = (itemIndex: number, portion: string) => {
    if (!editedMeal) return;

    const updatedMeal = { ...editedMeal };
    updatedMeal.items[itemIndex].portion = portion;
    setEditedMeal(updatedMeal);
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
            {/* Meal Info */}
            <Animated.View 
              style={styles.mealInfoSection}
              entering={FadeIn.duration(400).delay(200)}
            >
              <View style={styles.mealHeader}>
                {editedMeal.photoUri && (
                  <Image source={{ uri: editedMeal.photoUri }} style={styles.mealPhoto} />
                )}
                <View style={styles.mealDetails}>
                  <Text style={styles.mealTime}>{formatTime(editedMeal.timestamp)}</Text>
                  <Text style={styles.totalCalories}>
                    {Math.round(editedMeal.totalMacros.calories)} kcal total
                  </Text>
                </View>
              </View>

              {/* Total Macros Summary */}
              <View style={styles.macrosSummary}>
                <View style={styles.macroSummaryItem}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>{Math.round(editedMeal.totalMacros.protein)}g</Text>
                </View>
                <View style={styles.macroSummaryItem}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroValue}>{Math.round(editedMeal.totalMacros.carbs)}g</Text>
                </View>
                <View style={styles.macroSummaryItem}>
                  <Text style={styles.macroLabel}>Fats</Text>
                  <Text style={styles.macroValue}>{Math.round(editedMeal.totalMacros.fats)}g</Text>
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
                  <TextInput
                    style={styles.foodNameInput}
                    value={item.name}
                    onChangeText={(text) => updateItemName(index, text)}
                    placeholder="Food name"
                  />
                  <TextInput
                    style={styles.portionInput}
                    value={item.portion}
                    onChangeText={(text) => updateItemPortion(index, text)}
                    placeholder="Portion"
                  />
                </View>

                <View style={styles.macroInputs}>
                  <View style={styles.macroInputGroup}>
                    <Text style={styles.macroInputLabel}>Calories</Text>
                    <TextInput
                      style={styles.macroInput}
                      value={item.macros.calories.toString()}
                      onChangeText={(text) => updateItemMacro(index, 'calories', text)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>

                  <View style={styles.macroInputGroup}>
                    <Text style={styles.macroInputLabel}>Protein</Text>
                    <TextInput
                      style={styles.macroInput}
                      value={item.macros.protein.toString()}
                      onChangeText={(text) => updateItemMacro(index, 'protein', text)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>

                  <View style={styles.macroInputGroup}>
                    <Text style={styles.macroInputLabel}>Carbs</Text>
                    <TextInput
                      style={styles.macroInput}
                      value={item.macros.carbs.toString()}
                      onChangeText={(text) => updateItemMacro(index, 'carbs', text)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>

                  <View style={styles.macroInputGroup}>
                    <Text style={styles.macroInputLabel}>Fats</Text>
                    <TextInput
                      style={styles.macroInput}
                      value={item.macros.fats.toString()}
                      onChangeText={(text) => updateItemMacro(index, 'fats', text)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
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
  mealInfoSection: {
    marginBottom: 24,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mealPhoto: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  mealDetails: {
    flex: 1,
  },
  mealTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  totalCalories: {
    fontSize: 14,
    color: '#666666',
  },
  macrosSummary: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  macroSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
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
    marginBottom: 16,
    gap: 12,
  },
  foodNameInput: {
    flex: 2,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    fontSize: 16,
  },
  portionInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    fontSize: 16,
  },
  macroInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  macroInputGroup: {
    flex: 1,
  },
  macroInputLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    textAlign: 'center',
  },
  macroInput: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    textAlign: 'center',
    fontSize: 14,
  },
}); 