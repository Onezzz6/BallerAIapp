import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import subscriptionService, { SubscriptionData } from '../services/subscription';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SubscriptionSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    const loadSubscriptionData = async () => {
      if (user) {
        try {
          const data = await subscriptionService.getSubscriptionData(user.uid);
          setSubscriptionData(data);
          setDaysRemaining(subscriptionService.getDaysRemaining(data));
        } catch (error) {
          console.error('Error loading subscription data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadSubscriptionData();
  }, [user]);

  const handleRenewSubscription = () => {
    router.push('/(onboarding)/paywall');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerContainer}>
        <View style={styles.header}>
          <Pressable 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </Pressable>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading subscription details...</Text>
          </View>
        ) : subscriptionData && subscriptionData.isActive ? (
          <View style={styles.subscriptionContainer}>
            <View style={styles.subscriptionHeader}>
              <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
              <Text style={styles.subscriptionStatus}>Active Subscription</Text>
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Plan</Text>
                <Text style={styles.detailValue}>
                  {subscriptionData.productId === '1month' ? 'Monthly' : 'Annual'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Start Date</Text>
                <Text style={styles.detailValue}>
                  {formatDate(new Date(subscriptionData.purchaseTime))}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expiration Date</Text>
                <Text style={styles.detailValue}>
                  {formatDate(new Date(subscriptionData.expiresDate))}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Days Remaining</Text>
                <Text style={styles.detailValue}>
                  {daysRemaining} days
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Auto-Renewal</Text>
                <Text style={styles.detailValue}>
                  {subscriptionData.autoRenewing ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>

            {daysRemaining !== null && daysRemaining <= 3 && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning" size={24} color="#FFA000" />
                <Text style={styles.warningText}>
                  Your subscription will expire in {daysRemaining} days. Renew now to maintain access to all features.
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.renewButton,
                pressed && styles.pressedButton,
              ]}
              onPress={handleRenewSubscription}
            >
              <Text style={styles.renewButtonText}>Renew Subscription</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.noSubscriptionContainer}>
            <Ionicons name="card-outline" size={48} color="#666666" />
            <Text style={styles.noSubscriptionText}>
              You don't have an active subscription
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.subscribeButton,
                pressed && styles.pressedButton,
              ]}
              onPress={handleRenewSubscription}
            >
              <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscriptionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 24,
  },
  subscriptionHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  subscriptionStatus: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 12,
  },
  detailsContainer: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666666',
  },
  detailValue: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#FFA000',
  },
  renewButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  pressedButton: {
    opacity: 0.8,
  },
  renewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noSubscriptionContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noSubscriptionText: {
    fontSize: 18,
    color: '#666666',
    marginTop: 12,
    marginBottom: 24,
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 