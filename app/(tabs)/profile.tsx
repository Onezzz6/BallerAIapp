import { View, Text, Image, Pressable, StyleSheet, ScrollView, TextInput, Modal, ActivityIndicator, Alert, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useOnboarding } from '../context/OnboardingContext';
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { deleteUser, signOut, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { useRouter } from 'expo-router';
import authService from '../services/auth';
import { Picker } from '@react-native-picker/picker';

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

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  buttonStyle?: any;
  icon?: React.ReactNode;
  disabled?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({ 
  title, 
  onPress, 
  buttonStyle, 
  icon,
  disabled 
}) => (
  <Pressable 
    style={[styles.button, buttonStyle, disabled && { opacity: 0.5 }]} 
    onPress={onPress}
    disabled={disabled}
  >
    {icon && icon}
    <Text style={styles.buttonText}>{title}</Text>
  </Pressable>
);

const buttonStyles = StyleSheet.create({
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

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

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            setUserData(userData);
            
            // If user has a profile picture URL, set it
            if (userData.profilePicture) {
              setProfileImage(userData.profilePicture);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };
    fetchUserData();
  }, [user]);

  const updateUserField = async (field: string, value: string) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { [field]: value });
      
      // Update local state
      setUserData((prev: UserData | null) => prev ? {
        ...prev,
        [field]: value
      } : { [field]: value });
      
      setEditingField(null);
    } catch (error) {
      console.error('Error updating field:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const profileDetails: ProfileDetail[] = [
    { field: 'age', label: 'Age', value: userData?.age, icon: 'calendar-outline', unit: 'years' },
    { field: 'gender', label: 'Gender', value: userData?.gender, icon: 'person-outline' },
    { field: 'height', label: 'Height', value: userData?.height, icon: 'resize-outline', unit: 'cm' },
    { field: 'weight', label: 'Weight', value: userData?.weight, icon: 'barbell-outline', unit: 'kg' },
    { field: 'dominantFoot', label: 'Dominant Foot', value: userData?.dominantFoot, icon: 'football-outline' },
    { field: 'position', label: 'Position', value: userData?.position, icon: 'people-outline' },
    { field: 'injuryHistory', label: 'Injury History', value: userData?.injuryHistory, icon: 'medical-outline' },
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

  const reauthenticateUser = async (password: string) => {
    if (!user?.email) return;
    
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      return true;
    } catch (error) {
      console.error('Reauthentication error:', error);
      Alert.alert(
        'Error',
        'Invalid password. Please try again.'
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

        // 5. Navigate to welcome screen
        router.replace('/');
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
    const reason = deleteReason === 'Other' ? otherReason : deleteReason;
    const emailBody = `User Feedback for Account Deletion:\n\nReason: ${reason}`;
    const emailUrl = `mailto:ballerai.official@gmail.com?subject=Account Deletion Feedback&body=${encodeURIComponent(emailBody)}`;
    
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
      const genderOptions = [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' }
      ];

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
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  What is your gender?
                </Text>

                <View style={styles.optionsContainer}>
                  {genderOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setEditValue(option.value)}
                      style={({ pressed }) => [
                        styles.optionButton,
                        editValue === option.value && styles.selectedOption,
                        { opacity: pressed ? 0.9 : 1 }
                      ]}
                    >
                      <Text style={[
                        styles.optionText,
                        editValue === option.value && styles.selectedOptionText
                      ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={() => setEditingField(null)}
                    buttonStyle={{ backgroundColor: '#666666', flex: 1 }}
                  />
                  <Button
                    title="Save"
                    onPress={() => {
                      if (editValue) {
                        updateUserField('gender', editValue);
                      }
                    }}
                    buttonStyle={{ backgroundColor: '#99E86C', flex: 1 }}
                    disabled={!editValue}
                  />
                </View>
              </View>
            </View>
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
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  How old are you?
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

                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={() => setEditingField(null)}
                    buttonStyle={{ backgroundColor: '#666666', flex: 1 }}
                  />
                  <Button
                    title="Save"
                    onPress={() => {
                      if (editValue) {
                        updateUserField('age', editValue);
                      }
                    }}
                    buttonStyle={{ backgroundColor: '#99E86C', flex: 1 }}
                    disabled={isLoading}
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      );
    }

    if (editingField === 'dominantFoot') {
      const footOptions = [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
        { value: 'both', label: 'Both' }
      ];

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
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  Which is your dominant foot?
                </Text>

                <View style={styles.optionsContainer}>
                  {footOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setEditValue(option.value)}
                      style={({ pressed }) => [
                        styles.optionButton,
                        editValue === option.value && styles.selectedOption,
                        { opacity: pressed ? 0.9 : 1 }
                      ]}
                    >
                      <Text style={[
                        styles.optionText,
                        editValue === option.value && styles.selectedOptionText
                      ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={() => setEditingField(null)}
                    buttonStyle={{ backgroundColor: '#666666', flex: 1 }}
                  />
                  <Button
                    title="Save"
                    onPress={() => {
                      if (editValue) {
                        updateUserField('dominantFoot', editValue);
                      }
                    }}
                    buttonStyle={{ backgroundColor: '#99E86C', flex: 1 }}
                    disabled={!editValue}
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      );
    }

    if (editingField === 'position') {
      const POSITIONS = [
        { id: 'goalkeeper', title: 'Goalkeeper' },
        { id: 'defender', title: 'Defender' },
        { id: 'midfielder', title: 'Midfielder' },
        { id: 'forward', title: 'Forward' },
      ];

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
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  What's your position?
                </Text>

                <View style={styles.optionsContainer}>
                  {POSITIONS.map((position) => (
                    <Pressable
                      key={position.id}
                      onPress={() => setEditValue(position.id)}
                      style={({ pressed }) => [
                        styles.optionButton,
                        editValue === position.id && styles.selectedOption,
                        { opacity: pressed ? 0.9 : 1 }
                      ]}
                    >
                      <Text style={[
                        styles.optionText,
                        editValue === position.id && styles.selectedOptionText
                      ]}>
                        {position.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={() => setEditingField(null)}
                    buttonStyle={{ backgroundColor: '#666666', flex: 1 }}
                  />
                  <Button
                    title="Save"
                    onPress={() => {
                      if (editValue) {
                        updateUserField('position', editValue);
                      }
                    }}
                    buttonStyle={{ backgroundColor: '#99E86C', flex: 1 }}
                    disabled={!editValue}
                  />
                </View>
              </View>
            </View>
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
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  What's your activity level?
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

                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={() => setEditingField(null)}
                    buttonStyle={{ backgroundColor: '#666666', flex: 1 }}
                  />
                  <Button
                    title="Save"
                    onPress={() => {
                      if (editValue) {
                        updateUserField('activityLevel', editValue);
                      }
                    }}
                    buttonStyle={{ backgroundColor: '#99E86C', flex: 1 }}
                    disabled={!editValue}
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      );
    }

    if (editingField === 'injuryHistory') {
      const CHARACTER_LIMIT = 100;

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
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  Do you have any injury history?
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

                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={() => setEditingField(null)}
                    buttonStyle={{ backgroundColor: '#666666', flex: 1 }}
                  />
                  <Button
                    title="Save"
                    onPress={() => {
                      if (editValue.trim()) {
                        updateUserField('injuryHistory', editValue.trim());
                      }
                    }}
                    buttonStyle={{ backgroundColor: '#99E86C', flex: 1 }}
                    disabled={!editValue.trim()}
                  />
                </View>
              </View>
            </View>
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

                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={() => setEditingField(null)}
                    buttonStyle={{ backgroundColor: '#666666', flex: 1 }}
                  />
                  <Button
                    title="Save"
                    onPress={() => {
                      if (editingField) {
                        updateUserField(editingField, editValue);
                      }
                    }}
                    buttonStyle={{ backgroundColor: '#99E86C', flex: 1 }}
                    disabled={isLoading}
                  />
                </View>
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
          <Text style={styles.modalTitle}>Confirm Your Password</Text>
          <Text style={styles.modalSubtitle}>
            For security reasons, please enter your password to continue.
          </Text>
          
          <TextInput
            style={styles.modalInput}
            placeholder="Enter your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <View style={styles.modalButtons}>
            <CustomButton
              title="Cancel"
              onPress={() => {
                setShowReauthModal(false);
                setPassword('');
              }}
              buttonStyle={styles.cancelButton}
              disabled={!password.trim()}
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
              buttonStyle={styles.deleteButton}
              disabled={!password.trim()}
            />
          </View>
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
            Please let us know why you're leaeving so we can improve our service
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
            <CustomButton
              title="Send Feedback via Email"
              onPress={sendFeedbackEmail}
              buttonStyle={styles.feedbackButton}
              icon={<Ionicons name="mail-outline" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />}
            />
            
            <View style={styles.actionButtons}>
              <CustomButton
                title="Go Back"
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteReason('');
                  setOtherReason('');
                }}
                buttonStyle={styles.cancelButton}
              />
              <CustomButton
                title="Continue to Delete"
                onPress={() => {
                  setShowDeleteModal(false);
                  setShowReauthModal(true);
                }}
                buttonStyle={styles.deleteButton}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (showDeleteModal) {
    return (
      <SafeAreaView style={styles.container}>
        {renderDeleteModal()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Fixed at top when scrolling */}
      <View style={{
        paddingTop: 4,
        paddingHorizontal: 18,
        backgroundColor: '#ffffff',
      }}>
        {/* Header with Logo */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 50, // Same height as OnboardingHeader
        }}>
          {/* Empty View for spacing (instead of BackButton) */}
          <View style={{ width: 32 }} />
          
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginLeft: 'auto',
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
              fontWeight: '600',
              color: '#000000',
            }}>
              BallerAI
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={{
          fontSize: 32,
          fontWeight: '700',
          color: '#000000',
          textAlign: 'center',
          marginTop: 24,
          marginBottom: 8,
        }}>
          Profile
        </Text>
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>
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
                  name={isEditing ? "checkmark" : "pencil"} 
                  size={16} 
                  color="#007AFF" 
                />
                <Text style={{ color: '#007AFF', fontSize: 14 }}>
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
                    color={isEditing ? "#007AFF" : "#999999"} 
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
                    <Ionicons name="pencil" size={16} color="#007AFF" />
                    <Ionicons name="chevron-forward" size={20} color="#007AFF" />
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
                  BallerAI Privacy Policy{'\n'}
                  Effective Date [19.2.2025]{'\n\n'}

                  1. Introduction{'\n'}
                  BallerAI ("we," "our," or "us") is committed to protecting the privacy of our users ("you"). This Privacy Policy explains how we collect, use, disclose, and safeguard your personal data when you use our BallerAI app, which provides personalized training plans, recovery plans, nutrition goals, calorie calculations, and team performance tracking. By accessing or using the app, you agree to the practices described in this policy.{'\n\n'}

                  2. Information We Collect{'\n'}
                  A. Personal Information You Provide{'\n'}
                  When you register or use our app, we may collect information that can identify you, including but not limited to:{'\n\n'}

                  • Account Information: Your name, email address, password, and profile picture.{'\n'}
                  • Personal Attributes: Gender, age, height, weight, dominant foot, and injury history.{'\n'}
                  • Health and Fitness Data: Training details, recovery plan inputs, nutrition goals, calorie intake, physical activity levels, sleep patterns, and dietary preferences.{'\n'}
                  • Team Information: If you use team management features, data related to team names, player profiles, and recovery/performance metrics.{'\n'}
                  • Payment Information: Billing details and payment history if you subscribe to premium features.{'\n\n'}

                  B. Data Collected Automatically{'\n'}
                  When you use our app, we may also collect:{'\n\n'}

                  • Usage Data: IP address, device information, operating system, app usage logs, and performance data.{'\n'}
                  • Cookies and Similar Technologies: To enhance user experience and analyze trends.{'\n\n'}

                  3. How We Use Your Information{'\n'}
                  We use the data we collect for various purposes, including:{'\n\n'}

                  • Providing and Personalizing Services: To create and customize your training, recovery, and nutrition plans based on your inputs.{'\n'}
                  • Improving the App: To analyze usage patterns, conduct research, and improve our app features and user experience.{'\n'}
                  • Communication: To send you notifications, updates, customer support communications, and marketing messages.{'\n'}
                  • Team Management: To enable features for teams, allowing coaches or administrators to track players' performance and recovery.{'\n'}
                  • Compliance and Legal Obligations: To comply with applicable laws, regulations, and legal processes.{'\n\n'}

                  4. Legal Basis for Processing (For Users in the EU){'\n'}
                  Under the General Data Protection Regulation (GDPR), we process your personal data based on the following legal grounds:{'\n\n'}

                  • Consent: When you explicitly consent to the collection and use of your data.{'\n'}
                  • Contractual Necessity: To provide the services you request.{'\n'}
                  • Legitimate Interest: To improve our app, perform analytics, and develop new features.{'\n'}
                  • Compliance with Legal Obligations: To meet legal requirements and regulatory obligations.{'\n\n'}

                  5. Data Sharing and Disclosure{'\n'}
                  We may share your information with:{'\n\n'}

                  • Service Providers: Third-party vendors who perform services on our behalf.{'\n'}
                  • Team Administrators: If you use team features, your information may be accessible to designated team coaches or administrators.{'\n'}
                  • Legal and Regulatory Authorities: When required by law or to protect our rights.{'\n'}
                  • Business Transfers: In the event of a merger, acquisition, or sale of assets.{'\n\n'}

                  6. Data Retention{'\n'}
                  We will retain your personal data for as long as necessary to:{'\n\n'}

                  • Provide the services you have requested.{'\n'}
                  • Comply with legal obligations.{'\n'}
                  • Resolve disputes and enforce our agreements.{'\n\n'}

                  7. Data Security{'\n'}
                  We implement industry-standard security measures to protect your data from unauthorized access, alteration, disclosure, or destruction.{'\n\n'}

                  8. International Data Transfers{'\n'}
                  Your information may be processed in countries outside your country of residence, including the United States and European Economic Area (EEA) countries.{'\n\n'}

                  9. Your Rights{'\n'}
                  Depending on your jurisdiction, you may have the following rights:{'\n\n'}

                  • Access: The right to request copies of your data.{'\n'}
                  • Correction: The right to have inaccurate data corrected.{'\n'}
                  • Deletion: The right to request deletion of your data.{'\n'}
                  • Restriction: The right to request restrictions on processing.{'\n'}
                  • Objection: The right to object to the processing of your data.{'\n'}
                  • Data Portability: The right to request data transfer.{'\n\n'}

                  10. Children's Privacy{'\n'}
                  Our app is intended for users who are 18 years or older. We do not knowingly collect personal data from individuals under 18.{'\n\n'}

                  11. Updates to This Privacy Policy{'\n'}
                  We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.{'\n\n'}

                  12. Contact Us{'\n'}
                  If you have questions or concerns, please contact us at:{'\n\n'}

                  BallerAI Privacy Team{'\n'}
                  Email: ballerai.official@gmail.com{'\n\n'}

                  Last Updated: [18.2.2025]
                </Text>
              </View>
            )}
          </View>
          
          {/* Button Container - Now inside the ScrollView after privacy section */}
          <View style={styles.buttonContainer}>
            <CustomButton
              title="Log Out"
              onPress={handleLogout}
              buttonStyle={styles.logoutButton}
            />
            <CustomButton
              title="Delete Account"
              onPress={handleDeleteAccount}
              buttonStyle={styles.deleteButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderEditModal()}
      {renderReauthModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  section: {
    padding: 24,
    gap: 16,
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
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
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
    gap: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
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
    gap: 12,
  },
  modalFooter: {
    gap: 16,
  },
  feedbackButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
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
  profileSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 16,
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
    backgroundColor: '#007AFF',
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
    color: '#007AFF',
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
    marginBottom: 16,
    textAlign: 'center',
  },
  reasonButton: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
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
    color: '#FFFFFF',
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
    marginBottom: 16,
  },
  reasonsSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  reasonsInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  reasonsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reasonsButton: {
    backgroundColor: '#007AFF',
  },
  reasonsCancelButton: {
    backgroundColor: '#8E8E93',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 