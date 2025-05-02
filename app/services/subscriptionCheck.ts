import * as InAppPurchases from 'expo-in-app-purchases';
import { Alert, Platform } from 'react-native';
import axios from 'axios';
import subscriptionService, { PRODUCT_IDS } from './subscription';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Keep track of ongoing subscription checks
let subscriptionCheckInProgress: Promise<any> | null = null;

/**
 * Validates an in-app purchase receipt with Apple's servers
 */
export const validateReceipt = async (purchase: InAppPurchases.InAppPurchase): Promise<{ expirationDate: Date | null, isRenewing: boolean }> => {
  try {
    if (Platform.OS === 'ios') {
      // Check if the purchase has a valid receipt
      if (!purchase.transactionReceipt) {
        console.log('Validate receipt: No transaction receipt found');
        return { expirationDate: null, isRenewing: false };
      }

      const prodURL = 'https://buy.itunes.apple.com/verifyReceipt';
      const stagingURL = 'https://sandbox.itunes.apple.com/verifyReceipt';
      const appSecret = '7e261d6bb5084148a94d1a665aa891da';

      const payload = {
        "receipt-data": purchase.transactionReceipt,
        "password": appSecret,
        "exclude-old-transactions": true,
      };

      let receipt: any = null;
      let data: any = null;

      // First, try to validate against production
      const prodRes = await axios.post(prodURL, payload);
      // If status is 21007, fall back to sandbox
      if (prodRes.data) {
        if (prodRes.data.status === 21007) {
          const sandboxRes = await axios.post(stagingURL, payload);
          if (sandboxRes.data && sandboxRes.data.latest_receipt_info && sandboxRes.data.latest_receipt_info.length > 0) {
            receipt = sandboxRes.data.latest_receipt_info[0];
            data = sandboxRes.data;
          }
        }
        else if (prodRes.data.latest_receipt_info && prodRes.data.latest_receipt_info.length > 0) {
          receipt = prodRes.data.latest_receipt_info[0];
          data = prodRes.data;
        }
      }

      if (receipt) {
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
            if (data.pending_renewal_info.length > 0) {  
              const renewalInfo = data.pending_renewal_info[0];
              const isRenewingValue = renewalInfo.auto_renew_status === '1';
              console.log('Validate receipt: isRenewing:', isRenewingValue);
              return { expirationDate: expirationTime, isRenewing: isRenewingValue };
            }
            return { expirationDate: expirationTime, isRenewing: false };
          }
      }
    } 
    return { expirationDate: null, isRenewing: false };
  } catch (error) {
    console.error('Error validating receipt:', error);
    return { expirationDate: null, isRenewing: false };
  }
};

/**
 * Handles subscription data by validating and saving to Firebase
 */
export const handleSubscriptionData = async (purchase: any, userId: string | null) => {
  try {
    //console.log('Handling subscription data:', purchase);
    console.log('Handling subscription data:');
    
    // Validate the receipt before processing the purchase
    const validationResult = await validateReceipt(purchase);
    const { expirationDate, isRenewing } = validationResult;
    if (expirationDate === null) {
      console.error('Receipt validation failed');
      return false;
    }
    
    if (userId) {
      // For logged-in users, use the subscription service
      const result = await subscriptionService.saveSubscriptionData(userId, purchase, expirationDate, isRenewing);
      if (result) {
        console.log('Succesfully handled subscription data for user:', userId);
      } else {
        console.error('Failed to handle subscription data for user:', userId);
      }
      return result;
    }
    
    console.log('Receipt validation success, but no user ID:', validationResult);
    return true;
  } catch (error) {
    console.error('Error handling subscription data:', error);
    return false;
  }
};

/**
 * Checks if there is an existing subscription through Firebase or IAP
 */
