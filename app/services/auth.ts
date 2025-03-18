import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  OAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import * as AppleAuthentication from 'expo-apple-authentication';

type UserOnboardingData = {
  hasSmartwatch: boolean | null;
  footballGoal: string | null;
  improvementFocus: string | null;
  trainingFrequency: string | null;
  hasGymAccess: boolean | null;
  motivation: string | null;
};

const authService = {
  async checkEmailExists(email: string) {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        // Email exists
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  async signUpWithEmail(email: string, password: string, onboardingData: UserOnboardingData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        createdAt: new Date(),
        ...onboardingData
      });

      return user;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        error.message = 'This email is already registered';
      } else if (error.code === 'auth/invalid-email') {
        error.message = 'Please enter a valid email address';
      } else if (error.code === 'auth/weak-password') {
        error.message = 'Password must be at least 6 characters';
      }
      throw error;
    }
  },

  async signInWithEmail(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        error.message = 'Invalid password';
      }
      throw error;
    }
  },

  async signOut() {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  },

  async deleteAccount() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user found');
      }

      // Re-authenticate if needed
      if (user.metadata.lastSignInTime) {
        const lastSignIn = new Date(user.metadata.lastSignInTime);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        if (lastSignIn < fiveMinutesAgo) {
          throw new Error('Please sign in again to delete your account');
        }
      }

      await user.delete();
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('Please sign in again to delete your account');
      }
      throw error;
    }
  },

  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  },

  async signInWithApple() {
    try {
      // For iOS native Apple Sign In using expo-apple-authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // Sign in with Firebase using the Apple credential
      const { identityToken } = credential;
      
      if (!identityToken) {
        throw new Error('No identity token provided from Apple');
      }
      
      // Create a Firebase credential from the Apple ID token
      const provider = new OAuthProvider('apple.com');
      const authCredential = provider.credential({
        idToken: identityToken,
        // Nonce is not available in expo-apple-authentication, but Firebase doesn't require it
      });
      
      // Sign in to Firebase with the Apple credential
      const userCredential = await signInWithCredential(auth, authCredential);
      const user = userCredential.user;
      
      // Check if user profile already exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      // If user doesn't exist in Firestore, create a profile
      if (!userDoc.exists()) {
        // Get name from Apple credential if available
        const displayName = credential.fullName 
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
          : user.displayName || '';
          
        await setDoc(doc(db, 'users', user.uid), {
          email: credential.email || user.email,
          name: displayName,
          createdAt: new Date(),
          // Default onboarding data
          hasSmartwatch: null,
          footballGoal: null,
          improvementFocus: null,
          trainingFrequency: null,
          hasGymAccess: null,
          motivation: null
        });
      }
      
      return user;
    } catch (error: any) {
      // Don't throw error if user canceled
      if (error.code === 'ERR_CANCELED') {
        return null;
      }
      throw error;
    }
  },

  async signUpWithApple(onboardingData: UserOnboardingData) {
    try {
      // For iOS native Apple Sign In using expo-apple-authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // Sign in with Firebase using the Apple credential
      const { identityToken } = credential;
      
      if (!identityToken) {
        throw new Error('No identity token provided from Apple');
      }
      
      // Create a Firebase credential from the Apple ID token
      const provider = new OAuthProvider('apple.com');
      const authCredential = provider.credential({
        idToken: identityToken,
        // Nonce is not available in expo-apple-authentication, but Firebase doesn't require it
      });
      
      // Sign in/up to Firebase with the Apple credential
      const userCredential = await signInWithCredential(auth, authCredential);
      const user = userCredential.user;
      
      // Check if user profile already exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      // Determine if this is a new or existing user
      let isNewUser = false;
      
      // If user doesn't exist in Firestore, create a profile with onboarding data
      if (!userDoc.exists()) {
        isNewUser = true;
        
        // Get name from Apple credential if available
        const displayName = credential.fullName 
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
          : user.displayName || '';
          
        await setDoc(doc(db, 'users', user.uid), {
          email: credential.email || user.email,
          name: displayName,
          createdAt: new Date(),
          // Include onboarding data from the sign up flow
          ...onboardingData
        });
      }
      
      return { user, isNewUser };
    } catch (error: any) {
      // Don't throw error if user canceled
      if (error.code === 'ERR_CANCELED') {
        return { user: null, isNewUser: false };
      }
      throw error;
    }
  }
};

export default authService; 