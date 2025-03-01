import { View, Text, Pressable, StyleSheet } from 'react-native';
import { format, addDays, startOfWeek, isSameDay, getWeek, addWeeks, subWeeks } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { usePathname } from 'expo-router';

interface WeeklyOverviewProps {
  selectedDate: Date;
  onDateSelect: (date: Date, adherenceScore?: number | null) => void;
}

interface DayData {
  date: Date;
  day: string;
  dayNum: string;
  isSelected: boolean;
  isDisabled: boolean;
  isToday: boolean;
  adherenceScore: number | null;
}

export default function WeeklyOverview({ selectedDate, onDateSelect }: WeeklyOverviewProps) {
  const today = new Date();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(today, { weekStartsOn: 1 }));
  const [weekDates, setWeekDates] = useState<DayData[]>([]);
  const { user } = useAuth();
  const pathname = usePathname();
  
  // Check if we're on the home tab
  const isHomeTab = pathname === '/' || pathname === '/home';

  // Generate week dates starting from Monday of the current week and fetch adherence scores
  useEffect(() => {
    const generateDates = async () => {
      const dates = [...Array(7)].map((_, index) => {
        const date = addDays(currentWeekStart, index);
        const isToday = isSameDay(date, today);
        const isFuture = date > today;
        
        return {
          date,
          day: format(date, 'EEEEE'),
          dayNum: format(date, 'd'),
          isSelected: isSameDay(date, selectedDate),
          isDisabled: isFuture,
          isToday,
          adherenceScore: null, // Will be populated with actual data if on home tab
        };
      });

      // Only fetch nutrition data if on home tab and user is logged in
      if (isHomeTab && user) {
        const updatedDates = [...dates];
        
        // Fetch nutrition adherence data for each day
        for (let i = 0; i < dates.length; i++) {
          if (dates[i].isDisabled) continue; // Skip future dates
          
          const dateStr = format(dates[i].date, 'yyyy-MM-dd');
          const dailyMacrosRef = doc(db, 'users', user.uid, 'dailyMacros', dateStr);
          
          try {
            const docSnap = await getDoc(dailyMacrosRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data();
              
              // If the document has data, calculate the adherence score
              if (data.calories !== undefined || data.protein !== undefined || data.carbs !== undefined || data.fats !== undefined) {
                // Get the user document to get the goals
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                let calorieGoal = 2000;
                let proteinGoal = 150;
                let carbsGoal = 200;
                let fatsGoal = 55;
                
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  // If user has custom goals, use those
                  if (userData.nutritionGoals) {
                    calorieGoal = userData.nutritionGoals.calories || calorieGoal;
                    proteinGoal = userData.nutritionGoals.protein || proteinGoal;
                    carbsGoal = userData.nutritionGoals.carbs || carbsGoal;
                    fatsGoal = userData.nutritionGoals.fats || fatsGoal;
                  }
                }
                
                // Calculate individual scores with a cap at 100%
                const caloriesScore = Math.min(((data.calories || 0) / calorieGoal) * 100, 100);
                const proteinScore = Math.min(((data.protein || 0) / proteinGoal) * 100, 100);
                const carbsScore = Math.min(((data.carbs || 0) / carbsGoal) * 100, 100);
                const fatsScore = Math.min(((data.fats || 0) / fatsGoal) * 100, 100);
                
                // Calculate weighted score (same formula as in nutrition.tsx)
                const adherenceScore = Math.round(
                  caloriesScore * 0.4 + // 40% weight on calories
                  proteinScore * 0.3 + // 30% weight on protein
                  carbsScore * 0.15 + // 15% weight on carbs
                  fatsScore * 0.15    // 15% weight on fats
                );
                
                updatedDates[i].adherenceScore = adherenceScore;
              }
            }
          } catch (error) {
            console.error(`Error fetching nutrition data for date ${dateStr}:`, error);
          }
        }
        
        setWeekDates(updatedDates);
      } else {
        // Just set the dates without adherence scores for nutrition tab
        setWeekDates(dates);
      }
    };
    
    generateDates();
  }, [currentWeekStart, selectedDate, user, isHomeTab]);

  const handleDateSelect = (date: Date) => {
    // Find the adherence score for this date
    const selectedDayData = weekDates.find(day => isSameDay(day.date, date));
    
    // Pass both the date and adherence score to the parent component
    onDateSelect(date, selectedDayData?.adherenceScore || null);
  };

  const handlePreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    if (isSameDay(currentWeekStart, startOfWeek(today, { weekStartsOn: 1 }))) return;
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };

  const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1 });
  const isCurrentWeek = isSameDay(currentWeekStart, startOfWeek(today, { weekStartsOn: 1 }));
  
  // Standard height for all buttons now that we don't show adherence scores
  const dayButtonHeight = 64;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          onPress={handlePreviousWeek}
          style={({ pressed }) => [
            styles.arrowButton,
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </Pressable>

        <View style={styles.headerTextContainer}>
          <Text style={styles.monthText}>
            {format(selectedDate, 'MMMM do, yyyy')}
          </Text>
          <Text style={styles.weekText}>
            Week {weekNumber.toString().padStart(2, '0')}
          </Text>
        </View>

        <Pressable 
          onPress={handleNextWeek}
          style={({ pressed }) => [
            styles.arrowButton,
            { opacity: (pressed || isCurrentWeek) ? 0.7 : 1 }
          ]}
          disabled={isCurrentWeek}
        >
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={isCurrentWeek ? "#CCCCCC" : "#000000"} 
          />
        </Pressable>
      </View>

      <View style={styles.weekContainer}>
        {weekDates.map((item) => (
          <Pressable
            key={item.date.toISOString()}
            onPress={() => !item.isDisabled && handleDateSelect(item.date)}
            style={[
              styles.dayButton,
              { height: dayButtonHeight },
              item.isToday && styles.todayButton,
              item.isSelected && styles.selectedDay,
              item.isDisabled && styles.disabledDay,
            ]}
            disabled={item.isDisabled}
          >
            <Text style={[
              styles.dayText,
              item.isToday && styles.todayText,
              item.isSelected && styles.selectedText,
            ]}>
              {item.day}
            </Text>
            <Text style={[
              styles.dateText,
              item.isToday && styles.todayText,
              item.isSelected && styles.selectedText,
            ]}>
              {item.dayNum}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 4,
  },
  weekText: {
    fontSize: 14,
    color: '#666666',
  },
  arrowButton: {
    padding: 8,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  dayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    padding: 4,
  },
  todayButton: {
    backgroundColor: '#F0F9FF', // Light blue background for today
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  selectedDay: {
    backgroundColor: '#99E86C',
  },
  disabledDay: {
    opacity: 0.5,
  },
  dayText: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  todayText: {
    color: '#007AFF',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  // Kept these styles in case they're needed in the future
  adherenceIndicator: {
    marginTop: 6,
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  selectedAdherenceIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  adherenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0288D1',
  },
  selectedAdherenceText: {
    color: '#FFFFFF',
  },
}); 