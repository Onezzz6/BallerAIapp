/**
 * Tester Account Management Service
 * 
 * This service manages Google tester accounts that should bypass the paywall.
 * Add email addresses to the GOOGLE_TESTER_EMAILS array to grant them premium access.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { db } from '../config/firebase';

// List of Google tester email addresses that should bypass the paywall
// Add email addresses of your Google Play Console testers here
const GOOGLE_TESTER_EMAILS = [
  // Example entries - replace with actual tester emails:
  // 'tester1@gmail.com',
  // 'tester2@company.com',
  // 'internal.tester@ballerai.com',
  
  // Add your Google Play Console tester emails here:
  'googletester1@gmail.com',
  
];

// Environment-based tester emails (loaded from environment variables)
// This allows you to add tester emails without code changes
const getEnvironmentTesterEmails = (): string[] => {
  const envTesterEmails = Constants.expoConfig?.extra?.testerEmails;
  if (typeof envTesterEmails === 'string') {
    return envTesterEmails.split(',').map(email => email.trim()).filter(Boolean);
  }
  return [];
};

// Combined list of all tester emails
const getAllTesterEmails = (): string[] => {
  return [...GOOGLE_TESTER_EMAILS, ...getEnvironmentTesterEmails()];
};

/**
 * Check if a user is a Google tester based on their email address
 * @param email - The user's email address
 * @returns Promise<boolean> - True if the user is a designated tester
 */
export const isGoogleTester = async (email: string): Promise<boolean> => {
  try {
    if (!email) {
      return false;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const testerEmails = getAllTesterEmails().map(e => e.toLowerCase().trim());
    
    const isTester = testerEmails.includes(normalizedEmail);
    
    if (isTester) {
      console.log(`🧪 TESTER ACCOUNT DETECTED: ${email} - Will bypass paywall`);
    }
    
    return isTester;
  } catch (error) {
    console.error('Error checking tester status:', error);
    return false;
  }
};

/**
 * Check if a user should have premium access (either through subscription or tester status)
 * @param userId - Firebase user ID
 * @param email - User's email address
 * @param hasActiveSubscription - Whether the user has an active RevenueCat subscription
 * @returns Promise<boolean> - True if user should have premium access
 */
export const shouldHavePremiumAccess = async (
  userId: string, 
  email: string, 
  hasActiveSubscription: boolean
): Promise<boolean> => {
  try {
    // First check if they have a real subscription
    if (hasActiveSubscription) {
      return true;
    }
    
    // Then check if they're a designated tester
    const isTester = await isGoogleTester(email);
    
    if (isTester) {
      // Log this for debugging and tracking
      console.log(`🧪 GRANTING PREMIUM ACCESS TO TESTER: ${email} (${userId})`);
      
      // Optionally store tester status in Firestore for tracking
      try {
        await db.collection('users').doc(userId).update({
          isTester: true,
          testerGrantedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } catch (firestoreError) {
        console.error('Error updating tester status in Firestore:', firestoreError);
        // Don't fail the premium access check if Firestore update fails
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking premium access:', error);
    // In case of error, fall back to subscription status only
    return hasActiveSubscription;
  }
};

/**
 * Get all configured tester emails (for admin/debugging purposes)
 * @returns string[] - Array of all tester email addresses
 */
export const getAllConfiguredTesterEmails = (): string[] => {
  return getAllTesterEmails();
};

/**
 * Add a tester email dynamically (for development/testing)
 * Note: This only adds to the runtime list, not to the persistent configuration
 * @param email - Email address to add as tester
 */
export const addTesterEmailRuntime = (email: string): void => {
  const normalizedEmail = email.toLowerCase().trim();
  if (!GOOGLE_TESTER_EMAILS.includes(normalizedEmail)) {
    GOOGLE_TESTER_EMAILS.push(normalizedEmail);
    console.log(`🧪 Added runtime tester email: ${normalizedEmail}`);
  }
};

/**
 * Remove a tester email dynamically (for development/testing)
 * Note: This only removes from the runtime list, not from the persistent configuration
 * @param email - Email address to remove from testers
 */
export const removeTesterEmailRuntime = (email: string): void => {
  const normalizedEmail = email.toLowerCase().trim();
  const index = GOOGLE_TESTER_EMAILS.indexOf(normalizedEmail);
  if (index > -1) {
    GOOGLE_TESTER_EMAILS.splice(index, 1);
    console.log(`🧪 Removed runtime tester email: ${normalizedEmail}`);
  }
};
