import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Modal, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import subscriptionService, { PRODUCT_IDS, SubscriptionData } from '../services/subscription';
import subscriptionCheck from '../services/subscriptionCheck';
import CustomButton from './CustomButton';
import * as InAppPurchases from 'expo-in-app-purchases';
import axios from 'axios';
import authService from '../services/auth';

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
    };
    
    checkSubscription();
  }, [user, showExpirationAlert]);

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