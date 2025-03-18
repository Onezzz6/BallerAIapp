import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import nutritionService from '../services/nutrition';
import recoveryService from '../services/recovery';
import trainingService from '../services/training';
import { useOnboarding } from '../context/OnboardingContext';

// Initialize data listeners function defined locally to avoid circular imports
const initializeAllDataListeners = async (userId: string) => {
  console.log("Initializing all data listeners for user:", userId);
  try {
    // Initialize nutrition data listeners
    nutritionService.initializeDataListeners(userId);
    
    // Initialize recovery data listeners
    recoveryService.initializeDataListeners(userId);
    
    // Initialize training data listeners
    trainingService.initializeDataListeners(userId);
    
    console.log("All data listeners initialized successfully");
    return true;
  } catch (error) {
    console.error("Error initializing data listeners:", error);
    return false;
  }
};

// Function to create user document
const createUserDocument = async (userId: string, userData: any) => {
  try {
    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, userData);
    console.log("User document created successfully");
    return true;
  } catch (error) {
    console.error("Error creating user document:", error);
    throw error;
  }
};

// Function to verify the user document exists and contains all required data
const verifyUserDocument = async (userId: string) => {
  try {
    console.log("Verifying user document...");
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log("User document verified:", userData);
      return true;
    }
    
    console.log("User document does not exist or is incomplete");
    return false;
  } catch (error) {
    console.error("Error verifying user document:", error);
    return false;
  }
};

type SubscriptionPlan = {
  id: string;
  duration: string;
  price: string;
  period: string;
  totalPrice: string;
  period2: string;
  isBestValue?: boolean;
};

type Review = {
  id: string;
  name: string;
  rating: number;
  comment: string;
};

const PaywallScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<string>('12months');
  const [isLoading, setIsLoading] = useState(false);
  const { onboardingData } = useOnboarding(); // Get the real onboarding data
  
  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: '1month',
      duration: '1',
      price: '9.99',
      period: 'per month',
      totalPrice: '9,99 €',
      period2: 'monthly',
    },
    {
      id: '12months',
      duration: '12',
      price: '4.99',
      period: 'per month',
      totalPrice: '59,99 €',
      period2: 'yearly',
      isBestValue: true,
    }
  ];

  const reviews: Review[] = [
    {
      id: '1',
      name: 'Carlos D.',
      rating: 5,
      comment: 'Well worth the cost! These exercise routines really woke up my muscles and I like how we can add different equipment!',
    },
    {
      id: '2',
      name: 'Emma M.',
      rating: 5,
      comment: 'Buying this app has really made a difference in my lifestyle. It\'s the best app for fitness. Surprised by the quality!',
    },
  ];

  const handleContinue = async () => {
    try {
      setIsLoading(true);
      const { uid, hasAppleInfo } = params;
      
      // If this is an Apple user who needs a document created
      if (uid && hasAppleInfo === 'true') {
        const userIdString = Array.isArray(uid) ? uid[0] : uid;
        console.log('Creating user document for Apple user with uid:', userIdString);
        console.log('Using onboarding data:', onboardingData);
        
        // Create the user document with the actual onboarding data
        await createUserDocument(userIdString, {
          ...onboardingData, // Use all the onboarding data
          createdAt: new Date().toISOString(),
          hasCompletedOnboarding: true,
        });
        
        // Initialize all data listeners before navigating
        console.log('Initializing data listeners for newly created user');
        await initializeAllDataListeners(userIdString);
        
        // Add a delay to ensure Firebase has time to process the data
        console.log('Waiting for data to be processed...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify that user document exists and contains all required data
        let verified = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!verified && attempts < maxAttempts) {
          verified = await verifyUserDocument(userIdString);
          if (!verified) {
            console.log(`Verification attempt ${attempts + 1} failed. Waiting...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }
        
        if (!verified) {
          console.warn("Could not verify user document after multiple attempts, but proceeding anyway");
        }
      }
      
      // Navigate specifically to the home tab
      console.log('Navigating to home screen after paywall');
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error in handleContinue:', error);
      // Show an error toast or message here
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array(rating).fill(0).map((_, index) => (
      <Ionicons key={index} name="star" size={20} color="#FFD700" />
    ));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Better training.{'\n'}Better results!</Text>

        {/* Subscription Plans */}
        <View style={styles.plansContainer}>
          {subscriptionPlans.map((plan) => (
            <Pressable
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.selectedPlan,
                plan.isBestValue && styles.bestValuePlan,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              {plan.isBestValue && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    BEST VALUE
                  </Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <Text style={styles.planDuration}>{plan.duration}</Text>
                <Text style={styles.planPeriod}>Month{plan.duration !== '1' ? 's' : ''}</Text>
              </View>
              
              {selectedPlan === plan.id && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={24} color="#4064F6" />
                </View>
              )}
              
              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>{plan.price} €</Text>
                <Text style={styles.planPriceDetail}>{plan.period}</Text>
              </View>
              
              <Text style={styles.planTotal}>{plan.totalPrice}</Text>
              <Text style={styles.planTotalPeriod}>{plan.period2}</Text>
            </Pressable>
          ))}
        </View>

        {/* Pro Testimonial Section */}
        <View style={styles.testimonialSection}>
          <Text style={styles.testimonialTitle}>Trusted by Professionals</Text>
          <View style={styles.testimonialContent}>
            <Image 
              source={require('../../assets/images/2027.png')}
              style={styles.testimonialImage}
              resizeMode="cover"
            />
            <Text style={styles.testimonialText}>
              "BallerAI changed the way I approach training forever. The ease of use and the amount of value it has brought to my professional life is incredible. I have loved the recovery plans and macro calculation methods the most. I'm improving at the highest rate possible."
            </Text>
          </View>
        </View>

        {/* Continue Button */}
        <CustomButton
          title={isLoading ? "Processing..." : "Continue"}
          onPress={handleContinue}
          buttonStyle={styles.continueButton}
          textStyle={styles.continueButtonText}
          disabled={isLoading}
        />
      </View>
    </ScrollView>
  );
};

export default PaywallScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 32,
    textAlign: 'center',
  },
  plansContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectedPlan: {
    backgroundColor: '#F0F4FF',
    borderColor: '#4064F6',
    borderWidth: 2,
  },
  bestValuePlan: {
    backgroundColor: '#F0F4FF',
  },
  badge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#4064F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  planDuration: {
    fontSize: 40,
    fontWeight: '600',
    color: '#4064F6',
  },
  planPeriod: {
    fontSize: 16,
    color: '#4064F6',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  planPricing: {
    alignItems: 'center',
    marginTop: 12,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
  },
  planPriceDetail: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  planTotal: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  planTotalPeriod: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  testimonialSection: {
    marginBottom: 32,
    backgroundColor: '#F8F8F8',
    borderRadius: 24,
    padding: 24,
  },
  testimonialTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 24,
  },
  testimonialContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  testimonialImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  testimonialText: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: '#4064F6',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 