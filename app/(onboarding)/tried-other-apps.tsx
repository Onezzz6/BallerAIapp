import { View, Text, Pressable, SafeAreaView, ScrollView } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import { useOnboarding } from '../context/OnboardingContext';
import { useState, useEffect } from 'react';
import analytics from '@react-native-firebase/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import analyticsService from '../services/analytics';

const OPTIONS = [
  {
    id: 'no',
    title: 'No',
    icon: 'close-circle' as keyof typeof Ionicons.glyphMap,
    bgColor: '#EF4444',
  },
  {
    id: 'yes',
    title: 'Yes',
    icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
    bgColor: '#10B981',
  },
];

export default function TriedOtherAppsScreen() {
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.triedOtherApps);
  const headerHeight = useOnboardingHeaderHeight();
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('tried-other-apps');

  const handleContinue = async () => {
    if (selected) {
      haptics.light();
      await analyticsService.logEvent('AA__05_tried_other_apps_continue');
      await updateOnboardingData({ triedOtherApps: selected });
      // NEW: Use automatic navigation instead of hardcoded route
      goToNext();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="tried-other-apps" />

      <Animated.View 
        entering={FadeInRight.duration(200).withInitialValues({ transform: [{ translateX: 400 }] })}
        style={{
          flex: 1,
          backgroundColor: colors.backgroundColor,
        }}
      >

        {/* Fixed Title Section - Locked at top like reference */}
        <View style={{
          paddingHorizontal: 24,
          paddingTop: headerHeight,
          paddingBottom: 16,
        }}>
          <Text style={[
            typography.title,
            {
            textAlign: 'left',
              marginBottom: 8,
            }
          ]} allowFontScaling={false}>
            Have you tried other football training apps?
          </Text>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 100, // Space for fixed button
            justifyContent: 'center',
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{
            gap: 12, // Increased spacing
          }}>
            {OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => {
                  haptics.light();
                  setSelected(option.id);
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  width: '100%',
                  padding: 16,
                  backgroundColor: selected === option.id ? '#99E86C' : '#FFFFFF',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selected === option.id ? '#99E86C' : '#E5E5E5',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                {/* Icon Container */}
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: selected === option.id ? '#FFFFFF' : option.bgColor,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}>
                  <Ionicons 
                    name={option.icon} 
                    size={20} 
                    color={selected === option.id ? option.bgColor : '#FFFFFF'} 
                  />
                </View>

                {/* Title */}
                <Text style={{
                  fontSize: 18,
                  color: '#000000',
                  fontWeight: '600',
                  flex: 1,
                }}>
                  {option.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Static Continue Button - No animation, always in same position */}
      <View style={{
        position: 'absolute',
        bottom: 32,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingTop: 14,
        paddingBottom: 14,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.veryLightGray,
      }}>
          <Button 
            title="Continue" 
            onPress={handleContinue}
            disabled={!selected}
          />
        </View>
    </SafeAreaView>
  );
} 