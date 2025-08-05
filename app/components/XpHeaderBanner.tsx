import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useXp } from '../../context/XpContext';
import { calculateLevelProgress, getBadgeColor, calculateXpForLevel, calculateLevelFromXp } from '../../utils/xpCalculations';
import { XP_CONSTANTS } from '../../types/xp';

interface XpHeaderBannerProps {
  onTap?: () => void;
}

export const XpHeaderBanner: React.FC<XpHeaderBannerProps> = ({ onTap }) => {
  const { xpData, isLoading, isCapReached } = useXp();

  if (isLoading || !xpData) {
    return null; // Don't show anything while loading
  }

  const progress = calculateLevelProgress(xpData.totalXp);
  const badgeColor = getBadgeColor(xpData.level);
  const currentLevelXp = calculateXpForLevel(xpData.level);
  const nextLevelXp = calculateXpForLevel(xpData.level + 1);
  
  // Calculate progress within current level (not total lifetime XP)
  // Handle edge case where user might be at max level
  const xpInCurrentLevel = xpData.totalXp - currentLevelXp;
  const xpNeededForCurrentLevel = nextLevelXp - currentLevelXp;
  
  // Check for max level edge case
  const isMaxLevel = nextLevelXp === currentLevelXp;
  
  // Ensure progress is between 0 and 1, and calculate exact percentage
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const progressPercentage = Math.round(clampedProgress * 100);
  
  // Debug logging (remove this later if needed)
  if (__DEV__) {
    console.log(`📊 XP Progress Debug:`, {
      totalXp: xpData.totalXp,
      level: xpData.level,
      currentLevelXp,
      nextLevelXp,
      xpInCurrentLevel,
      xpNeededForCurrentLevel,
      rawProgress: progress,
      clampedProgress,
      progressPercentage: `${progressPercentage}%`,
      displayFormat: isMaxLevel ? 'MAX LEVEL' : `${xpInCurrentLevel}/${xpNeededForCurrentLevel} XP`,
      isMaxLevel
    });
  }

  const Container = onTap ? TouchableOpacity : View;

  return (
    <Container 
      style={styles.container}
      onPress={onTap}
      activeOpacity={onTap ? 0.7 : 1}
    >
      {/* Level Badge */}
      <View style={[styles.levelBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.levelText}>Lv {xpData.level}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${progressPercentage}%`,
                backgroundColor: badgeColor 
              }
            ]} 
          />
          {/* Alternative flex-based approach - uncomment if percentage doesn't work */}
          {/* <View style={{ flex: progressPercentage, backgroundColor: badgeColor, height: '100%' }} />
          <View style={{ flex: 100 - progressPercentage, backgroundColor: 'transparent' }} /> */}
        </View>
        <Text style={styles.xpText}>
          {isMaxLevel ? 'MAX LEVEL' : `${xpInCurrentLevel.toLocaleString()} / ${xpNeededForCurrentLevel.toLocaleString()} XP`}
        </Text>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  levelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#e9ecef',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
    position: 'absolute',
    left: 0,
    top: 0,
    minWidth: 0, // Ensure it can be 0 width
  },
  xpText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '500',
  },
}); 