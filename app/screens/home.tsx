import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';

export default function HomeScreen() {
  const testCrash = () => {
    crashlytics().log('Testing crash');
    crashlytics().crash();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={testCrash}
        style={{
          backgroundColor: '#FF3B30',
          padding: 16,
          borderRadius: 8,
          margin: 16,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Test Crashlytics</Text>
      </TouchableOpacity>
      
      {/* Rest of your existing UI */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
}); 