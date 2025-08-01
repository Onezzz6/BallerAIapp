import { View, Text, TextInput, Alert, StyleSheet, Pressable, Image, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import authService from '../../services/auth';
import { runPostLoginSequence } from '../(onboarding)/paywall';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useAuth } from '../../context/AuthContext';

export default function SignInScreen() {
  const router = useRouter();
  const { user } = useAuth();
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

  const handleEmailPasswordVerification = async () => {
    if (!user?.email) {
      Alert.alert('Not Available', 'Email authentication is not available for your account. Please use Apple or Google sign-in instead.');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyCurrentUserPassword(password);
      console.log('✅ Password verification successful');
      
      // Password verified successfully - continue with the intended action
      await runPostLoginSequence(
        user.uid,
        () => router.replace('/(tabs)/home'),
        () => router.replace('/')
      );
    } catch (error: any) {
      console.error('Password verification error:', error);
      if (error.message === 'Invalid password') {
        Alert.alert('Error', 'Invalid password. Please try again.');
      } else if (error.message === 'No current user or email found') {
        Alert.alert('Not Available', 'Email authentication is not available for your account. Please use Apple or Google sign-in instead.');
      } else {
        Alert.alert('Error', 'Failed to verify password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      console.log("Starting Apple Sign-In...");
      
      const result = await authService.checkAppleSignIn();
      
      if (result && result.exists && result.user && result.user.uid) {
        console.log('✅ Apple Sign-In successful, navigating to home');
        await runPostLoginSequence(
          result.user.uid,
          () => router.replace('/(tabs)/home'),
          () => router.replace('/')
        );
      } else if (result && !result.wasCanceled) {
        Alert.alert('Account Not Found', 'No account found with this Apple ID. Please create an account first.');
      }
      // If wasCanceled is true, do nothing - user cancelled intentionally
    } catch (error: any) {
      console.error('Apple Sign-In error:', error);
      // Only show error messages for actual failures, not cancellations
      if (error.code !== 'ERR_REQUEST_CANCELED' &&
          !error.message?.includes('canceled') &&
          !error.message?.includes('cancelled') &&
          error.code !== '1001') {
        Alert.alert('Error', 'Apple Sign-In failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      console.log("Starting Google Sign-In...");
      
      const result = await authService.checkGoogleSignIn();
      
      if (result && result.exists && result.user && result.user.uid) {
        console.log('✅ Google Sign-In successful, navigating to home');
        await runPostLoginSequence(
          result.user.uid,
          () => router.replace('/(tabs)/home'),
          () => router.replace('/')
        );
      } else if (result && !result.wasCanceled) {
        Alert.alert('Account Not Found', 'No account found with this Google account. Please create an account first.');
      }
      // If wasCanceled is true, do nothing - user cancelled intentionally
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      // Only show error for actual failures that aren't cancellations
      if (!error.message?.includes('cancelled') && 
          !error.message?.includes('canceled') &&
          !error.message?.includes('No identity token') &&
          error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Error', 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <Text style={styles.title}>Confirm Your Identity</Text>
        <Text style={styles.subtitle}>For security reasons, please verify your identity to continue.</Text>
        
        {!showEmailForm ? (
          // Show all available authentication options
          <View style={styles.authOptionsContainer}>
            {/* Email Verification Button - ALWAYS VISIBLE */}
            <Pressable 
              key="email-button-always-visible"
              style={[styles.authButton, styles.emailButton]}
              onPress={() => {
                console.log('📧 Email button pressed');
                setShowEmailForm(true);
              }}
              disabled={isLoading}
            >
              <Ionicons name="mail-outline" size={24} color="#4064F6" />
              <Text style={styles.emailButtonText}>Continue with Email</Text>
            </Pressable>

            {/* Apple Sign In - show if available */}
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
            
            {/* Google Sign In - show if available - FIXED STYLING */}
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
          // Show email password form
          <View style={styles.emailFormContainer}>
            <View style={styles.inputContainer}>
              {/* Read-only email field */}
              <View style={styles.emailDisplayContainer}>
                <Text style={styles.emailLabel}>Email</Text>
                <Text style={styles.emailDisplay}>
                  {user?.email || 'Not available for this account'}
                </Text>
              </View>
              
              {/* Password input - only show if user has email */}
              {user?.email ? (
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                    autoFocus
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
              ) : (
                <View style={styles.noEmailContainer}>
                  <Text style={styles.noEmailText}>
                    This account uses social sign-in. Please use Apple or Google authentication instead.
                  </Text>
                </View>
              )}
            </View>

            {/* Only show verify button if user has email */}
            {user?.email && (
              <Pressable
                style={[styles.verifyButton, { opacity: isLoading ? 0.5 : 1 }]}
                onPress={handleEmailPasswordVerification}
                disabled={isLoading}
              >
                <Text style={styles.verifyButtonText}>
                  {isLoading ? "Verifying..." : "Verify Password"}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                setShowEmailForm(false);
                setPassword('');
                setShowPassword(false);
              }}
              style={styles.backButton}
              disabled={isLoading}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          </View>
        )}

        {!showEmailForm && (
          <Pressable
            onPress={() => router.back()}
            style={styles.cancelButton}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
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
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 48,
    textAlign: 'center',
    lineHeight: 24,
  },
  authOptionsContainer: {
    gap: 16,
    marginBottom: 32,
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
    color: '#000000',
  },
  emailFormContainer: {
    width: '100%',
    marginBottom: 32,
  },
  inputContainer: {
    gap: 16,
    marginBottom: 24,
  },
  emailDisplayContainer: {
    gap: 8,
  },
  emailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  emailDisplay: {
    fontSize: 16,
    color: '#666666',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
  verifyButton: {
    backgroundColor: '#4064F6',
    borderRadius: 28,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backButton: {
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666666',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  noEmailContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  noEmailText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
}); 