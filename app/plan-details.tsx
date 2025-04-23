import { View, Text, SafeAreaView, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTraining } from './context/TrainingContext';
import Accordion from './components/Accordion';

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function PlanDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { plans } = useTraining();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const plan = plans.find(p => p.id === id);

  if (!plan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </Pressable>
          <Text style={styles.title}>Plan Details</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Plan not found</Text>
        </View>
      </SafeAreaView>
    );
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

  // Helper function to safely format day headers
  const formatDayHeader = (day) => {
    if (!day) return '';
    return day.charAt(0).toUpperCase() + day.slice(1);
  };
  
  // Helper function to safely get plan content
  const getDayContent = (day) => {
    if (!plan.schedule || !plan.schedule[day]) {
      return "No content available for this day.";
    }
    return plan.schedule[day];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </Pressable>
        <Text style={styles.title}>{plan.name}</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.planMeta}>
          <Text style={styles.planDate}>
            Created on {plan.createdAt.toLocaleDateString()}
          </Text>
        </View>
        
        {/* Days of the week */}
        {DAYS_ORDER.map((day) => (
          <Accordion 
            key={day}
            title={formatDayHeader(day)}
            expanded={false}
          >
            <View style={styles.planContent}>
              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={styles.planText}>{getDayContent(day)}</Text>
              </ScrollView>
            </View>
          </Accordion>
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
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  planMeta: {
    marginBottom: 24,
  },
  planDate: {
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
  },
  planContent: {
    padding: 16,
    backgroundColor: '#F8F8F8',
  },
  planText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
  },
}); 