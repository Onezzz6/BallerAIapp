import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RecoveryScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Recovery Screen</Text>
      </View>
    </SafeAreaView>
  );
} 