import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  OAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import * as AppleAuthentication from 'expo-apple-authentication';

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
          // Default onboarding data - user will need to complete onboarding
          username: null,
          gender: null,
          age: null,
          height: null,
          weight: null,
          dominantFoot: null,
          injuryHistory: null,
          skillLevel: null,
          position: null,
          teamStatus: null,
          trainingSurface: null,
          footballGoal: null,
          improvementFocus: null,
          goalTimeline: null,
          holdingBack: null,
          trainingAccomplishment: null,
          trainingFrequency: null,
          discoverySource: null,
          triedOtherApps: null,
          hasGymAccess: null,
          referralCode: null,
          referralDiscount: null,
          referralInfluencer: null,
          motivation: null,
          fitnessLevel: null,
          activityLevel: null,
          sleepHours: null,
          nutrition: null,
          preferMetricUnits: null
        });
      }
      
      return user;
    } catch (error: any) {
      // Don't throw error if user canceled
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log("User canceled Apple Sign In");
        return null;
      }
      throw error;
    }
  },

  async signUpWithApple(onboardingData: UserOnboardingData) {
    try {
      console.log("Starting Apple authentication process...");
      
      // For iOS native Apple Sign In using expo-apple-authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      console.log("Apple credential obtained successfully");
      
      // Sign in with Firebase using the Apple credential
      const { identityToken } = credential;
      
      if (!identityToken) {
        console.error("No identity token provided from Apple");
        throw new Error('No identity token provided from Apple');
      }
      
      // Create a Firebase credential from the Apple ID token
      console.log("Creating Firebase credential with Apple token");
      const provider = new OAuthProvider('apple.com');
      const authCredential = provider.credential({
        idToken: identityToken,
      });
      
      // First check if user exists in Firebase by signing in
      console.log("Attempting to sign in with Firebase");
      const userCredential = await signInWithCredential(auth, authCredential);
      const user = userCredential.user;
      console.log("Firebase sign-in successful, user:", user.uid);
      
      // Check if user profile already exists in Firestore
      console.log("Checking if user document exists in Firestore");
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      // Determine if this is a new or existing user
      let isNewUser = false;
      
      // If user exists in Firebase Auth but not in Firestore, it's a new user
      if (!userDoc.exists()) {
        console.log("No user document found, creating new document with onboarding data");
        isNewUser = true;
        
        // Get name from Apple credential if available
        const displayName = credential.fullName 
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
          : user.displayName || '';
          
        // Create a new user document with onboarding data
        const userData = {
          email: credential.email || user.email,
          name: displayName,
          createdAt: new Date(),
          // Include complete onboarding data
          ...onboardingData
        };
        
        console.log("Setting user document with data:", userData);
        
        // Create the user document in Firestore
        await setDoc(doc(db, 'users', user.uid), userData);
        console.log("User document created successfully");
      } else {
        console.log("User document already exists in Firestore");
      }
      
      return { user, isNewUser };
    } catch (error: any) {
      // Log the error for debugging
      console.error("Error in signUpWithApple:", error);
      
      // Don't throw error if user canceled
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log("User canceled Apple Sign In");
        return { user: null, isNewUser: false };
      }
      throw error;
    }
  },

  // Authenticate with Apple without creating a Firestore document
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
      const provider = new OAuthProvider('apple.com');
      const authCredential = provider.credential({
        idToken: identityToken,
      });
      
      console.log("Attempting to sign in with Firebase");
      const userCredential = await signInWithCredential(auth, authCredential);
      const user = userCredential.user;
      console.log("Firebase sign-in successful, user:", user.uid);
      
      // Check if user profile already exists in Firestore
      console.log("Checking if user document exists in Firestore");
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      // Save the relevant user data to be passed back to the caller
      const appleInfo = {
        email: credential.email || user.email,
        fullName: credential.fullName
      };
      
      // Return user with information about whether the document exists and is valid
      return { 
        user, 
        hasDocument: userDoc.exists(), 
        isValidDocument: userDoc.exists() && this.isValidUserDocument(userDoc.data()),
        appleInfo,
        wasCanceled: false
      };
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log("User canceled Apple Sign In");
        return { user: null, hasDocument: false, isValidDocument: false, appleInfo: null, wasCanceled: true };
      }
      console.error("Error in authenticateWithApple:", error);
      throw error;
    }
  },
  
  // Create a Firestore document for a user who authenticated with Apple
  async createAppleUserDocument(uid: string, onboardingData: UserOnboardingData, appleInfo: any = null) {
    try {
      console.log("Creating document for Apple user:", uid);
      
      // Get user from Firebase Auth to ensure we have the latest data
      const currentUser = auth.currentUser;
      
      if (!currentUser || currentUser.uid !== uid) {
        console.error("Current user does not match provided UID");
        throw new Error('User authentication mismatch');
      }
      
      let displayName = '';
      
      // Try to get fullName from appleInfo first, then from the user object
      if (appleInfo && appleInfo.fullName) {
        displayName = `${appleInfo.fullName.givenName || ''} ${appleInfo.fullName.familyName || ''}`.trim();
      } else if (currentUser.displayName) {
        displayName = currentUser.displayName;
      }
      
      // Create document data
      const userData = {
        email: appleInfo?.email || currentUser.email,
        name: displayName,
        createdAt: new Date(),
        ...onboardingData
      };
      
      console.log("Setting user document with data:", userData);
      
      // Create the Firestore document
      await setDoc(doc(db, 'users', uid), userData);
      console.log("User document created successfully");
      
      return true;
    } catch (error) {
      console.error("Error creating Apple user document:", error);
      throw error;
    }
  },

  // Helper to check if a user document has the required onboarding fields
  isValidUserDocument(userData: any) {
    // First ensure the document exists
    if (!userData) {
      console.log("User document is null or undefined");
      return false;
    }
    
    // Check if we're in the process of onboarding (document exists but fields are null)
    const isInOnboarding = 
      userData.hasOwnProperty('createdAt') && 
      userData.hasOwnProperty('email');
    
    // If we have just the basic fields, this user is in the onboarding process
    if (isInOnboarding) {
      console.log("User document exists but is incomplete (in onboarding process)");
      return false;
    }
    
    // A valid user should have completed onboarding with these core fields
    const hasRequiredFields = 
      userData.hasGymAccess !== null &&
      userData.improvementFocus !== null &&
      userData.trainingFrequency !== null &&
      userData.motivation !== null &&
      userData.username !== null &&
      userData.gender !== null;
    
    return hasRequiredFields;
  },

  // Get a user's document from Firestore
  async getUserDocument(uid: string) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        console.log(`No document found for user ID: ${uid}`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching user document:', error);
      return null;
    }
  },

  // Verify a user has completed full onboarding and has a valid account
  async verifyCompleteUserAccount(userId: string) {
    try {
      if (!userId) {
        console.log("No user ID provided for verification");
        return false;
      }
      
      // Add retry mechanism with delay for Apple Sign-In cases
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        const userDoc = await this.getUserDocument(userId);
        
        // User must have a document and all required onboarding fields
        if (userDoc && this.isValidUserDocument(userDoc)) {
          return true;
        }
        
        // If document exists but is incomplete, it might be in the process of creation
        if (userDoc) {
          console.log(`User document exists for ID ${userId} but is incomplete. Attempt ${attempts + 1}/${maxAttempts}`);
        } else {
          console.log(`User document not found for ID ${userId}. Attempt ${attempts + 1}/${maxAttempts}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      console.log(`Failed to verify user account after ${maxAttempts} attempts`);
      
      // After all attempts, if we still can't verify, sign out for safety
      await signOut(auth);
      return false;
    } catch (error) {
      console.error('Error verifying user account:', error);
      
      // Force sign out on any error
      try {
        await signOut(auth);
      } catch (e) {
        // Ignore sign-out errors
      }
      
      return false;
    }
  },

  // Add the checkAppleSignIn method to the authService object
  async checkAppleSignIn() {
    try {
      // Use the existing authenticateWithApple method but don't create a new account
      const { user, hasDocument, appleInfo, wasCanceled } = await this.authenticateWithApple();
      
      // Return if the user exists and has a valid document
      return {
        exists: !!user && hasDocument,
        user: user,
        appleInfo: appleInfo,
        wasCanceled: wasCanceled
      };
    } catch (error) {
      console.error("Error in checkAppleSignIn:", error);
      // Return false for exists to indicate no valid user was found
      return { exists: false, user: null, appleInfo: null, wasCanceled: false };
    }
  },

  async resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      throw error;
    }
  }
};

export default authService; 