import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Same calculation from ReadinessCard for consistency
const calculateReadiness = (data: {
  soreness: number;
  fatigue: number;
  sleep: number;
  mood: number;
}) => {
  // Convert sleep scale (1-10) to approximate hours (5-10 hours)
  const sleepHours = 5 + (data.sleep * 0.5);
  
  // Average the physical metrics (soreness, fatigue, and mood/intensity)
  const loadAverage = (data.soreness + data.fatigue + data.mood) / 3;
  
  // Base readiness - quadratic formula that heavily penalizes high load values
  const baseReadiness = Math.pow(11 - loadAverage, 2);
  
  // Sleep bonus - extra boost if sleep is 9+ hours (scale 0-20%)
  const sleepBonus = (sleepHours >= 9) ? 20 : (sleepHours / 9) * 20;
  
  // Calculate total readiness (cap at 100, target 95% for good metrics)
  let readiness = Math.min(100, baseReadiness + sleepBonus);
  
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

export default function WeekdayReadinessIndicator({ 
  data,
  small = false,
  showLabel = true
}: { 
  data: {
    soreness: number;
    fatigue: number;
    sleep: number;
    mood: number;
  },
  small?: boolean,
  showLabel?: boolean
}) {
  const readinessScore = calculateReadiness(data);
  
  // Get appropriate color based on readiness score
  const getReadinessColor = (score: number) => {
    if (score >= 80) return ['#99E86C', '#99E86C']; // Green for high readiness
    if (score >= 60) return ['#E8B76C', '#E8B76C']; // Yellow/Orange for medium readiness
    return ['#E86C6C', '#E86C6C']; // Red for low readiness
  };

  // Get appropriate text based on readiness score
  const getReadinessText = (score: number) => {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Moderate';
    if (score >= 40) return 'Low';
    return 'Very Low';
  };

  // ... rest of existing component code ...
} 