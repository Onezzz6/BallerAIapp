export interface XpData {
  totalXp: number;
  xpToday: number;
  lastXpReset: number; // Timestamp
  level: number; // Cached level derived from totalXp
  timezone: string; // IANA timezone string (e.g., 'Europe/Helsinki')
  xpFeatureStart: number; // Timestamp marking when XP became active for this user
}

export interface XpAward {
  reason: 'meal' | 'recovery' | 'training';
  amount: number;
  timestamp: number;
  eligible: boolean;
  cappedAmount?: number; // Amount actually awarded if capped
}

export interface XpConstants {
  MEAL_XP: 50;
  RECOVERY_XP: 300;
  TRAINING_XP: 300;
  DAILY_CAP: 900;
  LEVEL_CURVE_CONSTANT: 30;
  BADGE_COLOR_INTERVAL: 25;
}

export const XP_CONSTANTS: XpConstants = {
  MEAL_XP: 50,
  RECOVERY_XP: 300,
  TRAINING_XP: 300,
  DAILY_CAP: 900,
  LEVEL_CURVE_CONSTANT: 30,
  BADGE_COLOR_INTERVAL: 25,
} as const;

export interface LevelUpEvent {
  previousLevel: number;
  newLevel: number;
  totalXp: number;
} 