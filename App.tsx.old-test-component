import { useEffect } from 'react';
import { SafeAreaView, Text, View, StyleSheet } from 'react-native';
import firebaseApp, { auth, db } from './config/firebase';

export default function App() {
  useEffect(() => {
    // Firebase is already initialized in the firebase.ts file
    console.log('Firebase app initialized:', !!firebaseApp);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>BallerAI</Text>
        <Text style={styles.subtitle}>Your AI Fitness Companion</Text>
        <Text style={styles.status}>Metro Connected - Hot Reload Ready!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 24,
    color: '#666',
  },
  status: {
    fontSize: 16,
    padding: 12,
    backgroundColor: '#e6f7ff',
    borderRadius: 8,
    overflow: 'hidden',
    color: '#0066cc',
  }
}); 