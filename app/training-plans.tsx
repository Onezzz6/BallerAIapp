import { View, Text, SafeAreaView, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTraining } from './context/TrainingContext';

export default function TrainingPlansScreen() {
  const router = useRouter();
  const { plans, loading, deletePlan } = useTraining();
  const { fromTraining } = useLocalSearchParams<{ fromTraining: string }>();

  const handleDeletePlan = (planId: string) => {
    Alert.alert(
      'Delete Plan',
      'Are you sure you want to delete this training plan?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlan(planId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete plan. Please try again.');
            }
          },
        },
      ]
    );
  };

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
            <Ionicons name="arrow-back" size={24} color="#000" />
          </Pressable>
          <Text style={styles.title}>This weeks training plan</Text>
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
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text style={styles.title}>Your Training Plans</Text>
      </View>

      <ScrollView style={styles.content}>
        {plans.map((plan) => (
          <Pressable
            key={plan.id}
            style={styles.planCard}
            onPress={() => router.push(`../plan-details?id=${plan.id}`)}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>{plan.name}</Text>
              <View style={styles.planActions}>
                <Text style={styles.planDate}>
                  {plan.createdAt.toLocaleDateString()}
                </Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeletePlan(plan.id);
                  }}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </Pressable>
              </View>
            </View>
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
    padding: 24,
  },
  planCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  planDate: {
    fontSize: 16,
    color: '#666666',
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
  planActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 4,
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