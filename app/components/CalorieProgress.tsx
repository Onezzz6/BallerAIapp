import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNutrition } from '../context/NutritionContext';
import { useEffect } from 'react';

export default function CalorieProgress() {
  // Get data directly from the nutrition context
  const { macros, isLoading } = useNutrition();
  const eaten = macros.calories.current;
  const goal = macros.calories.goal;
  const remaining = Math.max(goal - eaten, 0);
  const progress = Math.min(Math.max(eaten / goal, 0), 1);

  // Add debug logging to help diagnose issues
  useEffect(() => {
    console.log(`DEBUG - CalorieProgress: isLoading=${isLoading}, goal=${goal}, eaten=${eaten}`);
  }, [isLoading, goal, eaten]);

  const showInfoAlert = () => {
    Alert.alert(
      "Calorie Tracking",
      "This card shows your current day's calorie consumption progress. Track your meals in the nutrition tab to update your progress.",
      [{ text: "OK" }]
    );
  };

  // Show loading indicator while data is being fetched
  if (isLoading) {
    console.log('DEBUG - CalorieProgress: Showing loading state');
    return (
      <View style={{
        flex: 1,
        padding: 16,
        gap: 24,
        borderRadius: 16,
        backgroundColor: '#E2E8FE', // Use the same color as the calorie card for consistency
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        minHeight: 280,
        width: '100%',
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="flame-outline" size={24} color="#000000" />
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#000000',
            }} allowFontScaling={false}>
              Calories
            </Text>
          </View>
          <Pressable onPress={showInfoAlert}>
            <Ionicons name="information-circle-outline" size={24} color="#000000" />
          </Pressable>
        </View>
        
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
        }}>
          <ActivityIndicator size="large" color="#4064F6" />
          <Text style={{
            marginTop: 16,
            fontSize: 14,
            color: '#666666',
            textAlign: 'center',
          }}>Calculating your nutrition goals...</Text>
        </View>
      </View>
    );
  }

  // Only show empty state if goal is explicitly 0 and we're not loading
  // This prevents showing "Tap to learn how to start tracking" when goals are being calculated
  if (goal === 0 && !isLoading) {
    console.log('DEBUG - CalorieProgress: Showing empty state (goal is 0 and not loading)');
    return (
      <View style={{
        flex: 1,
        padding: 16,
        gap: 24,
        borderRadius: 16,
        backgroundColor: '#99E86C',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        minHeight: 280,
        width: '100%',
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="flame-outline" size={24} color="#000000" />
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#000000',
            }}>
              Calories
            </Text>
          </View>
          <Pressable onPress={showInfoAlert}>
            <Ionicons name="information-circle-outline" size={24} color="#000000" />
          </Pressable>
        </View>
        
        <View style={{ 
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
        }}>
          <Ionicons name="information-circle-outline" size={32} color="#666666" />
          <Text style={{
            marginTop: 8,
            fontSize: 14,
            color: '#666666',
            textAlign: 'center',
          }}>Tap to learn how to start tracking</Text>
        </View>
      </View>
    );
  }

  // Normal view with goal and progress
  console.log(`DEBUG - CalorieProgress: Showing normal state with goal=${goal}, eaten=${eaten}`);
  return (
    <View style={{
      flex: 1,
      padding: 16,
      gap: 24,
      borderRadius: 16,
      backgroundColor: '#E2E8FE',
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      minHeight: 280,
      width: '100%',
      alignSelf: 'stretch',
      flexGrow: 1,
      maxWidth: '100%',
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="flame-outline" size={24} color="#000000" />
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#000000',
          }} allowFontScaling={false}>
            Calories
          </Text>
        </View>
        <Pressable onPress={showInfoAlert}>
          <Ionicons name="information-circle-outline" size={24} color="#000000" />
        </Pressable>
      </View>

      <View style={{ 
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: 180,
      }}>
        <Svg width="180" height="180" style={{
          position: 'absolute',
          transform: [{ rotate: '-90deg' }],
        }}>
          <Circle
            cx="90"
            cy="90"
            r="70"
            stroke="#ffffff"
            strokeWidth="12"
            fill="none"
          />
          <Circle
            cx="90"
            cy="90"
            r="70"
            stroke="#4064F6"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 70}`}
            strokeDashoffset={2 * Math.PI * 70 * (1 - progress)}
          />
        </Svg>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ 
            fontSize: 34, 
            fontWeight: '700', 
            color: '#000000',
          }}>
            {eaten}
          </Text>
          <Text style={{
            fontSize: 12,
            color: '#666666',
          }}>
            consumed
          </Text>
        </View>
      </View>

      <View style={{
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <View style={{ alignItems: 'center', paddingHorizontal: 6 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#000000',
          }} allowFontScaling={false}>
            {remaining}
          </Text>
          <Text style={{
            fontSize: 12,
            color: '#666666',
            textAlign: 'center',
          }}>
            remaining
          </Text>
        </View>

        <View style={{ alignItems: 'center', paddingHorizontal: 6 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#000000',
          }} allowFontScaling={false}>
            {goal}
          </Text>
          <Text style={{
            fontSize: 12,
            color: '#666666',
            textAlign: 'center',
          }}>
            goal
          </Text>
        </View>
      </View>
    </View>
  );
} 