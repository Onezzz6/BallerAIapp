import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../config/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import authService from '../services/auth';
import { resetAuthenticationStatus } from '../(onboarding)/paywall';
import { resetRevenueCatState, logOutRevenueCatUser } from '../services/revenuecat';

interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Log out RevenueCat user first
      await logOutRevenueCatUser();
      
      // Then sign out from Firebase
      await authService.signOut();
      
      // Reset authentication status when user signs out
      resetAuthenticationStatus();
      
      // Reset RevenueCat user state (clears pending attributes, keeps SDK configured)
      resetRevenueCatState();
      
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}; 