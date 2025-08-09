import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconBadge from 'react-native-icon-badge';
import { useXp } from '../../context/XpContext';
import { getBallerIconTier, getUnlockedIconTiers, getNextIconTier, BALLER_ICON_TIERS, BallerIconTier } from '../../utils/ballerIcons';

// Accordion-style Baller icon gallery for profile screen
export const BallerIconGallery: React.FC = () => {
  const { xpData } = useXp();
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!xpData) return null;
  
  const currentTier = getBallerIconTier(xpData.level);
  const unlockedTiers = getUnlockedIconTiers(xpData.level);
  const nextTier = getNextIconTier(xpData.level);
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <View style={styles.accordionContainer}>
      {/* Accordion Header - Always visible */}
      <TouchableOpacity style={styles.accordionHeader} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          {/* Level Badge using ready-made component */}
          <IconBadge
            MainElement={
              <View style={[styles.levelIcon, { backgroundColor: currentTier.iconColor }]}>
                <Ionicons 
                  name={currentTier.iconName as any} 
                  size={20} 
                  color="white" 
                />
              </View>
            }
            BadgeElement={
              <Text style={styles.levelBadgeText}>{xpData.level}</Text>
            }
            IconBadgeStyle={styles.levelBadge}
            Hidden={false}
          />
          
          <View style={styles.tierInfo}>
            <Text style={styles.tierTitle}>{currentTier.tierName}</Text>
            <Text style={styles.tierSubtitle}>
              Level {xpData.level} • {nextTier ? `${nextTier.minLevel - xpData.level} levels to ${nextTier.tierName}` : 'Max tier reached!'}
            </Text>
          </View>
        </View>
        
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {/* Accordion Content - Shows when expanded */}
      {isExpanded && (
        <Animated.View style={styles.accordionContent}>
          {/* Progress to next tier */}
          {nextTier && (
            <View style={styles.progressSection}>
              <Text style={styles.progressText}>
                Next: <Text style={styles.nextTierName}>{nextTier.tierName}</Text>
              </Text>
              <Text style={styles.progressSubtext}>
                Unlock at Level {nextTier.minLevel}
              </Text>
            </View>
          )}
          
          {/* All tiers grid */}
          <View style={styles.tiersGrid}>
            <Text style={styles.gridTitle}>All Baller Tiers</Text>
            <View style={styles.tiersList}>
              {BALLER_ICON_TIERS.slice(0, 6).map(tier => {
                const isUnlocked = unlockedTiers.includes(tier);
                const isCurrent = tier === currentTier;
                
                return (
                  <View 
                    key={tier.minLevel}
                    style={[
                      styles.tierItem,
                      isCurrent && styles.currentTierItem,
                      !isUnlocked && styles.lockedTierItem
                    ]}
                  >
                    <IconBadge
                      MainElement={
                        <View style={[
                          styles.tierIconSmall, 
                          { backgroundColor: isUnlocked ? tier.iconColor : '#E0E0E0' }
                        ]}>
                          <Ionicons 
                            name={tier.iconName as any} 
                            size={14} 
                            color={isUnlocked ? 'white' : '#999'} 
                          />
                        </View>
                      }
                      BadgeElement={
                        <Text style={styles.tierLevelBadge}>{tier.minLevel}</Text>
                      }
                      IconBadgeStyle={[
                        styles.tierLevelBadgeStyle,
                        { backgroundColor: isUnlocked ? tier.iconColor : '#999' }
                      ]}
                      Hidden={false}
                    />
                    
                    <Text style={[
                      styles.tierItemName,
                      !isUnlocked && styles.lockedText
                    ]}>
                      {tier.tierName.split(' ')[0]} {/* First word only */}
                    </Text>
                    
                    {isCurrent && (
                      <View style={styles.currentIndicator}>
                        <Text style={styles.currentText}>CURRENT</Text>
                      </View>
                    )}
                    
                    {!isUnlocked && (
                      <Ionicons 
                        name="lock-closed" 
                        size={10} 
                        color="#999" 
                        style={styles.lockIcon}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

// Single Baller icon for headers (keep this simple)
export const BallerIcon: React.FC<{ size?: number }> = ({ size = 32 }) => {
  const { xpData } = useXp();
  
  if (!xpData) return null;
  
  const currentTier = getBallerIconTier(xpData.level);
  
  return (
    <IconBadge
      MainElement={
        <View style={[styles.singleIcon, { 
          width: size, 
          height: size,
          backgroundColor: currentTier.iconColor 
        }]}>
          <Ionicons 
            name={currentTier.iconName as any} 
            size={size * 0.6} 
            color="white" 
          />
        </View>
      }
      BadgeElement={
        <Text style={styles.singleLevelText}>{xpData.level}</Text>
      }
      IconBadgeStyle={[styles.singleLevelBadge, { backgroundColor: currentTier.iconColor }]}
      Hidden={false}
    />
  );
};

const styles = StyleSheet.create({
  // Accordion container
  accordionContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 0,
    marginVertical: 12,
    overflow: 'hidden',
  },
  
  // Accordion header (always visible)
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  // Level icon and badge
  levelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  levelBadge: {
    backgroundColor: '#FF6B6B',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
  },
  levelBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Tier info
  tierInfo: {
    flex: 1,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  tierSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  
  // Accordion content
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  
  // Progress section
  progressSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  nextTierName: {
    fontWeight: '700',
  },
  progressSubtext: {
    fontSize: 12,
    color: '#1976D2',
    marginTop: 2,
  },
  
  // Tiers grid
  tiersGrid: {
    marginTop: 8,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  tiersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  // Individual tier items
  tierItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  currentTierItem: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 8,
    margin: -4,
  },
  lockedTierItem: {
    opacity: 0.5,
  },
  
  // Tier icon small
  tierIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierLevelBadge: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  tierLevelBadgeStyle: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
  },
  
  // Tier item text
  tierItemName: {
    fontSize: 10,
    fontWeight: '500',
    color: '#000',
    marginTop: 4,
    textAlign: 'center',
  },
  lockedText: {
    color: '#999',
  },
  
  // Current indicator
  currentIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  currentText: {
    fontSize: 8,
    color: 'white',
    fontWeight: '700',
  },
  
  // Lock icon
  lockIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  
  // Single icon styles (for headers)
  singleIcon: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleLevelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  singleLevelBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
  },
}); 