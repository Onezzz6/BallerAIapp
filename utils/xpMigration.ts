import { db } from '../config/firebase';
import firestore from '@react-native-firebase/firestore';
import { XpData } from '../types/xp';
import { getDeviceTimezone, calculateLevelFromXp } from './xpCalculations';

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
    
    // Check if user already has new XP fields (xpPerDateByActivity and xpLimitsStart)
    if (userData && 
        typeof userData.xpPerDateByActivity === 'object' &&
        typeof userData.xpLimitsStart === 'number') {
      console.log('✅ User already has new XP system fields');
      return true;
    }

    console.log('🔄 Migrating user to new XP system...');
    
    const now = Date.now();
    const timezone = getDeviceTimezone();
    
    // Prepare migration data
    const migrationData: Partial<XpData> = {};

    // Handle new users (no XP data at all)
    if (!userData || 
        typeof userData.totalXp !== 'number' || 
        typeof userData.level !== 'number') {
      
      console.log('🆕 New user - initializing XP system');
      
      migrationData.totalXp = 0;
      migrationData.xpPerDate = {};
      migrationData.xpPerDateByActivity = {};
      migrationData.lastXpReset = now;
      migrationData.level = 1;
      migrationData.timezone = timezone;
      migrationData.xpFeatureStart = now; // New users start from now
      migrationData.xpLimitsStart = now; // New users get new limits immediately
      
    } else {
      // Handle existing users - preserve their progress but clean up data
      console.log('🔄 Existing user - preserving progress and adding new features');
      
      // Preserve existing level and totalXp (same calculation system)
      let existingLevel = userData.level || 1;
      let existingTotalXp = userData.totalXp || 0;
      
      // Handle corrupted data from development (negative XP, NaN levels, etc.)
      if (existingTotalXp < 0 || isNaN(existingTotalXp) || !isFinite(existingTotalXp)) {
        console.log('⚠️ Corrupted totalXp detected, recalculating from level');
        existingTotalXp = calculateXpForLevel(existingLevel);
      }
      
      if (existingLevel < 1 || isNaN(existingLevel) || !isFinite(existingLevel)) {
        console.log('⚠️ Corrupted level detected, recalculating from totalXp');
        existingLevel = calculateLevelFromXp(Math.max(0, existingTotalXp));
      }
      
      // Keep existing data but ensure it's clean
      migrationData.totalXp = existingTotalXp;
      migrationData.level = existingLevel;
      migrationData.xpPerDate = userData.xpPerDate || {};
      migrationData.lastXpReset = userData.lastXpReset || now;
      migrationData.timezone = userData.timezone || timezone;
      migrationData.xpFeatureStart = userData.xpFeatureStart || now;
      
      // Add new fields for per-activity limits
      migrationData.xpPerDateByActivity = {}; // Start fresh - existing activities won't count toward new limits
      migrationData.xpLimitsStart = now; // Set to now - only NEW activities after update will be subject to limits
      
      console.log('📊 Preserved user progress:', {
        level: existingLevel,
        totalXp: existingTotalXp,
        newLimitsStarting: new Date(now).toISOString()
      });
    }

    // Perform the migration
    await db.collection('users').doc(userId).update(migrationData);
    
    console.log('✅ XP migration completed successfully');
    console.log('📊 Migration summary:', {
      totalXp: migrationData.totalXp,
      level: migrationData.level,
      xpFeatureStart: new Date(migrationData.xpFeatureStart!).toISOString(),
      xpLimitsStart: new Date(migrationData.xpLimitsStart!).toISOString(),
      timezone: migrationData.timezone
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during XP migration:', error);
    return false;
  }
}

/**
 * Helper function to calculate XP for a specific level (same as existing system)
 */
function calculateXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) ** 2 * 30; // Original LEVEL_CURVE_CONSTANT was 30, not 1000
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
    
    // Check if user already has all required new XP fields
    return !(userData && 
        typeof userData.totalXp === 'number' && 
        typeof userData.xpPerDate === 'object' && 
        typeof userData.level === 'number' &&
        userData.timezone &&
        typeof userData.xpFeatureStart === 'number');
  } catch (error) {
    console.error('Error checking XP migration status:', error);
    return false;
  }
} 