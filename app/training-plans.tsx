import { View, Text, SafeAreaView, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTraining } from './context/TrainingContext';
import Accordion from './components/Accordion';

// Add type definition for TrainingPlan
type TrainingPlan = {
  id: string;
  name: string;
  createdAt: Date;
  schedule: {
    [key: string]: string;
  };
};

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function TrainingPlansScreen() {
  const router = useRouter();
  const { plans, loading } = useTraining();
  const { fromTraining } = useLocalSearchParams<{ fromTraining: string }>();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const handleBack = () => {
    if (fromTraining === 'true') {
      router.push({
        pathname: '/(tabs)/training',
        params: { fromTraining: 'true' }
      });
    } else {
      router.back();
    }
  };

  // Helper function to safely format day headers
  const formatDayHeader = (day: string): string => {
    if (!day) return '';
    return day.toUpperCase();
  };
  
  // Helper function to safely get plan content
  const getDayContent = (plan: TrainingPlan, day: string): string => {
    if (!plan.schedule || !plan.schedule[day]) {
      return "No content available for this day.";
    }
    return plan.schedule[day];
  };

  // Auto-select the first plan if none is selected and plans are available
  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  // Find the selected plan
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </Pressable>
          <Text style={styles.title}>This weeks training plan.</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000022" />
        </View>
      </SafeAreaView>
    );
  }

  if (!plans.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </Pressable>
          <Text style={styles.title}>Your Training Plans</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No training plans generated yet</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </Pressable>
        <Text style={styles.title}>Your Training Plans</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Plan selection buttons */}
        <View style={styles.plansButtonContainer}>
          {plans.map((plan) => (
            <Pressable
              key={plan.id}
              style={[
                styles.planButton,
                selectedPlanId === plan.id && styles.selectedPlanButton
              ]}
              onPress={() => setSelectedPlanId(plan.id)}
            >
              <Text 
                style={[
                  styles.planButtonText, 
                  selectedPlanId === plan.id && styles.selectedPlanButtonText
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {plan.name}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Selected plan details section - always visible if a plan is selected */}
        {selectedPlan && (
          <View style={styles.planDetailsContainer}>
            {/* Days of the week */}
            {DAYS_ORDER.map((day) => (
              <Accordion 
                key={day}
                title={formatDayHeader(day)}
                expanded={false}
              >
                <View style={styles.planContent}>
                  <ScrollView style={{ maxHeight: 400 }}>
                    <Text style={styles.planText}>{getDayContent(selectedPlan, day)}</Text>
                  </ScrollView>
                </View>
              </Accordion>
            ))}
          </View>
        )}
        
        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#4064F6" />
            <Text style={styles.infoTitle}>About Training Plans</Text>
          </View>
          <Text style={styles.infoText}>
            Select a plan above to see its daily details.
          </Text>
          <Text style={styles.infoText}>
            You can generate one plan per week. Old ones get deleted after two weeks.
          </Text>
        </View>
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
  plansButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  planButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000022',

    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    minWidth: 140,
    flexGrow: 1,

    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginVertical: 10,

  },
  selectedPlanButton: {
    backgroundColor: '#4064F6',
    borderColor: '#4064F6',
    borderRadius: 100,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  selectedPlanButtonText: {
    color: '#FFFFFF',
  },
  planDetailsContainer: {
    backgroundColor: '#DCF4F5',
    padding: 16,
    marginBottom: 16,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  planDate: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  infoContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4064F6',
  },
  infoText: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
    lineHeight: 20,
  },
}); 