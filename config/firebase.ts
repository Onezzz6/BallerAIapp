// 🚀 INDUSTRY STANDARD: React Native Firebase
// ✅ Built-in AsyncStorage persistence (automatic)
// ✅ Better performance (native modules)
// ✅ More reliable for React Native
// ✅ Official Google recommendation for React Native

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage'; // Commented out - not used by any files

// React Native Firebase automatically handles:
// - App initialization using google-services.json / GoogleService-Info.plist
// - AsyncStorage persistence (no configuration needed!)
// - Proper React Native integration

export const db = firestore();
export { auth };

export default auth; 