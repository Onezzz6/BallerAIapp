import firestore from '@react-native-firebase/firestore';

export interface ReferralCodeResult {
  isValid: boolean;
  discount?: number;
  influencer?: string;
  paywallType?: string | null;
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
    const db = firestore();
    
    // Create query for the referral code
    const querySnapshot = await db
      .collection('referralCodes')
      .where('code', '==', cleanCode)
      .limit(1)
      .get();

    // Check if we found a valid referral code
    if (querySnapshot.empty) {
      return {
        isValid: false,
        error: 'Invalid referral code'
      };
    }

    // Get the first (and should be only) document
    const doc = querySnapshot.docs[0];
    const data = doc.data();

    // Code exists = user is allowed
    console.log('Referral code document data:', data); // Debug log to see actual structure
    
    // Try different possible field names for influencer
    const influencerName = data.INFLUENCER || 
                          data.influencer || 
                          data.name || 
                          data.influencerName || 
                          data.creator ||
                          'Influencer'; // Better fallback than 'Unknown'
    
    const discount = data.DISCOUNT || 
                    data.discount || 
                    10; // Default discount
    
    // Get paywall type for dynamic paywall selection
    const paywallType = data.paywallType || null;
    
    return {
      isValid: true,
      discount: discount,
      influencer: influencerName,
      paywallType: paywallType
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
  return `Great! You've unlocked a discount with ${influencer}'s referral code!`;
}; 