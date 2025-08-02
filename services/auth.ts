import { auth, db } from '../config/firebase';
import firestore from '@react-native-firebase/firestore';
import * as AppleAuthentication from 'expo-apple-authentication';
import { resetPaywallPresentationFlag } from '../app/(onboarding)/paywall';
import { Platform } from 'react-native';

type UserOnboardingData = {
  username: string | null;
  gender: string | null;
  age: string | null;
  height: string | null;
  weight: string | null;
  dominantFoot: string | null;
  injuryHistory: string | null;
  skillLevel: string | null;
  position: string | null;
  teamStatus: string | null;
  trainingSurface: string | null;
  footballGoal: string | null;
  improvementFocus: string | null;
  goalTimeline: string | null;
  holdingBack: string | null;
  trainingAccomplishment: string | null;
  trainingFrequency: string | null;
  discoverySource: string | null;
  triedOtherApps: string | null;
  hasGymAccess: boolean | null;
  referralCode: string | null;
  referralDiscount: number | null;
  referralInfluencer: string | null;
  motivation: string | null;
  fitnessLevel: string | null;
  activityLevel: string | null;
  sleepHours: string | null;
  nutrition: string | null;
  preferMetricUnits: boolean | null;
};

const authService = {
  async checkEmailExists(email: string) {
    try {
      const methods = await auth().fetchSignInMethodsForEmail(email);
      return methods && methods.length > 0;
    } catch (error) {
      console.error('Error checking email:', error);
      throw error;
    }
  },

  async signUpWithEmail(email: string, password: string, onboardingData: UserOnboardingData) {
    try {
      console.log('🔑 Creating user with email and password...');
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      
      console.log('✅ User created successfully, saving onboarding data...');
      
      // Save user data to Firestore
      await db.collection('users').doc(userCredential.user.uid).set({
        email: email,
        ...onboardingData,
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastLoginAt: firestore.FieldValue.serverTimestamp(),
        isOnboardingComplete: true
      });
      
      console.log('✅ User data saved to Firestore');
      return userCredential.user;
    } catch (error) {
      console.error('❌ Error in signUpWithEmail:', error);
      throw error;
    }
  },

  async signInWithEmail(email: string, password: string) {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      
      // Update last login timestamp
      await db.collection('users').doc(userCredential.user.uid).update({
        lastLoginAt: firestore.FieldValue.serverTimestamp()
      });
      
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  async signOut() {
    try {
      await auth().signOut();
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  getCurrentUser() {
    return auth().currentUser;
  },

  async getUserDocument(userId: string) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user document:', error);
      return null;
    }
  },

  async signInWithGoogle() {
    throw new Error('Google Sign-In not implemented for React Native Firebase yet');
  },

  async signUpWithGoogle(onboardingData: UserOnboardingData) {
    throw new Error('Google Sign-Up not implemented for React Native Firebase yet');
  },

  async authenticateWithGoogle() {
    // Implementation depends on your Google sign-in setup
  },

  async signInWithApple() {
    try {
      console.log('🍎 Starting Apple Sign In...');
      
      // Start Apple authentication request
      const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, email, fullName } = appleAuthRequestResponse;

      if (identityToken) {
        // Create Firebase credential
        const appleCredential = auth.AppleAuthProvider.credential(identityToken);

        // Sign in with credential
        const result = await auth().signInWithCredential(appleCredential);
        
        console.log('✅ Apple Sign In successful');

        // Update user document with login timestamp
        try {
          await db.collection('users').doc(result.user.uid).update({
            lastLoginAt: firestore.FieldValue.serverTimestamp()
          });
        } catch (updateError) {
          // User document might not exist yet, this is OK for sign-in
          console.log('Note: Could not update lastLoginAt - user document may not exist yet');
        }

        return result.user;
      } else {
        throw new Error('No identity token received from Apple');
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        throw new Error('Apple Sign In was canceled');
      } else {
        console.error('❌ Apple Sign In error:', error);
        throw error;
      }
    }
  },

  async signUpWithApple(onboardingData: UserOnboardingData) {
    try {
      console.log('🍎 Starting Apple Sign Up...');
      
      // Start Apple authentication request
      const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, email, fullName } = appleAuthRequestResponse;

      if (identityToken) {
        // Create Firebase credential
        const appleCredential = auth.AppleAuthProvider.credential(identityToken);

        // Sign in with credential (this creates the user if it doesn't exist)
        const result = await auth().signInWithCredential(appleCredential);
        
        console.log('✅ Apple Sign Up successful');

        // Prepare user data with Apple info and onboarding data
        const userData = {
          email: email || result.user.email || '',
          displayName: fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : result.user.displayName || '',
          ...onboardingData,
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastLoginAt: firestore.FieldValue.serverTimestamp(),
          isOnboardingComplete: true,
          authProvider: 'apple'
        };

        // Save user data to Firestore
        await db.collection('users').doc(result.user.uid).set(userData);
        
        console.log('✅ User data saved to Firestore');
        return result.user;
      } else {
        throw new Error('No identity token received from Apple');
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        throw new Error('Apple Sign Up was canceled');
      } else {
        console.error('❌ Apple Sign Up error:', error);
        throw error;
      }
    }
  },

  async authenticateWithApple() {
    try {
      console.log("Starting Apple authentication process...");
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      console.log("Apple credential obtained successfully");
      
      const { identityToken } = credential;
      
      if (!identityToken) {
        console.error("No identity token provided from Apple");
        throw new Error('No identity token provided from Apple');
      }
      
      console.log("Creating Firebase credential with Apple token");
      const appleCredential = auth.AppleAuthProvider.credential(identityToken);
      
      console.log("Attempting to sign in with Firebase");
      const userCredential = await auth().signInWithCredential(appleCredential);
      const user = userCredential.user;
      console.log("Firebase sign-in successful, user:", user.uid);
      
      console.log("Checking if user document exists in Firestore");
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      const appleInfo = {
        email: credential.email || user.email,
        fullName: credential.fullName
      };
      
      // If no valid user document exists, sign out immediately (this is sign-in only)
      if (!userDoc.exists || !this.isValidUserDocument(userDoc.data())) {
        console.log("No valid user document found - signing out newly created auth user");
        await auth().signOut();
        
        return { 
          user: null, 
          hasDocument: false, 
          isValidDocument: false,
          appleInfo,
          wasCanceled: false
        };
      }
      
      console.log("Valid user document found");
      return { 
        user, 
        hasDocument: true, 
        isValidDocument: true,
        appleInfo,
        wasCanceled: false
      };
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log("Apple authentication was canceled by user");
        return { user: null, hasDocument: false, isValidDocument: false, appleInfo: null, wasCanceled: true };
      }
      throw error;
    }
  },

  async checkAppleSignIn() {
    try {
      console.log("🍎 Starting Apple Sign-In check...");
      
      // Start Apple authentication request
      const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, email, fullName } = appleAuthRequestResponse;

      if (identityToken) {
        // Create Firebase credential
        const appleCredential = auth.AppleAuthProvider.credential(identityToken);

        // Sign in with credential to check if account exists
        const result = await auth().signInWithCredential(appleCredential);
        
        console.log('✅ Apple Sign In successful');

        // Check if user document exists in Firestore
        const userDoc = await db.collection('users').doc(result.user.uid).get();
        
        if (userDoc.exists && this.isValidUserDocument(userDoc.data())) {
          // Update user document with login timestamp
          await db.collection('users').doc(result.user.uid).update({
            lastLoginAt: firestore.FieldValue.serverTimestamp()
          });

          return { 
            exists: true, 
            user: result.user, 
            wasCanceled: false 
          };
        } else {
          // Account exists in Firebase Auth but no valid user document
          // Sign out and return exists: false
          await auth().signOut();
          return { 
            exists: false, 
            user: null, 
            wasCanceled: false 
          };
        }
      } else {
        throw new Error('No identity token received from Apple');
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('Apple Sign In was canceled');
        return { 
          exists: false, 
          user: null, 
          wasCanceled: true 
        };
      } else {
        console.error('❌ Apple Sign In error:', error);
        throw error;
      }
    }
  },

  async checkGoogleSignIn() {
    try {
      console.log("🔍 Starting Google Sign-In check...");
      
      // Check if Google Play Services are available (Android only)
      if (Platform.OS === 'android') {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        await GoogleSignin.hasPlayServices();
      }

      // Sign in with Google
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const userInfo = await GoogleSignin.signIn();
      
      const idToken = userInfo.data?.idToken;
      
      if (!idToken) {
        console.log('No ID token received - user likely cancelled Google sign-in');
        return { 
          exists: false, 
          user: null, 
          wasCanceled: true 
        };
      }

      // Create Google credential for Firebase
      const credential = auth.GoogleAuthProvider.credential(idToken);

      // Sign in with Firebase using Google credentials
      const userCredential = await auth().signInWithCredential(credential);
      const user = userCredential.user;
      
      if (user) {
        // Check if user document exists in Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists && this.isValidUserDocument(userDoc.data())) {
          // Update user document with login timestamp
          await db.collection('users').doc(user.uid).update({
            lastLoginAt: firestore.FieldValue.serverTimestamp()
          });

          return { 
            exists: true, 
            user: user, 
            wasCanceled: false 
          };
        } else {
          // Account exists in Firebase Auth but no valid user document
          // Sign out and return exists: false
          await auth().signOut();
          return { 
            exists: false, 
            user: null, 
            wasCanceled: false 
          };
        }
      }
      
      return { 
        exists: false, 
        user: null, 
        wasCanceled: false 
      };
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      
      // Check if user cancelled the sign-in process
      const { statusCodes } = require('@react-native-google-signin/google-signin');
      if (error.code === statusCodes.SIGN_IN_CANCELLED || 
          error.code === 'SIGN_IN_CANCELLED' ||
          error.code === statusCodes.IN_PROGRESS ||
          error.message?.includes('SIGN_IN_CANCELLED') ||
          error.message?.includes('cancelled') ||
          error.message?.includes('canceled') ||
          error.message?.includes('The user canceled') ||
          error.message?.includes('User cancelled') ||
          error.message?.includes('No identity token provided') ||
          error.toString().includes('cancelled')) {
        console.log('User cancelled Google Sign-In - returning cancellation status');
        return { 
          exists: false, 
          user: null, 
          wasCanceled: true 
        };
      } else {
        // For actual errors (not cancellations), still throw
        throw error;
      }
    }
  },

  // Verify a user has completed full onboarding and has a valid account
  async verifyUserAccount(user: any, maxRetries = 3) {
    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`AuthService: Verifying user account (attempt ${attempt}/${maxRetries})`);
        
        if (!user || !user.uid) {
          console.log('AuthService: No user or UID provided');
          return false;
        }

        try {
          const userDoc = await this.getUserDocument(user.uid);
          
          if (!userDoc) {
            console.log(`AuthService: No user document found (attempt ${attempt})`);
            if (attempt < maxRetries) {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
            return false;
          }

          const isValid = this.isValidUserDocument(userDoc);
          console.log(`AuthService: User document validation result: ${isValid}`);
          return isValid;
        } catch (docError) {
          console.error(`AuthService: Error fetching user document (attempt ${attempt}):`, docError);
          if (attempt < maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          return false;
        }
      }
      
      // After all attempts, if we still can't verify, sign out for safety
      await auth().signOut();
      return false;
    } catch (error) {
      console.error('AuthService: Critical error in verifyUserAccount:', error);
      
      // Force sign out on any error
      try {
        await auth().signOut();
      } catch (e) {
        // Ignore sign-out errors
      }
      return false;
    }
  },

  async resetPassword(email: string) {
    try {
      await auth().sendPasswordResetEmail(email);
      console.log('Password reset email sent');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  },

  async verifyCurrentUserPassword(password: string) {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error('No current user or email found');
      }

      // Create a credential with the current user's email and provided password
      const credential = auth.EmailAuthProvider.credential(currentUser.email, password);
      
      // Re-authenticate the user with their credentials
      await currentUser.reauthenticateWithCredential(credential);
      
      console.log('✅ Password verification successful');
      return true;
    } catch (error: any) {
      console.error('❌ Password verification failed:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error('Invalid password');
      }
      throw error;
    }
  },

  // Helper to check if a user document exists and has basic info
  isValidUserDocument(userData: any) {
    // First ensure the document exists
    if (!userData) {
      console.log("User document is null or undefined");
      return false;
    }
    
    // For existing users, we only need to check that the document exists
    // and has some basic info. Don't be too strict since older users 
    // may not have all current fields.
    const hasBasicData = (
      // Check if document has any meaningful content
      Object.keys(userData).length > 0 &&
      // Must have either email, displayName, or username
      (userData.email !== undefined || 
       userData.displayName !== undefined || 
       userData.username !== undefined ||
       // Or any onboarding completion indicator
       userData.isOnboardingComplete !== undefined ||
       userData.createdAt !== undefined)
    );
    
    if (hasBasicData) {
      console.log("User document exists with basic info - validation passed");
      return true;
    } else {
      console.log("User document exists but missing basic required fields");
      return false;
    }
  }
};

export default authService; 