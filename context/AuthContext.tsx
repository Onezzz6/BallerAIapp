import React, { createContext, useContext, useEffect, useState } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import authService from '../services/auth';
import { resetAuthenticationStatus } from '../app/(onboarding)/paywall';
import { resetRevenueCatState, logOutRevenueCatUser } from '../services/revenuecat';

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  isLoading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log('🚀 AuthContext: Setting up React Native Firebase Auth (with built-in persistence)');
    
    // 🔥 INDUSTRY STANDARD: React Native Firebase automatically handles AsyncStorage persistence
    // No custom logic needed - it just works like Instagram, WhatsApp, etc.
    const subscriber = auth().onAuthStateChanged((firebaseUser) => {
      console.log('🔥 Firebase Auth State Changed:', firebaseUser ? `User: ${firebaseUser.uid}` : 'No user');
      
      setUser(firebaseUser);
      
      // Only set loading to false after the first auth state change
      if (isLoading) {
        setIsLoading(false);
        console.log('✅ Auth loading complete');
      }
    });

    // Cleanup subscription on unmount
    return subscriber;
  }, [isLoading]);

  const signOut = async () => {
    try {
      console.log('AuthContext: Starting sign out process...');
      
      // Reset RevenueCat first
      await resetRevenueCatState();
      await logOutRevenueCatUser();
      console.log('AuthContext: RevenueCat state reset');
      
      // Reset authentication status
      resetAuthenticationStatus();
      console.log('AuthContext: Authentication status reset');
      
      // Sign out from Firebase - this will trigger onAuthStateChanged with null
      await auth().signOut();
      console.log('AuthContext: Firebase sign out complete');
      
      setUser(null);
    } catch (error) {
      console.error('AuthContext: Error during sign out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}; 