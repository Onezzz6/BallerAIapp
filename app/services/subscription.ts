import { doc, getDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as InAppPurchases from 'expo-in-app-purchases';

// Product IDs for subscription plans
export const PRODUCT_IDS = {
  '1month': 'BallerAISubscriptionOneMonth',
  '12months': 'BallerAISubscriptionOneYear'
};

// Subscription status types
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'none';

// Subscription data structure
export interface SubscriptionData {
  productId: string;
  purchaseTime: string;
  expiresDate: string;
  isActive: boolean;
  transactionId: string | null;
  status: SubscriptionStatus;
  autoRenewing: boolean;
  cancellationDate: string | null;
}

export const NO_SUBSCRIPTION_DATA: SubscriptionData = {
  productId: '',
  purchaseTime: '',
  expiresDate: '',
  isActive: false,
  transactionId: null,
  status: 'none',
  autoRenewing: false,
  cancellationDate: null
};

const subscriptionService = {
  /**
   * Save subscription data to Firebase
   */
  async saveSubscriptionData(userId: string, purchase: any, expirationDateFromValidReceipt: Date): Promise<boolean> {
    try {
      console.log('Saving subscription data for user:', userId);
      console.log('Saving subscription, purchase:', purchase);
      console.log('Saving subscription, expirationDateFromValidReceipt:', expirationDateFromValidReceipt);

      const subscriptionData: SubscriptionData = {
        productId: purchase.productId,
        purchaseTime: new Date().toISOString(),
        expiresDate: expirationDateFromValidReceipt.toISOString(),
        isActive: true,
        transactionId: purchase.transactionId || null,
        status: 'active',
        autoRenewing: true
      };

      // Update user document with subscription data
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        subscription: subscriptionData,
        updatedAt: Timestamp.now()
      });
      
      console.log('Subscription data saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving subscription data:', error);
      return false;
    }
  },
  
  /**
   * Get subscription data from Firebase
   */
  async getSubscriptionData(userId: string): Promise<SubscriptionData> {
    try {
      console.log('Getting subscription data for user:', userId);
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists() && userDoc.data().subscription) {
        // Check if subscription has expired
        const expirationDate = new Date(userDoc.data().expiresDate);
        const now = new Date();
        
        if (expirationDate < now) {
          console.log('Updating Firebase subscription status to expired for user:', userId);
          await this.updateSubscriptionStatus(userId, 'expired');
        }

        return userDoc.data().subscription as SubscriptionData;
      }
      
      console.log('User has no subscription:', userId);
      return NO_SUBSCRIPTION_DATA;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return NO_SUBSCRIPTION_DATA;
    }
  },
  
  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(userId: string, status: SubscriptionStatus): Promise<boolean> {
    try {
      console.log(`Updating subscription status to ${status} for user:`, userId);
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists() || !userDoc.data().subscription) {
        return false;
      }
      
      const subscriptionData = userDoc.data().subscription as SubscriptionData;

      const cancelDate = subscriptionData.cancellationDate || null;
      
      // Update subscription data
      const updatedSubscriptionData = {
        ...subscriptionData,
        status,
        isActive: status === 'active',
        cancellationDate: status === 'cancelled' ? new Date().toISOString() : cancelDate
      };
      
      // Update user document
      await updateDoc(userRef, {
        subscription: updatedSubscriptionData,
        updatedAt: Timestamp.now()
      });
      
      console.log('Subscription status updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating subscription status:', error);
      return false;
    }
  },
  
  /**
   * Check for existing subscriptions using Expo IAP
   */
  async checkExistingSubscriptions(): Promise<any> {
    try {
      console.log('Checking for existing subscriptions...');
      const history = await InAppPurchases.getPurchaseHistoryAsync();
      console.log('Purchase history:', history);
      
      if (history && history.results && history.results.length > 0) {
        // Find active subscriptions
        const activeSubscriptions = history.results.filter(purchase => {
          const productId = purchase.productId;
          return (
            productId === PRODUCT_IDS['1month'] ||
            productId === PRODUCT_IDS['12months']
          );
        });
        
        if (activeSubscriptions.length > 0) {
          console.log('Found active subscriptions:', activeSubscriptions);
          return activeSubscriptions[0]; // Return the most recent subscription
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return null;
    }
  },
  
  /**
   * Process a successful purchase
   */
  async processSuccessfulPurchase(userId: string, purchase: any, expirationDateFromValidReceipt: Date): Promise<boolean> {
    try {
      console.log('Processing successful purchase for user:', userId);
      
      // Save subscription data to Firebase
      const success = await this.saveSubscriptionData(userId, purchase, expirationDateFromValidReceipt);
      
      if (!success) {
        console.error('Failed to save subscription data');
        return false;
      }
      
      // Log the purchase event
      // This would typically be done with Firebase Analytics
      console.log('Purchase processed successfully');
      
      return true;
    } catch (error) {
      console.error('Error processing purchase:', error);
      return false;
    }
  },
  
  /**
   * Get subscription expiration date
   */
  getSubscriptionExpirationDate(subscriptionData: SubscriptionData | null): Date | null {
    if (!subscriptionData || !subscriptionData.expiresDate) {
      return null;
    }
    
    return new Date(subscriptionData.expiresDate);
  },
  
  /**
   * Get days remaining in subscription
   */
  getDaysRemaining(subscriptionData: SubscriptionData | null): number | null {
    if (!subscriptionData || !subscriptionData.expiresDate) {
      return null;
    }
    
    const expirationDate = new Date(subscriptionData.expiresDate);
    const now = new Date();
    
    // Calculate difference in days
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }
};

export default subscriptionService; 