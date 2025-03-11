import { View, Text, TextInput, Alert, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import authService from '../services/auth';
import { useOnboarding } from '../context/OnboardingContext';
import * as AppleAuthentication from 'expo-apple-authentication';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const { onboardingData } = useOnboarding();

  // Check if Apple authentication is available on this device
  useEffect(() => {
    const checkAppleAuthAvailability = async () => {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setIsAppleAvailable(isAvailable);
    };
    
    checkAppleAuthAvailability();
  }, []);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      // First try to create new account
      const user = await authService.signUpWithEmail(email, password, onboardingData);
      if (user) {
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      // If email exists, prompt for sign in
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Existing Account',
          'Looks like you already have an account. Would you like to sign in?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: async () => {
                try {
                  const user = await authService.signInWithEmail(email, password);
                  if (user) {
                    router.replace('/(tabs)/home');
                  }
                } catch (signInError: any) {
                  Alert.alert('Error', 'Invalid password. Please try again.');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          error.message || 'Failed to create account. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      
      const user = await authService.signInWithApple();
      if (user) {
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      if (error.code !== 'ERR_CANCELED') { // Don't show error if user cancels
        Alert.alert(
          'Error',
          'Failed to sign in with Apple. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Account</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!isLoading}
        />
        
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
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

      <Button
        title={isLoading ? "Creating Account..." : "Continue"}
        onPress={handleSubmit}
        disabled={isLoading}
        buttonStyle={{
          backgroundColor: '#4064F6',
          opacity: isLoading ? 0.5 : 1,
        }}
      />

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.divider} />
      </View>

      {/* Apple Sign In */}
      {isAppleAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    gap: 16,
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666666',
    fontSize: 14,
  },
  appleButton: {
    height: 50,
    width: '100%',
  }
}); 