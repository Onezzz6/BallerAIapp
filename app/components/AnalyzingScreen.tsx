import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  FadeIn, 
  FadeInDown,
  FadeOut,
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  withSequence,
  Easing,
  interpolate
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const loadingMessages = [
  "Analyzing your answers...",
  "Comparing with our database...",
  "Setting up your player profile...",
  "Personalizing your dashboard...",
  "Almost there...",
];

export default function AnalyzingScreen() {
  const router = useRouter();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const pulseAnimation = useSharedValue(0);
  const rotateAnimation = useSharedValue(0);

  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnimation.value, [0, 1], [1, 1.08]);
    const opacity = interpolate(pulseAnimation.value, [0, 1], [0.1, 0.03]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const innerRingStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnimation.value, [0, 1], [0.9, 1.1]);
    const opacity = interpolate(pulseAnimation.value, [0, 1], [0.3, 0.1]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const rotateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateAnimation.value}deg` }],
    };
  });

  useEffect(() => {
    // Start animations
    pulseAnimation.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }),
      -1,
      true
    );

    rotateAnimation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );

    // Cycle through messages
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    // Navigate after delay
    const timer = setTimeout(() => {
      router.replace('/fitness-level');
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearInterval(messageInterval);
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <LinearGradient
        colors={['#ffffff', '#F0F4FF']}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        {/* Spacer to account for missing header */}
        <View style={{ height: 160 }} />
        
        {/* Animated Background Circle */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: '#4064F6',
            },
            pulseStyle,
          ]}
        />

        {/* Mascot Container with Elegant Rings */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          {/* Outer rotating ring */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 280,
                height: 280,
                borderRadius: 140,
                borderWidth: 1,
                borderColor: '#E8F0FF',
                borderStyle: 'solid',
              },
              rotateStyle,
            ]}
          />
          
          {/* Inner pulsing ring */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 250,
                height: 250,
                borderRadius: 125,
                borderWidth: 1.5,
                borderColor: '#DCF4F5',
                backgroundColor: 'rgba(220, 244, 245, 0.1)',
              },
              innerRingStyle,
            ]}
          />
          
          <Animated.View
            entering={FadeInDown.duration(800).springify()}
            style={{
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: '#ffffff',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <Image
              source={require('../../assets/images/mascot.png')}
              style={{
                width: 200,
                height: 200,
                resizeMode: 'contain',
              }}
            />
          </Animated.View>
        </View>

        {/* Loading Message */}
        <View style={{ height: 40, marginBottom: 24 }}>
          <Animated.Text
            key={currentMessageIndex}
            entering={FadeIn.duration(800)}
            exiting={FadeOut.duration(400)}
            style={{
              fontSize: 20,
              color: '#000000',
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            {loadingMessages[currentMessageIndex]}
          </Animated.Text>
        </View>

        {/* Progress Dots */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 40 }}>
          {[0, 1, 2, 3, 4].map((index) => (
            <Animated.View
              key={index}
              entering={FadeIn.duration(300).delay(index * 100)}
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: index <= currentMessageIndex ? '#4064F6' : '#E5E5E5',
              }}
            />
          ))}
        </View>

        {/* Fun Facts Section */}
        <Animated.View
          entering={FadeIn.duration(800).delay(1000)}
          style={{
            backgroundColor: '#DCF4F5',
            borderRadius: 16,
            padding: 10,
            width: '100%',
            alignItems: 'center',
          }}
        >
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}>
            <Ionicons name="bulb-outline" size={20} color="#4064F6" />
            <Text style={{
              fontSize: 16,
              color: '#4064F6',
              fontWeight: '600',
            }}>
              Did you know?
            </Text>
          </View>
          <Text style={{
            fontSize: 14,
            color: '#666666',
            textAlign: 'center',
            lineHeight: 20,
          }}>
            Professional players spend an average of 4-6 hours daily on training, recovery, and nutrition.
          </Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
} 