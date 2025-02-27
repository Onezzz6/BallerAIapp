import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, createContext, useContext } from 'react';
import { format } from 'date-fns';
import { Pressable } from 'react-native';

// Create a context to track and manage the selected date in the nutrition tab
export const NutritionDateContext = createContext({
  selectedDate: new Date(),
  setSelectedDate: (date: Date) => {},
  isLeavingNutrition: false,
  setIsLeavingNutrition: (isLeaving: boolean) => {},
  targetTab: '',
  setTargetTab: (tab: string) => {}
});

export function useNutritionDate() {
  return useContext(NutritionDateContext);
}

export default function TabLayout() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLeavingNutrition, setIsLeavingNutrition] = useState(false);
  const [targetTab, setTargetTab] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  // Handle tab switching from nutrition to another tab
  useEffect(() => {
    if (isLeavingNutrition && targetTab) {
      // Reset flag
      setIsLeavingNutrition(false);
      
      // Navigate to the target tab
      router.navigate(targetTab);
      
      // Clear target
      setTargetTab('');
    }
  }, [isLeavingNutrition, targetTab, router]);

  // Custom tab listener to intercept tab navigation
  const handleTabPress = (tabName: string) => {
    // If we're not on the nutrition tab or coming from nutrition tab and trying to navigate elsewhere,
    // no need for special handling
    const isOnNutritionTab = pathname.includes('/nutrition');
    
    if (!isOnNutritionTab || tabName === 'nutrition') {
      // Regular navigation behavior
      router.navigate(tabName);
      return;
    }
    
    // We are on the nutrition tab and trying to navigate elsewhere

    // Check if we're on a non-today date in the nutrition tab
    const today = new Date();
    const isSelectedDateToday = format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    
    if (isSelectedDateToday) {
      // If already on today's date, navigate directly
      router.navigate(tabName);
    } else {
      // Set today's date in the context
      setSelectedDate(today);
      
      // Set the target tab and flag that we're leaving nutrition
      setTargetTab(tabName);
      setIsLeavingNutrition(true);
      
      // Note: The nutrition screen will detect this context change and reset its selected date
      // After the date is reset, the useEffect above will navigate to the target tab
    }
  };

  return (
    <NutritionDateContext.Provider value={{ 
      selectedDate, 
      setSelectedDate,
      isLeavingNutrition,
      setIsLeavingNutrition,
      targetTab,
      setTargetTab
    }}>
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
            tabBarButton: (props) => (
              <Pressable
                {...props}
                onPress={() => handleTabPress('home')}
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
            tabBarButton: (props) => (
              <Pressable
                {...props}
                onPress={() => handleTabPress('recovery')}
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
            tabBarButton: (props) => (
              <Pressable
                {...props}
                onPress={() => handleTabPress('training')}
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
            tabBarButton: (props) => (
              <Pressable
                {...props}
                onPress={() => handleTabPress('profile')}
              />
            ),
          }}
        />
      </Tabs>
    </NutritionDateContext.Provider>
  );
}
