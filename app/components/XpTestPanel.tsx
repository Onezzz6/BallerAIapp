import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useXp } from '../../context/XpContext';
import { XP_CONSTANTS } from '../../types/xp';

export const XpTestPanel: React.FC = () => {
  const { awardXp, isCapReached, getRemainingXpToday } = useXp();
  const [isAwarding, setIsAwarding] = useState(false);

  const handleAwardXp = async (amount: number, reason: 'meal' | 'recovery' | 'training') => {
    if (isAwarding) return;
    
    setIsAwarding(true);
    try {
      const result = await awardXp(amount, reason);
      
      if (result.eligible) {
        if (result.amount > 0) {
          Alert.alert(
            '🎉 XP Awarded!',
            `Awarded ${result.amount} XP for ${reason}${result.cappedAmount && result.cappedAmount < amount ? ` (capped from ${amount})` : ''}`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            '🛑 Daily Cap Reached',
            'You\'ve reached your daily XP limit of 900 XP! Come back tomorrow for more.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          '❌ Not Eligible',
          'This action is not eligible for XP (either not today or before XP feature launch).',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to award XP. Please try again.');
      console.error('XP award error:', error);
    } finally {
      setIsAwarding(false);
    }
  };

  const remainingXp = getRemainingXpToday();
  const capReached = isCapReached();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 XP System Test Panel</Text>
      
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Remaining XP Today: {remainingXp}/{XP_CONSTANTS.DAILY_CAP}
        </Text>
        {capReached && (
          <Text style={styles.capText}>✅ Daily Cap Reached!</Text>
        )}
      </View>

      <View style={styles.buttonGrid}>
        <TouchableOpacity
          style={[styles.testButton, styles.mealButton, isAwarding && styles.disabled]}
          onPress={() => handleAwardXp(XP_CONSTANTS.MEAL_XP, 'meal')}
          disabled={isAwarding}
        >
          <Text style={styles.buttonText}>🍽️ Log Meal</Text>
          <Text style={styles.buttonSubtext}>+{XP_CONSTANTS.MEAL_XP} XP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, styles.recoveryButton, isAwarding && styles.disabled]}
          onPress={() => handleAwardXp(XP_CONSTANTS.RECOVERY_XP, 'recovery')}
          disabled={isAwarding}
        >
          <Text style={styles.buttonText}>🧘 Recovery</Text>
          <Text style={styles.buttonSubtext}>+{XP_CONSTANTS.RECOVERY_XP} XP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, styles.trainingButton, isAwarding && styles.disabled]}
          onPress={() => handleAwardXp(XP_CONSTANTS.TRAINING_XP, 'training')}
          disabled={isAwarding}
        >
          <Text style={styles.buttonText}>💪 Training</Text>
          <Text style={styles.buttonSubtext}>+{XP_CONSTANTS.TRAINING_XP} XP</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>
        💡 Note: XP is only awarded for actions performed "today" in your timezone. 
        Daily cap is {XP_CONSTANTS.DAILY_CAP} XP.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 2,
    borderColor: '#007bff',
    borderStyle: 'dashed',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    color: '#007bff',
  },
  statusBar: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    textAlign: 'center',
  },
  capText: {
    fontSize: 12,
    color: '#28a745',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  testButton: {
    width: '48%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  mealButton: {
    backgroundColor: '#28a745',
  },
  recoveryButton: {
    backgroundColor: '#17a2b8',
  },
  trainingButton: {
    backgroundColor: '#dc3545',
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonSubtext: {
    color: 'white',
    fontSize: 12,
    opacity: 0.9,
  },
  note: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
}); 