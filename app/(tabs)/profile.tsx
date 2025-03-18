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
  const [isPrivacyExpanded, setIsPrivacyExpanded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAppleUser, setIsAppleUser] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  const renderModalButtons = (onSave: () => void) => (
    <View style={styles.modalButtons}>
      <Button
        title="Cancel"
        onPress={() => setEditingField(null)}
        buttonStyle={{ backgroundColor: '#666666', flex: 1 }}
        textStyle={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}
        disabled={isSaving}
      />
      <Button
        title={isSaving ? "Saving..." : "Save"}
        onPress={onSave}
        buttonStyle={{ backgroundColor: '#4064F6', flex: 1 }}
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
      
      // Calculate new calorie and macro goals based on updated information
      let bmr = 0;
      let tdee = 0;
      
      // Calculate BMR using Mifflin-St Jeor Equation
      if (userData.gender === 'male') {
        bmr = (10 * parseFloat(userData.weight || '0')) + 
              (6.25 * parseFloat(userData.height || '0')) - 
              (5 * parseFloat(userData.age || '0')) + 5;
      } else {
        bmr = (10 * parseFloat(userData.weight || '0')) + 
              (6.25 * parseFloat(userData.height || '0')) - 
              (5 * parseFloat(userData.age || '0')) - 161;
      }

      // Calculate TDEE based on activity level
      const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        very: 1.725,
        extra: 1.9
      };
      
      tdee = bmr * (activityMultipliers[userData.activityLevel as keyof typeof activityMultipliers] || 1.2);

      // Calculate macros (assuming 30% protein, 30% fat, 40% carbs)
      const proteinCalories = tdee * 0.3;
      const fatCalories = tdee * 0.3;
      const carbCalories = tdee * 0.4;

      const proteinGrams = Math.round(proteinCalories / 4);
      const fatGrams = Math.round(fatCalories / 9);
      const carbGrams = Math.round(carbCalories / 4);

      console.log('📊 New calculated goals:', {
        calorieGoal: Math.round(tdee),
        macroGoals: {
          protein: proteinGrams,
          fat: fatGrams,
          carbs: carbGrams
        }
      });

      // Update the goals in Firestore
      await updateDoc(userRef, {
        calorieGoal: Math.round(tdee),
        macroGoals: {
          protein: proteinGrams,
          fat: fatGrams,
          carbs: carbGrams
        }
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
      // Update the specific field in Firebase immediately
      await updateDoc(userRef, { [field]: value });
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
      console.error('❌ Error updating field:', error);
      alert('Failed to update. Please try again.');
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
    { field: 'dominantFoot', label: 'Dominant Foot', value: userData?.dominantFoot, icon: 'football-outline' },
    { field: 'position', label: 'Position', value: userData?.position, icon: 'people-outline' },
    { field: 'injuryHistory', label: 'Injury History', value: userData?.injuryHistory, icon: 'bandage' },
    { field: 'activityLevel', label: 'Activity Level', value: userData?.activityLevel, icon: 'fitness-outline' },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
              router.replace('/');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Check if Apple authentication is available
  useEffect(() => {
    const checkAppleAuthAvailability = async () => {
      try {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        setIsAppleAuthAvailable(isAvailable);
      } catch (error) {
        console.error('Error checking Apple Authentication availability:', error);
        setIsAppleAuthAvailable(false);
      }
    };
    
    checkAppleAuthAvailability();
  }, []);

  // Check if the user signed in with Apple
  useEffect(() => {
    if (user) {
      // Check if the user has Apple provider data
      const hasAppleProvider = user.providerData?.some(provider => 
        provider.providerId === 'apple.com'
      );
      setIsAppleUser(hasAppleProvider || false);
    }
  }, [user]);

  const reauthenticateUser = async (password: string, method: 'password' | 'apple' = 'password') => {
    if (!user) return false;
    
    try {
      if (method === 'apple') {
        try {
          // For iOS, we need to use the native Apple authentication
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
          
          if (!credential.identityToken) {
            throw new Error('No identity token provided from Apple');
          }
          
          // Create Firebase credential
          const provider = new OAuthProvider('apple.com');
          const authCredential = provider.credential({
            idToken: credential.identityToken,
          });
          
          // Reauthenticate with Firebase
          await reauthenticateWithCredential(user, authCredential);
          return true;
        } catch (error: any) {
          console.error('Apple reauthentication error:', error);
          if (error.code !== 'ERR_CANCELED') {
            Alert.alert(
              'Error',
              'Apple authentication failed. Please try again.'
            );
          }
          return false;
        }
      } else {
        // Email/password authentication
        if (!user.email) return false;
        
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        return true;
      }
    } catch (error) {
      console.error('Reauthentication error:', error);
      Alert.alert(
        'Error',
        'Authentication failed. Please try again.'
      );
      return false;
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirmation = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      // Try to delete account first
      try {
        // 1. Delete all user's meals
        const mealsQuery = query(
          collection(db, 'meals'),
          where('userId', '==', user.uid)
        );
        const mealsSnapshot = await getDocs(mealsQuery);
        const mealDeletions = mealsSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        await Promise.all(mealDeletions);

        // 2. Delete all user's dailyMacros
        const dailyMacrosRef = collection(db, `users/${user.uid}/dailyMacros`);
        const dailyMacrosSnapshot = await getDocs(dailyMacrosRef);
        const macroDeletions = dailyMacrosSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        await Promise.all(macroDeletions);

        // 3. Delete user document and all its subcollections
        await deleteDoc(doc(db, 'users', user.uid));

        // 4. Delete Firebase Auth user and sign out
        await deleteUser(user);
        await signOut(auth);

        // Show success alert
        Alert.alert(
          'Account Deleted',
          'Your account has been successfully deleted. Thank you for using BallerAI!',
          [
            {
              text: 'OK',
              onPress: () => {
                // 5. Navigate to welcome screen
                router.replace('/');
              }
            }
          ]
        );
      } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') {
          setShowReauthModal(true);
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error during account deletion:', error);
      Alert.alert(
        'Error',
        'Failed to delete account. Please try again or contact support.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const sendFeedbackEmail = async () => {
    const emailUrl = `mailto:ballerai.official@gmail.com?subject=Account Deletion Feedback`;
    
    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      }
    } catch (error) {
      console.error('Error opening email:', error);
    }
  };

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
                      <Picker.Item label="Forward" value="forward" />
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
                          { opacity: pressed ? 0.9 : 1 }
                        ]}
                      >
                        <Text style={[
                          styles.optionText,
                          editValue === level.id && styles.selectedOptionText
                        ]}>
                          {level.title}
                        </Text>
                        <Text style={[
                          styles.optionDescription,
                          editValue === level.id && styles.selectedOptionText
                        ]}>
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

  const renderReauthModal = () => (
    <Modal
      visible={showReauthModal}
      transparent
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Confirm Your Identity</Text>
          <Text style={styles.modalSubtitle}>
            For security reasons, please verify your identity to delete your account.
          </Text>
          
          {/* Always show password authentication option */}
          <TextInput
            style={styles.modalInput}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={24}
              color="#666666"
            />
          </Pressable>
          
          <View style={styles.modalButtons}>
            <CustomButton
              title="Cancel"
              onPress={() => {
                setShowReauthModal(false);
                setPassword('');
              }}
              buttonStyle={{ backgroundColor: '#666666', flex: 1, borderRadius: 36 }}
              textStyle={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}
            />
            <CustomButton
              title="Confirm"
              onPress={async () => {
                const success = await reauthenticateUser(password);
                if (success) {
                  setShowReauthModal(false);
                  setPassword('');
                  handleDeleteConfirmation();
                }
              }}
              buttonStyle={{ backgroundColor: '#FF3B30', flex: 1, borderRadius: 36 }}
              textStyle={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}
              disabled={!password.trim()}
            />
          </View>
          
          {/* Show Apple Authentication option if available */}
          {isAppleAuthAvailable && (
            <View style={styles.appleAuthContainer}>
              <Text style={styles.orSeparator}>OR</Text>
              <Text style={styles.authMessage}>Sign in with Apple to confirm</Text>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={36}
                style={styles.appleButton}
                onPress={async () => {
                  const success = await reauthenticateUser('', 'apple');
                  if (success) {
                    setShowReauthModal(false);
                    handleDeleteConfirmation();
                  }
                }}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderDeleteModal = () => (
    <Modal
      visible={showDeleteModal}
      transparent
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>We're sorry to see you go</Text>
          <Text style={styles.modalSubtitle}>
            Please, let us know why you're leaving, so we can improve our service
          </Text>

          <ScrollView style={styles.reasonsContainer}>
            {[
              'Not finding it useful',
              'Technical issues',
              'Found a better alternative',
              'Privacy concerns',
              'Too expensive',
              'Other'
            ].map((reason) => (
              <Pressable
                key={reason}
                style={[
                  styles.reasonButton,
                  deleteReason === reason && styles.selectedReason
                ]}
                onPress={() => setDeleteReason(reason)}
              >
                <Text style={[
                  styles.reasonText,
                  deleteReason === reason && styles.selectedReasonText
                ]}>
                  {reason}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {deleteReason === 'Other' && (
            <TextInput
              style={styles.otherInput}
              placeholder="Please tell us more..."
              multiline
              value={otherReason}
              onChangeText={setOtherReason}
            />
          )}

          <View style={styles.modalFooter}>
            <Pressable
              onPress={sendFeedbackEmail}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              })}
            >
              <Ionicons name="mail-outline" size={24} color="#4064F6" />
              <Text style={{ color: '#4064F6', fontSize: 16 }}>Send Feedback</Text>
            </Pressable>
            
            <View style={styles.actionButtons}>
              <CustomButton
                title="Go Back"
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteReason('');
                  setOtherReason('');
                }}
                buttonStyle={{ backgroundColor: '#666666', flex: 1, borderRadius: 36 }}
                textStyle={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}
              />
              <CustomButton
                title="Delete"
                onPress={() => {
                  setShowDeleteModal(false);
                  setShowReauthModal(true);
                }}
                buttonStyle={{ backgroundColor: '#FF3B30', flex: 1, borderRadius: 36 }}
                textStyle={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (showDeleteModal) {
    return (
      <View style={styles.container}>
        {renderDeleteModal()}
      </View>
    );
  }

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
            paddingTop: 48,
            paddingHorizontal: 24,
            backgroundColor: '#ffffff',
          }}>
            {/* Header with Logo */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 92,
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

            {/* Privacy Policy Accordion */}
            <View style={styles.privacySection}>
              <Pressable 
                style={styles.privacyHeader}
                onPress={() => setIsPrivacyExpanded(!isPrivacyExpanded)}
              >
                <Text style={styles.privacyTitle}>Privacy Policy</Text>
                <Ionicons 
                  name={isPrivacyExpanded ? 'chevron-up' : 'chevron-down'} 
                  size={24} 
                  color="#666666" 
                />
              </Pressable>
              
              {isPrivacyExpanded && (
                <View style={styles.privacyContent}>
                  <Text style={styles.privacyText}>
                    Privacy Policy for BallerAI{'\n'}
                    Effective Date: March 13, 2025{'\n\n'}

                    1. Introduction{'\n'}
                    BallerAI ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how BallerAI collects, uses, discloses, and safeguards your information when you use our mobile application (the "App"), as well as your rights regarding your data. By using the App, you agree to the collection and use of information in accordance with this Privacy Policy.{'\n\n'}

                    2. Information We Collect{'\n'}
                    a. Personal Information:{'\n'}
                    When you onboard and use the App, we may collect personal information that you voluntarily provide, including:{'\n'}
                    • Basic details such as your name, age, gender, height, and weight{'\n'}
                    • Football-specific data including your playing level, position, training schedule, and injury history{'\n'}
                    • Lifestyle and health data (e.g., sleep habits, nutritional intake, and training environment){'\n'}
                    • Photographs of meals (if you opt for our meal analysis feature) for nutritional analysis{'\n\n'}

                    b. Usage Information:{'\n'}
                    We may collect data about your interaction with the App, including training logs, session feedback, and activity metrics, to enhance and personalize your training experience.{'\n\n'}

                    c. Device and Log Information:{'\n'}
                    We may automatically collect device-specific information (e.g., device type, operating system, and unique device identifiers) and log data (e.g., IP address, access times, and usage patterns) for security, analytics, and performance improvements.{'\n\n'}

                    3. How We Use Your Information{'\n'}
                    We use the collected information for various purposes, including:{'\n'}
                    • Personalization: To create tailored training programs and adaptive load management based on your profile, training history, and performance data.{'\n'}
                    • Injury Prevention and Recovery: To provide guidelines, feedback, and personalized recommendations to minimize injury risks.{'\n'}
                    • Nutrition Analysis: To offer personalized nutritional guidance by analyzing meal photos and logged dietary information.{'\n'}
                    • Improvement of Services: To analyze usage trends, perform internal research, and improve the overall functionality and user experience of the App.{'\n'}
                    • Communication: To contact you with important updates, support messages, or relevant information about the App, subject to your communication preferences.{'\n\n'}

                    4. Sharing and Disclosure of Information{'\n'}
                    a. With Third Parties:{'\n'}
                    We do not sell your personal information. We may share your information with trusted third-party service providers who perform services on our behalf (e.g., cloud hosting, data analytics, image processing). These providers are contractually obligated to protect your data and use it only for the purposes specified by us.{'\n\n'}

                    b. Legal Requirements:{'\n'}
                    We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency).{'\n\n'}

                    c. Business Transfers:{'\n'}
                    In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction. In such cases, we will notify you via email and/or a prominent notice on our App of any change in ownership or use of your personal information.{'\n\n'}

                    5. Data Security{'\n'}
                    We implement commercially reasonable security measures to protect your information from unauthorized access, disclosure, alteration, or destruction. However, please note that no method of transmission over the Internet or method of electronic storage is 100% secure, and we cannot guarantee absolute security.{'\n\n'}

                    6. Data Retention{'\n'}
                    We retain your personal information for as long as is necessary to fulfill the purposes outlined in this Privacy Policy unless a longer retention period is required or permitted by law. When your information is no longer needed, we will take reasonable steps to securely delete or anonymize it.{'\n\n'}

                    7. Your Rights and Choices{'\n'}
                    a. Access and Correction:{'\n'}
                    You may request access to or correction of your personal information by contacting us through the contact details provided below.{'\n\n'}

                    b. Deletion:{'\n'}
                    Subject to applicable laws and regulations, you may request the deletion of your personal information. Please note that we may need to retain certain information for recordkeeping and legal purposes.{'\n\n'}

                    c. Opt-Out:{'\n'}
                    You can opt out of receiving marketing communications by following the instructions in those communications or by contacting us. Even if you opt out, we may still send you non-promotional messages, such as those about your account or our ongoing business relations.{'\n\n'}

                    8. International Data Transfers{'\n'}
                    Your information may be transferred to—and maintained on—computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those in your jurisdiction. We take appropriate steps to ensure that your data is treated securely and in accordance with this Privacy Policy when transferred.{'\n\n'}

                    9. Children's Privacy{'\n'}
                    Our App is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13 without parental consent, we will take steps to remove that information.{'\n\n'}

                    10. Changes to This Privacy Policy{'\n'}
                    We may update this Privacy Policy from time to time. When we do, we will revise the "Effective Date" at the top of this Privacy Policy. We encourage you to review this Privacy Policy periodically to stay informed about our information practices.{'\n\n'}

                    11. Contact Us{'\n'}
                    If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:{'\n\n'}

                    BallerAI Support{'\n'}
                    Email: ballerai.official@gmail.com{'\n'}
                    Mail: Limingantie 37, 00560 Helsinki, Finland{'\n\n'}

                    12. Governing Law{'\n'}
                    This Privacy Policy shall be governed by and construed in accordance with the laws of the jurisdiction in which BallerAI operates, without regard to its conflict of law provisions.{'\n\n'}

                    Last Updated: March 13, 2025
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Button Container */}
          <View style={styles.buttonContainer}>
            <CustomButton
              title="Log Out"
              onPress={handleLogout}
              buttonStyle={{ backgroundColor: '#4064F6', borderRadius: 36 }}
              textStyle={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}
            />
            <CustomButton
              title="Delete Account"
              onPress={handleDeleteAccount}
              buttonStyle={{ backgroundColor: '#FF3B30', borderRadius: 36 }}
              textStyle={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}
            />
          </View>
        </ScrollView>

        {renderEditModal()}
        {renderReauthModal()}
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
    paddingVertical: 24,
    alignItems: 'center',
    gap: 16,
  },
  section: {
    gap: 16,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  logoContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    marginBottom: 16,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  logoText: { 
    fontSize: 24, 
    fontWeight: '600', 
    color: '#000000' 
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  privacySection: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  privacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  privacyContent: {
    paddingTop: 16,
  },
  privacyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666666',
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
}); 