export const checkExistingSubscriptions = async (
  userId: string | null = null, 
  isIAPInitialized: boolean = false
) => {
  // If there's already a check in progress, wait for it to complete
  if (subscriptionCheckInProgress) {
    try {
      console.log('Subscription check already in progress, waiting for it to complete...');
      return await subscriptionCheckInProgress;
    } catch (error) {
      console.error('Error while waiting for existing subscription check:', error);
      return null;
    }
  }

  // Create a new promise for this check
  try {
    const checkPromise = (async () => {
      if (!userId) return null;
      
      console.log('Checking for existing Firebase subscription...');
      
      // First check Firebase if user is logged in
      try {
        const firebaseSubscription = await subscriptionService.getSubscriptionData(userId);
        console.log('Firebase subscription check done.');
        
        if (firebaseSubscription) {
          console.log('Found subscription check result: ', firebaseSubscription);
          
          if (firebaseSubscription.isActive) {
            console.log('Firebase subscription is active');
            return { source: 'firebase', data: firebaseSubscription };
          /*} else if (firebaseSubscription.status === 'none') {
            console.log('Firebase subscription status is none, i.e. no actual Firebase doc found');
            return null;*/
          } else {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              console.log('Firebase subscription is not active, but user doc exists');
            } else {
              console.log('Firebase subscription is not active, and user doc does not exist');
              return null;
            }
          }
        }
      } catch (fbError) {
        console.log('Error checking Firebase subscription:', fbError);
        // Continue to IAP check even if Firebase check fails
      }
      
      // If no active subscription in Firebase, check IAP
      if (isIAPInitialized) {
        console.log('Checking for IAP subscription in purchase history...');
        try {
          /*const history = await InAppPurchases.getPurchaseHistoryAsync();
          
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
            const validatedSubscriptions = [];
            let validationResult: { expirationDate: Date | null, isRenewing: boolean } = { expirationDate: null, isRenewing: false };
            for (const subscription of activeSubscriptions) {
              validationResult = await validateReceipt(subscription);
              if (validationResult.expirationDate) {
                validatedSubscriptions.push(subscription);
                break;
              } else {
                console.log('Subscription validation failed:', subscription.productId);
              }
            }

            if (validatedSubscriptions.length > 0 && validationResult.expirationDate) {
              console.log('Found validated active subscription in IAP, expiration date:', validationResult.expirationDate);
              
              // If user is logged in, save this to Firebase
              if (userId) {
                await subscriptionService.saveSubscriptionData(userId, validatedSubscriptions[0], validationResult.expirationDate, validationResult.isRenewing);
              }
              
              return { source: 'iap', data: validatedSubscriptions[0] };
            }
          }*/

          const purchaseHistory = await InAppPurchases.getPurchaseHistoryAsync();
          console.log('Got purchase history');
      
          if (purchaseHistory && purchaseHistory.responseCode === InAppPurchases.IAPResponseCode.OK) {
            console.log('Purchase history response code is OK');
            if (purchaseHistory.results && purchaseHistory.results.length > 0) {
              console.log('Purchase history results found');
              // Find the most recent active subscription
              const activeSubscription = purchaseHistory.results
                .filter(purchase => 
                  purchase.productId.includes('BallerAIProSubscription') && 
                  purchase.transactionReceipt
                )
                .sort((a, b) => {
                  const dateA = a.purchaseTime ? new Date(a.purchaseTime).getTime() : 0;
                  const dateB = b.purchaseTime ? new Date(b.purchaseTime).getTime() : 0;
                  return dateB - dateA;
                })[0];
    
              if (activeSubscription) {
                console.log('Found active subscription');
                let validationResult: { expirationDate: Date | null, isRenewing: boolean } = { expirationDate: null, isRenewing: false };
                validationResult = await validateReceipt(activeSubscription);
                if (validationResult.expirationDate) {
                  console.log('Found validated active subscription in IAP, expiration date:', validationResult.expirationDate);
                
                  // If user is logged in, save this to Firebase
                  if (userId) {
                    await subscriptionService.saveSubscriptionData(userId, activeSubscription, validationResult.expirationDate, validationResult.isRenewing);
                  }                        
                  return { source: 'iap', data: activeSubscription };
                } else {
                  console.log('Subscription validation failed:', activeSubscription.productId);
                }
              }
            }
          }
        } catch (iapError) {
          console.error('Error checking IAP subscription status:', iapError);
          return null;
        }
        console.log('IAP subscription check done: No valid IAP subscriptions found');
        return null;
      } else {
        console.log('IAP not initialized, skipping IAP subscription check');
        return null;
      }
    })();
    
    // Store the promise in the ref
    subscriptionCheckInProgress = checkPromise;
    
    // Wait for the check to complete
    const result = await checkPromise;
    
    // Clear the ref when done
    subscriptionCheckInProgress = null;
    
    return result;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    // Clean up the ref on error
    subscriptionCheckInProgress = null;
    return null;
  }
};

export const checkIsPurchasing = async (): Promise<boolean> => {
    try {
      const status = await AsyncStorage.getItem('is_purchasing');
      //console.log('checkIsPurchasing, status:', status);
      return status === 'true';
    } catch (error) {
      console.error('Error checking purchasing status:', error);
      return false;
    }
};
  
export const setIsPurchasing = async (): Promise<void> => {
    try {
        await AsyncStorage.setItem('is_purchasing', 'true');
        console.log('setIsPurchasing: true');
    } catch (error) {
        console.error('Error setting purchasing status:', error);
    }
};
  
export const cancelIsPurchasing = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('is_purchasing');
        console.log('cancelIsPurchasing');
    } catch (error) {
        console.error('Error cancelling purchasing status:', error);
    }
};
  
  export default {
  validateReceipt,
  handleSubscriptionData,
  checkExistingSubscriptions,
  checkIsPurchasing,
  setIsPurchasing,
  cancelIsPurchasing
};

