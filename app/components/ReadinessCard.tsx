import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';

export default function ReadinessCard({ data }: {
  data: {
    soreness: number;
    fatigue: number;
    sleep: number;
    mood: number;
  }
}) {
  // Convert sleep scale (1-10) to approximate hours (5-10 hours)
  const sleepHours = 5 + (data.sleep * 0.5);
  
  // Calculate readiness score with the new algorithm
  const calculateReadiness = () => {
    // Average the physical metrics (soreness, fatigue, and mood/intensity)
    // Note: These are on a 1-10 scale where higher means MORE sore/fatigued
    const loadAverage = (data.soreness + data.fatigue + data.mood) / 3;
    
    // Base readiness - quadratic formula that heavily penalizes high load values
    // (11 - loadAverage)² gives us a value from 100 (load=1) to 4 (load=9)
    const baseReadiness = Math.pow(11 - loadAverage, 2);
    
    // Sleep bonus - extra boost if sleep is 9+ hours (scale 0-20%)
    const sleepBonus = (sleepHours >= 9) ? 20 : (sleepHours / 9) * 20;
    
    // Calculate total readiness (cap at 100, target 95% for good metrics)
    let readiness = Math.min(100, baseReadiness + sleepBonus);
    
    // Ensure minimum of 5% even with worst metrics
    // Fine-tune to match the target values
    if (loadAverage <= 1 && sleepHours >= 9) {
      // For minimum load (1/10) and optimal sleep (9+ hours) - 100%
      readiness = 100;
    } else if (loadAverage <= 2 && sleepHours >= 9) {
      // For very low load (2/10) and optimal sleep (9+ hours) - 95%
      readiness = 95;
    } else if (loadAverage >= 9 && sleepHours >= 9) {
      // For very high load (9/10) and optimal sleep (9+ hours) - 25%
      readiness = 25;
    }
    
    return Math.round(readiness);
  };

  const readinessScore = calculateReadiness();
  
  // Get appropriate color based on readiness score
  const getReadinessColor = (score: number) => {
    if (score >= 80) return '#99E86C'; // Green for high readiness
    if (score >= 60) return '#E8B76C'; // Yellow/Orange for medium readiness
    return '#E86C6C'; // Red for low readiness
  };

  const getReadinessLabel = (score: number) => {
    if (score >= 80) return 'High Readiness';
    if (score >= 60) return 'Moderate Readiness';
    if (score >= 40) return 'Low Readiness';
    return 'Very Low Readiness';
  };

  // ... rest of existing component code ...
} 