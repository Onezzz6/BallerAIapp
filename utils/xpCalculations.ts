import { XP_CONSTANTS } from '../types/xp';

/**
 * Calculate level from total XP using the quadratic curve: level = floor(sqrt(totalXp / constant))
 * This gives a gentle quadratic curve where early levels come quickly, then slow to steady cadence
 */
export function calculateLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  return Math.floor(Math.sqrt(totalXp / XP_CONSTANTS.LEVEL_CURVE_CONSTANT)) + 1;
}

/**
 * Calculate XP required for a specific level
 */
export function calculateXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) ** 2 * XP_CONSTANTS.LEVEL_CURVE_CONSTANT;
}

/**
 * Calculate XP required to reach the next level from current total XP
 */
export function calculateXpToNextLevel(totalXp: number): number {
  const currentLevel = calculateLevelFromXp(totalXp);
  const nextLevelXp = calculateXpForLevel(currentLevel + 1);
  return nextLevelXp - totalXp;
}

/**
 * Calculate progress to next level as a percentage (0-1)
 */
export function calculateLevelProgress(totalXp: number): number {
  const currentLevel = calculateLevelFromXp(totalXp);
  const currentLevelXp = calculateXpForLevel(currentLevel);
  const nextLevelXp = calculateXpForLevel(currentLevel + 1);
  
  if (nextLevelXp === currentLevelXp) return 1;
  
  return (totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp);
}

/**
 * Get badge color based on level (changes every 25 levels)
 */
export function getBadgeColor(level: number): string {
  const colorIndex = Math.floor((level - 1) / XP_CONSTANTS.BADGE_COLOR_INTERVAL);
  const colors = [
    '#3B82F6', // Blue (levels 1-25)
    '#10B981', // Green (levels 26-50)
    '#F59E0B', // Yellow (levels 51-75)
    '#EF4444', // Red (levels 76-100)
    '#8B5CF6', // Purple (levels 101-125)
    '#F97316', // Orange (levels 126-150)
    '#EC4899', // Pink (levels 151+)
  ];
  
  return colors[Math.min(colorIndex, colors.length - 1)];
}

/**
 * Check if it's a new day since last XP reset based on timezone
 */
export function isNewDay(lastXpReset: number, timezone: string): boolean {
  try {
    const now = new Date();
    const lastReset = new Date(lastXpReset);
    
    // Convert both dates to the user's timezone
    const nowInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const lastResetInTimezone = new Date(lastReset.toLocaleString('en-US', { timeZone: timezone }));
    
    // Compare just the date parts
    const nowDate = nowInTimezone.toDateString();
    const lastResetDate = lastResetInTimezone.toDateString();
    
    return nowDate !== lastResetDate;
  } catch (error) {
    console.error('Error checking new day:', error);
    // Fallback to UTC comparison if timezone parsing fails
    const now = new Date();
    const lastReset = new Date(lastXpReset);
    return now.toDateString() !== lastReset.toDateString();
  }
}

/**
 * Check if an action is eligible for XP based on timing rules
 */
export function isActionEligibleForXp(
  actionCreatedAt: number,
  xpFeatureStart: number,
  timezone: string
): boolean {
  // Rule 1: Action must be created on or after XP feature start
  if (actionCreatedAt < xpFeatureStart) {
    return false;
  }
  
  // Rule 2: Action must be created "today" in user's timezone
  try {
    const now = new Date();
    const actionDate = new Date(actionCreatedAt);
    
    // Convert both to user's timezone
    const nowInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const actionInTimezone = new Date(actionDate.toLocaleString('en-US', { timeZone: timezone }));
    
    // Compare just the date parts
    const nowDateStr = nowInTimezone.toDateString();
    const actionDateStr = actionInTimezone.toDateString();
    
    return nowDateStr === actionDateStr;
  } catch (error) {
    console.error('Error checking action eligibility:', error);
    // Fallback to UTC comparison
    const now = new Date();
    const actionDate = new Date(actionCreatedAt);
    return now.toDateString() === actionDate.toDateString();
  }
}

/**
 * Calculate actual XP to award considering daily cap
 */
export function calculateXpAward(requestedAmount: number, currentXpToday: number): number {
  const remainingCap = XP_CONSTANTS.DAILY_CAP - currentXpToday;
  return Math.min(requestedAmount, Math.max(0, remainingCap));
}

/**
 * Get user's device timezone as IANA string
 */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Error getting device timezone:', error);
    return 'UTC'; // Fallback
  }
} 