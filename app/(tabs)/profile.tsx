import { View, Text, Image, Pressable, StyleSheet, ScrollView, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useOnboarding } from '../context/OnboardingContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

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
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
      // Here you would typically upload the image to Firebase Storage
      // and update the user's profile picture URL in Firestore
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
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

  const profileDetails = [
    { label: 'Age', field: 'age', value: userData?.age, icon: 'calendar-outline' as const },
    { label: 'Gender', field: 'gender', value: userData?.gender, icon: 'person-outline' as const },
    { label: 'Height', field: 'height', value: userData?.height, icon: 'resize-outline' as const, unit: 'cm' },
    { label: 'Weight', field: 'weight', value: userData?.weight, icon: 'scale-outline' as const, unit: 'kg' },
    { label: 'Dominant Foot', field: 'dominantFoot', value: userData?.dominantFoot, icon: 'football-outline' as const },
    { label: 'Position', field: 'position', value: userData?.position, icon: 'location-outline' as const },
    { label: 'Skill Level', field: 'skillLevel', value: userData?.skillLevel, icon: 'star-outline' as const },
    { label: 'Training Frequency', field: 'trainingFrequency', value: userData?.trainingFrequency, icon: 'time-outline' as const },
    { label: 'Fitness Level', field: 'fitnessLevel', value: userData?.fitnessLevel, icon: 'fitness-outline' as const },
    { label: 'Activity Level', field: 'activityLevel', value: userData?.activityLevel, icon: 'walk-outline' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable 
          onPress={() => setIsEditing(!isEditing)}
          style={styles.editButton}
        >
          <Ionicons 
            name={isEditing ? "checkmark-outline" : "create-outline"} 
            size={24} 
            color="#99E86C" 
          />
          <Text style={styles.editButtonText}>
            {isEditing ? "Done" : "Edit Info"}
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.profileSection}>
          <Pressable onPress={pickImage} style={styles.profileImageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={40} color="#666666" />
              </View>
            )}
            <View style={styles.editIconContainer}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </Pressable>

          <View style={styles.usernameContainer}>
            <Text style={styles.username}>{userData?.username || "User"}</Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Player Details</Text>
          {profileDetails.map((detail, index) => (
            <Pressable 
              key={index} 
              style={styles.detailRow}
              onPress={() => {
                if (isEditing) {
                  setEditingField(detail.field);
                  setEditValue(detail.value?.toString() || '');
                }
              }}
            >
              <View style={styles.detailIcon}>
                <Ionicons name={detail.icon} size={24} color="#666666" />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>{detail.label}</Text>
                <Text style={[
                  styles.detailValue,
                  isEditing && { color: '#666666' }
                ]}>
                  {detail.value} {detail.unit}
                </Text>
              </View>
              {isEditing && (
                <Ionicons name="chevron-forward" size={20} color="#666666" />
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editingField !== null}
        transparent
        animationType="slide"
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
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setEditingField(null)}
                buttonStyle={{ backgroundColor: '#666666' }}
              />
              <Button
                title="Save"
                onPress={() => {
                  if (editingField) {
                    updateUserField(editingField, editValue);
                  }
                }}
                buttonStyle={{ backgroundColor: '#99E86C' }}
                disabled={isLoading}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    color: '#99E86C',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
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
  detailsSection: {
    padding: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
}); 