import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  Easing
} from 'react-native-reanimated';

interface FoodAnalysisScreenProps {
  visible: boolean;
  imageUri: string;
  onAnalysisComplete?: () => void;
}

const analysisMessages = [
  "Analyzing your meal...",
  "Identifying ingredients...",
  "Comparing with our database...",
  "Calculating nutrition values...",
  "Gathering all ingredients...",
  "Finalizing your meal profile...",
  "Almost there..."
];

export default function FoodAnalysisScreen({ visible, imageUri, onAnalysisComplete }: FoodAnalysisScreenProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  // Animation values
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (visible) {
      // Start rotation animation
      rotation.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );

      // Start pulsing animation
      scale.value = withRepeat(
        withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      opacity.value = withRepeat(
        withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      // Cycle through messages
      const messageInterval = setInterval(() => {
        setCurrentMessageIndex((prev) => {
          if (prev === analysisMessages.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, 2000);

      return () => {
        clearInterval(messageInterval);
      };
    }
  }, [visible]);

  const animatedRingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const animatedInnerRingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${-rotation.value * 0.7}deg` }],
      opacity: opacity.value * 0.6,
    };
  });

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <LinearGradient
        colors={['#FFFFFF', '#F0F8FF']}
        style={styles.gradient}
      >
        {/* Header */}
        <Animated.View 
          style={styles.header}
          entering={FadeInDown.duration(400)}
        >
          <Text style={styles.title}>Analyzing Your Meal</Text>
          <Text style={styles.subtitle}>Please wait while we process your photo</Text>
        </Animated.View>

        {/* Photo Preview with Animation */}
        <Animated.View 
          style={styles.photoContainer}
          entering={FadeIn.duration(600).delay(200)}
        >
          {/* Outer animated ring */}
          <Animated.View style={[styles.outerRing, animatedRingStyle]} />
          
          {/* Inner animated ring */}
          <Animated.View style={[styles.innerRing, animatedInnerRingStyle]} />
          
          {/* Photo */}
          <View style={styles.photoWrapper}>
            <Image source={{ uri: imageUri }} style={styles.photo} />
            <View style={styles.photoOverlay} />
          </View>
        </Animated.View>

        {/* Analysis Status */}
        <Animated.View 
          style={styles.statusContainer}
          entering={FadeInDown.duration(400).delay(400)}
        >
          <View style={styles.mascotContainer}>
            <Image 
              source={require('../../assets/images/mascot.png')}
              style={styles.mascot}
              resizeMode="contain"
            />
          </View>
          
          <Animated.Text 
            key={currentMessageIndex}
            style={styles.analysisMessage}
            entering={FadeIn.duration(300)}
          >
            {analysisMessages[currentMessageIndex]}
          </Animated.Text>

          {/* Progress dots */}
          <View style={styles.progressDots}>
            {analysisMessages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentMessageIndex && styles.activeDot
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* Bottom tip */}
        <Animated.View 
          style={styles.tipContainer}
          entering={FadeInDown.duration(400).delay(600)}
        >
          <Text style={styles.tipText}>
            💡 For best results, ensure your food is well-lit and clearly visible
          </Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
    position: 'relative',
  },
  outerRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: '#4064F6',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  innerRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: '#FFD93D',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  photoWrapper: {
    width: 200,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(64, 100, 246, 0.1)',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mascotContainer: {
    marginBottom: 20,
  },
  mascot: {
    width: 60,
    height: 60,
  },
  analysisMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
    minHeight: 22,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5E5',
  },
  activeDot: {
    backgroundColor: '#4064F6',
    transform: [{ scale: 1.3 }],
  },
  tipContainer: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  tipText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 