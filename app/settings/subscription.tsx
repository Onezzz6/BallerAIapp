import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import subscriptionService, { SubscriptionData, PRODUCT_IDS } from '../../services/subscription';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import { db } from '../../config/firebase';

export default function SubscriptionSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [autoRenewing, setAutoRenewing] = useState<boolean>(true);

  useEffect(() => {
    const loadSubscriptionData = async () => {
      if (user) {
        try {
          const data = await subscriptionService.getSubscriptionData(user.uid);
          setSubscriptionData(data);
          if (data) {
            setAutoRenewing(data.autoRenewing);
            
            // Calculate days remaining
            const daysLeft = subscriptionService.getDaysRemaining(data);
            setDaysRemaining(daysLeft);
          }
          
          // Check if subscription is active
          setIsActive(data.isActive);
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

  const handleDontRenew = async () => {
    Alert.alert(
      "Don't Renew Subscription",
      "Are you sure you don't want to renew your subscription? You'll lose access to premium features when your current subscription expires.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Don't Renew",
          style: "destructive",
          onPress: async () => {
            try {
              if (user) {
                // Update the autoRenewing status in Firestore
                const userRef = db.collection('users').doc(user.uid);
                await userRef.update({
                  autoRenewing: false
                });
                
                // Update local state
                setAutoRenewing(false);
                if (subscriptionData) {
                  setSubscriptionData({
                    ...subscriptionData,
                    autoRenewing: false
                  });
                }
                
                Alert.alert(
                  "Subscription Update",
                  "Your subscription will not auto-renew. You can still access premium features until your current subscription expires."
                );
              }
            } catch (error) {
              console.error('Error updating auto-renewal status:', error);
              Alert.alert(
                "Error",
                "There was a problem updating your subscription preferences. Please try again later."
              );
            }
          }
        }
      ]
    );
  };

  const handleEnableRenewal = async () => {
    Alert.alert(
      "Enable Auto-Renewal",
      "Would you like to enable auto-renewal for your subscription?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Enable",
          style: "default",
          onPress: async () => {
            try {
              if (user) {
                // Update the autoRenewing status in Firestore
                const userRef = db.collection('users').doc(user.uid);
                await userRef.update({
                  autoRenewing: true
                });
                
                // Update local state
                setAutoRenewing(true);
                if (subscriptionData) {
                  setSubscriptionData({
                    ...subscriptionData,
                    autoRenewing: true
                  });
                }
                
                Alert.alert(
                  "Subscription Update",
                  "Auto-renewal has been enabled. Your subscription will automatically renew when it expires."
                );
              }
            } catch (error) {
              console.error('Error updating auto-renewal status:', error);
              Alert.alert(
                "Error",
                "There was a problem updating your subscription preferences. Please try again later."
              );
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlanName = (productId: string) => {
    if (productId === PRODUCT_IDS['1month']) {
      return 'Monthly Plan';
    } else if (productId === PRODUCT_IDS['12months']) {
      return 'Annual Plan';
    } else {
      return 'Monthly Plan'; // Default to Monthly Plan
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'expired':
        return '#FF3B30';
      case 'cancelled':
        return '#FF9500';
      default:
        return '#666666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expired':
        return 'Expired';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
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
            <ActivityIndicator size="large" color="#4064F6" />
            <Text style={styles.loadingText}>Loading subscription details...</Text>
          </View>
        ) : subscriptionData ? (
          <View style={styles.subscriptionContainer}>
            <View style={styles.subscriptionHeader}>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: getStatusColor(subscriptionData.status) }
              ]}>
                <Text style={styles.statusText}>
                  {getStatusText(subscriptionData.status)}
                </Text>
              </View>
              
              <Text style={styles.planName}>
                {getPlanName(subscriptionData.productId)}
              </Text>
              
              {daysRemaining !== null && daysRemaining > 0 && (
                <Text style={styles.daysRemaining}>
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                </Text>
              )}
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Plan Type</Text>
                <Text style={styles.detailValue}>
                  {subscriptionData.productId === PRODUCT_IDS['1month'] ? 'Monthly' : 
                   subscriptionData.productId === PRODUCT_IDS['12months'] ? 'Annual' : 'Monthly'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Start Date</Text>
                <Text style={styles.detailValue}>
                  {formatDate(subscriptionData.purchaseTime)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expiration Date</Text>
                <Text style={styles.detailValue}>
                  {formatDate(subscriptionData.expiresDate)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Auto-Renewal</Text>
                <Text style={[
                  styles.detailValue,
                  { color: autoRenewing ? '#4CAF50' : '#FF3B30' }
                ]}>
                  {autoRenewing ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              
              {subscriptionData.transactionId && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction ID</Text>
                  <Text style={styles.detailValue}>
                    {subscriptionData.transactionId.substring(0, 8)}...
                  </Text>
                </View>
              )}
            </View>

            {subscriptionData.status === 'active' && (
              <View style={styles.actionContainer}>
                {autoRenewing ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.dontRenewButton,
                      pressed && styles.pressedButton,
                    ]}
                    onPress={handleDontRenew}
                  >
                    <Text style={styles.dontRenewButtonText}>Don't Renew</Text>
                  </Pressable>
                ) : (
                  <View style={styles.autoRenewalContainer}>
                    <View style={styles.autoRenewalDisabledContainer}>
                      <Ionicons name="checkmark-circle" size={20} color="#FF3B30" />
                      <Text style={styles.autoRenewalDisabledText}>
                        Auto-renewal is disabled
                      </Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.enableRenewalButton,
                        pressed && styles.pressedButton,
                      ]}
                      onPress={handleEnableRenewal}
                    >
                      <Text style={styles.enableRenewalButtonText}>Enable Auto-Renewal</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0 && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning" size={24} color="#FFA000" />
                <Text style={styles.warningText}>
                  Your subscription will expire in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}. Visit the paywall to renew your subscription.
                </Text>
                <View style={styles.warningButtonsContainer}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.warningButton,
                      styles.renewButton,
                      pressed && styles.pressedButton,
                    ]}
                    onPress={handleRenewSubscription}
                  >
                    <Text style={styles.warningButtonText}>Renew Now</Text>
                  </Pressable>
                  {autoRenewing && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.warningButton,
                        styles.dontRenewButton,
                        pressed && styles.pressedButton,
                      ]}
                      onPress={handleDontRenew}
                    >
                      <Text style={styles.warningButtonText}>Don't Renew</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {subscriptionData.status !== 'active' && (
              <View style={styles.warningContainer}>
                <Ionicons name="alert-circle" size={24} color="#FF3B30" />
                <Text style={styles.warningText}>
                  Your subscription is {subscriptionData.status}. Subscribe now to access all premium features.
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
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
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
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  planName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  daysRemaining: {
    fontSize: 16,
    color: '#666666',
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
  actionContainer: {
    marginBottom: 24,
  },
  dontRenewButton: {
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  dontRenewButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  autoRenewalContainer: {
    marginBottom: 16,
  },
  autoRenewalDisabledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  autoRenewalDisabledText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  enableRenewalButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  enableRenewalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warningContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    marginTop: 12,
    marginBottom: 16,
    fontSize: 14,
    color: '#FFA000',
    textAlign: 'center',
  },
  warningButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  warningButton: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  renewButton: {
    backgroundColor: '#007AFF',
  },
  warningButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pressedButton: {
    opacity: 0.8,
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