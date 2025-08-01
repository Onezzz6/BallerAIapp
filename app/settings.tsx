import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Modal, Alert, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import CustomButton from './components/CustomButton';
import authService from '../services/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { auth as authInstance, db } from '../config/firebase';
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
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
  const [isGoogleAuthAvailable, setIsGoogleAuthAvailable] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
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

  // Check if Google authentication is available and configure it
  React.useEffect(() => {
    const checkGoogleAuthAvailability = async () => {
      try {
        const webClientId = Constants.expoConfig?.extra?.googleWebClientId;
        if (webClientId) {
          GoogleSignin.configure({
            webClientId: webClientId,
          });
          setIsGoogleAuthAvailable(true);
          console.log('Google Sign In configured successfully in settings');
        } else {
          console.log('Google Web Client ID not found in configuration');
          setIsGoogleAuthAvailable(false);
        }
      } catch (error) {
        console.error('Error configuring Google Sign In in settings:', error);
        setIsGoogleAuthAvailable(false);
      }
    };
    
    checkGoogleAuthAvailability();
  }, []);

  // Check if the user signed in with Apple
  React.useEffect(() => {
    if (user) {
      // Check if the user has Apple or Google authentication providers
      const providers = user.providerData || [];
      const hasAppleProvider = providers.some(provider => provider.providerId === 'apple.com');
      const hasGoogleProvider = providers.some(provider => provider.providerId === 'google.com');
      
      setIsAppleUser(hasAppleProvider || false);
      setIsGoogleUser(hasGoogleProvider || false);
    }
  }, [user]);

  const reauthenticateUser = async (password: string, method: 'password' | 'apple' | 'google' = 'password') => {
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
          
          // Create Firebase credential for Apple
          const authCredential = auth.AppleAuthProvider.credential(credential.identityToken);
          
          // Reauthenticate with Firebase
          await auth().currentUser?.reauthenticateWithCredential(authCredential);
          return true;
        } catch (error: any) {
          console.error('Apple reauthentication error:', error);
          if (error.code !== 'ERR_REQUEST_CANCELED' &&
              !error.message?.includes('canceled') &&
              !error.message?.includes('cancelled') &&
              error.code !== '1001') {
            Alert.alert(
              'Sign in with Apple Failed',
              'Failed to sign in with Apple. Please try again.'
            );
          }
          return false;
        }
      } else if (method === 'google') {
        try {
          // Check if Google Play Services are available (Android only)
          if (Platform.OS === 'android') {
            await GoogleSignin.hasPlayServices();
          }
          
          // Sign in with Google
          const userInfo = await GoogleSignin.signIn();
          
          if (!userInfo.data?.idToken) {
            console.log('No ID token received - user likely cancelled Google sign-in');
            return false;
          }
          
          // Create Firebase credential for Google
          const googleCredential = auth.GoogleAuthProvider.credential(userInfo.data.idToken);
          
          // Reauthenticate with Firebase
          await auth().currentUser?.reauthenticateWithCredential(googleCredential);
          return true;
        } catch (error: any) {
          console.error('Google reauthentication error:', error);
          // Check if user cancelled the sign-in process
          if (error.code === 'SIGN_IN_CANCELLED' ||
              error.message?.includes('cancelled') ||
              error.message?.includes('canceled') ||
              error.message?.includes('No identity token provided') ||
              error.toString().includes('cancelled')) {
            console.log('User cancelled Google reauthentication');
            return false;
          } else if (error.code === 'auth/user-not-found' || 
                     error.code === 'auth/invalid-user-token' ||
                     error.code === 'auth/user-disabled' ||
                     error.code === 'auth/user-mismatch' ||
                     error.code === 'auth/account-exists-with-different-credential' ||
                     error.message?.includes('user-not-found') ||
                     error.message?.includes('user-mismatch') ||
                     error.message?.includes('invalid-user')) {
            Alert.alert('Account Mismatch', "You're not signed in on this account so can't delete it.");
            return false;
          } else {
            Alert.alert(
              'Sign in with Google Failed',
              'Failed to sign in with Google. Please try again.'
            );
            return false;
          }
        }
      } else {
        // Email/password authentication
        if (!user.email) return false;
        
        try {
          const credential = auth.EmailAuthProvider.credential(user.email, password);
          await auth().currentUser?.reauthenticateWithCredential(credential);
          return true;
        } catch (error: any) {
          console.error('Email/password reauthentication error:', error);
          
          if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            Alert.alert('Incorrect Password', 'The password you entered is incorrect. Please try again.');
          } else if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
            Alert.alert('Account Mismatch', "You're not signed in on this account so can't delete it.");
          } else if (error.code === 'auth/too-many-requests') {
            Alert.alert('Too Many Attempts', 'Too many failed attempts. Please try again later.');
          } else {
            Alert.alert('Authentication Failed', 'Failed to verify your identity. Please try again.');
          }
          return false;
        }
      }
    } catch (error) {
      console.error('Reauthentication error:', error);
      // Specific error messages are now handled in each method above
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
      console.log('Starting account deletion process for user:', user.uid);
      
      // Store user info before deletion
      const userUid = user.uid;
      
      try {
        // 1. Delete all user's meals
        console.log('Deleting user meals...');
        const mealsQuery = db.collection('meals').where('userId', '==', userUid);
        const mealsSnapshot = await mealsQuery.get();
        const mealDeletions = mealsSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(mealDeletions);
        console.log(`Deleted ${mealsSnapshot.docs.length} meals`);

        // 2. Delete all user's dailyMacros
        console.log('Deleting user daily macros...');
        const dailyMacrosRef = db.collection(`users/${userUid}/dailyMacros`);
        const dailyMacrosSnapshot = await dailyMacrosRef.get();
        const macroDeletions = dailyMacrosSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(macroDeletions);
        console.log(`Deleted ${dailyMacrosSnapshot.docs.length} daily macro records`);

        // 3. Delete user document
        console.log('Deleting user document...');
        await db.collection('users').doc(userUid).delete();
        console.log('User document deleted');

        // 4. Close all modals first
        setShowDeleteConfirmModal(false);
        setShowReauthModal(false);
        setShowDeleteModal(false);

        // 5. Show success message and navigate BEFORE deleting auth user
        Alert.alert(
          'Account Deleted',
          'Your account and all associated data have been permanently deleted. Thank you for using BallerAI!',
          [
            {
              text: 'OK',
              onPress: async () => {
                try {
                  // 6. Delete Firebase Auth user as final step
                  console.log('Deleting Firebase Auth user...');
                  await auth().currentUser?.delete();
                  console.log('Firebase Auth user deleted');
                  
                  // 7. Sign out and navigate to welcome
                  await auth().signOut();
                  console.log('User signed out successfully');
                  
                  // Reset authentication status
                  resetAuthenticationStatus();
                  
                  // Navigate to welcome screen
                  router.replace('/');
                  console.log('Navigated to welcome screen');
                } catch (finalError: any) {
                  console.error('Error in final deletion steps:', finalError);
                  // Even if auth deletion fails, still navigate away since data is deleted
                  router.replace('/');
                }
              }
            }
          ]
        );

      } catch (error: any) {
        console.error('Error during data deletion:', error);
        if (error.code === 'auth/requires-recent-login') {
          console.log('Recent login required, showing reauth modal');
          setShowReauthModal(true);
          return;
        }
        throw error;
      }
    } catch (error: any) {
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
          <Text style={styles.modalTitle} allowFontScaling={false}>Confirm Your Identity</Text>
          <Text style={styles.modalSubtitle} allowFontScaling={false}>
            For security reasons, please verify your identity to delete your account.
          </Text>
          
          {/* Always show email authentication option */}
          <View style={{ marginVertical: 8 }}>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.modalInput}
                placeholder={
                  user?.email 
                    ? "Password for your email" 
                    : "Enter password (email auth may not be available)"
                }
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!!user?.email}
              />
              
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIconFixed}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color="#666666"
                />
              </Pressable>
            </View>
            
            <CustomButton
              title="Continue with Email"
              onPress={async () => {
                if (!user?.email) {
                  Alert.alert('Not Available', 'Email authentication is not available for your account. Please use Apple or Google sign-in instead.');
                  return;
                }
                
                if (!password.trim()) {
                  Alert.alert('Error', 'Please enter your password');
                  return;
                }
                
                const success = await reauthenticateUser(password, 'password');
                if (success) {
                  setShowReauthModal(false);
                  setShowDeleteConfirmModal(true);
                  setPassword('');
                }
              }}
              buttonStyle={{ ...styles.authButton, backgroundColor: '#4064F6' }}
              textStyle={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}
            />
          </View>
          
          {/* Show Apple authentication if available */}
          {isAppleAuthAvailable && (
            <CustomButton
              title="Continue with Apple"
              onPress={async () => {
                const success = await reauthenticateUser('', 'apple');
                if (success) {
                  setShowReauthModal(false);
                  setShowDeleteConfirmModal(true);
                }
              }}
              buttonStyle={{ ...styles.authButton, backgroundColor: '#000000' }}
              textStyle={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}
            />
          )}
          
          {/* Show Google authentication - show if available with fixed styling */}
          {isGoogleAuthAvailable && (
            <CustomButton
              title="Continue with Google"
              onPress={async () => {
                const success = await reauthenticateUser('', 'google');
                if (success) {
                  setShowReauthModal(false);
                  setShowDeleteConfirmModal(true);
                }
              }}
              buttonStyle={{ 
                ...styles.authButton, 
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E5E5E5'
              }}
              textStyle={{ color: '#000000', fontSize: 16, fontWeight: '600' }}
            />
          )}
          
          <View style={styles.modalButtons}>
            <CustomButton
              title="Cancel"
              onPress={() => {
                setShowReauthModal(false);
                setPassword('');
              }}
              buttonStyle={{ ...styles.modalButton, backgroundColor: '#E5E5E7' }}
              textStyle={{ color: '#000000', fontSize: 16, fontWeight: '600' }}
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
      <Pressable 
        style={styles.modalContainer}
        onPress={() => {
          // Dismiss keyboard when tapping outside the input
          Keyboard.dismiss();
        }}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle} allowFontScaling={false}>We're sorry to see you go</Text>
          <Text style={styles.modalSubtitle} allowFontScaling={false}>
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
                ]} allowFontScaling={false}>
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
              <Text style={{ color: '#4064F6', fontSize: 16, textAlign: 'center' }} allowFontScaling={false}>Send Feedback</Text>
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
                <Text style={styles.customButtonText} allowFontScaling={false}>Cancel</Text>
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
                <Text style={styles.customButtonText} allowFontScaling={false}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );

  const renderDeleteConfirmModal = () => (
    <Modal
      visible={showDeleteConfirmModal}
      transparent
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Ionicons name="warning" size={48} color="#FF3B30" style={{ alignSelf: 'center', marginBottom: 16 }} />
          <Text style={styles.modalTitle} allowFontScaling={false}>Delete Account</Text>
          <Text style={styles.modalSubtitle} allowFontScaling={false}>
            This action cannot be undone. All your data, including meals, progress, and account information will be permanently deleted.
          </Text>
          <Text style={[styles.modalSubtitle, { fontWeight: '600', color: '#FF3B30', marginTop: 12 }]} allowFontScaling={false}>
            Are you absolutely sure?
          </Text>
          
          <View style={styles.modalButtons}>
            <CustomButton
              title="Cancel"
              onPress={() => setShowDeleteConfirmModal(false)}
              buttonStyle={{ ...styles.modalButton, backgroundColor: '#E5E5E7' }}
              textStyle={{ color: '#000000', fontSize: 16, fontWeight: '600' }}
            />
            <CustomButton
              title="Delete Forever"
              onPress={handleDeleteConfirmation}
              buttonStyle={{ ...styles.modalButton, backgroundColor: '#FF3B30', marginTop: 12 }}
              textStyle={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}
              disabled={isSaving}
            />
          </View>
        </View>
      </View>
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
          <Text style={styles.headerTitle} allowFontScaling={false}>Settings</Text>
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
          <Text style={styles.sectionTitle} allowFontScaling={false}>Support</Text>
          <Pressable
            style={styles.settingItem}
            onPress={() => router.push('/settings/privacy')}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="shield-outline" size={24} color="#000000" />
              <Text style={styles.settingItemText} allowFontScaling={false}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#000000" />
          </Pressable>
          <Pressable
            style={styles.settingItem}
            onPress={() => Linking.openURL('mailto:ballerai.official@gmail.com')}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="mail-outline" size={24} color="#000000" />
              <Text style={styles.settingItemText} allowFontScaling={false}>Contact Us</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#000000" />
          </Pressable>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>Account Actions</Text>
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
      {renderDeleteConfirmModal()}
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
    flex: 1,
    padding: 16,
    fontSize: 16,
    borderWidth: 0,
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
  authButton: {
    width: '100%',
    height: 50,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  modalButton: {
    width: '100%',
    height: 50,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    marginVertical: 16,
  },
  eyeIconFixed: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
}); 