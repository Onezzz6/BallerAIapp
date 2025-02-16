import { View, Image } from 'react-native';
import Animated, { 
  FadeIn,
  FadeOut 
} from 'react-native-reanimated';

export default function LoadingScreen() {
  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      exiting={FadeOut.duration(500)}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Image
        source={require('../../assets/images/BallerAILogo.png')}
        style={{
          width: 120,
          height: 120,
          resizeMode: 'contain'
        }}
      />
    </Animated.View>
  );
} 