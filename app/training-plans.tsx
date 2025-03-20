import { View, Text, SafeAreaView, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTraining } from './context/TrainingContext';

export default function TrainingPlansScreen() {
  const router = useRouter();
  const { plans, loading } = useTraining();
  const { fromTraining } = useLocalSearchParams<{ fromTraining: string }>();

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
              </View>
            </View>
          </Pressable>
        ))}
        
        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#4064F6" />
            <Text style={styles.infoTitle}>About Training Plans</Text>
          </View>
          <Text style={styles.infoText}>
            The personalized plan is above, click it to open it.
          </Text>
          <Text style={styles.infoText}>
            You can generate one plan per week and old ones get deleted after 2 weeks.
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
    alignItems: 'center',
    justifyContent: 'center',
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
  infoContainer: {
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
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