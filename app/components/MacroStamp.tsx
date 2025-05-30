import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface MacroStampProps {
  meal: {
    combinedName?: string;
    items?: Array<{ name: string }>;
    totalMacros?: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    };
  };
  style?: any;
}

export default function MacroStamp({ meal, style }: MacroStampProps) {
  return (
    <View style={[styles.macroStamp, style]}>
      <View style={styles.macroStampHeader}>
        <Image 
          source={require('../../assets/images/BallerAILogo.png')}
          style={styles.stampLogo}
        />
        <Text style={styles.stampBrand}>BallerAI</Text>
      </View>
      <Text style={styles.stampMealName} numberOfLines={2}>
        {meal.combinedName || meal.items?.[0]?.name || 'Meal'}
      </Text>
      <View style={styles.stampMacros}>
        <View style={styles.stampMacroItem}>
          <Text style={styles.stampMacroEmoji}>🔥</Text>
          <Text style={styles.stampMacroValue}>{meal.totalMacros?.calories || 0}</Text>
        </View>
        <View style={styles.stampMacroItem}>
          <Text style={styles.stampMacroEmoji}>🥩</Text>
          <Text style={styles.stampMacroValue}>{meal.totalMacros?.protein || 0}g</Text>
        </View>
        <View style={styles.stampMacroItem}>
          <Text style={styles.stampMacroEmoji}>🌾</Text>
          <Text style={styles.stampMacroValue}>{meal.totalMacros?.carbs || 0}g</Text>
        </View>
        <View style={styles.stampMacroItem}>
          <Text style={styles.stampMacroEmoji}>🧈</Text>
          <Text style={styles.stampMacroValue}>{meal.totalMacros?.fats || 0}g</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  macroStamp: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  macroStampHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stampLogo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  stampBrand: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4064F6',
  },
  stampMealName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  stampMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stampMacroItem: {
    alignItems: 'center',
  },
  stampMacroEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  stampMacroValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
}); 