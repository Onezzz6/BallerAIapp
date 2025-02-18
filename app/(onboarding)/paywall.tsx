import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Button from '../components/Button';
import { Ionicons } from '@expo/vector-icons';

const PLANS = [
  {
    id: 'monthly',
    duration: '1',
    unit: 'Month',
    pricePerWeek: '3,45 €',
    totalPrice: '14,99 €',
    period: 'monthly',
  },
  {
    id: 'yearly',
    duration: '12',
    unit: 'Months',
    pricePerWeek: '1,34 €',
    totalPrice: '69,99 €',
    period: 'yearly',
    tag: 'BEST VALUE',
  },
  {
    id: 'quarterly',
    duration: '3',
    unit: 'Months',
    pricePerWeek: '2,69 €',
    totalPrice: '34,99 €',
    period: 'quarterly',
    tag: 'POPULAR',
  },
];

const REVIEWS = [
  {
    id: '1',
    name: 'Carlos D.',
    rating: 5,
    text: 'Well worth the cost! These exercise routines really woke up my muscles and I like how we can add different equipment!',
  },
  {
    id: '2',
    name: 'Emma M.',
    rating: 5,
    text: "Buying this app has really made a difference in my lifestyle. It's the best app for fitness. Surprised by the quality!",
  },
];

export default function PaywallScreen() {
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Animated.View 
        entering={FadeIn.duration(500)}
        style={{
          flex: 1,
          padding: 24,
        }}
      >
        <Image 
          source={require('../../assets/images/mascot.png')}
          style={{
            width: '100%',
            height: 200,
            marginBottom: 24,
          }}
          resizeMode="contain"
        />

        <Text style={{
          fontSize: 32,
          fontWeight: '700',
          color: '#000000',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          Smarter workouts.
        </Text>
        <Text style={{
          fontSize: 32,
          fontWeight: '700',
          color: '#000000',
          textAlign: 'center',
          marginBottom: 32,
        }}>
          Better results!
        </Text>

        <View style={{
          flexDirection: 'row',
          gap: 12,
          marginBottom: 40,
        }}>
          {PLANS.map((plan) => (
            <Pressable
              key={plan.id}
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                borderWidth: 2,
                borderColor: plan.tag === 'BEST VALUE' ? '#99E86C' : '#E5E5E5',
                shadowColor: '#000000',
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              {plan.tag && (
                <View style={{
                  position: 'absolute',
                  top: -12,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                }}>
                  <View style={{
                    backgroundColor: plan.tag === 'BEST VALUE' ? '#99E86C' : '#000000',
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}>
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: '600',
                    }}>
                      {plan.tag}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={{
                fontSize: 24,
                fontWeight: '700',
                color: '#000000',
                textAlign: 'center',
                marginBottom: 4,
              }}>
                {plan.duration}
              </Text>
              <Text style={{
                fontSize: 16,
                color: '#000000',
                textAlign: 'center',
                marginBottom: 12,
              }}>
                {plan.unit}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#666666',
                textAlign: 'center',
              }}>
                {plan.pricePerWeek}
              </Text>
              <Text style={{
                fontSize: 12,
                color: '#666666',
                textAlign: 'center',
                marginBottom: 8,
              }}>
                per week
              </Text>
              <Text style={{
                fontSize: 16,
                color: '#666666',
                textAlign: 'center',
              }}>
                {plan.totalPrice}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#666666',
                textAlign: 'center',
              }}>
                {plan.period}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={{
          fontSize: 24,
          fontWeight: '700',
          color: '#000000',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          Used by millions, personalized for you
        </Text>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}>
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            color: '#000000',
            marginRight: 8,
          }}>
            4.8
          </Text>
          <Ionicons name="star" size={24} color="#FFD700" />
          <Text style={{
            fontSize: 16,
            color: '#666666',
            marginLeft: 8,
          }}>
            150.000+ reviews
          </Text>
        </View>

        {REVIEWS.map((review) => (
          <View
            key={review.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 2,
              borderColor: '#E5E5E5',
            }}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#000000',
              marginBottom: 4,
            }}>
              {review.name}
            </Text>
            <View style={{
              flexDirection: 'row',
              marginBottom: 8,
            }}>
              {[...Array(review.rating)].map((_, i) => (
                <Ionicons key={i} name="star" size={16} color="#FFD700" />
              ))}
            </View>
            <Text style={{
              fontSize: 14,
              color: '#666666',
            }}>
              {review.text}
            </Text>
          </View>
        ))}

        <Button 
          title="Continue" 
          onPress={() => {
            router.replace('/(tabs)/home');
          }}
          buttonStyle={{
            backgroundColor: '#007AFF',
          }}
        />
      </Animated.View>
    </ScrollView>
  );
} 