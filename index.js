import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import App from './App';

// Register the app with both Expo and React Native
registerRootComponent(App);
AppRegistry.registerComponent('main', () => App); 