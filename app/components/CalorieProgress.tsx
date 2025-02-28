import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNutrition } from '../context/NutritionContext';

export default function CalorieProgress() {
  // Get data directly from the nutrition context
  const { macros, isLoading } = useNutrition();
  const eaten = macros.calories.current;
  const goal = macros.calories.goal;
  const progress = Math.min(Math.max(eaten / goal, 0), 1);

  const showInfoAlert = () => {
    Alert.alert(
      "Calorie Tracking",
      "This card shows your daily calorie consumption progress. Track your meals in the nutrition tab to update your progress.",
      [{ text: "OK" }]
    );
  };

  // Show loading indicator while data is being fetched
  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        padding: 16,
        gap: 24,
        borderRadius: 24,
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
      }}>
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <ActivityIndicator size="large" color="#4A72B2" />
          <Text style={{
            marginTop: 16,
            fontSize: 14,
            color: '#666666',
            textAlign: 'center',
          }}>Loading your nutrition data...</Text>
        </View>
      </View>
    );
  }

  // Show empty state if no goal is set
  if (goal === 0) {
    return (
      <View style={{
        flex: 1,
        padding: 16,
        gap: 24,
        borderRadius: 24,
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

  return (
    <View style={{
      flex: 1,
      padding: 16,
      gap: 24,
      borderRadius: 24,
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
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Svg width="200" height="200" style={{
          position: 'absolute',
          transform: [{ rotate: '-90deg' }],
        }}>
          <Circle
            cx="100"
            cy="100"
            r="80"
            stroke="#ffffff"
            strokeWidth="12"
            fill="none"
          />
          <Circle
            cx="100"
            cy="100"
            r="80"
            stroke="#4064F6"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 80}`}
            strokeDashoffset={2 * Math.PI * 80 * (1 - progress)}
          />
        </Svg>

        <Text style={{ 
          fontSize: 40, 
          fontWeight: '700', 
          color: '#000000',
        }}>
          {eaten}
        </Text>
        <Text style={{
          fontSize: 14,
          color: '#666666',
        }}>
          consumed
        </Text>
      </View>

      <Text style={{ 
        fontSize: 14, 
        color: '#666666',
        textAlign: 'center',
      }}>
        {eaten > 0 
          ? eaten >= goal 
            ? 'You\'ve reached your\ndaily calorie goal.'
            : eaten >= goal * 0.7
            ? 'Making good progress\ntoward your daily goal.'
            : 'Keep tracking your meals\nto reach your goal.'
          : 'Start logging meals\nto track your progress'
        }
      </Text>
    </View>
  );
} 