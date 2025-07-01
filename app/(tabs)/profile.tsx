import { View, Text, Image, Pressable, StyleSheet, ScrollView, TextInput, Modal, ActivityIndicator, Alert, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useOnboarding } from '../context/OnboardingContext';
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, writeBatch, query, where, onSnapshot } from 'firebase/firestore';
import { deleteUser, signOut, reauthenticateWithCredential, EmailAuthProvider, OAuthProvider } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { useRouter } from 'expo-router';
import authService from '../services/auth';
import { Picker } from '@react-native-picker/picker';
import CustomButton from '../components/CustomButton';
import * as AppleAuthentication from 'expo-apple-authentication';
import { calculateNutritionGoals } from '../utils/nutritionCalculations';
import Animated, { PinwheelIn } from 'react-native-reanimated';

type UserData = {
  username?: string;
  age?: string;
  gender?: string;
  height?: string;
  weight?: string;
  dominantFoot?: string;
  position?: string;
  skillLevel?: string;
  trainingFrequency?: string;
  fitnessLevel?: string;
  activityLevel?: string;
  profilePicture?: string;
  injuryHistory?: string;
};

type ProfileDetail = {
  field: string;
  label: string;
  value?: string;
  icon: keyof typeof Ionicons.glyphMap;
  unit?: string;
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
      const storage = getStorage();
      const storageRef = ref(storage, `profile_pictures/${user.uid}/profile_${timestamp}.jpg`);
      
      // Upload to Firebase Storage
      const uploadTask = await uploadBytes(storageRef, blob);
      console.log('Upload successful:', uploadTask);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL:', downloadURL);
      
      // Update user profile in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
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
      const userRef = doc(db, 'users', user.uid);
      
      // Use the unified calculation utility
      const { calorieGoal, macroGoals } = calculateNutritionGoals(userData);
      
      console.log('📊 New calculated goals:', {
        calorieGoal,
        macroGoals
      });

      // Update the goals in Firestore
      await updateDoc(userRef, {
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
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const newUserData = doc.data() as UserData;
        
        // Only update if there are actual changes
        if (JSON.stringify(newUserData) !== JSON.stringify(userData)) {
          console.log('🔄 Detected changes in user data:', newUserData);
          setUserData(newUserData);
          
          // If user has a profile picture URL, set it
          if (newUserData.profilePicture) {
            setProfileImage(newUserData.profilePicture);
          }

          // Check if any of the fields that affect goals have changed
          const fieldsAffectingGoals = ['weight', 'height', 'activityLevel', 'gender', 'age'];
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
      const userRef = doc(db, 'users', user.uid);
      
      console.log('📝 Attempting to update Firebase document...');

      // Set a timeout to prevent the app from hanging indefinitely
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firebase update timed out. Please try again.')), 8000);
      });
      
      // Race between the normal analysis and the timeout
      await Promise.race([
        // Update the specific field in Firebase immediately
        updateDoc(userRef, { [field]: value }),
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
    { field: 'age', label: 'Age', value: userData?.age, icon: 'calendar-outline', unit: 'years' },
    { field: 'gender', label: 'Gender', value: userData?.gender, icon: 'person-outline' },
    { field: 'height', label: 'Height', value: userData?.height, icon: 'resize-outline', unit: 'cm' },
    { field: 'weight', label: 'Weight', value: userData?.weight, icon: 'barbell-outline', unit: 'kg' },
    { field: 'position', label: 'Position', value: userData?.position, icon: 'people-outline' },
    { field: 'injuryHistory', label: 'Injury History', value: userData?.injuryHistory, icon: 'bandage' },
    { field: 'activityLevel', label: 'Activity Level', value: userData?.activityLevel, icon: 'fitness-outline' },
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
                      <Picker.Item label="Other" value="other" />
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

    if (editingField === 'dominantFoot') {
      return (
        <Modal
          visible={editingField === 'dominantFoot'}
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
                      <Picker.Item label="Left" value="left" />
                      <Picker.Item label="Right" value="right" />
                      <Picker.Item label="Both" value="both" />
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
                  
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editValue}
                      onValueChange={(itemValue) => setEditValue(itemValue)}
                      style={styles.picker}
                    >
                      {Array.from({ length: 93 }, (_, i) => i + 120).map((num) => (
                        <Picker.Item
                          key={num}
                          label={`${num} cm`}
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

    if (editingField === 'weight') {
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
                  
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editValue}
                      onValueChange={(itemValue) => setEditValue(itemValue)}
                      style={styles.picker}
                    >
                      {Array.from({ length: 81 }, (_, i) => i + 40).map((num) => (
                        <Picker.Item
                          key={num}
                          label={`${num} kg`}
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

    // Return the default text input modal for other fields
    return (
      <Modal
        visible={editingField !== null && 
          editingField !== 'age' && 
          editingField !== 'gender' && 
          editingField !== 'dominantFoot' &&
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
                      {detail.value} {detail.unit}
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