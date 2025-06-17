import { View, Text, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '../components/Button';
import OnboardingHeader from '../components/OnboardingHeader';
import analytics from '@react-native-firebase/analytics';
import { colors, typography } from '../utils/theme';
import { useHaptics } from '../utils/haptics';
                
export default function AccountReadyScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
      <OnboardingHeader 
        currentStep={26}
        totalSteps={26}
      />

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
          paddingTop: 20,
        }}>
          <Text style={[
            typography.title,
            {
              textAlign: 'center',
              marginBottom: 8,
            }
          ]} allowFontScaling={false}>
            Your personalized account is ready!
          </Text>
        </View>

        <View style={{
          paddingHorizontal: 24,
          paddingBottom: 64,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Image 
            source={require('../../assets/images/mascot.png')}
            style={{
              width: 200,
              height: 200,
              marginBottom: 32,
            }}
            resizeMode="contain"
          />

          <Text style={[
            typography.subtitle,
            {
              textAlign: 'center',
              fontSize: 18,
              color: colors.mediumGray,
            }
          ]}>
            Remember, the more you use the app, the better it will get!
          </Text>
        </View>
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
          title="First step to go pro!" 
          onPress={async () => {
            haptics.light();
            await analytics().logEvent('onboarding_account_ready_continue');
            router.push('/sign-up');
          }}
        />
      </View>
    </SafeAreaView>
  );
} 