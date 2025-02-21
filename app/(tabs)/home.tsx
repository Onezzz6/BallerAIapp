import { View, Text, Image, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useState, useEffect } from 'react';
import { TextInput } from 'react-native';
import { format, startOfWeek, addDays } from 'date-fns';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useNutrition } from '../context/NutritionContext';

export default function HomeScreen() {
  const { user } = useAuth();
  const { macros } = useNutrition();
  const calorieGoal = 1600;
  const currentCalories = 800;
  const progressPercentage = (currentCalories / calorieGoal) * 100;
  const [showQuestion, setShowQuestion] = useState(false);
  const [question, setQuestion] = useState('');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  
  // Fetch user's profile picture
  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().profilePicture) {
            setProfilePicture(userDoc.data().profilePicture);
          }
        } catch (error) {
          console.error('Error fetching profile picture:', error);
        }
      }
    };

    fetchProfilePicture();
  }, [user]);

  // Generate week days
  const today = new Date();
  const startOfTheWeek = startOfWeek(today);
  const weekDays = [...Array(7)].map((_, i) => {
    const date = addDays(startOfTheWeek, i);
    return {
      date,
      dayLetter: format(date, 'E')[0],
      dayNumber: format(date, 'd'),
      isToday: format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
    };
  });

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: '#FFFFFF',  // Keep white background
    }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
      }}>
        {/* BallerAI Logo and Text */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: 8,
          marginBottom: 16, // Add space between logo and title
        }}>
          <Image 
            source={require('../../assets/images/BallerAILogo.png')}
            style={{ width: 32, height: 32 }}
            resizeMode="contain"
          />
          <Text style={{ 
            fontSize: 24, 
            fontWeight: '600', 
            color: '#000000' 
          }}>
            BallerAI
          </Text>
        </View>

        {/* Title */}
        <Text style={{
          fontSize: 32,
          fontWeight: '700',
          color: '#000000',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          Home
        </Text>
      </View>

      <ScrollView 
        style={{ 
          flex: 1,
          backgroundColor: '#FFFFFF',
        }}
        contentContainerStyle={{
          padding: 8,
          gap: 16,
        }}
      >
        <View style={{ padding: 16, gap: 24 }}>
          {/* Overview Section */}
          <View style={{ 
            alignItems: 'center',
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5',
          }}>
            <Text style={{ 
              fontSize: 32, 
              fontWeight: '600',
              color: '#000000',
            }}>
              Todays Progress
            </Text>
          </View>
                      
          {/* First Row of Cards */}
          <View style={{ 
            flexDirection: 'row', 
            gap: 8,
          }}>
            {/* Daily Calories Card */}
            <View style={{
              flex: 1,
              backgroundColor: '#99E86C',
              borderRadius: 24,
              padding: 16,
              gap: 24,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
              borderWidth: 1,
              borderColor: '#E5E5E5',
              minHeight: 280,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons 
                    name="nutrition-outline" 
                    size={24} 
                    color="#000000"
                  />
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '600',
                    color: '#000000',
                  }}>calories</Text>
                </View>
              </View>

              <View style={{
                alignItems: 'center',
                gap: 24,
              }}>
                <View style={{
                  width: 200,
                  height: 200,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <View style={{
                    width: '100%',
                    height: '100%',
                  }}>
                    <View style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{
                          fontSize: 32,
                          fontWeight: '600',
                          color: '#000000',
                        }}>{macros.calories.current}</Text>
                        <Text style={{
                          fontSize: 14,
                          color: '#666666',
                        }}>consumed</Text>
                      </View>
                    </View>
                    <Svg width={200} height={200} style={StyleSheet.absoluteFill}>
                      {/* Background Circle */}
                      <Circle
                        cx={100}
                        cy={100}
                        r={80}
                        stroke="#ffffff"
                        strokeWidth={12}
                        fill="transparent"
                      />
                      {/* Progress Circle */}
                      <Circle
                        cx={100}
                        cy={100}
                        r={80}
                        stroke="#4064F6"
                        strokeWidth={12}
                        fill="transparent"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 80}`}
                        strokeDashoffset={2 * Math.PI * 80 * (1 - Math.min(Math.max(macros.calories.current / macros.calories.goal, 0), 1))}
                        transform={`rotate(-90 100 100)`}
                      />
                    </Svg>
                  </View>
                </View>

                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 24,
                }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{
                      fontSize: 20,
                      fontWeight: '600',
                      color: '#000000',
                    }}>{macros.calories.goal - macros.calories.current}</Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#666666',
                    }}>Remaining</Text>
                  </View>

                  <View style={{
                    width: 1,
                    height: 40,
                    backgroundColor: '#E5E5E5',
                  }} />

                  <View style={{ alignItems: 'center' }}>
                    <Text style={{
                      fontSize: 20,
                      fontWeight: '600',
                      color: '#000000',
                    }}>{macros.calories.goal}</Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#666666',
                    }}>Goal</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Readiness Card */}
            <View style={{
              flex: 1,
              padding: 16,
              gap: 24,
              borderRadius: 24,
              backgroundColor: '#99E86C',
              alignItems: 'center',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
              borderWidth: 1,
              borderColor: '#E5E5E5',
              minHeight: 280,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="trending-up" size={24} color="#000000" />
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '600',
                    color: '#000000',
                  }}>
                    Readiness 
                  </Text>
                </View>
              </View>

              {/* Progress Circle Container */}
              <View style={{ 
                width: 200,
                height: 200,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Svg width="200" height="200" style={{
                  position: 'absolute',
                  transform: [{ rotate: '-90deg' }],
                }}>
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#ffffff"
                    strokeWidth="12"
                    fill="none"
                  />
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#4064F6"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={2 * Math.PI * 80 * (1 - 40 / 100)}
                  />
                </Svg>

                <Text style={{ 
                  fontSize: 40, 
                  fontWeight: '700', 
                  color: '#000000',
                }}>
                  40%
                </Text>
              </View>

              <Text style={{ 
                fontSize: 14, 
                color: '#666666',
                textAlign: 'center',
              }}>
                Reaching moderate{'\n'}level of readiness.
              </Text>
            </View>
          </View>

          {/* Weekly Progress Section Header */}
          <View style={{ 
            alignItems: 'center',
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5',
          }}>
            <Text style={{ 
              fontSize: 32, 
              fontWeight: '600',
              color: '#000000',
            }}>
              Weekly Progress
            </Text>
          </View>

          {/* Second Row of Cards */}
          <View style={{ 
            flexDirection: 'row', 
            gap: 8,
          }}>
            {/* Training Progress Card */}
            <View style={{
              flex: 1,
              padding: 16,
              gap: 24,
              borderRadius: 24,
              backgroundColor: '#99E86C',
              alignItems: 'center',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
              borderWidth: 1,
              borderColor: '#E5E5E5',
              minHeight: 280,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="barbell-outline" size={24} color="#000000" />
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '600',
                    color: '#000000',
                  }}>
                    Training
                  </Text>
                </View>
              </View>

              {/* Progress Circle Container */}
              <View style={{ 
                width: 200,
                height: 200,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Svg width="200" height="200" style={{
                  position: 'absolute',
                  transform: [{ rotate: '-90deg' }],
                }}>
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#ffffff"
                    strokeWidth="12"
                    fill="none"
                  />
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#4064F6"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={2 * Math.PI * 80 * (1 - 80 / 100)}
                  />
                </Svg>

                <Text style={{ 
                  fontSize: 40, 
                  fontWeight: '700', 
                  color: '#000000',
                }}>
                  80%
                </Text>
              </View>

              <Text style={{ 
                fontSize: 14, 
                color: '#666666',
                textAlign: 'center',
              }}>
                Completed this week!
              </Text>
            </View>

            {/* Recovery Card */}
            <View style={{
              flex: 1,
              padding: 16,
              gap: 24,
              borderRadius: 24,
              backgroundColor: '#99E86C',
              alignItems: 'center',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
              borderWidth: 1,
              borderColor: '#E5E5E5',
              minHeight: 280,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="pulse-outline" size={24} color="#000000" />
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '600',
                    color: '#000000',
                  }}>
                    Recovery
                  </Text>
                </View>
              </View>
              
              {/* Progress Circle Container */}
              <View style={{ 
                width: 200,
                height: 200,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Svg width="200" height="200">
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#ffffff"
                    strokeWidth="12"
                    fill="none"
                  />
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#4064F6"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={2 * Math.PI * 80 * (1 - 90 / 100)}
                    transform="rotate(-90 100 100)"
                  />
                </Svg>

                {/* Center Text */}
                <Text style={{ 
                  position: 'absolute',
                  fontSize: 40, 
                  fontWeight: '700', 
                  color: '#000000',
                }}>
                  90%
                </Text>
              </View>

              <Text style={{ 
                fontSize: 14, 
                color: '#666666',
                textAlign: 'center',
              }}>
                Awesome! You did{'\n'}excellent recovery level.
              </Text>
            </View>
          </View>

          {/* Ask AI Section */}
          <View style={{
            backgroundColor: '#4A3AFF',
            borderRadius: 24,
            padding: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 24,
                fontWeight: '600',
                color: '#FFFFFF',
                marginBottom: 8,
              }}>
                Ask me a question.
              </Text>
              <Pressable
                onPress={() => setShowQuestion(!showQuestion)}
                style={({ pressed }) => ({
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 12,
                  alignSelf: 'flex-start',
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#4A3AFF',
                }}>
                  {showQuestion ? 'Close' : 'Ask a question'}
                </Text>
              </Pressable>
            </View>

            <Image 
              source={require('../../assets/images/mascot.png')}
              style={{
                width: 120,
                height: 120,
                marginRight: -24,
                marginBottom: -24,
              }}
              resizeMode="contain"
            />
          </View>

          {/* Question Interface */}
          {showQuestion && (
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 24,
              gap: 16,
              borderWidth: 1,
              borderColor: '#E5E5E5',
            }}>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask anything about football..."
                multiline
                numberOfLines={3}
                style={{
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  textAlignVertical: 'top',
                  minHeight: 100,
                }}
              />

              {question && (
                <View style={{ gap: 16 }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}>
                    <Image 
                      source={require('../../assets/images/mascot.png')}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                      }}
                    />
                    <View style={{
                      flex: 1,
                      backgroundColor: '#F5F5FF',
                      padding: 16,
                      borderRadius: 12,
                    }}>
                      <Text style={{
                        fontSize: 16,
                        color: '#000000',
                        lineHeight: 24,
                      }}>
                        Based on your profile and goals, here's my recommendation: Focus on incorporating more explosive exercises in your training routine. This will help improve your speed and agility on the field. Try adding box jumps and plyometric exercises 2-3 times per week.{'\n\n'}Remember to maintain proper form and gradually increase intensity!
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Weekly Overview Section */}
          <View style={{ gap: 16 }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#000000',
            }}>
              Weekly Overview
            </Text>

            {/* Calendar Days */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 8,
            }}>
              {weekDays.map((day) => (
                <Pressable
                  key={day.date.toISOString()}
                  onPress={() => setSelectedDay(
                    selectedDay?.toISOString() === day.date.toISOString() ? null : day.date
                  )}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 56,
                    borderRadius: 12,
                    backgroundColor: day.isToday ? '#99e86c' 
                      : selectedDay?.toISOString() === day.date.toISOString() ? '#f5f5ff'
                      : '#f5f5ff',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{
                    fontSize: 12,
                    color: '#000000',
                    marginBottom: 4,
                  }}>
                    {day.dayLetter}
                  </Text>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#000000',
                  }}>
                    {day.dayNumber}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Day Details */}
            {selectedDay && (
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 24,
                gap: 16,
                borderWidth: 1,
                borderColor: '#000000',
              }}>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: '#000000',
                  }}>
                    {format(selectedDay, 'EEEE, MMMM d')}
                  </Text>
                  <Pressable
                    onPress={() => setSelectedDay(null)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{
                      fontSize: 16,
                      color: '#000000',
                    }}>
                      Close
                    </Text>
                  </Pressable>
                </View>

                {/* Scores Grid */}
                <View style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 12,
                }}>
                  {/* Nutrition Score */}
                  <View style={{
                    flex: 1,
                    minWidth: '45%',
                    backgroundColor: '#FFF5EB',
                    padding: 16,
                    borderRadius: 16,
                    gap: 8,
                  }}>
                    <Text style={{ fontSize: 14, color: '#666666' }}>Nutrition Adherence</Text>
                    <Text style={{ fontSize: 24, fontWeight: '600', color: '#FF9500' }}>85%</Text>
                  </View>

                  {/* Recovery Score */}
                  <View style={{
                    flex: 1,
                    minWidth: '45%',
                    backgroundColor: '#F5F5FF',
                    padding: 16,
                    borderRadius: 16,
                    gap: 8,
                  }}>
                    <Text style={{ fontSize: 14, color: '#666666' }}>Recovery Score</Text>
                    <Text style={{ fontSize: 24, fontWeight: '600', color: '#4064F6' }}>90%</Text>
                  </View>

                  {/* Readiness Score */}
                  <View style={{
                    flex: 1,
                    minWidth: '45%',
                    backgroundColor: '#F5F5FF',
                    padding: 16,
                    borderRadius: 16,
                    gap: 8,
                  }}>
                    <Text style={{ fontSize: 14, color: '#666666' }}>Readiness Score</Text>
                    <Text style={{ fontSize: 24, fontWeight: '600', color: '#4A72B2' }}>40</Text>
                  </View>

                  {/* Training Status */}
                  <View style={{
                    flex: 1,
                    minWidth: '45%',
                    backgroundColor: '#F5F5FF',
                    padding: 16,
                    borderRadius: 16,
                    gap: 8,
                  }}>
                    <Text style={{ fontSize: 14, color: '#666666' }}>Training Status</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons 
                        name={selectedDay > new Date() ? 'time-outline' : 'checkmark-circle'} 
                        size={24} 
                        color={selectedDay > new Date() ? '#666666' : '#99E86C'} 
                      />
                      <Text style={{ 
                        fontSize: 16, 
                        color: selectedDay > new Date() ? '#666666' : '#000000',
                      }}>
                        {selectedDay > new Date() ? 'Upcoming' : 'Completed'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 