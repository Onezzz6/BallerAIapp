import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
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
  const screenWidth = Dimensions.get('window').width;
  const containerWidth = screenWidth * 0.4; // Background pill is 40% of screen width
  const progressBarWidth = containerWidth - 50; // Progress bar fills background with margins for badge and padding

  if (isLoading || !xpData) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>-</Text>
        </View>
        <ProgressBar 
          progress={0}
          width={progressBarWidth}
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
      <View style={[styles.levelBadge, { backgroundColor: '#3F63F6' }]}>
        <Text style={styles.levelText} allowFontScaling={false}>{xpData.level}</Text>
      </View>
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarContainer}>
          <ProgressBar 
            progress={clampedProgress}
            width={progressBarWidth}
            height={20}
            color="#99E86C"
            unfilledColor="#3F63F6"
            borderWidth={0}
            borderRadius={24}
            animated={true}
            animationType="timing"
            animationConfig={{ duration: 500 }}
          />
          
          {/* XP Text overlaid on progress bar */}
          <Text style={styles.xpTextOverlay} allowFontScaling={false}>
            {isMaxLevel 
              ? 'MAX' 
              : `${xpInCurrentLevel}/${xpNeededForCurrentLevel}`
            }
          </Text>
        </View>
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
    marginLeft: -2,
    marginRight: -32,
    marginTop: 1,
    paddingHorizontal: 7,
    paddingVertical: 8,
    minWidth: Dimensions.get('window').width * 0.4, // 40% of screen width
    height: 32, // Consistent height
  },
  levelBadge: {
    height: 24,
    minWidth: 24,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -1,
    marginRight: 12,
  },
  levelText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  progressContainer: {
    alignItems: 'flex-start',
  },
  progressBarContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpTextOverlay: {
    position: 'absolute',
    fontSize: 12,
    color: 'white',
    fontWeight: '700',
  },
}); 