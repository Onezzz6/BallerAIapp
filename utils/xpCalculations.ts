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
  const colorIndex = Math.floor((level - 1) / 25); // Every 25 levels
  const colors = [
    '#3F63F6', // Blue (levels 1-25)
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
 * Get device timezone
 */
export function getDeviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Check if it's a new day in the user's timezone since last XP reset
 */
export function isNewDay(lastResetTimestamp: number, timezone: string): boolean {
  const now = new Date();
  const lastReset = new Date(lastResetTimestamp);
  
  // Convert to user's timezone for comparison using Intl.DateTimeFormat
  const nowInUserTz = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
  const lastResetInUserTz = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(lastReset);
  
  return nowInUserTz !== lastResetInUserTz;
}

/**
 * Format date for XP tracking (YYYY-MM-DD in user's timezone)
 */
export function formatDateForXp(date: Date, timezone: string): string {
  try {
    // Use Intl.DateTimeFormat which is more reliable for timezone conversion
    // 'en-CA' format gives us YYYY-MM-DD directly
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
  } catch (error) {
    console.error('Error formatting date for XP:', error, 'Date:', date, 'Timezone:', timezone);
    // Fallback to UTC if timezone conversion fails
    return date.toISOString().split('T')[0];
  }
}

/**
 * Check if a target date is eligible for XP based on user's XP feature start date
 */
export function isTargetDateEligibleForXp(targetDate: Date, xpFeatureStart: number, timezone: string): boolean {
  const targetDateString = formatDateForXp(targetDate, timezone);
  const featureStartDateString = formatDateForXp(new Date(xpFeatureStart), timezone);
  
  return targetDateString >= featureStartDateString;
}

/**
 * Check if an activity timestamp is eligible for the new XP limits system
 * (only activities logged AFTER xpLimitsStart are subject to the new limits)
 */
export function isActivityEligibleForNewLimits(activityTimestamp: number, xpLimitsStart: number): boolean {
  return activityTimestamp >= xpLimitsStart;
}

/**
 * Calculate how much XP can be awarded for a specific activity on a target date
 * Takes into account per-activity-type limits and existing XP for that date/activity
 */
export function calculateXpAwardForDate(
  activityType: 'meal' | 'recovery' | 'training',
  baseAmount: number,
  targetDate: string,
  activityTimestamp: number,
  xpPerDateByActivity: { [dateString: string]: { meals: number; recovery: number; training: number } },
  xpLimitsStart: number
): { amount: number; activityLimitReached: boolean } {
  
  // If this activity was logged before the new limits started, award full XP (legacy behavior)
  if (!isActivityEligibleForNewLimits(activityTimestamp, xpLimitsStart)) {
    return { amount: baseAmount, activityLimitReached: false };
  }
  
  // Get existing XP for this date and activity type
  const dateActivity = xpPerDateByActivity[targetDate] || { meals: 0, recovery: 0, training: 0 };
  const currentActivityXp = dateActivity[activityType === 'meal' ? 'meals' : activityType];
  
  // Get the limit for this activity type
  let activityLimit: number;
  switch (activityType) {
    case 'meal':
      activityLimit = XP_CONSTANTS.MEALS_XP_PER_DATE;
      break;
    case 'recovery':
      activityLimit = XP_CONSTANTS.RECOVERY_XP_PER_DATE;
      break;
    case 'training':
      activityLimit = XP_CONSTANTS.TRAINING_XP_PER_DATE;
      break;
  }
  
  // Calculate how much XP can still be awarded for this activity type
  const remainingActivityXp = Math.max(0, activityLimit - currentActivityXp);
  const awardAmount = Math.min(baseAmount, remainingActivityXp);
  const activityLimitReached = awardAmount < baseAmount;
  
  return { amount: awardAmount, activityLimitReached };
} 