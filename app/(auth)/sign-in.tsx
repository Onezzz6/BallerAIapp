import { View, Text, TextInput, Alert, StyleSheet, Pressable, Image, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import authService from '../services/auth';
import { runPostLoginSequence } from '../(onboarding)/paywall';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isGoogleAvailable, setIsGoogleAvailable] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Check if social authentication methods are available on this device
  useEffect(() => {
    const checkSocialAuthAvailability = async () => {
      const appleAvailable = await AppleAuthentication.isAvailableAsync();
      setIsAppleAvailable(appleAvailable);
      
      // Configure Google Sign In
      try {
        const webClientId = Constants.expoConfig?.extra?.googleWebClientId;
        if (webClientId) {
          GoogleSignin.configure({
            webClientId: webClientId,
          });
          setIsGoogleAvailable(true);
          console.log('Google Sign In configured successfully');
        } else {
          console.log('Google Web Client ID not found in configuration');
          setIsGoogleAvailable(false);
        }
      } catch (error) {
        console.error('Error configuring Google Sign In:', error);
        setIsGoogleAvailable(false);
      }
    };
    
    checkSocialAuthAvailability();
  }, []);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      // First check if the email exists
      const emailExists = await authService.checkEmailExists(email);
      
      if (!emailExists) {
        // Email doesn't exist - redirect to onboarding
        Alert.alert(
          'Account Not Found',
          'No account found with this email. Would you like to create one?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Get Started', 
              onPress: () => {
                router.replace('/onboarding');
              }
            }
          ]
        );
        return;
      }

      // Email exists - try to sign in
      const user = await authService.signInWithEmail(email, password);
      if (user) {
        // Run the post-login sequence (identification, subscription check, and paywall if needed)
        await runPostLoginSequence(
          user.uid,
          () => router.replace('/(tabs)/home'),
          () => router.replace('/')  // Navigate to welcome on cancellation
        );
      }
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Invalid password. Please try again.');
      } else {
        Alert.alert(
          'Error',
          'Failed to sign in. Please check your network connection and try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Please contact support to reset your password.',
      [{ text: 'OK' }]
    );
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      console.log("Starting Apple Sign-In...");
      
      const { exists, user, wasCanceled } = await authService.checkAppleSignIn();
      
      if (exists && user && user.uid) {
        console.log('✅ Apple Sign-In successful, navigating to home');
        await runPostLoginSequence(
          user.uid,
          () => router.replace('/(tabs)/home'),
          () => router.replace('/')
        );
      } else if (!wasCanceled) {
        Alert.alert('Account Not Found', 'No account found with this Apple ID. Please create an account first.');
      }
    } catch (error: any) {
      console.error('Apple Sign-In error:', error);
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', error.message || 'Apple Sign-In failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      console.log("Starting Google Sign-In...");
      
      // Check if Google Play Services are available (Android only)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }

      // Sign in with Google
      console.log('Attempting Google Sign In...');
      const userInfo = await GoogleSignin.signIn();
      console.log('Google Sign In successful, received user info:', userInfo.data?.user?.email);
      
      const idToken = userInfo.data?.idToken;
      console.log('ID Token received:', !!idToken);
      
      if (!idToken) {
        console.error('No ID token in response:', userInfo);
        throw new Error('Google Sign In failed - no ID token received');
      }

      // Create Google credential for Firebase
      console.log('Creating Google credential...');
      const credential = GoogleAuthProvider.credential(idToken);

      // Sign in with Firebase using Google credentials
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      
      if (user) {
        console.log('✅ Google Sign-In successful, navigating to home');
        await runPostLoginSequence(
          user.uid,
          () => router.replace('/(tabs)/home'),
          () => router.replace('/')
        );
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      
      if (error.code === 'auth/user-not-found') {
        Alert.alert('Account Not Found', 'No account found with this Google account. Please create an account first.');
      } else if (error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Error', error.message || 'Google Sign-In failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome Back!</Text>
        
        {!showEmailForm ? (
          // Show three uniform buttons initially
          <View style={styles.authOptionsContainer}>
            {/* Email Sign In Button */}
            <Pressable 
              style={[styles.authButton, styles.emailButton]}
              onPress={() => setShowEmailForm(true)}
              disabled={isLoading}
            >
              <Ionicons name="mail-outline" size={24} color="#4064F6" />
              <Text style={styles.emailButtonText}>Continue with Email</Text>
            </Pressable>

            {/* Apple Sign In */}
            {isAppleAvailable && (
              <View style={styles.authButtonWrapper}>
                {isLoading ? (
                  <View style={[styles.authButton, { backgroundColor: 'black' }]} />
                ) : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={28}
                    style={styles.authButton}
                    onPress={handleAppleSignIn}
                  />
                )}
              </View>
            )}
            
            {/* Google Sign In */}
            {isGoogleAvailable && (
              <Pressable 
                style={[styles.authButton, styles.googleButton, { opacity: isLoading ? 0.5 : 1 }]}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Image 
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </Pressable>
            )}
          </View>
        ) : (
          // Show email form when email button is pressed
          <View style={styles.emailFormContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
                autoFocus
              />
              
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#666666"
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleForgotPassword}
              style={styles.forgotPasswordButton}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </Pressable>

            <Button
              title={isLoading ? "Signing In..." : "Sign In"}
              onPress={handleSubmit}
              disabled={isLoading}
              buttonStyle={{
                backgroundColor: '#4064F6',
                opacity: isLoading ? 0.5 : 1,
                marginTop: 16,
              }}
            />

            <Pressable
              onPress={() => {
                setShowEmailForm(false);
                setEmail('');
                setPassword('');
              }}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 48,
    textAlign: 'center',
  },
  authOptionsContainer: {
    gap: 16,
  },
  authButton: {
    height: 56,
    width: '100%',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  authButtonWrapper: {
    width: '100%',
  },
  emailButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4064F6',
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4064F6',
    marginLeft: 12,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  emailFormContainer: {
    width: '100%',
  },
  inputContainer: {
    gap: 16,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    paddingRight: 50,
    backgroundColor: '#F9F9F9',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#666666',
    textDecorationLine: 'underline',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666666',
  },
}); 