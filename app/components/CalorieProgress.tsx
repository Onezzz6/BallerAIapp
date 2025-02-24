import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

export default function CalorieProgress({ eaten, burned, goal }: { eaten: number; burned: number; goal: number }) {
  const remaining = goal - eaten;
  const progress = Math.min(Math.max(eaten / goal, 0), 1);

  const showInfoAlert = () => {
    Alert.alert(
      "No Data Yet",
      "Start logging your meals to see your daily calorie progress. You can log meals from the nutrition tab.",
      [{ text: "OK" }]
    );
  };

  if (goal === 0) {
    return (
      <View style={styles.calorieCard}>
        <View style={styles.emptyStateContainer}>
          <Pressable
            onPress={showInfoAlert}
            style={({ pressed }) => [
              styles.infoButton,
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <Ionicons name="information-circle-outline" size={32} color="#666666" />
            <Text style={styles.infoText}>Tap to learn how to start tracking</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.calorieCard}>
      <View style={styles.calorieHeader}>
        <Text style={styles.calorieTitle}>Daily Calories</Text>
        <Text style={styles.calorieGoal}>Target: {goal} kcal</Text>
      </View>

      <View style={styles.calorieCircleContainer}>
        <View style={styles.circleProgress}>
          {/* Circular Progress */}
          <View style={styles.progressCircle}>
            <View style={styles.progressBackground}>
              <View style={styles.progressValue}>
                <Text style={styles.progressNumber}>{eaten}</Text>
                <Text style={styles.progressLabel}>consumed</Text>
              </View>
            </View>
            <Svg width={200} height={200} style={StyleSheet.absoluteFill}>
              {/* Background Circle */}
              <Circle
                cx={100}
                cy={100}
                r={80}
                stroke="#E5E5E5"
                strokeWidth={12}
                fill="transparent"
              />
              {/* Progress Circle */}
              <Circle
                cx={100}
                cy={100}
                r={80}
                stroke="#4A72B2"
                strokeWidth={12}
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 80}`}
                strokeDashoffset={2 * Math.PI * 80 * (1 - progress)}
                transform={`rotate(-90 100 100)`}
              />
            </Svg>
          </View>
        </View>

        {/* Stats below circle */}
        <View style={styles.calorieStats}>
          <View style={styles.calorieStat}>
            <Text style={styles.calorieValue}>{remaining}</Text>
            <Text style={styles.calorieLabel}>Remaining</Text>
          </View>

          <View style={styles.calorieDivider} />

          <View style={styles.calorieStat}>
            <Text style={styles.calorieValue}>{goal}</Text>
            <Text style={styles.calorieLabel}>Goal</Text>
          </View>
        </View>
      </View>

      <View style={styles.dateSelector}>
        <Pressable>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </Pressable>
        <View style={styles.dateDisplay}>
          <Ionicons name="calendar-outline" size={20} color="#666666" />
          <Text style={styles.dateText}>Tuesday, Feb 4</Text>
        </View>
        <Pressable>
          <Ionicons name="chevron-forward" size={24} color="#000000" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calorieCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calorieTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  calorieGoal: {
    fontSize: 16,
    color: '#666666',
  },
  calorieCircleContainer: {
    alignItems: 'center',
    gap: 24,
  },
  circleProgress: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircle: {
    width: '100%',
    height: '100%',
  },
  progressBackground: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressValue: {
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000000',
  },
  progressLabel: {
    fontSize: 14,
    color: '#666666',
  },
  calorieStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  calorieStat: {
    alignItems: 'center',
  },
  calorieValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  calorieLabel: {
    fontSize: 14,
    color: '#666666',
  },
  calorieDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5E5',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#666666',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200, // Ensure minimum height for empty state
  },
  infoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  infoText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  }
}); 