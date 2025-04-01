import React from 'react';
import { View, Button, StyleSheet } from 'react-native';

const TestCrash = () => {
  const forceCrash = () => {
    // This will cause a crash that Crashlytics can catch
    const numbers: any[] = [];
    const crash = numbers[1].toString();
  };

  return (
    <View style={styles.container}>
      <Button 
        title="Test Crash" 
        onPress={forceCrash}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});

export default TestCrash; 