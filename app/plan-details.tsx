import { View, Text, SafeAreaView, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTraining } from './context/TrainingContext';

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function PlanDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { plans } = useTraining();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const plan = plans.find(p => p.id === id);

  if (!plan) {
    return null;
  }

  const formatScheduleText = (text: string) => {
    return text
      .replace(/^[a-zA-Z]+:\s*/i, '') // Remove day prefix if exists
      .replace(/[#*]/g, '') // Remove special characters
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </Pressable>
        <Text style={styles.title}>{plan.name}</Text>
      </View>

      <ScrollView style={styles.content}>
        {DAYS_ORDER.map((day) => (
          <Pressable
            key={day}
            style={styles.dayCard}
            onPress={() => setExpandedDay(expandedDay === day ? null : day)}
          >
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </Text>
              <Ionicons 
                name={expandedDay === day ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#000000" 
              />
            </View>
            
            {expandedDay === day && (
              <View style={styles.dayContent}>
                <Text style={styles.scheduleText}>
                  {formatScheduleText(plan.schedule[day])}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dayCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  dayContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  scheduleText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
  },
}); 