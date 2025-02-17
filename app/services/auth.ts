import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
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
    } catch (error) {
      throw error;
    }
  },

  async signInWithEmail(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
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