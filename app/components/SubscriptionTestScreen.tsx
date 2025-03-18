import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import subscriptionService, { SubscriptionData } from '../services/subscription';

/**
 * This is a test/debug component to verify subscription functionality.
 * You can include this in your app during development and remove it for production.
 */
const SubscriptionTestScreen = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  
  // Fetch subscriptions on mount
  useEffect(() => {
    fetchSubscriptions();
  }, []);
  
  // Function to fetch available subscriptions
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const subs = await subscriptionService.getSubscriptions();
      setSubscriptions(subs);
      console.log('Fetched subscriptions:', subs);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      Alert.alert('Error', 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle purchasing a subscription
  const handlePurchase = async (planId: string) => {
    try {
      setLoading(true);
      const result = await subscriptionService.purchaseSubscription(planId);
      
      if (result.success) {
        Alert.alert('Success', 'Subscription purchased successfully!');
        checkPurchases();
      } else if (result.cancelled) {
        Alert.alert('Cancelled', 'Purchase was cancelled');
      } else {
        Alert.alert('Error', result.error || 'Failed to purchase subscription');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      Alert.alert('Error', error.message || 'Failed to purchase subscription');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to restore purchases
  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      const result = await subscriptionService.restorePurchases();
      
      if (result.success && result.purchases && result.purchases.length > 0) {
        Alert.alert('Success', `Restored ${result.purchases.length} purchase(s)`);
        setPurchases(result.purchases);
      } else {
        Alert.alert('No Purchases', 'No previous purchases found to restore');
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      Alert.alert('Error', error.message || 'Failed to restore purchases');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to check current purchases
  const checkPurchases = async () => {
    try {
      setLoading(true);
      const result = await subscriptionService.restorePurchases();
      
      if (result.success && result.purchases) {
        setPurchases(result.purchases);
      }
    } catch (error) {
      console.error('Check purchases error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscription Test</Text>
        <Text style={styles.subtitle}>
          This screen helps verify subscription functionality
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Subscriptions</Text>
        <Pressable 
          style={styles.refreshButton}
          onPress={fetchSubscriptions}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Refresh Subscriptions'}
          </Text>
        </Pressable>
        
        {subscriptions.length === 0 ? (
          <Text style={styles.emptyText}>No subscriptions found</Text>
        ) : (
          subscriptions.map((sub, index) => (
            <View key={index} style={styles.subscriptionItem}>
              <View style={styles.subscriptionDetails}>
                <Text style={styles.subTitle}>
                  {sub.duration} {sub.duration === '1' ? 'Month' : 'Months'}
                </Text>
                <Text style={styles.subPrice}>
                  {sub.price} € {sub.period}
                </Text>
                <Text style={styles.subTotal}>Total: {sub.totalPrice}</Text>
              </View>
              
              <Pressable
                style={styles.purchaseButton}
                onPress={() => handlePurchase(sub.id)}
                disabled={loading}
              >
                <Text style={styles.purchaseButtonText}>
                  {loading ? 'Loading...' : 'Purchase'}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Purchases</Text>
        <Pressable
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Restore Purchases'}
          </Text>
        </Pressable>
        
        <Pressable
          style={styles.checkButton}
          onPress={checkPurchases}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Check Purchases'}
          </Text>
        </Pressable>
        
        {purchases.length === 0 ? (
          <Text style={styles.emptyText}>No active purchases found</Text>
        ) : (
          purchases.map((purchase, index) => (
            <View key={index} style={styles.purchaseItem}>
              <Text style={styles.purchaseTitle}>
                Product: {purchase.productId}
              </Text>
              <Text style={styles.purchaseDate}>
                Date: {new Date(purchase.transactionDate).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    padding: 20,
    backgroundColor: '#4064F6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#4064F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  checkButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666666',
    fontStyle: 'italic',
    padding: 20,
  },
  subscriptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 12,
  },
  subscriptionDetails: {
    flex: 1,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subPrice: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  subTotal: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  purchaseButton: {
    backgroundColor: '#FF5722',
    padding: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  purchaseItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 12,
  },
  purchaseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  purchaseDate: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
});

export default SubscriptionTestScreen; 