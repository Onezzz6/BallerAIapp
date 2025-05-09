import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Modal, Alert, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './context/AuthContext';
import CustomButton from './components/CustomButton';
import authService from './services/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { reauthenticateWithCredential, EmailAuthProvider, OAuthProvider, deleteUser, signOut } from 'firebase/auth';
import { auth, db } from './config/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { resetAuthenticationStatus } from './(onboarding)/paywall';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
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
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);

  const handleSignOut = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Reset authentication status before signing out
              resetAuthenticationStatus();
              await authService.signOut();
              router.replace('/');
            } catch (error) {
              console.error('Error signing out:', error);
            }
          }
        }
      ]
    );
  };

  // Check if Apple authentication is available
  React.useEffect(() => {
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
  React.useEffect(() => {
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
          if (error.code !== 'ERR_REQUEST_CANCELED') {
            Alert.alert(
              'Sign in with Apple Failed',
              'Failed to sign in with Apple. Please try again.'
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
      setIsSaving(true);
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
      setIsSaving(false);
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
            <Pressable
              onPress={() => {
                setShowReauthModal(false);
                setPassword('');
              }}
              style={({ pressed }) => [
                styles.customButton,
                styles.customCancelButton,
                { opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <Text style={styles.customButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                const success = await reauthenticateUser(password);
                if (success) {
                  setShowReauthModal(false);
                  setPassword('');
                  handleDeleteConfirmation();
                }
              }}
              style={({ pressed }) => [
                styles.customButton,
                styles.customDeleteButton,
                { opacity: pressed ? 0.8 : 1 }
              ]}
              disabled={!password.trim()}
            >
              <Text style={[
                styles.customButtonText,
                !password.trim() && { opacity: 0.5 }
              ]}>Confirm</Text>
            </Pressable>
          </View>
          
          {/* Show Apple Authentication option if available */}
          {isAppleAuthAvailable && (
            <View style={styles.appleAuthContainer}>
              <Text style={styles.orSeparator}>OR</Text>
              <Text style={styles.authMessage}>Continue with Apple to confirm</Text>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
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
      <Pressable 
        style={styles.modalContainer}
        onPress={() => {
          // Dismiss keyboard when tapping outside the input
          Keyboard.dismiss();
        }}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>We're sorry to see you go</Text>
          <Text style={styles.modalSubtitle}>
            Please, let us know why you're leaving, so we can improve our service.
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
                justifyContent: 'center',
              })}
            >
              <Ionicons name="mail-outline" size={24} color="#4064F6" />
              <Text style={{ color: '#4064F6', fontSize: 16, textAlign: 'center' }}>Send Feedback</Text>
            </Pressable>
            
            <View style={styles.actionButtons}>
              <Pressable
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteReason('');
                  setOtherReason('');
                }}
                style={({ pressed }) => [
                  styles.customButton,
                  styles.customCancelButton,
                  { opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <Text style={styles.customButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowDeleteModal(false);
                  setShowReauthModal(true);
                }}
                style={({ pressed }) => [
                  styles.customButton,
                  styles.customDeleteButton,
                  { opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <Text style={styles.customButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerContainer}>
        <View style={styles.header}>
          <Pressable 
            style={styles.backButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        {/* Subscription Section */}
        {/*<View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <Pressable
            style={styles.settingItem}
            onPress={() => router.push('/settings/subscription')}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="card-outline" size={24} color="#000000" />
              <Text style={styles.settingItemText}>Manage Subscription</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#000000" />
          </Pressable>
        </View>*/}

        {/* Privacy Policy and Contact Us */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Pressable
            style={styles.settingItem}
            onPress={() => router.push('/settings/privacy')}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="shield-outline" size={24} color="#000000" />
              <Text style={styles.settingItemText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#000000" />
          </Pressable>
          <Pressable
            style={styles.settingItem}
            onPress={() => Linking.openURL('mailto:ballerai.official@gmail.com')}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="mail-outline" size={24} color="#000000" />
              <Text style={styles.settingItemText}>Contact Us</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#000000" />
          </Pressable>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <View style={styles.buttonContainer}>
            <CustomButton
              title="Log Out"
              onPress={handleSignOut}
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
        </View>
      </ScrollView>

      {renderDeleteModal()}
      {renderReauthModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingItemText: {
    fontSize: 16,
    color: '#000000',
  },
  buttonContainer: {
    gap: 16,
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
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
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
  reasonsContainer: {
    maxHeight: 300,
    marginVertical: 16,
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