import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBadgeColor } from '../../utils/xpCalculations';

interface LevelUpModalProps {
  visible: boolean;
  onClose: () => void;
  previousLevel: number;
  newLevel: number;
  totalXp: number;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  visible,
  onClose,
  previousLevel,
  newLevel,
  totalXp,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Start celebration animation
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        // Sparkle animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkleAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(sparkleAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      sparkleAnim.setValue(0);
    }
  }, [visible]);

  const badgeColor = getBadgeColor(newLevel);
  
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Sparkle Effects */}
          <Animated.View style={[styles.sparkle, styles.sparkle1, { opacity: sparkleOpacity }]}>
            <Ionicons name="sparkles" size={20} color="#FFD700" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, styles.sparkle2, { opacity: sparkleOpacity }]}>
            <Ionicons name="sparkles" size={16} color="#FFA500" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, styles.sparkle3, { opacity: sparkleOpacity }]}>
            <Ionicons name="sparkles" size={18} color="#FFD700" />
          </Animated.View>

          {/* Main Content */}
          <Text style={styles.congratsText}>🎉 Level Up! 🎉</Text>
          
          <Animated.View 
            style={[
              styles.levelBadge,
              { backgroundColor: badgeColor },
              { transform: [{ rotate: spin }] },
            ]}
          >
            <Text style={styles.levelText}>Lv {newLevel}</Text>
          </Animated.View>

          <Text style={styles.upgradeText}>
            You leveled up from <Text style={styles.boldText}>Level {previousLevel}</Text> to <Text style={styles.boldText}>Level {newLevel}</Text>!
          </Text>

          <View style={styles.xpContainer}>
            <Text style={styles.xpText}>{totalXp.toLocaleString()} Total XP</Text>
          </View>

          <TouchableOpacity 
            style={[styles.continueButton, { backgroundColor: badgeColor }]}
            onPress={onClose}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: 20,
    right: 30,
  },
  sparkle2: {
    top: 50,
    left: 25,
  },
  sparkle3: {
    bottom: 80,
    right: 20,
  },
  congratsText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 24,
    textAlign: 'center',
  },
  levelBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  levelText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  upgradeText: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  boldText: {
    fontWeight: '700',
    color: '#2D3748',
  },
  xpContainer: {
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 24,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 