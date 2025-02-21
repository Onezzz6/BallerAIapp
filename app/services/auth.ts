import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

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
  }
};

export default authService; 