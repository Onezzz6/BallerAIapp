import AsyncStorage from '@react-native-async-storage/async-storage';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from Firebase and AsyncStorage
  useEffect(() => {
    const checkUserAuth = async () => {
      try {
        // First check if we have a persisted user auth state
        const persistedUser = await AsyncStorage.getItem('user_auth_state');
        
        // Then listen for Firebase auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            // User is signed in - store this in AsyncStorage for persistence
            setUser(firebaseUser);
            await AsyncStorage.setItem('user_auth_state', 'authenticated');
          } else {
            // No Firebase user, but check if we have persistent state
            if (persistedUser === 'authenticated') {
              // Try to reauthenticate silently with Firebase
              // This is a fallback to handle cases where Firebase session expired
              // but we still want to keep the user logged in
              console.log('Persisted auth found, but Firebase user is null.');
              // You might want to attempt to refresh tokens here if needed
            } else {
              // No Firebase user and no persisted state - user is definitely logged out
              setUser(null);
              await AsyncStorage.removeItem('user_auth_state');
            }
          }
          setLoading(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Error checking authentication state:', error);
        setLoading(false);
      }
    };

    checkUserAuth();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      // Make sure to clear the persisted state on logout
      await AsyncStorage.removeItem('user_auth_state');
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // ... rest of your AuthProvider code ...
} 