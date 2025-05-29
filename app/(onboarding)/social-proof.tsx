import { View, Text, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeIn, FadeInUp } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import ScrollIfNeeded from '../components/ScrollIfNeeded';
import { Ionicons } from '@expo/vector-icons';

export default function SocialProofScreen() {
  const router = useRouter();

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
              Players Are Already Using the Newest Tech
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#666666',
              textAlign: 'center',
              lineHeight: 22,
            }} allowFontScaling={false}>
              See what they're saying about it
            </Text>
          </Animated.View>

          {/* Instagram DM Screenshots Container */}
          <View style={{
            paddingHorizontal: 24,
            marginBottom: 32,
          }}>
            {/* First Row - DM1 and DM2 */}
            <View style={{
              flexDirection: 'row',
              gap: 16,
              marginBottom: 16,
            }}>
              <Animated.View
                entering={FadeInUp.duration(400).delay(100)}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 4,
                  },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 5,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                  height: 200,
                }}
              >
                <Image 
                  source={require('../../assets/images/dm1.png')}
                  style={{
                    width: '100%',
                    height: 200,
                    resizeMode: 'cover',
                  }}
                />
                <View style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: '#99E86C',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 16,
                }}>
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: '#FFFFFF',
                  }}>
                    Verified
                  </Text>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.duration(400).delay(200)}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 4,
                  },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 5,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                  height: 200,
                }}
              >
                <Image 
                  source={require('../../assets/images/dm2.png')}
                  style={{
                    width: '100%',
                    height: 200,
                    resizeMode: 'cover',
                  }}
                />
              </Animated.View>
            </View>

            {/* Second Row - DM3 and DM4 */}
            <View style={{
              flexDirection: 'row',
              gap: 16,
            }}>
              <Animated.View
                entering={FadeInUp.duration(400).delay(300)}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 4,
                  },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 5,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                  height: 200,
                }}
              >
                <Image 
                  source={require('../../assets/images/dm3.png')}
                  style={{
                    width: '100%',
                    height: 200,
                    resizeMode: 'cover',
                  }}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInUp.duration(400).delay(400)}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 4,
                  },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 5,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                  height: 200,
                }}
              >
                <Image 
                  source={require('../../assets/images/dm4.png')}
                  style={{
                    width: '100%',
                    height: 200,
                    resizeMode: 'contain',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </Animated.View>
            </View>
          </View>

          {/* Key Highlights */}
          <Animated.View
            entering={FadeIn.duration(400).delay(400)}
            style={{
              paddingHorizontal: 24,
              marginBottom: 32,
            }}
          >
            <View style={{
              backgroundColor: '#F8F8F8',
              borderRadius: 16,
              padding: 20,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#000000',
                marginBottom: 16,
                textAlign: 'center',
              }}>
                What Players Are Saying
              </Text>
              
              <View style={{ gap: 12 }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#DCF4F5',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Ionicons name="fitness" size={20} color="#4064F6" />
                  </View>
                  <Text style={{
                    flex: 1,
                    fontSize: 15,
                    color: '#333333',
                    lineHeight: 20,
                  }}>
                    "Like having a mini physio and nutritionist"
                  </Text>
                </View>

                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#FFE8E8',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Ionicons name="trophy" size={20} color="#FF6B6B" />
                  </View>
                  <Text style={{
                    flex: 1,
                    fontSize: 15,
                    color: '#333333',
                    lineHeight: 20,
                  }}>
                    "Got named in the starting 11"
                  </Text>
                </View>

                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#E8FFE8',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Ionicons name="trending-up" size={20} color="#99E86C" />
                  </View>
                  <Text style={{
                    flex: 1,
                    fontSize: 15,
                    color: '#333333',
                    lineHeight: 20,
                  }}>
                    "Improving fast but legs still fresh on game days"
                  </Text>
                </View>

                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#E8F0FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Ionicons name="heart" size={20} color="#4064F6" />
                  </View>
                  <Text style={{
                    flex: 1,
                    fontSize: 15,
                    color: '#333333',
                    lineHeight: 20,
                  }}>
                    "Recovery is made so easy that its kinda fun"
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Continue Button */}
          <View style={{
            paddingHorizontal: 24,
          }}>
            <Button 
              title="Continue" 
              onPress={() => {
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