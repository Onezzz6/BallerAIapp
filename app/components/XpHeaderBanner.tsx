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
  const nextLevelXp = calculateXpForLevel(xpData.level + 1);

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
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: badgeColor 
              }
            ]} 
          />
        </View>
        <Text style={styles.xpText}>
          {xpData.totalXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
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
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  xpText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '500',
  },
}); 