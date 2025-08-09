// Baller icon system - different icons unlock every 5 levels

export interface BallerIconTier {
  minLevel: number;
  maxLevel: number;
  iconName: string;
  iconColor: string;
  tierName: string;
  description: string;
}

// Icon tiers that unlock every 5 levels
export const BALLER_ICON_TIERS: BallerIconTier[] = [
  {
    minLevel: 1,
    maxLevel: 4,
    iconName: 'football-outline',
    iconColor: '#8E8E93',
    tierName: 'Rookie Baller',
    description: 'Just starting your journey'
  },
  {
    minLevel: 5,
    maxLevel: 9,
    iconName: 'football',
    iconColor: '#007AFF',
    tierName: 'Rising Star',
    description: 'Making progress on the field'
  },
  {
    minLevel: 10,
    maxLevel: 14,
    iconName: 'trophy-outline',
    iconColor: '#32D74B',
    tierName: 'Skilled Player',
    description: 'Showing real talent'
  },
  {
    minLevel: 15,
    maxLevel: 19,
    iconName: 'trophy',
    iconColor: '#FF9500',
    tierName: 'Team Captain',
    description: 'Leading by example'
  },
  {
    minLevel: 20,
    maxLevel: 24,
    iconName: 'medal-outline',
    iconColor: '#FF3B30',
    tierName: 'Pro Prospect',
    description: 'Professional level skills'
  },
  {
    minLevel: 25,
    maxLevel: 29,
    iconName: 'medal',
    iconColor: '#AF52DE',
    tierName: 'Elite Athlete',
    description: 'Among the best'
  },
  {
    minLevel: 30,
    maxLevel: 34,
    iconName: 'star-outline',
    iconColor: '#FFD60A',
    tierName: 'Rising Legend',
    description: 'Legendary potential'
  },
  {
    minLevel: 35,
    maxLevel: 39,
    iconName: 'star',
    iconColor: '#FFD60A',
    tierName: 'Baller Legend',
    description: 'True football legend'
  },
  {
    minLevel: 40,
    maxLevel: 49,
    iconName: 'diamond-outline',
    iconColor: '#00D4FF',
    tierName: 'Diamond Elite',
    description: 'Rare diamond tier'
  },
  {
    minLevel: 50,
    maxLevel: 999,
    iconName: 'diamond',
    iconColor: '#FF6B6B',
    tierName: 'Ultimate Baller',
    description: 'The ultimate football master'
  }
];

/**
 * Get the current Baller icon tier for a given level
 */
export function getBallerIconTier(level: number): BallerIconTier {
  const tier = BALLER_ICON_TIERS.find(
    tier => level >= tier.minLevel && level <= tier.maxLevel
  );
  
  // Fallback to the highest tier if level exceeds all defined tiers
  return tier || BALLER_ICON_TIERS[BALLER_ICON_TIERS.length - 1];
}

/**
 * Get all unlocked icon tiers for a given level
 */
export function getUnlockedIconTiers(level: number): BallerIconTier[] {
  return BALLER_ICON_TIERS.filter(tier => level >= tier.minLevel);
}

/**
 * Get the next icon tier to unlock
 */
export function getNextIconTier(level: number): BallerIconTier | null {
  const currentTier = getBallerIconTier(level);
  const currentIndex = BALLER_ICON_TIERS.findIndex(tier => tier === currentTier);
  
  if (currentIndex < BALLER_ICON_TIERS.length - 1) {
    return BALLER_ICON_TIERS[currentIndex + 1];
  }
  
  return null; // Already at max tier
}

/**
 * Check if a new icon tier was just unlocked
 */
export function didUnlockNewIconTier(previousLevel: number, newLevel: number): boolean {
  const previousTier = getBallerIconTier(previousLevel);
  const newTier = getBallerIconTier(newLevel);
  
  return previousTier.minLevel !== newTier.minLevel;
} 