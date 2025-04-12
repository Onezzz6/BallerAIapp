import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Modal, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import subscriptionService, { PRODUCT_IDS, SubscriptionData } from '../services/subscription';
import CustomButton from './CustomButton';
import * as InAppPurchases from 'expo-in-app-purchases';
import axios from 'axios';

interface SubscriptionStatusProps {
  showExpirationAlert?: boolean;
  onExpirationAlertDismiss?: () => void;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ 
  showExpirationAlert = false,
  onExpirationAlertDismiss
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const firebaseSubscription = await subscriptionService.getSubscriptionData(user.uid);
          
        if (firebaseSubscription) {
          setSubscriptionData(firebaseSubscription);
          
          if (firebaseSubscription.isActive) {
            // Update local state
            const daysLeft = subscriptionService.getDaysRemaining(firebaseSubscription);
            setDaysRemaining(daysLeft);
            console.log('Found active subscription in Firebase:', firebaseSubscription);
            console.log('Firebase subscription days left:', daysLeft);

            // Show alert if subscription is expiring soon (within 3 days)
            if (showExpirationAlert && daysLeft !== null && daysLeft <= 3) {
              console.log('Firebase subscription valid for 3 days or less: check if IAP subscription is valid and renewing');

              console.log('Checking for IAP subscription in purchase history...');
              const history = await InAppPurchases.getPurchaseHistoryAsync();
              //console.log('Purchase history:', history);
              
              if (history && history.results && history.results.length > 0) {
                // Find active subscriptions
                const activeSubscriptions = history.results.filter(purchase => {
                  const productId = purchase.productId;
                  return (
                    (productId === PRODUCT_IDS['1month'] ||
                    productId === PRODUCT_IDS['12months']) &&
                    purchase.transactionReceipt &&
                    (purchase.purchaseState === InAppPurchases.InAppPurchaseState.PURCHASED ||
                    purchase.purchaseState === InAppPurchases.InAppPurchaseState.RESTORED)
                  );
                });

                // Validate receipts for active subscriptions
                let validationResult: { expirationDate: Date | null, isRenewing: boolean } = { expirationDate: null, isRenewing: false };
                const validatedSubscriptions = [];
                for (const subscription of activeSubscriptions) {
                  validationResult = await validateReceipt(subscription);
                  if (validationResult.expirationDate) {
                    validatedSubscriptions.push(subscription);
                    break;
                  } else {
                    console.log('Subscription validation failed:', subscription.productId);
                  }
                }

                if (validatedSubscriptions.length <= 0) {
                  console.log('IAP subscription check done: No valid IAP subscriptions found, updating Firebase and redirecting to paywall');
                  // Save subscription data to Firebase
                  await subscriptionService.updateSubscriptionStatus(user.uid, 'expired');
                  router.replace('/(onboarding)/paywall');
                }
                else {
                  console.log('IAP subscription check done: Found valid IAP subscriptions, updating Firebase');
                  if (validationResult.expirationDate) {
                    await subscriptionService.saveSubscriptionData(user.uid, validatedSubscriptions[0], validationResult.expirationDate, validationResult.isRenewing);
                  }
                  if (!validationResult.isRenewing) {
                    Alert.alert('Subscription Expiring Soon', `Your subscription will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew now to continue enjoying all features.`);
                  }
                }
              }
            }
          } else {
            console.log('Firebase subscription is not active');
            // Subscription is not active, redirect to paywall
            router.replace('/(onboarding)/paywall');
          }
        }
      } catch (error) {
        console.log('Error checking subscription:', error);
        router.replace('/(onboarding)/paywall');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSubscription();
  }, [user, showExpirationAlert]);

  const validateReceipt = async (purchase: InAppPurchases.InAppPurchase): Promise<{ expirationDate: Date | null, isRenewing: boolean }> => {
    try {
      //console.log('Validating receipt on client side:', purchase);
      
      // For iOS, we can use the InAppPurchases API
      if (Platform.OS === 'ios') {
        // Check if the purchase has a valid receipt
        if (!purchase.transactionReceipt) {
          console.log('Validate receipt: No transaction receipt found');
          return { expirationDate: null, isRenewing: false };
        }

        const prodURL = 'https://buy.itunes.apple.com/verifyReceipt'
        const stagingURL = 'https://sandbox.itunes.apple.com/verifyReceipt'
        const appSecret = '7e261d6bb5084148a94d1a665aa891da'

        const payload = {
          "receipt-data": purchase.transactionReceipt,
          "password": appSecret,
          "exclude-old-transactions": true,
        }

        // First, try to validate against production
        //console.log('Validate receipt: Contacting production server...');
        const prodRes = await axios.post(prodURL, payload)
        //console.log('Validate receipt: Production server response: ', prodRes.data);
        // If status is 21007, fall back to sandbox
        if (prodRes.data && prodRes.data.status === 21007) {
          //console.log('Validate receipt: Falling back to sandbox server...');
          const sandboxRes = await axios.post(stagingURL, payload)
          //console.log('Validate receipt: Sandbox server response: ', sandboxRes.data);

          if (sandboxRes.data && sandboxRes.data.latest_receipt_info && sandboxRes.data.latest_receipt_info.length > 0) {
            const receipt = sandboxRes.data.latest_receipt_info[0]
            //console.log('Validate receipt: Latest receipt: ', receipt);

            // Check expiration
            const purchaseTime = new Date(purchase.purchaseTime);
            const expirationTime = new Date(parseInt(receipt.expires_date_ms));
            const now = new Date();
            console.log('Validate receipt: purchase: ', purchaseTime);
            console.log('Validate receipt: expiration: ', expirationTime);
            console.log('Validate receipt: now: ', now);
            const isValid = expirationTime > now;
            console.log('Validate receipt: Is receipt valid:', isValid);

            if (isValid) {
              if (sandboxRes.data.pending_renewal_info.length > 0) {  
                const renewalInfo = sandboxRes.data.pending_renewal_info[0]
                //console.log('Validate receipt: renewalInfo: ', renewalInfo);
                const isRenewingValue = renewalInfo.auto_renew_status === '1'
                console.log('Validate receipt: isRenewing:', isRenewingValue);
                return { expirationDate: expirationTime, isRenewing: isRenewingValue };
              }
              return { expirationDate: expirationTime, isRenewing: false };
            }
          }
        }
      } 
      return { expirationDate: null, isRenewing: false };
    } catch (error) {
      console.error('Error validating receipt:', error);
      return { expirationDate: null, isRenewing: false };
    }
  };

  const handleRenewSubscription = () => {
    router.push('/(onboarding)/paywall');
  };

  const handleDismissAlert = () => {
    setShowAlert(false);
    if (onExpirationAlertDismiss) {
      onExpirationAlertDismiss();
    }
  };

  if (isLoading) {
    return null;
  }

  if (!subscriptionData) {
    return null;
  }

  return (
    <>
      {/* Subscription expiration alert modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAlert}
        onRequestClose={handleDismissAlert}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Subscription Expiring Soon</Text>
            <Text style={styles.modalText}>
              Your subscription will expire in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}.
              Renew now to continue enjoying all features.
            </Text>
            <View style={styles.modalButtons}>
              <CustomButton
                title="Renew Now"
                onPress={handleRenewSubscription}
                buttonStyle={styles.renewButton}
                textStyle={styles.renewButtonText}
              />
              <CustomButton
                title="Later"
                onPress={handleDismissAlert}
                buttonStyle={styles.laterButton}
                textStyle={styles.laterButtonText}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  renewButton: {
    backgroundColor: '#4064F6',
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    flex: 1,
    marginRight: 5,
  },
  renewButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  laterButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    flex: 1,
    marginLeft: 5,
  },
  laterButtonText: {
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default SubscriptionStatus; 