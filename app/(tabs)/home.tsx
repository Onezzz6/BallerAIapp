import { View, Text, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 24,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image 
            source={require('../../assets/images/BallerAILogo.png')}
            style={{ width: 32, height: 32 }}
            resizeMode="contain"
          />
          <Text style={{ fontSize: 24, fontWeight: '600', color: '#000000' }}>
            BallerAI
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Image 
            source={require('../../assets/images/profile.png')}
            style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 20,
              backgroundColor: '#E5E5E5',
            }}
          />
          <Ionicons name="notifications-outline" size={24} color="#000000" />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 24, gap: 24 }}>
          {/* Welcome Section */}
          <View style={{ gap: 8 }}>
            <Text style={{ 
              fontSize: 32, 
              fontWeight: '600',
              color: '#000000',
            }}>
              Welcome back,
            </Text>
            <Text style={{ 
              fontSize: 16, 
              color: '#666666',
            }}>
              Let's get started—your journey to greatness begins now!
            </Text>
          </View>

          {/* Progress Cards */}
          <View style={{ 
            flexDirection: 'row', 
            gap: 16,
          }}>
            {/* Goal Progress Card */}
            <View style={{
              flex: 1,
              padding: 16,
              borderRadius: 16,
              backgroundColor: '#FFF5EB',
              alignItems: 'center',
              gap: 8,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="trophy-outline" size={20} color="#FF9500" />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#000000' }}>
                  Goal Progress
                </Text>
              </View>
              
              <Text style={{ fontSize: 40, fontWeight: '700', color: '#FF9500' }}>
                80
              </Text>
              <Text style={{ fontSize: 14, color: '#666666' }}>/100</Text>
              <Text style={{ fontSize: 14, color: '#666666' }}>
                Completed this week!
              </Text>
            </View>

            {/* Recovery Score Card */}
            <View style={{
              flex: 1,
              padding: 16,
              borderRadius: 16,
              backgroundColor: '#E8F8F5',
              alignItems: 'center',
              gap: 8,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="pulse-outline" size={20} color="#00BFA5" />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#000000' }}>
                  Recovery Score
                </Text>
              </View>
              
              <Text style={{ fontSize: 40, fontWeight: '700', color: '#00BFA5' }}>
                90%
              </Text>
              <Text style={{ fontSize: 14, color: '#666666' }}>
                Awesome! You did
              </Text>
              <Text style={{ fontSize: 14, color: '#666666' }}>
                excellent recovery level.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 