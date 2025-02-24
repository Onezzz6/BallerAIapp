import { View, Text, Pressable, StyleSheet } from 'react-native';
import { format, addDays, startOfWeek, isSameDay, getWeek, addWeeks, subWeeks } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

interface WeeklyOverviewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export default function WeeklyOverview({ selectedDate, onDateSelect }: WeeklyOverviewProps) {
  const today = new Date();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(today, { weekStartsOn: 1 }));

  // Generate week dates starting from Monday of the current week
  const weekDates = [...Array(7)].map((_, index) => {
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
    };
  });

  const handlePreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    if (isSameDay(currentWeekStart, startOfWeek(today, { weekStartsOn: 1 }))) return;
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };

  const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1 });
  const isCurrentWeek = isSameDay(currentWeekStart, startOfWeek(today, { weekStartsOn: 1 }));

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
            onPress={() => !item.isDisabled && onDateSelect(item.date)}
            style={[
              styles.dayButton,
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
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
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
}); 