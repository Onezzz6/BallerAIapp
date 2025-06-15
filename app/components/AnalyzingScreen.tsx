import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  PinwheelIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const professionalFacts = [
  {
    icon: "analytics-outline",
    text: "All top-tier academies and professional teams track each player's load, nutrition, and have personalized recovery plans for every day."
  },
  {
    icon: "time-outline", 
    text: "Professional players spend 5-7 hours every day at the training center perfecting their craft."
  },
  {
    icon: "trophy-outline",
    text: "At the pro level, basketball isn't just a hobby—it's a complete lifestyle and mindset."
  },
  {
    icon: "restaurant-outline",
    text: "Every meal is calculated. Pros consume 4,000+ calories daily with perfect macro balance."
  }
];

export default function AnalyzingScreen() {
  const router = useRouter();

  const handleContinue = () => {
    router.replace('/fitness-level');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - Same style as other screens */}
        <View style={{
          paddingTop: 48,
          paddingHorizontal: 24,
          backgroundColor: '#ffffff',
        }}>
          {/* Header with Logo */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 92,
          }}>
            {/* Title */}
            <Text style={{
              fontSize: 28,
              fontWeight: '900',
              color: '#000000',
            }} 
            allowFontScaling={false}
            maxFontSizeMultiplier={1.2}>
              Welcome
            </Text>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
              <Animated.View 
                entering={PinwheelIn.duration(500)}
              >
              <Image 
                source={require('../../assets/images/BallerAILogo.png')}
                style={{
                  width: 32,
                  height: 32,
                }}
                resizeMode="contain"
              />
              </Animated.View>
              <Text style={{
                fontSize: 28,
                fontWeight: '300',
                color: '#000000',
              }} 
              allowFontScaling={false}
              maxFontSizeMultiplier={1.2}>
                BallerAI
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          {/* Mascot */}
          <View style={{
            alignItems: 'center',
            marginVertical: 32,
          }}>
            <View style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: '#F0F4FF',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#4064F6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 4,
            }}>
              <Image
                source={require('../../assets/images/mascot.png')}
                style={{
                  width: 100,
                  height: 100,
                  resizeMode: 'contain',
                }}
              />
            </View>
          </View>

          {/* Title */}
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            color: '#000000',
            textAlign: 'center',
            marginBottom: 8,
          }}>
            Train Like a Pro
          </Text>
          
          <Text style={{
            fontSize: 16,
            color: '#666666',
            textAlign: 'center',
            marginBottom: 32,
          }}>
            Here's what separates elite players from the rest:
          </Text>

          {/* Facts List */}
          <View style={{ gap: 20, marginBottom: 40 }}>
            {professionalFacts.map((fact, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  backgroundColor: '#ffffff',
                  padding: 20,
                  borderRadius: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: '#F0F0F0',
                }}
              >
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#F0F4FF',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                  marginTop: 2,
                }}>
                  <Ionicons 
                    name={fact.icon as any} 
                    size={16} 
                    color="#4064F6" 
                  />
                </View>
                <Text style={{
                  fontSize: 15,
                  color: '#333333',
                  lineHeight: 22,
                  flex: 1,
                }}>
                  {fact.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Bottom Section */}
          <View style={{
            alignItems: 'center',
            marginTop: 'auto',
            paddingTop: 20,
          }}>
            <Text style={{
              fontSize: 14,
              color: '#888888',
              textAlign: 'center',
              marginBottom: 24,
            }}>
              Ready to start your professional journey?
            </Text>
            
            <TouchableOpacity
              onPress={handleContinue}
              style={{
                backgroundColor: '#4064F6',
                paddingHorizontal: 48,
                paddingVertical: 16,
                borderRadius: 25,
                shadowColor: '#4064F6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
                width: '100%',
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: '#ffffff',
                fontSize: 16,
                fontWeight: '600',
              }}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
} 