import { View, Text, Image, Pressable, StyleSheet, ScrollView, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useOnboarding } from '../context/OnboardingContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPrivacyExpanded, setIsPrivacyExpanded] = useState(false);

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
}); 