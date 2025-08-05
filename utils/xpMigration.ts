import { db } from '../config/firebase';
import firestore from '@react-native-firebase/firestore';
import { XpData } from '../types/xp';
import { getDeviceTimezone } from './xpCalculations';

/**
 * Check if user has XP fields and migrate if necessary
 * This ensures existing users get XP fields when they first launch the updated app
 */
export async function migrateUserToXpSystem(userId: string): Promise<boolean> {
  try {
    console.log('🔄 Checking if user needs XP migration:', userId);
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log('❌ User document does not exist');
      return false;
    }
    
    const userData = userDoc.data();
    
    // Check if user already has XP fields
    if (userData && 
        typeof userData.totalXp === 'number' && 
        typeof userData.xpToday === 'number' && 
        typeof userData.level === 'number' &&
        typeof userData.lastXpReset === 'number' &&
        userData.timezone &&
        typeof userData.xpFeatureStart === 'number') {
      console.log('✅ User already has XP fields, no migration needed');
      return true;
    }
    
    console.log('🚀 Migrating user to XP system...');
    
    // Generate initial XP data
    const now = Date.now();
    const xpData: XpData = {
      totalXp: 0,
      xpToday: 0,
      lastXpReset: now,
      level: 1,
      timezone: getDeviceTimezone(),
      xpFeatureStart: now, // Set to now so only future actions grant XP
    };
    
    // Update user document with XP fields
    await db.collection('users').doc(userId).update(xpData);
    
    console.log('✅ Successfully migrated user to XP system');
    return true;
  } catch (error) {
    console.error('❌ Error migrating user to XP system:', error);
    return false;
  }
}

/**
 * Check if user needs XP migration (without performing it)
 */
export async function doesUserNeedXpMigration(userId: string): Promise<boolean> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return false;
    }
    
    const userData = userDoc.data();
    
    // Check if user already has all required XP fields
    return !(userData && 
        typeof userData.totalXp === 'number' && 
        typeof userData.xpToday === 'number' && 
        typeof userData.level === 'number' &&
        typeof userData.lastXpReset === 'number' &&
        userData.timezone &&
        typeof userData.xpFeatureStart === 'number');
  } catch (error) {
    console.error('Error checking XP migration status:', error);
    return false;
  }
} 