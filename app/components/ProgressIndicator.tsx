import { View, Text, Animated } from 'react-native';
import { useEffect, useRef, useState } from 'react';

export default function ProgressIndicator() {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [displayedPercentage, setDisplayedPercentage] = useState(0);
  
  useEffect(() => {
    // Create a sequence of animations for smoother progress
    const animations = [
      Animated.timing(progressAnim, {
        toValue: 35,
        duration: 800, // 0.8 seconds
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 65,
        duration: 1200, // 1.2 seconds
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 1000, // 1 second
        useNativeDriver: false,
      }),
    ];

    // Update the percentage number smoothly
    const interval = setInterval(() => {
      progressAnim.addListener(({ value }) => {
        setDisplayedPercentage(Math.round(value));
      });
    }, 50);

    Animated.sequence(animations).start();

    return () => {
      clearInterval(interval);
      progressAnim.removeAllListeners();
    };
  }, []);

  return (
    <View style={{ width: '100%', alignItems: 'center', gap: 16 }}>
      <View style={{
        width: '80%',
        height: 12,
        backgroundColor: '#E5E5E5',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        <Animated.View style={{
          width: progressAnim.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          }),
          height: '100%',
          backgroundColor: '#4064F6',
          borderRadius: 8,
        }} />
      </View>
      <Text style={{
        fontSize: 18,
        color: '#666666',
      }}>
        {displayedPercentage}%
      </Text>
    </View>
  );
} 