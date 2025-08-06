import { View, Text, Image, Pressable, StyleSheet, ScrollView, TextInput, Modal, ActivityIndicator, Alert, Linking, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useOnboarding } from '../../context/OnboardingContext';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { db, auth as authInstance } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../components/Button';
import storage from '@react-native-firebase/storage';
import { useRouter } from 'expo-router';
import authService from '../../services/auth';
import { Picker } from '@react-native-picker/picker';
import CustomButton from '../components/CustomButton';
import * as AppleAuthentication from 'expo-apple-authentication';
import { calculateNutritionGoals } from '../../utils/nutritionCalculations';
import Animated, { PinwheelIn } from 'react-native-reanimated';
import { XpHeaderBanner } from '../components/XpHeaderBanner';

type UserData = {
  username?: string;
  age?: string;
  gender?: string;
  height?: string;
  weight?: string;
  dominantFoot?: string;
  position?: string;
  teamStatus?: string;
  skillLevel?: string;
  trainingFrequency?: string;
  fitnessLevel?: string;
  activityLevel?: string;
  profilePicture?: string;
  injuryHistory?: string;
  preferMetricUnits?: boolean;
};

type ProfileDetail = {
  field: string;
  label: string;
  value?: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Imperial/Metric system state for height and weight editing
  const [isMetricHeight, setIsMetricHeight] = useState(true);
  const [isMetricWeight, setIsMetricWeight] = useState(true);
  const [heightFeet, setHeightFeet] = useState(5);
  const [heightInches, setHeightInches] = useState(7);
  const [weightPounds, setWeightPounds] = useState(154);
  
  // User preference for display units (loaded from user data, defaults to metric)
  const [preferMetricDisplay, setPreferMetricDisplay] = useState(true);

  // Conversion functions (from measurements.tsx)
  const cmToFeetInches = (cm: number) => {
    const totalInches = Math.round(cm / 2.54);
    const ft = Math.floor(totalInches / 12);
    const inch = totalInches % 12;
    return { feet: ft, inches: inch };
  };

  const feetInchesToCm = (ft: number, inch: number) => {
    return Math.round(((ft * 12) + inch) * 2.54);
  };

  const kgToLbs = (kg: number) => {
    return Math.round(kg * 2.20462);
  };

  const lbsToKg = (lbs: number) => {
    return Math.round(lbs / 2.20462);
  };

  // Format height and weight values for display based on user preference
  const getDisplayValue = (field: string, value: string | undefined): { displayValue: string; unit: string } => {
    if (!value) return { displayValue: 'Not set', unit: '' };
    
    if (field === 'height') {
      const heightCm = parseFloat(value);
      if (preferMetricDisplay) {
        return { displayValue: `${heightCm}`, unit: 'cm' };
      } else {
        const { feet, inches } = cmToFeetInches(heightCm);
        return { displayValue: `${feet}'${inches}"`, unit: '' };
      }
    } else if (field === 'weight') {
      const weightKg = parseFloat(value);
      if (preferMetricDisplay) {
        return { displayValue: `${weightKg}`, unit: 'kg' };
      } else {
        const pounds = kgToLbs(weightKg);
        return { displayValue: `${pounds}`, unit: 'lb' };
      }
    } else if (field === 'age') {
      return { displayValue: value, unit: 'years' };
    } else {
      return { displayValue: value.charAt(0).toUpperCase() + value.slice(1), unit: '' };
    }
  };

  const renderModalButtons = (onSave: () => void) => (
    <View style={styles.modalButtons}>
      <Button
        title="Cancel"
        onPress={() => setEditingField(null)}
        buttonStyle={{ backgroundColor: '#666666', flex: 1, minWidth: 130 }}
        textStyle={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}
        disabled={isSaving}
      />
      <Button
        title={isSaving ? "Saving..." : "Save"}
        onPress={onSave}
        buttonStyle={{ backgroundColor: '#4064F6', flex: 1, minWidth: 130 }}
        textStyle={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}
        disabled={isSaving}
      />
    </View>
  );

  const uploadImageToFirebase = async (uri: string) => {
    if (!user?.uid) {
      alert('You must be logged in to upload a profile picture');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create unique filename with user ID in path
      const timestamp = new Date().getTime();
      const storageRef = storage().ref(`profile_pictures/${user.uid}/profile_${timestamp}.jpg`);
      
      // Upload to Firebase Storage
      const uploadTask = await storageRef.put(blob);
      console.log('Upload successful:', uploadTask);
      
      // Get download URL
      const downloadURL = await storageRef.getDownloadURL();
      console.log('Download URL:', downloadURL);
      
      // Update user profile in Firestore
      const userRef = db.collection('users').doc(user.uid);
      await userRef.update({
        profilePicture: downloadURL
      });
      
      // Update local state
      setProfileImage(downloadURL);
      setUserData(prev => prev ? {
        ...prev,
        profilePicture: downloadURL
      } : { profilePicture: downloadURL });

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Selected image URI:', result.assets[0].uri);
        await uploadImageToFirebase(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to select image. Please try again.');
    }
  };

  const calculateAndUpdateGoals = async (userData: UserData) => {
    if (!user) return;
    
    try {
      console.log('🔄 Calculating new goals based on:', userData);
      const userRef = db.collection('users').doc(user.uid);
      
      // Use the unified calculation utility
      const { calorieGoal, macroGoals } = calculateNutritionGoals(userData);
      
      console.log('📊 New calculated goals:', {
        calorieGoal,
        macroGoals
      });

      // Update the goals in Firestore
      await userRef.update({
        calorieGoal,
        macroGoals
      });
      console.log('✅ Successfully updated goals in Firestore');
    } catch (error) {
      console.error('❌ Error calculating goals:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Set up real-time listener for user data
    const userRef = db.collection('users').doc(user.uid);
    const unsubscribe = userRef.onSnapshot((doc) => {
      if (doc.exists) {
        const newUserData = doc.data() as UserData;
        
        // Only update if there are actual changes
        if (JSON.stringify(newUserData) !== JSON.stringify(userData)) {
          console.log('🔄 Detected changes in user data:', newUserData);
          setUserData(newUserData);
          
          // If user has a profile picture URL, set it
          if (newUserData.profilePicture) {
            setProfileImage(newUserData.profilePicture);
          }
          
          // Set unit preference from user data (defaults to metric if not set)
          setPreferMetricDisplay(newUserData.preferMetricUnits !== false); // true if undefined or true

          // Check if any of the fields that affect goals have changed
          const fieldsAffectingGoals = ['weight', 'height', 'activityLevel', 'gender', 'age', 'fitnessLevel'];
          const hasRelevantChanges = fieldsAffectingGoals.some(field => {
            const hasChanged = newUserData[field as keyof UserData] !== userData?.[field as keyof UserData];
            if (hasChanged) {
              console.log(`📝 Field ${field} has changed from ${userData?.[field as keyof UserData]} to ${newUserData[field as keyof UserData]}`);
            }
            return hasChanged;
          });

          if (hasRelevantChanges) {
            console.log('🔄 Recalculating goals due to relevant field changes');
            calculateAndUpdateGoals(newUserData);
          }
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user, userData]);

  const updateUserField = async (field: string, value: string) => {
    if (!user) {
      console.log('❌ No user found, cannot update field');
      return;
    }
    
    try {
      console.log('🔄 Starting update process for field:', field, 'with value:', value);
      setIsSaving(true);
      const userRef = db.collection('users').doc(user.uid);
      
      console.log('📝 Attempting to update Firebase document...');

      // Set a timeout to prevent the app from hanging indefinitely
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firebase update timed out. Please try again.')), 8000);
      });
      
      // Race between the normal analysis and the timeout
      await Promise.race([
        // Update the specific field in Firebase immediately
        userRef.update({ [field]: value }),
        timeoutPromise
      ]);

      console.log('✅ Successfully updated Firebase document');
      
      console.log('🔄 Updating local state...');
      // Update local state
      setUserData((prev: UserData | null) => {
        const newData = prev ? {
          ...prev,
          [field]: value
        } : { [field]: value };
        console.log('📊 New local state:', newData);
        return newData;
      });
      
      console.log('✅ Update process completed successfully');
      setEditingField(null);
    } catch (error) {
      console.log('❌ Error updating field:', error);
      Alert.alert('Error', 'Failed to update profile. Please check your network connection and try again.');
    } finally {
      setIsSaving(false);
      console.log('🏁 Update process finished');
    }
  };

  const profileDetails: ProfileDetail[] = [
    { field: 'username', label: 'Name', value: userData?.username, icon: 'person-outline' },
    { field: 'age', label: 'Age', value: userData?.age, icon: 'calendar-outline' },
    { field: 'gender', label: 'Gender', value: userData?.gender, icon: 'person-outline' },
    { field: 'height', label: 'Height', value: userData?.height, icon: 'resize-outline' },
    { field: 'weight', label: 'Weight', value: userData?.weight, icon: 'barbell-outline' },
    { field: 'position', label: 'Position', value: userData?.position, icon: 'people-outline' },
    { field: 'teamStatus', label: 'Team Status', value: userData?.teamStatus, icon: 'football-outline' },
    { field: 'injuryHistory', label: 'Injury History', value: userData?.injuryHistory, icon: 'bandage' },
    { field: 'activityLevel', label: 'Activity Level', value: userData?.activityLevel, icon: 'fitness-outline' },
    { field: 'fitnessLevel', label: 'Fitness Level', value: userData?.fitnessLevel, icon: 'fitness-outline' },
  ];

  const renderEditModal = () => {
    if (editingField === 'gender') {
      return (
        <Modal
          visible={editingField === 'gender'}
          transparent
          animationType="slide"
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView 
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    Edit {profileDetails.find(d => d.field === editingField)?.label}
                  </Text>
                  
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editValue}
                      onValueChange={(itemValue) => setEditValue(itemValue)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Male" value="male" />
                      <Picker.Item label="Female" value="female" />
                    </Picker>
                  </View>

                  {renderModalButtons(() => {
                    if (editingField) {
                      updateUserField(editingField, editValue);
                    }
                  })}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      );
    }

    if (editingField === 'age') {
      return (
        <Modal
          visible={editingField === 'age'}
          transparent
          animationType="slide"
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView 
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    Edit {profileDetails.find(d => d.field === editingField)?.label}
                  </Text>
                  
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editValue}
                      onValueChange={(itemValue) => setEditValue(itemValue)}
                      style={styles.picker}
                    >
                      {Array.from({ length: 83 }, (_, i) => i + 8).map((num) => (
                        <Picker.Item
                          key={num}
                          label={num.toString()}
                          value={num.toString()}
                        />
                      ))}
                    </Picker>
                  </View>

                  {renderModalButtons(() => {
                    if (editingField) {
                      updateUserField(editingField, editValue);
                    }
                  })}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      );
    }

    if (editingField === 'teamStatus') {
      return (
        <Modal
          visible={editingField === 'teamStatus'}
          transparent
          animationType="slide"
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView 
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    Edit {profileDetails.find(d => d.field === editingField)?.label}
                  </Text>
                  
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editValue}
                      onValueChange={(itemValue) => setEditValue(itemValue)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Yes" value="true" />
                      <Picker.Item label="No" value="false" />
                    </Picker>
                  </View>

                  {renderModalButtons(() => {
                    if (editingField) {
                      updateUserField(editingField, editValue);
                    }
                  })}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      );
    }

    if (editingField === 'position') {
      return (
        <Modal
          visible={editingField === 'position'}
          transparent
          animationType="slide"
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView 
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    Edit {profileDetails.find(d => d.field === editingField)?.label}
                  </Text>
                  
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editValue}
                      onValueChange={(itemValue) => setEditValue(itemValue)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Goalkeeper" value="goalkeeper" />
                      <Picker.Item label="Defender" value="defender" />
                      <Picker.Item label="Midfielder" value="midfielder" />
                      <Picker.Item label="Attacker" value="forward" />
                    </Picker>
                  </View>

                  {renderModalButtons(() => {
                    if (editingField) {
                      updateUserField(editingField, editValue);
                    }
                  })}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      );
    }

    if (editingField === 'activityLevel') {
      const ACTIVITY_LEVELS = [
        {
          id: 'sedentary',
          title: 'Sedentary',
          description: 'No exercise, desk job',
        },
        {
          id: 'light',
          title: 'Lightly Active',
          description: '1-3 days/week',
        },
        {
          id: 'moderate',
          title: 'Moderately Active',
          description: '3-5 days/week',
        },
        {
          id: 'very',
          title: 'Very Active',
          description: '6-7 days/week',
        },
        {
          id: 'extra',
          title: 'Extra Active',
          description: 'Very active & physical job',
        },
      ];

      return (
        <Modal
          visible={editingField === 'activityLevel'}
          transparent
          animationType="slide"
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView 
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    Edit {profileDetails.find(d => d.field === editingField)?.label}
                  </Text>

                  <View style={styles.optionsContainer}>
                    {ACTIVITY_LEVELS.map((level) => (
                      <Pressable
                        key={level.id}
                        onPress={() => setEditValue(level.id)}
                        style={({ pressed }) => [
                          styles.optionButtonWithDescription,
                          editValue === level.id && styles.selectedOption,
                          { opacity: pressed ? 0.8 : 1 }
                        ]}
                      >
                        <Text style={[
                          styles.optionText,
                          editValue === level.id && styles.selectedOptionText
                        ]} allowFontScaling={false}>
                          {level.title}
                        </Text>
                        <Text style={[
                          styles.optionDescription,
                          editValue === level.id && styles.selectedOptionText
                        ]} allowFontScaling={false}>
                          {level.description}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {renderModalButtons(() => {
                    if (editingField) {
                      updateUserField(editingField, editValue);
                    }
                  })}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      );
    }

    if (editingField === 'fitnessLevel') {
      const FITNESS_LEVELS = [
        {
          id: 'out-of-shape',
          title: 'Out of shape',
        },
        {
          id: 'average',
          title: 'Average',
        },
        {
          id: 'athletic',
          title: 'Athletic',
        },
        {
          id: 'elite',
          title: 'Elite',
        },
      ];
      
      return (
        <Modal
          visible={editingField === 'fitnessLevel'}
          transparent
          animationType="slide"
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView 
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    Edit {profileDetails.find(d => d.field === editingField)?.label}
                  </Text>

                  <View style={styles.optionsContainer}>
                    {FITNESS_LEVELS.map((level) => (
                      <Pressable
                        key={level.id}
                        onPress={() => setEditValue(level.id)}
                        style={({ pressed }) => [
                          styles.optionButtonWithDescription,
                          editValue === level.id && styles.selectedOption,
                          { opacity: pressed ? 0.8 : 1 }
                        ]}
                      >
                        <Text style={[
                          styles.optionText,
                          editValue === level.id && styles.selectedOptionText
                        ]} allowFontScaling={false}>
                          {level.title}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {renderModalButtons(() => {
                    if (editingField) {
                      updateUserField(editingField, editValue);
                    }
                  })}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      );
    }

    if (editingField === 'injuryHistory') {
      const CHARACTER_LIMIT = 300;

      return (
        <Modal
          visible={editingField === 'injuryHistory'}
          transparent
          animationType="slide"
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView 
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    Edit {profileDetails.find(d => d.field === editingField)?.label}
                  </Text>

                  <TextInput
                    value={editValue}
                    onChangeText={(text) => {
                      if (text.length <= CHARACTER_LIMIT) {
                        setEditValue(text);
                      }
                    }}
                    style={[styles.modalInput, styles.textArea]}
                    multiline
                    placeholder="Describe any past injuries..."
                    maxLength={CHARACTER_LIMIT}
                  />

                  <Text style={styles.characterCount}>
                    {editValue.length}/{CHARACTER_LIMIT}
                  </Text>

                  {renderModalButtons(() => {
                    if (editingField) {
                      updateUserField(editingField, editValue.trim());
                    }
                  })}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      );
    }

    if (editingField === 'height') {
      const handleUnitToggle = (value: boolean) => {
        setIsMetricHeight(value);
        
        // Save unit preference to user data
        setPreferMetricDisplay(value);
        if (user) {
          db.collection('users').doc(user.uid).update({
            preferMetricUnits: value
          }).catch(error => console.error('Error updating unit preference:', error));
        }

        console.log('=== UNIT TOGGLE DEBUG ===');
        console.log('Switching to:', value ? 'metric' : 'imperial');
        console.log('Current state - height:', editValue, 'feet:', heightFeet, 'inches:', heightInches);
        
        // Use setTimeout to ensure picker has time to process the unit change
        setTimeout(() => {
          if (value) {
            // Switching to metric - convert from imperial
            const heightCm = feetInchesToCm(heightFeet, heightInches);
            setEditValue(heightCm.toString());
          } else {
            // Switching to imperial - convert from metric
            const heightCm = parseFloat(editValue) || 170;
            const { feet, inches } = cmToFeetInches(heightCm);
            setHeightFeet(feet);
            setHeightInches(inches);
          }
        }, 50); // Small delay to ensure picker updates
      };

      const handleSave = () => {
        let finalHeight;
        if (isMetricHeight) {
          finalHeight = editValue;
        } else {
          finalHeight = feetInchesToCm(heightFeet, heightInches).toString();
        }
        updateUserField('height', finalHeight);
      };

      return (
        <Modal
          visible={editingField === 'height'}
          transparent
          animationType="slide"
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView 
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    Edit {profileDetails.find(d => d.field === editingField)?.label}
                  </Text>

                  {/* Unit Toggle */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginVertical: 16,
                  }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: !isMetricHeight ? '#000000' : '#666666',
                    }}>
                      Imperial
                    </Text>
                    <Switch
                      trackColor={{ false: '#E5E5E5', true: '#4064F6' }}
                      thumbColor={'#FFFFFF'}
                      onValueChange={handleUnitToggle}
                      value={isMetricHeight}
                      style={{ marginHorizontal: 12 }}
                    />
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: isMetricHeight ? '#000000' : '#666666',
                    }}>
                      Metric
                    </Text>
                  </View>
                  
                  <View style={styles.pickerContainer}>
                    {isMetricHeight ? (
                      <Picker
                        key={`metric-height-1`}
                        selectedValue={editValue}
                        onValueChange={(itemValue) => setEditValue(itemValue)}
                        style={styles.picker}
                      >
                        {Array.from({ length: 117 }, (_, i) => i + 125).map((num) => (
                          <Picker.Item
                            key={num}
                            label={`${num} cm`}
                            value={num.toString()}
                          />
                        ))}
                      </Picker>
                    ) : (
                      <View style={{ flexDirection: 'row' }}>
                        <View style={{ flex: 1 }}>
                          <Picker
                            selectedValue={heightFeet}
                            onValueChange={(itemValue) => setHeightFeet(Number(itemValue))}
                            style={styles.picker}
                          >
                            {Array.from({ length: 4 }, (_, i) => i + 4).map((ft) => (
                              <Picker.Item
                                key={ft}
                                label={`${ft} ft`}
                                value={ft}
                              />
                            ))}
                          </Picker>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Picker
                            selectedValue={heightInches}
                            onValueChange={(itemValue) => setHeightInches(Number(itemValue))}
                            style={styles.picker}
                          >
                            {Array.from({ length: 12 }, (_, i) => i).map((inch) => (
                              <Picker.Item
                                key={inch}
                                label={`${inch} in`}
                                value={inch}
                              />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    )}
                  </View>

                  {renderModalButtons(handleSave)}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      );
    }

    if (editingField === 'weight') {
      const handleUnitToggle = (value: boolean) => {
        setIsMetricWeight(value);
        
        // Save unit preference to user data
        setPreferMetricDisplay(value);
        if (user) {
          db.collection('users').doc(user.uid).update({
            preferMetricUnits: value
          }).catch(error => console.error('Error updating unit preference:', error));
        }

        // Use setTimeout to ensure picker has time to process the unit change
        setTimeout(() => {
          if (value) {
            // Switching to metric - convert from imperial
            const weightKg = lbsToKg(weightPounds);
            setEditValue(weightKg.toString());
          } else {
            // Switching to imperial - convert from metric
            const weightKg = parseFloat(editValue) || 70;
            const pounds = kgToLbs(weightKg);
            setWeightPounds(pounds);
          }
        }, 50); // Small delay to ensure picker updates
      };

      const handleSave = () => {
        let finalWeight;
        if (isMetricWeight) {
          finalWeight = editValue;
        } else {
          finalWeight = lbsToKg(weightPounds).toString();
        }
        updateUserField('weight', finalWeight);
      };

      return (
        <Modal
          visible={editingField === 'weight'}
          transparent
          animationType="slide"
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView 
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    Edit {profileDetails.find(d => d.field === editingField)?.label}
                  </Text>

                  {/* Unit Toggle */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginVertical: 16,
                  }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: !isMetricWeight ? '#000000' : '#666666',
                    }}>
                      Imperial
                    </Text>
                    <Switch
                      trackColor={{ false: '#E5E5E5', true: '#4064F6' }}
                      thumbColor={'#FFFFFF'}
                      onValueChange={handleUnitToggle}
                      value={isMetricWeight}
                      style={{ marginHorizontal: 12 }}
                    />
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: isMetricWeight ? '#000000' : '#666666',
                    }}>
                      Metric
                    </Text>
                  </View>
                  
                  <View style={styles.pickerContainer}>
                    {isMetricWeight ? (
                      <Picker
                        key={`metric-weight-1`}
                        selectedValue={editValue}
                        onValueChange={(itemValue) => setEditValue(itemValue)}
                        style={styles.picker}
                      >
                        {Array.from({ length: 101 }, (_, i) => i + 40).map((num) => (
                          <Picker.Item
                            key={num}
                            label={`${num} kg`}
                            value={num.toString()}
                          />
                        ))}
                      </Picker>
                    ) : (
                      <Picker
                        key={`imperial-weight-1`}
                        selectedValue={weightPounds}
                        onValueChange={(itemValue) => setWeightPounds(Number(itemValue))}
                        style={styles.picker}
                      >
                        {Array.from({ length: 222 }, (_, i) => i + 88).map((lbs) => (
                          <Picker.Item
                            key={lbs}
                            label={`${lbs} lb`}
                            value={lbs}
                          />
                        ))}
                      </Picker>
                    )}
                  </View>

                  {renderModalButtons(handleSave)}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      );
    }

    // Return the default text input modal for other fields
    return (
      <Modal
        visible={editingField !== null && 
          editingField !== 'age' && 
          editingField !== 'gender' && 
          editingField !== 'teamStatus' &&
          editingField !== 'position' &&
          editingField !== 'activityLevel' &&
          editingField !== 'injuryHistory'}
        transparent
        animationType="slide"
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  Edit {profileDetails.find(d => d.field === editingField)?.label}
                </Text>
                
                <TextInput
                  value={editValue}
                  onChangeText={setEditValue}
                  style={styles.modalInput}
                  autoFocus
                  keyboardType={editingField === 'age' || editingField === 'height' || editingField === 'weight' ? 'numeric' : 'default'}
                />

                {renderModalButtons(() => {
                  if (editingField) {
                    updateUserField(editingField, editValue);
                  }
                })}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 120,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          bounces={true}
          overScrollMode="never"
        >
          {/* Header - Scrolls with content */}
          <View style={{
            paddingTop: 44,
            paddingHorizontal: 24,
            backgroundColor: '#ffffff',
          }}>
            {/* Settings Button - Above the header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginBottom: 0,
              marginTop: 0,
              height: 14,
            }}>
              <Pressable
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 16,
                  width: 28,
                  height: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15,
                  shadowRadius: 1,
                  elevation: 1,
                }}
                onPress={() => router.push('/settings')}
              >
                <Ionicons name="settings-outline" size={18} color="#000000" />
              </Pressable>
            </View>
            
            {/* Header with Logo */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 72,
              marginTop: 0,
            }}>
              {/* Title */}
              <Text style={{
                fontSize: 28,
                fontWeight: '900',
                color: '#000000',
              }} 
              allowFontScaling={false}
              maxFontSizeMultiplier={1.2}>
                Profile
              </Text>

              {/* Compact Level Indicator */}
              <XpHeaderBanner compact={true} />

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}>
                <Animated.View 
                  entering={PinwheelIn.duration(500)}
                >
                <Image 
                  source={require('../../assets/images/BallerAILogo.png')}
                  style={{
                    width: 32,
                    height: 32,
                  }}
                  resizeMode="contain"
                />
                </Animated.View>
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

          {/* Main content */}
          <View style={styles.content}>
            {/* Profile Picture Section */}
            <View style={styles.profileSection}>
              <Pressable
                onPress={pickImage} 
                style={styles.profileImageContainer}
                disabled={isLoading}
              >
                {profileImage ? (
                  <Image 
                    source={{ uri: profileImage }} 
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person" size={40} color="#666666" />
                  </View>
                )}
                <View style={styles.editIconContainer}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                  )}
                </View>
              </Pressable>

              <View style={styles.usernameContainer}>
                <Text style={styles.username}>{userData?.username || "User"}</Text>
              </View>
            </View>

            {/* Profile Info Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Player Details</Text>

                <Pressable
                  onPress={() => setIsEditing(!isEditing)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  })}
                >
                  <Ionicons 
                    name={isEditing ? "checkmark" : "create-outline"} 
                    size={24} 
                    color="#4064F6" 
                  />
                  <Text style={{ color: '#4064F6', fontSize: 16 }}>
                    {isEditing ? 'Done' : 'Edit'}
                  </Text>
                </Pressable>
              </View>



              {profileDetails.map((detail, index) => (
                <Pressable 
                  key={index} 
                  style={[
                    styles.detailRow,
                    !isEditing && styles.disabledRow,
                    isEditing && styles.editableRow
                  ]}
                  onPress={() => {
                    if (isEditing) {
                      setEditingField(detail.field);
                      setEditValue(detail.value?.toString() || '');
                      
                      // Initialize imperial/metric state for height and weight based on user preference
                      if (detail.field === 'height') {
                        setIsMetricHeight(preferMetricDisplay); // Start with user preference
                        if (detail.value) {
                          const heightCm = parseFloat(detail.value);
                          const { feet, inches } = cmToFeetInches(heightCm);
                          setHeightFeet(feet);
                          setHeightInches(inches);
                        }
                      } else if (detail.field === 'weight') {
                        setIsMetricWeight(preferMetricDisplay); // Start with user preference
                        if (detail.value) {
                          const weightKg = parseFloat(detail.value);
                          const pounds = kgToLbs(weightKg);
                          
                          // Validate pounds is within picker range (88-309) - same safety as measurements.tsx
                          const validPounds = Math.max(88, Math.min(309, pounds));
                          if (pounds !== validPounds) {
                            console.warn('⚠️  Pounds value', pounds, 'clamped to', validPounds);
                          }
                          setWeightPounds(validPounds);
                        }
                      }
                    }
                  }}
                  disabled={!isEditing}
                >
                  <View style={styles.detailIcon}>
                    <Ionicons 
                      name={detail.icon} 
                      size={24} 
                      color={isEditing ? "#4064F6" : "#999999"} 
                    />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[
                      styles.detailLabel,
                      !isEditing && styles.disabledText
                    ]}>
                      {detail.label}
                    </Text>
                    <Text style={[
                      styles.detailValue,
                      !isEditing && styles.disabledText,
                      isEditing && styles.editableValue
                    ]}>
                      {(() => {
                        const { displayValue, unit } = getDisplayValue(detail.field, detail.value);
                        return `${displayValue} ${unit}`.trim();
                      })()}
                    </Text>
                  </View>
                  {isEditing && (
                    <View style={styles.editIndicator}>
                      <Ionicons name="pencil" size={16} color="" />
                      <Ionicons name="chevron-forward" size={20} color="#4064F6" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
          
          {/* Button Container */}
          <View style={styles.buttonContainer}>
            {/* Logout and Delete Account buttons removed as they're now in settings */}
          </View>
        </ScrollView>

        {renderEditModal()}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  profileSection: {
    paddingVertical: 12,
    alignItems: 'center',
    gap: 16,
  },
  section: {
    gap: 16,
  },
  gearIcon: {
    padding: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  detailIcon: {
    width: 40,
    alignItems: 'center',
  },
  detailInfo: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  buttonContainer: {
    padding: 24,
    gap: 16,
  },
  logoutButton: {
    backgroundColor: '#4064F6',
    borderRadius: 36,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 36,
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
    borderRadius: 36,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    gap: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    justifyContent: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  modalFooter: {
    justifyContent: 'center',
    gap: 16,
  },
  feedbackButton: {
    backgroundColor: '#4064F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  otherInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 24,
    height: 100,
    textAlignVertical: 'top',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4064F6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  usernameContainer: {
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  disabledRow: {
    opacity: 0.7,
    backgroundColor: '#F5F5F5',
  },
  disabledText: {
    color: '#999999',
  },
  editableRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 12,
    marginVertical: 4,
  },
  editableValue: {
    color: '#4064F6',
  },
  editIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pickerContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 16,
  },
  picker: {
    width: '100%',
    height: '100%',
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
    marginVertical: 16,
  },
  optionButton: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  selectedOption: {
    borderColor: '#99E86C',
    backgroundColor: '#99E86C',
  },
  optionText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  optionButtonWithDescription: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666666',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    textAlign: 'left',
    paddingTop: 12,
  },
  characterCount: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'right',
    marginTop: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  reasonButton: {
    width: '100%',
    padding: 16,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  selectedReason: {
    borderColor: '#99E86C',
    backgroundColor: '#99E86C',
  },
  reasonText: {
    fontSize: 16,
    color: '#000000',
  },
  selectedReasonText: {
    color: '#000000',
  },
  reasonsContainer: {
    maxHeight: 300,
    marginVertical: 16,
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reasonsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  reasonsSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  reasonsInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  reasonsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reasonsButton: {
    backgroundColor: '#4064F6',
  },
  reasonsCancelButton: {
    backgroundColor: '#8E8E93',
  },
  appleAuthContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginTop: 10,
  },
  orSeparator: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 16,
    marginVertical: 10,
  },
  authMessage: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  eyeIcon: {
    position: 'absolute',
    right: 40,
    top: '52%',
  },
  customButton: {
    flex: 1,
    height: 50,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customCancelButton: {
    backgroundColor: '#666666',
  },
  customDeleteButton: {
    backgroundColor: '#FF3B30',
  },
  customButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
}); 