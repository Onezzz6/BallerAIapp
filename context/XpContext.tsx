import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { XpData, XpAward, LevelUpEvent, XP_CONSTANTS } from '../types/xp';
import {
  calculateLevelFromXp,
  isNewDay,
  isActionEligibleForXp,
  calculateXpAward,
} from '../utils/xpCalculations';
import { migrateUserToXpSystem } from '../utils/xpMigration';

interface XpContextType {
  // Current XP state
  xpData: XpData | null;
  isLoading: boolean;
  
  // Core method for awarding XP
  awardXp: (amount: number, reason: 'meal' | 'recovery' | 'training') => Promise<XpAward>;
  
  // Level up event handling
  levelUpEvent: LevelUpEvent | null;
  clearLevelUpEvent: () => void;
  
  // Utility methods
  refreshXpData: () => Promise<void>;
  isCapReached: () => boolean;
  getRemainingXpToday: () => number;
}

const XpContext = createContext<XpContextType>({
  xpData: null,
  isLoading: true,
  awardXp: async () => ({ reason: 'meal', amount: 0, timestamp: 0, eligible: false }),
  levelUpEvent: null,
  clearLevelUpEvent: () => {},
  refreshXpData: async () => {},
  isCapReached: () => false,
  getRemainingXpToday: () => 0,
});

export const useXp = () => useContext(XpContext);

export const XpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [xpData, setXpData] = useState<XpData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);
  
  // Track app state to handle daily resets
  const appState = useRef(AppState.currentState);

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
        
        // Check if user needs XP migration
        if (!userData?.totalXp && userData?.totalXp !== 0) {
          console.log('🔄 User needs XP migration, performing migration...');
          const migrated = await migrateUserToXpSystem(user.uid);
          if (!migrated) {
            console.error('❌ Failed to migrate user to XP system');
            setIsLoading(false);
            return;
          }
          // Migration will trigger this snapshot again with XP data
          return;
        }

        // Extract XP data
        const currentXpData: XpData = {
          totalXp: userData.totalXp || 0,
          xpToday: userData.xpToday || 0,
          lastXpReset: userData.lastXpReset || Date.now(),
          level: userData.level || 1,
          timezone: userData.timezone || 'UTC',
          xpFeatureStart: userData.xpFeatureStart || Date.now(),
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

  // Handle app state changes for daily reset
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🌅 App came to foreground, checking for daily reset...');
        await checkAndPerformDailyReset();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user?.uid, xpData]);

  // Check and perform daily reset if needed
  const checkAndPerformDailyReset = useCallback(async () => {
    if (!user?.uid || !xpData) return;

    try {
      const needsReset = isNewDay(xpData.lastXpReset, xpData.timezone);
      
      if (needsReset) {
        console.log('🌅 Performing daily XP reset...');
        
        const now = Date.now();
        const resetData = {
          xpToday: 0,
          lastXpReset: now,
        };

        await db.collection('users').doc(user.uid).update(resetData);
        console.log('✅ Daily XP reset completed');
      }
    } catch (error) {
      console.error('❌ Error performing daily reset:', error);
    }
  }, [user?.uid, xpData]);

  // Core method to award XP
  const awardXp = useCallback(async (
    amount: number, 
    reason: 'meal' | 'recovery' | 'training'
  ): Promise<XpAward> => {
    if (!user?.uid || !xpData) {
      console.log('❌ Cannot award XP: No user or XP data');
      return { reason, amount: 0, timestamp: Date.now(), eligible: false };
    }

    const now = Date.now();
    
    try {
      // Check daily reset first
      await checkAndPerformDailyReset();
      
      // Check if action is eligible for XP
      const eligible = isActionEligibleForXp(now, xpData.xpFeatureStart, xpData.timezone);
      
      if (!eligible) {
        console.log('❌ Action not eligible for XP (not today or before feature start)');
        return { reason, amount: 0, timestamp: now, eligible: false };
      }

      // Calculate actual XP to award (considering daily cap)
      const actualAmount = calculateXpAward(amount, xpData.xpToday);
      
      if (actualAmount <= 0) {
        console.log('❌ Daily XP cap reached, no XP awarded');
        return { 
          reason, 
          amount: 0, 
          timestamp: now, 
          eligible: true,
          cappedAmount: actualAmount 
        };
      }

      // Calculate new values
      const newXpToday = xpData.xpToday + actualAmount;
      const newTotalXp = xpData.totalXp + actualAmount;
      const newLevel = calculateLevelFromXp(newTotalXp);
      
      // Detect level up
      const leveledUp = newLevel > xpData.level;
      
      // Update Firestore
      await db.collection('users').doc(user.uid).update({
        totalXp: newTotalXp,
        xpToday: newXpToday,
        level: newLevel,
      });

      console.log(`🎉 Awarded ${actualAmount} XP for ${reason}! Total: ${newTotalXp}`);

      // Handle level up event
      if (leveledUp) {
        const levelUpData: LevelUpEvent = {
          previousLevel: xpData.level,
          newLevel: newLevel,
          totalXp: newTotalXp,
        };
        
        setLevelUpEvent(levelUpData);
        console.log(`🎊 LEVEL UP! ${levelUpData.previousLevel} → ${levelUpData.newLevel}`);
        
        // TODO: Trigger level up modal/animation
        // TODO: Fire analytics event
      }

      // TODO: Fire XP awarded analytics event

      return {
        reason,
        amount: actualAmount,
        timestamp: now,
        eligible: true,
        cappedAmount: actualAmount < amount ? actualAmount : undefined,
      };

    } catch (error) {
      console.error('❌ Error awarding XP:', error);
      return { reason, amount: 0, timestamp: now, eligible: false };
    }
  }, [user?.uid, xpData, checkAndPerformDailyReset]);

  // Refresh XP data manually
  const refreshXpData = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        const userData = doc.data();
        const currentXpData: XpData = {
          totalXp: userData?.totalXp || 0,
          xpToday: userData?.xpToday || 0,
          lastXpReset: userData?.lastXpReset || Date.now(),
          level: userData?.level || 1,
          timezone: userData?.timezone || 'UTC',
          xpFeatureStart: userData?.xpFeatureStart || Date.now(),
        };
        setXpData(currentXpData);
      }
    } catch (error) {
      console.error('❌ Error refreshing XP data:', error);
    }
  }, [user?.uid]);

  // Check if daily cap is reached
  const isCapReached = useCallback(() => {
    return xpData ? xpData.xpToday >= XP_CONSTANTS.DAILY_CAP : false;
  }, [xpData]);

  // Get remaining XP that can be earned today
  const getRemainingXpToday = useCallback(() => {
    return xpData ? Math.max(0, XP_CONSTANTS.DAILY_CAP - xpData.xpToday) : 0;
  }, [xpData]);

  // Clear level up event (called after modal is dismissed)
  const clearLevelUpEvent = useCallback(() => {
    setLevelUpEvent(null);
  }, []);

  const contextValue: XpContextType = {
    xpData,
    isLoading,
    awardXp,
    levelUpEvent,
    clearLevelUpEvent,
    refreshXpData,
    isCapReached,
    getRemainingXpToday,
  };

  return (
    <XpContext.Provider value={contextValue}>
      {children}
    </XpContext.Provider>
  );
}; 