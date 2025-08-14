export interface XpData {
  totalXp: number;
  xpPerDate: { [dateString: string]: number }; // XP earned from each specific date (YYYY-MM-DD)
  xpPerDateByActivity: { [dateString: string]: { meals: number; recovery: number; training: number } }; // Track XP by activity type per date
  lastXpReset: number; // Keep for compatibility, but not used for new system
  level: number;
  timezone: string;
  xpFeatureStart: number; // Account creation timestamp - only dates >= this are eligible
  xpLimitsStart: number; // When the new per-activity limits started applying (for existing user migration)
}

export interface XpAward {
  reason: 'meal' | 'recovery' | 'training';
  amount: number; // Amount actually awarded
  timestamp: number;
  eligible: boolean;
  targetDate: string; // The date (YYYY-MM-DD) this XP is attributed to
  cappedAmount?: number; // Amount actually awarded if capped
  activityLimitReached?: boolean; // True if this specific activity type hit its daily limit
}

export interface XpConstants {
  MEAL_XP: 50;
  RECOVERY_XP: 300;
  TRAINING_XP: 300;
  
  // Per-activity-type limits per date
  MEALS_XP_PER_DATE: 300; // Max 6 meals × 50 XP = 300 XP from meals per date
  RECOVERY_XP_PER_DATE: 300; // Max 1 recovery × 300 XP = 300 XP from recovery per date  
  TRAINING_XP_PER_DATE: 300; // Max 1 training × 300 XP = 300 XP from training per date
  
  PER_DATE_CAP: 900; // Maximum total XP from any single date (300 + 300 + 300)

  LEVEL_CURVE_CONSTANT: 30; // REVERTED TO ORIGINAL VALUE
}

export const XP_CONSTANTS: XpConstants = {
  MEAL_XP: 50,
  RECOVERY_XP: 300,
  TRAINING_XP: 300,
  MEALS_XP_PER_DATE: 300,
  RECOVERY_XP_PER_DATE: 300,
  TRAINING_XP_PER_DATE: 300,
  PER_DATE_CAP: 900,
  LEVEL_CURVE_CONSTANT: 30, // REVERTED TO ORIGINAL VALUE
};

export interface LevelUpEvent {
  newLevel: number;
  previousLevel: number;
  totalXp: number;
} 