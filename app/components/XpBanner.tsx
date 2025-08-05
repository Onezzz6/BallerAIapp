import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useXp } from '../../context/XpContext';
import { calculateXpToNextLevel, calculateLevelProgress, getBadgeColor } from '../../utils/xpCalculations';
import { XP_CONSTANTS } from '../../types/xp';

interface XpBannerProps {
  onTap?: () => void;
  compact?: boolean;
}

export const XpBanner: React.FC<XpBannerProps> = ({ onTap, compact = false }) => {
  const { xpData, isLoading, isCapReached, getRemainingXpToday } = useXp();

  if (isLoading) {
    return (
      <View style={[styles.container, compact && styles.compact]}>
        <Text style={styles.loadingText}>Loading XP...</Text>
      </View>
    );
  }

  if (!xpData) {
    return null;
  }

  const progress = calculateLevelProgress(xpData.totalXp);
  const xpToNext = calculateXpToNextLevel(xpData.totalXp);
  const badgeColor = getBadgeColor(xpData.level);
  const remainingToday = getRemainingXpToday();

  const Container = onTap ? TouchableOpacity : View;

  return (
    <Container 
      style={[styles.container, compact && styles.compact]}
      onPress={onTap}
      activeOpacity={onTap ? 0.7 : 1}
    >
      {/* Level Badge */}
      <View style={[styles.levelBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.levelText}>Lv {xpData.level}</Text>
      </View>

      {/* XP Info */}
      <View style={styles.xpInfo}>
        <Text style={styles.totalXpText}>{xpData.totalXp.toLocaleString()} XP</Text>
        
        {!compact && (
          <>
            <Text style={styles.progressText}>
              {xpToNext > 0 ? `${xpToNext} XP to Level ${xpData.level + 1}` : 'Max Level!'}
            </Text>
            
            {/* Progress Bar */}
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
          </>
        )}
      </View>

      {/* Daily XP Status */}
      <View style={styles.dailyStatus}>
        <Text style={[styles.dailyText, isCapReached() && styles.capReached]}>
          {xpData.xpToday}/{XP_CONSTANTS.DAILY_CAP}
        </Text>
        {!compact && (
          <Text style={styles.dailyLabel}>Today</Text>
        )}
        {isCapReached() && !compact && (
          <Text style={styles.capLabel}>Cap Reached!</Text>
        )}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  compact: {
    padding: 12,
    marginVertical: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 12,
  },
  levelText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  xpInfo: {
    flex: 1,
  },
  totalXpText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  dailyStatus: {
    alignItems: 'flex-end',
  },
  dailyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  dailyLabel: {
    fontSize: 10,
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  capReached: {
    color: '#28a745',
  },
  capLabel: {
    fontSize: 10,
    color: '#28a745',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
}); 