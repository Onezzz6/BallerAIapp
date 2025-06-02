import { View, Text, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeIn, FadeInUp } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import ScrollIfNeeded from '../components/ScrollIfNeeded';
import { useState } from 'react';
import analytics from '@react-native-firebase/analytics';

export default function SocialProofScreen() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    // Define the snap positions that correspond to each image being centered
    const snapPositions = [0, 320, 640, 960, 1280, 1600];
    
    // Find the closest snap position to determine the current page
    let closestIndex = 0;
    let minDistance = Math.abs(scrollPosition - snapPositions[0]);
    
    for (let i = 1; i < snapPositions.length; i++) {
      const distance = Math.abs(scrollPosition - snapPositions[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    setCurrentPage(closestIndex);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <OnboardingHeader 
        currentStep={24}
        totalSteps={26}
      />

      <ScrollIfNeeded
        style={{
          backgroundColor: '#ffffff',
        }}
        bounces={true}
      >
        <View style={{
          paddingBottom: 40,
        }}>
          {/* Title Section */}
          <Animated.View 
            entering={FadeIn.duration(400)}
            style={{
              paddingHorizontal: 24,
              paddingTop: 40,
              marginBottom: 24,
            }}
          >
            <Text style={{
              fontSize: 28,
              color: '#000000',
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: 12,
            }} allowFontScaling={false}>
              See what Players are saying about the newest tech →
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#666666',
              textAlign: 'center',
              lineHeight: 22,
            }} allowFontScaling={false}>
              
            </Text>
          </Animated.View>

          {/* Instagram DM Screenshots Carousel */}
          <View style={{
            marginBottom: 32,
          }}>
            <ScrollView
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              style={{
                height: 400,
              }}
              contentContainerStyle={{
                paddingHorizontal: 60,
              }}
              snapToOffsets={[0, 320, 640, 960, 1280, 1600]}
              snapToAlignment="center"
              decelerationRate="fast"
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              <Animated.View
                entering={FadeInUp.duration(400).delay(100)}
                style={{
                  width: 300,
                  height: 400,
                  borderRadius: 20,
                  overflow: 'hidden',
                  marginHorizontal: 10,
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 6,
                  },
                  shadowOpacity: 0.2,
                  shadowRadius: 15,
                  elevation: 8,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                }}
              >
                <Image 
                  source={require('../../assets/images/dm1.png')}
                  style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'contain',
                  }}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInUp.duration(400).delay(200)}
                style={{
                  width: 300,
                  height: 400,
                  borderRadius: 20,
                  overflow: 'hidden',
                  marginHorizontal: 10,
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 6,
                  },
                  shadowOpacity: 0.2,
                  shadowRadius: 15,
                  elevation: 8,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                }}
              >
                <Image 
                  source={require('../../assets/images/dm5.png')}
                  style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'contain',
                  }}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInUp.duration(400).delay(300)}
                style={{
                  width: 300,
                  height: 400,
                  borderRadius: 20,
                  overflow: 'hidden',
                  marginHorizontal: 10,
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 6,
                  },
                  shadowOpacity: 0.2,
                  shadowRadius: 15,
                  elevation: 8,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                }}
              >
                <Image 
                  source={require('../../assets/images/dm2.png')}
                  style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'contain',
                  }}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInUp.duration(400).delay(400)}
                style={{
                  width: 300,
                  height: 400,
                  borderRadius: 20,
                  overflow: 'hidden',
                  marginHorizontal: 10,
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 6,
                  },
                  shadowOpacity: 0.2,
                  shadowRadius: 15,
                  elevation: 8,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                }}
              >
                <Image 
                  source={require('../../assets/images/dm4.png')}
                  style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'contain',
                  }}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInUp.duration(400).delay(500)}
                style={{
                  width: 300,
                  height: 400,
                  borderRadius: 20,
                  overflow: 'hidden',
                  marginHorizontal: 10,
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 6,
                  },
                  shadowOpacity: 0.2,
                  shadowRadius: 15,
                  elevation: 8,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                }}
              >
                <Image 
                  source={require('../../assets/images/dm3.png')}
                  style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'contain',
                  }}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInUp.duration(400).delay(600)}
                style={{
                  width: 300,
                  height: 400,
                  borderRadius: 20,
                  overflow: 'hidden',
                  marginHorizontal: 10,
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 6,
                  },
                  shadowOpacity: 0.2,
                  shadowRadius: 15,
                  elevation: 8,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                }}
              >
                <Image 
                  source={require('../../assets/images/dm6.png')}
                  style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'contain',
                  }}
                />
              </Animated.View>
            </ScrollView>

            {/* Pagination Dots */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 20,
              gap: 12,
            }}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <Animated.View
                  key={index}
                  style={{
                    width: index === currentPage ? 16 : 12,
                    height: index === currentPage ? 16 : 12,
                    borderRadius: index === currentPage ? 8 : 6,
                    backgroundColor: index === currentPage ? '#4064F6' : '#E5E5E5',
                  }}
                />
              ))}
            </View>
          </View>

          {/* Continue Button */}
          <View style={{
            paddingHorizontal: 24,
          }}>
            <Button 
              title="Continue" 
              onPress={async () => {
                await analytics().logEvent('onboarding_social_proof_continue');
                router.push('/motivation-reason');
              }}
              buttonStyle={{
                backgroundColor: '#4064F6',
              }}
            />
          </View>
        </View>
      </ScrollIfNeeded>
    </View>
  );
} 