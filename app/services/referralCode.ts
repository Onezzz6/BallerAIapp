import { getFirestore, collection, query, where, limit, getDocs } from '@react-native-firebase/firestore';

export interface ReferralCodeResult {
  isValid: boolean;
  discount?: number;
  influencer?: string;
  error?: string;
}

/**
 * Validates a referral code against Firestore database
 * @param inputCode - The referral code entered by the user
 * @returns Promise<ReferralCodeResult> - Object containing validation results
 */
export const validateReferralCode = async (inputCode: string): Promise<ReferralCodeResult> => {
  try {
    // Trim and uppercase the input code for consistency
    const cleanCode = inputCode.trim().toUpperCase();
    
    if (!cleanCode) {
      return {
        isValid: false,
        error: 'Please enter a referral code'
      };
    }

    // Get Firestore instance
    const db = getFirestore();
    
    // Create query for the referral code
    const q = query(
      collection(db, 'referralCodes'),
      where('code', '==', cleanCode),
      where('ACTIVE', '==', true),
      limit(1)
    );

    // Execute the query
    const querySnapshot = await getDocs(q);

    // Check if we found a valid, active referral code
    if (querySnapshot.empty) {
      return {
        isValid: false,
        error: 'Invalid or expired referral code'
      };
    }

    // Get the first (and should be only) document
    const doc = querySnapshot.docs[0];
    const data = doc.data();

    // Validate the document structure
    if (typeof data.DISCOUNT !== 'number' || typeof data.INFLUENCER !== 'string') {
      console.error('Invalid referral code document structure:', data);
      return {
        isValid: false,
        error: 'Invalid referral code format'
      };
    }

    // Return successful validation result
    return {
      isValid: true,
      discount: data.DISCOUNT,
      influencer: data.INFLUENCER
    };

  } catch (error) {
    console.error('Error validating referral code:', error);
    return {
      isValid: false,
      error: 'Unable to validate referral code. Please try again.'
    };
  }
};

/**
 * Helper function to format discount display
 * @param discount - The discount percentage
 * @returns Formatted discount string
 */
export const formatDiscount = (discount: number): string => {
  return `${discount}% off`;
};

/**
 * Helper function to create success message
 * @param discount - The discount percentage
 * @param influencer - The influencer name
 * @returns Formatted success message
 */
export const createSuccessMessage = (discount: number, influencer: string): string => {
  return `Great! You've unlocked ${formatDiscount(discount)} with ${influencer}'s referral code!`;
}; 