import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bar as ProgressBar } from 'react-native-progress';
import { useXp } from '../../context/XpContext';
import { calculateLevelProgress, getBadgeColor, calculateXpForLevel } from '../../utils/xpCalculations';

interface LevelProgressIndicatorProps {
  onTap?: () => void;
  style?: any;
}

export const LevelProgressIndicator: React.FC<LevelProgressIndicatorProps> = ({ 
  onTap, 
  style 
}) => {
  const { xpData, isLoading } = useXp();

  if (isLoading || !xpData) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>-</Text>
        </View>
        <ProgressBar 
          progress={0}
          width={60}
          height={8}
          color="#e9ecef"
          unfilledColor="rgba(0,0,0,0.1)"
          borderWidth={0}
          borderRadius={4}
        />
      </View>
    );
  }

  const progress = calculateLevelProgress(xpData.totalXp);
  const badgeColor = getBadgeColor(xpData.level);
  const currentLevelXp = calculateXpForLevel(xpData.level);
  const nextLevelXp = calculateXpForLevel(xpData.level + 1);
  
  const xpInCurrentLevel = xpData.totalXp - currentLevelXp;
  const xpNeededForCurrentLevel = nextLevelXp - currentLevelXp;
  const isMaxLevel = nextLevelXp === currentLevelXp;
  
  const clampedProgress = Math.max(0, Math.min(1, progress));

  const Container = onTap ? TouchableOpacity : View;

  return (
    <Container 
      style={[styles.container, style]}
      onPress={onTap}
      activeOpacity={onTap ? 0.8 : 1}
    >
      {/* Level Badge */}
      <View style={[styles.levelBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.levelText}>{xpData.level}</Text>
      </View>
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <ProgressBar 
          progress={clampedProgress}
          width={60}
          height={8}
          color={badgeColor}
          unfilledColor="rgba(0,0,0,0.1)"
          borderWidth={0}
          borderRadius={4}
          animated={true}
          animationType="timing"
          animationConfig={{ duration: 500 }}
        />
        
        {/* XP Text */}
        <Text style={styles.xpText}>
          {isMaxLevel 
            ? 'MAX' 
            : `${xpInCurrentLevel}/${xpNeededForCurrentLevel}`
          }
        </Text>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    minWidth: 120, // Consistent width
    height: 40, // Consistent height
  },
  levelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  levelText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
  },
  xpText: {
    fontSize: 9,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
}); 