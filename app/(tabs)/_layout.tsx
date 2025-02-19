import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: 50,
          paddingBottom: 5,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={28}
              color={focused ? '#99E86C' : '#000000'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="recovery"
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'pulse' : 'pulse-outline'}
              size={28}
              color={focused ? '#99E86C' : '#000000'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="nutrition"
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'restaurant' : 'restaurant-outline'}
              size={28}
              color={focused ? '#99E86C' : '#000000'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="training"
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'barbell' : 'barbell-outline'}
              size={28}
              color={focused ? '#99E86C' : '#000000'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={28}
              color={focused ? '#99E86C' : '#000000'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
