import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { XpData, XpAward, LevelUpEvent, XP_CONSTANTS } from '../types/xp';
import {
  calculateLevelFromXp,
  formatDateForXp,
  isTargetDateEligibleForXp,
  calculateXpAwardForDate,
  getDeviceTimezone,
} from '../utils/xpCalculations';
import { migrateUserToXpSystem } from '../utils/xpMigration';

interface XpContextType {
  // Current XP state
  xpData: XpData | null;
  isLoading: boolean;
  
  // Core method for awarding XP
  awardXp: (amount: number, reason: 'meal' | 'recovery' | 'training', targetDate: Date) => Promise<XpAward>;
  
  // Level up event handling (RESTORED ORIGINAL SYSTEM)
  levelUpEvent: LevelUpEvent | null;
  clearLevelUpEvent: () => void;
  
  // Utility methods
  refreshXpData: () => Promise<void>;
}

const XpContext = createContext<XpContextType>({
  xpData: null,
  isLoading: true,
  awardXp: async () => ({ reason: 'meal', amount: 0, timestamp: 0, eligible: false, targetDate: '' }),
  levelUpEvent: null,
  clearLevelUpEvent: () => {},
  refreshXpData: async () => {},
});

export const useXp = () => useContext(XpContext);

export const XpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [xpData, setXpData] = useState<XpData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null); // RESTORED ORIGINAL STATE

  // Subscribe to user's XP data
  useEffect(() => {
    if (!user?.uid) {
      setXpData(null);
      setIsLoading(false);
      return;
    }

    console.log('🎯 XpContext: Subscribing to XP data for user:', user.uid);
    
    const unsubscribe = db.collection('users').doc(user.uid).onSnapshot(
      async (doc) => {
        if (!doc.exists) {
          console.log('❌ User document does not exist');
          setIsLoading(false);
          return;
        }

        const userData = doc.data();
        
        // Ensure user has XP system migration
        const migrated = await migrateUserToXpSystem(user.uid);
        if (!migrated) {
          console.error('❌ Failed to migrate user to XP system');
          setIsLoading(false);
          return;
        }

        // Extract XP data with proper type safety
        const currentXpData: XpData = {
          totalXp: userData?.totalXp || 0,
          xpPerDate: userData?.xpPerDate || {},
          xpPerDateByActivity: userData?.xpPerDateByActivity || {},
          lastXpReset: userData?.lastXpReset || Date.now(),
          level: userData?.level || 1,
          timezone: userData?.timezone || getDeviceTimezone(),
          xpFeatureStart: userData?.xpFeatureStart || Date.now(),
          xpLimitsStart: userData?.xpLimitsStart || Date.now(),
        };

        console.log('📊 XP Data updated:', currentXpData);
        setXpData(currentXpData);
        setIsLoading(false);
      },
      (error) => {
        console.error('❌ Error subscribing to XP data:', error);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  // Core method to award XP
  const awardXp = useCallback(async (
    amount: number, 
    reason: 'meal' | 'recovery' | 'training', 
    targetDate: Date
  ): Promise<XpAward> => {
    if (!user?.uid || !xpData) {
      return {
        reason,
        amount: 0,
        timestamp: Date.now(),
        eligible: false,
        targetDate: formatDateForXp(targetDate, xpData?.timezone || 'UTC'),
      };
    }

    try {
      const now = Date.now();
      const targetDateString = formatDateForXp(targetDate, xpData.timezone);
      
      // Check if target date is eligible for XP
      if (!isTargetDateEligibleForXp(targetDate, xpData.xpFeatureStart, xpData.timezone)) {
        console.log(`❌ Target date ${targetDateString} is before XP feature start date`);
        return {
          reason,
          amount: 0,
          timestamp: now,
          eligible: false,
          targetDate: targetDateString,
        };
      }

      // Calculate how much XP can be awarded considering per-activity limits
      const { amount: awardAmount, activityLimitReached } = calculateXpAwardForDate(
        reason,
        amount,
        targetDateString,
        now, // Activity timestamp is now
        xpData.xpPerDateByActivity,
        xpData.xpLimitsStart
      );

      if (awardAmount === 0) {
        console.log(`⚠️ No XP awarded for ${reason} on ${targetDateString} - ${activityLimitReached ? 'activity limit reached' : 'unknown reason'}`);
        return {
          reason,
          amount: 0,
          timestamp: now,
          eligible: true,
          targetDate: targetDateString,
          activityLimitReached,
        };
      }

      // Calculate new values
      const newTotalXp = xpData.totalXp + awardAmount;
      const newLevel = calculateLevelFromXp(newTotalXp);
      const previousLevel = xpData.level;

      // Update xpPerDate
      const newXpPerDate = { ...xpData.xpPerDate };
      newXpPerDate[targetDateString] = (newXpPerDate[targetDateString] || 0) + awardAmount;

      // Update xpPerDateByActivity
      const newXpPerDateByActivity = { ...xpData.xpPerDateByActivity };
      if (!newXpPerDateByActivity[targetDateString]) {
        newXpPerDateByActivity[targetDateString] = { meals: 0, recovery: 0, training: 0 };
      }
      const activityKey = reason === 'meal' ? 'meals' : reason;
      newXpPerDateByActivity[targetDateString][activityKey] += awardAmount;

      // Prepare update data
      const updateData = {
        totalXp: newTotalXp,
        level: newLevel,
        xpPerDate: newXpPerDate,
        xpPerDateByActivity: newXpPerDateByActivity,
      };

      // Update Firebase
      await db.collection('users').doc(user.uid).update(updateData);

      // Update local state
      const updatedXpData: XpData = {
        ...xpData,
        ...updateData,
      };
      setXpData(updatedXpData);

      // Handle level up event (RESTORED ORIGINAL SYSTEM)
      if (newLevel > previousLevel) {
        const levelUpData: LevelUpEvent = {
          previousLevel,
          newLevel,
          totalXp: newTotalXp,
        };
        
        setLevelUpEvent(levelUpData);
        console.log(`🎊 LEVEL UP! ${levelUpData.previousLevel} → ${levelUpData.newLevel}`);
      }

      console.log(`🎉 Awarded ${awardAmount} XP for ${reason} on ${targetDateString}! Total: ${newTotalXp} XP, Level: ${newLevel}`);
      
      return {
        reason,
        amount: awardAmount,
        timestamp: now,
        eligible: true,
        targetDate: targetDateString,
        activityLimitReached,
      };

    } catch (error) {
      console.error('❌ Error awarding XP:', error);
      return {
        reason,
        amount: 0,
        timestamp: Date.now(),
        eligible: false,
        targetDate: formatDateForXp(targetDate, xpData?.timezone || 'UTC'),
      };
    }
  }, [user?.uid, xpData]);

  // Refresh XP data manually
  const refreshXpData = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        const userData = doc.data();
        const currentXpData: XpData = {
          totalXp: userData?.totalXp || 0,
          xpPerDate: userData?.xpPerDate || {},
          xpPerDateByActivity: userData?.xpPerDateByActivity || {},
          lastXpReset: userData?.lastXpReset || Date.now(),
          level: userData?.level || 1,
          timezone: userData?.timezone || getDeviceTimezone(),
          xpFeatureStart: userData?.xpFeatureStart || Date.now(),
          xpLimitsStart: userData?.xpLimitsStart || Date.now(),
        };
        setXpData(currentXpData);
      }
    } catch (error) {
      console.error('❌ Error refreshing XP data:', error);
    }
  }, [user?.uid]);

  // Clear level up event (called after modal is dismissed) - RESTORED ORIGINAL FUNCTION
  const clearLevelUpEvent = useCallback(() => {
    setLevelUpEvent(null);
  }, []);

  const contextValue: XpContextType = {
    xpData,
    isLoading,
    awardXp,
    levelUpEvent, // RESTORED ORIGINAL STATE
    clearLevelUpEvent, // RESTORED ORIGINAL FUNCTION
    refreshXpData,
  };

  return (
    <XpContext.Provider value={contextValue}>
      {children}
    </XpContext.Provider>
  );
};