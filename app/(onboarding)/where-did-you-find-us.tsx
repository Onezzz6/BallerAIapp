import { View, Text, Pressable, SafeAreaView, ScrollView, Image } from 'react-native';
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

// Import all custom logos
const igLogo = require('../../assets/images/iglogo.png');
const tiktokLogo = require('../../assets/images/tiktok.png');
const facebookLogo = require('../../assets/images/facebook.png');
const youtubeLogo = require('../../assets/images/youtube.png');
const xLogo = require('../../assets/images/x.png');

type DiscoveryOption = {
  id: string;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  customImage?: any;
  bgColor: string;
};

const DISCOVERY_OPTIONS: DiscoveryOption[] = [
  {
    id: 'academy',
    title: 'Academy/Club',
    icon: 'football',
    bgColor: '#3B82F6',
  },
  {
    id: 'instagram',
    title: 'Instagram',
    customImage: igLogo,
    bgColor: '#E4405F',
  },
  {
    id: 'tiktok',
    title: 'TikTok',
    customImage: tiktokLogo,
    bgColor: '#000000',
  },
  {
    id: 'facebook',
    title: 'Facebook',
    customImage: facebookLogo,
    bgColor: '#1877F2',
  },
  {
    id: 'youtube',
    title: 'YouTube',
    customImage: youtubeLogo,
    bgColor: '#FF0000',
  },
  {
    id: 'x',
    title: 'X',
    customImage: xLogo,
    bgColor: '#000000',
  },
  {
    id: 'web',
    title: 'Web',
    icon: 'globe',
    bgColor: '#6B7280',
  },
  {
    id: 'tv',
    title: 'TV',
    icon: 'tv',
    bgColor: '#6B7280',
  },
  {
    id: 'friend',
    title: 'Friend',
    icon: 'person',
    bgColor: '#8B5CF6',
  },
  {
    id: 'other',
    title: 'Other',
    icon: 'ellipsis-horizontal',
    bgColor: '#F59E0B',
  },
];

export default function WhereDidYouFindUsScreen() {
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(onboardingData.discoverySource);
  const headerHeight = useOnboardingHeaderHeight();
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('where-did-you-find-us');

  const handleContinue = async () => {
    if (selected) {
      haptics.light();
      await analyticsService.logEvent('A0_04_where_did_you_find_us_continue');
      await updateOnboardingData({ discoverySource: selected });
      // NEW: Use automatic navigation instead of hardcoded route
      goToNext();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      {/* NEW: Automatic step detection */}
      <OnboardingHeader screenId="where-did-you-find-us" />

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
            Where did you find us?
          </Text>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 100, // Space for fixed button
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{
            gap: 12, // Increased spacing
          }}>
            {DISCOVERY_OPTIONS.map((option) => (
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
                {option.customImage ? (
                  // For custom images like Instagram, use a container to match alignment
                  <View style={{
                    width: 40,
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}>
                    <Image 
                      source={option.customImage}
                      style={{
                        width: option.id === 'instagram' ? 72 
                             : option.id === 'facebook' || option.id === 'tiktok' ? 56
                             : option.id === 'x' ? 40 
                             : 64,
                        height: option.id === 'instagram' ? 72 
                              : option.id === 'facebook' || option.id === 'tiktok' ? 56
                              : option.id === 'x' ? 40 
                              : 64,
                      }}
                      resizeMode="contain"
                      onError={(error) => console.log('Image load error:', error)}
                      onLoad={() => console.log('Image loaded successfully')}
                    />
                  </View>
                ) : (
                  // For icons, use the circular background
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
                      name={option.icon!} 
                      size={20} 
                      color={selected === option.id ? option.bgColor : '#FFFFFF'} 
                    />
                  </View>
                )}

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