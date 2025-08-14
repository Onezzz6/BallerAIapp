import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { XpData, XpAward, LevelUpEvent, XP_CONSTANTS } from '../types/xp';
import {
  calculateLevelFromXp,
  isNewDay,
  isTargetDateEligibleForXp,
  calculateXpAwardForDate,
  formatDateForXp,
} from '../utils/xpCalculations';
import { migrateUserToXpSystem } from '../utils/xpMigration';

interface XpContextType {
  // Current XP state
  xpData: XpData | null;
  isLoading: boolean;
  
  // Core method for awarding XP with target date
  awardXp: (amount: number, reason: 'meal' | 'recovery' | 'training', targetDate: Date) => Promise<XpAward>;
  
  // Level up events
  onLevelUp: (callback: (event: LevelUpEvent) => void) => void;
  
  // Manual refresh
  refreshXpData: () => Promise<void>;
}

const XpContext = createContext<XpContextType | null>(null);

export function XpProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [xpData, setXpData] = useState<XpData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const levelUpCallbacks = useRef<((event: LevelUpEvent) => void)[]>([]);

  // Load XP data from Firebase
  const loadXpData = useCallback(async () => {
    if (!user?.uid) {
      setXpData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Ensure user has XP system set up (migrate if necessary)
      await migrateUserToXpSystem(user.uid);
      
      // Load current XP data
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData) {
          const loadedXpData: XpData = {
            totalXp: userData.totalXp || 0,
            xpPerDate: userData.xpPerDate || {},
            xpPerDateByActivity: userData.xpPerDateByActivity || {},
            lastXpReset: userData.lastXpReset || Date.now(),
            level: userData.level || 1,
            timezone: userData.timezone || 'UTC',
            xpFeatureStart: userData.xpFeatureStart || Date.now(),
            xpLimitsStart: userData.xpLimitsStart || Date.now(),
          };
          
          setXpData(loadedXpData);
          console.log('✅ XP data loaded:', {
            totalXp: loadedXpData.totalXp,
            level: loadedXpData.level,
            xpFeatureStart: new Date(loadedXpData.xpFeatureStart).toISOString(),
            xpLimitsStart: new Date(loadedXpData.xpLimitsStart).toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('❌ Error loading XP data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Award XP for a specific activity on a target date
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

      // Update XP data
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

      // Check for level up
      if (newLevel > previousLevel) {
        const levelUpEvent: LevelUpEvent = {
          newLevel,
          previousLevel,
          totalXp: newTotalXp,
        };
        
        // Notify all level up callbacks
        levelUpCallbacks.current.forEach(callback => {
          try {
            callback(levelUpEvent);
          } catch (error) {
            console.error('Error in level up callback:', error);
          }
        });
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

  // Register level up callback
  const onLevelUp = useCallback((callback: (event: LevelUpEvent) => void) => {
    levelUpCallbacks.current.push(callback);
    
    // Return cleanup function
    return () => {
      const index = levelUpCallbacks.current.indexOf(callback);
      if (index > -1) {
        levelUpCallbacks.current.splice(index, 1);
      }
    };
  }, []);

  // Manual refresh
  const refreshXpData = useCallback(async () => {
    await loadXpData();
  }, [loadXpData]);

  // Load XP data when user changes
  useEffect(() => {
    loadXpData();
  }, [loadXpData]);

  // App state change handling (refresh when app comes to foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user?.uid) {
        refreshXpData();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user?.uid, refreshXpData]);

  const contextValue: XpContextType = {
    xpData,
    isLoading,
    awardXp,
    onLevelUp,
    refreshXpData,
  };

  return (
    <XpContext.Provider value={contextValue}>
      {children}
    </XpContext.Provider>
  );
}

export function useXp(): XpContextType {
  const context = useContext(XpContext);
  if (!context) {
    throw new Error('useXp must be used within an XpProvider');
  }
  return context;
} 