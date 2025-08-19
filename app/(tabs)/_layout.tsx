import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, createContext, useContext } from 'react';
import { format } from 'date-fns';
import { Pressable, Platform, Dimensions } from 'react-native';

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

// Define a custom height for the bottom tab bar to match Instagram
const TAB_BAR_HEIGHT = 84; // Instagram-style height

// We need to account for the home indicator on newer iPhones
const BOTTOM_SPACE = Platform.OS === 'ios' && 
                     (Dimensions.get('window').height > 800) ? 0 : 0;

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
          tabBarActiveTintColor: '#4064F6',
          tabBarInactiveTintColor: '#262626',
          // Instagram-style tab bar
          tabBarStyle: {
            height: TAB_BAR_HEIGHT,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0.5,
            borderTopColor: '#DBDBDB',
            paddingVertical: 0,
            paddingHorizontal: 0,
            position: 'absolute',
            bottom: BOTTOM_SPACE, // Position higher to leave space for home indicator
            left: 0,
            right: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          // Make labels tiny or invisible like Instagram
          tabBarLabelStyle: {
            display: 'none', // Instagram style has no visible labels
          },
          tabBarIconStyle: {
            marginTop: 0,
          },
          // Remove header to use our custom header in each screen
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="home"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              handleTabPress('home');
            },
          }}
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={30} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="recovery"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              handleTabPress('recovery');
            },
          }}
          options={{
            title: 'Recovery',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'fitness' : 'fitness-outline'} size={30} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="nutrition"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              handleTabPress('nutrition');
            },
          }}
          options={{
            title: 'Nutrition',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'nutrition' : 'nutrition-outline'} size={30} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              handleTabPress('profile');
            },
          }}
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={30} color={color} />
            ),
          }}
        />
      </Tabs>
    </NutritionDateContext.Provider>
  );
}
