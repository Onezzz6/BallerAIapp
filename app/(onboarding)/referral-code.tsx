import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableWithoutFeedback, Keyboard, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Animated as RNAnimated } from 'react-native';
import Button from '../components/Button';
import OnboardingHeader, { useOnboardingHeaderHeight } from '../components/OnboardingHeader';
import { useOnboarding } from '../../context/OnboardingContext';
import analyticsService from '../../services/analytics';
import { colors, typography } from '../../utils/theme';
import { useHaptics } from '../../utils/haptics';
import { validateTeamCode, createTeamCodeSuccessMessage } from '../../services/teamCode';
// Dashboard version: No RevenueCat functionality needed
import { useOnboardingStep } from '../../hooks/useOnboardingStep';

export default function ReferralCodeScreen() {
  const haptics = useHaptics();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [teamCode, setTeamCode] = useState(onboardingData.teamCode || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [teamName, setTeamName] = useState<string>('');
  const headerHeight = useOnboardingHeaderHeight();
  // NEW: Use automatic onboarding step system
  const { goToNext } = useOnboardingStep('referral-code');
  
  // Animated value for button bottom position
  const buttonBottomPosition = useRef(new RNAnimated.Value(32)).current;

  // Update local state when onboardingData changes
  useEffect(() => {
    setTeamCode(onboardingData.teamCode || '');
    
    // If we have team code and team name, it means it was previously validated
    if (onboardingData.teamCode && onboardingData.teamName) {
      setIsValid(true);
      setHasSubmitted(true);
      setTeamName(onboardingData.teamName);
      setValidationMessage(createTeamCodeSuccessMessage(onboardingData.teamName));
    }
  }, [onboardingData.teamCode, onboardingData.teamName]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const duration = Platform.OS === 'ios' ? event.duration : 250;
        RNAnimated.timing(buttonBottomPosition, {
          toValue: 0,
          duration,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (event) => {
        const duration = Platform.OS === 'ios' ? event.duration : 250;
        RNAnimated.timing(buttonBottomPosition, {
          toValue: 32,
          duration,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, [buttonBottomPosition]);

  const handleSubmit = async () => {
    if (!teamCode.trim()) return;
    
    haptics.light();
    setIsValidating(true);
    setValidationMessage('');
    setIsValid(null);
    setHasSubmitted(true);

    try {
      const cleanedCode = teamCode.trim().toUpperCase();
      
      // Validate team code against Firebase
      const validationResult = await validateTeamCode(cleanedCode);
      
      if (validationResult.isValid && validationResult.teamName) {
        // Success - team code is valid
        setIsValid(true);
        setTeamName(validationResult.teamName);
        setValidationMessage(createTeamCodeSuccessMessage(validationResult.teamName));
        
        await analyticsService.logEvent('A0_99_onboarding_team_code_valid', {
          code: cleanedCode,
          teamName: validationResult.teamName
        });

        // Save the validated team code and team name
        await updateOnboardingData({ 
          teamCode: cleanedCode,
          teamName: validationResult.teamName
        });

      } else {
        // Error - team code is invalid
        setIsValid(false);
        setValidationMessage(validationResult.error || 'Invalid team code');
        
        await analyticsService.logEvent('A0_99_onboarding_team_code_invalid', {
          code: cleanedCode,
          error: validationResult.error
        });
      }
    } catch (error) {
      console.error('Team code validation error:', error);
      setIsValid(false);
      setValidationMessage('Unable to validate team code. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkip = async () => {
    console.log('Skip button pressed');
    haptics.light();
    await analyticsService.logEvent('A0_26_team_code_skip');
    goToNext();
  };

  const handleContinue = async () => {
    haptics.light();
    await analyticsService.logEvent('A0_26_team_code_continue');
    goToNext();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundColor }}>
          {/* NEW: Automatic step detection */}
          <OnboardingHeader screenId="referral-code" />

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
            }}>
              <Text style={[
                typography.title,
                {
                  textAlign: 'left',
                  marginBottom: 8,
                }
              ]} allowFontScaling={false}>
                Enter Team Code
              </Text>
              <Text style={[
                typography.subtitle,
                {
                  fontSize: 16,
                  color: colors.mediumGray,
                }
              ]}>
                Join your team by entering the code provided by your club
              </Text>
            </View>

            <View style={{
              paddingHorizontal: 24,
              paddingBottom: 64,
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <View style={{ width: '100%' }}>
                <TextInput
                  value={teamCode}
                  onChangeText={(text) => {
                    // Don't allow changes if code is already validated
                    if (isValid === true) return;
                    
                    // Force uppercase letters but allow numbers
                    const uppercaseText = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setTeamCode(uppercaseText);
                    
                    // Clear validation state when user types
                    if (validationMessage) {
                      setValidationMessage('');
                      setIsValid(null);
                      setHasSubmitted(false);
                    }
                  }}
                  placeholder="TEAM CODE"
                  autoCapitalize="characters"
                  editable={!isValidating && isValid !== true}
                  style={{
                    width: '100%',
                    height: 56,
                    borderWidth: 1,
                    borderColor: isValid === false ? '#FF3B30' : isValid === true ? '#22C55E' : '#E5E5E5',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    fontSize: 16,
                    backgroundColor: isValid === true ? '#E8F5E8' : isValidating ? '#F0F0F0' : '#F8F8F8',
                    opacity: isValid === true ? 0.8 : isValidating ? 0.7 : 1,
                    color: isValid === true ? '#22C55E' : '#000000',
                  }}
                />

                {/* Submit Button - Show when there's text and not yet successfully validated */}
                {teamCode.trim() && isValid !== true && (
                  <Button 
                    title={isValidating ? "Validating..." : "Submit"} 
                    onPress={handleSubmit}
                    disabled={isValidating}
                    buttonStyle={{
                      marginTop: 16,
                      backgroundColor: colors.brandGreen,
                    }}
                  />
                )}
                {/* Validation Feedback */}
                {(validationMessage || isValidating) && (
                  <View style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: isValid === false ? 'rgba(255, 59, 48, 0.1)' : 
                                   isValid === true ? 'rgba(34, 197, 94, 0.1)' : 
                                   'rgba(64, 100, 246, 0.1)',
                    borderWidth: 1,
                    borderColor: isValid === false ? 'rgba(255, 59, 48, 0.2)' : 
                                isValid === true ? 'rgba(34, 197, 94, 0.2)' : 
                                'rgba(64, 100, 246, 0.2)',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    {isValidating ? (
                      <>
                        <ActivityIndicator 
                          size="small" 
                          color={colors.brandBlue} 
                          style={{ marginRight: 8 }}
                        />
                        <Text style={{
                          fontSize: 14,
                          color: colors.brandBlue,
                          flex: 1,
                        }}>
                          Validating team code...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={{
                          fontSize: 16,
                          marginRight: 8,
                        }}>
                          {isValid === true ? '✅' : '❌'}
                        </Text>
                        <Text style={{
                          fontSize: 14,
                          color: isValid === false ? '#FF3B30' : '#22C55E',
                          flex: 1,
                          lineHeight: 18,
                        }}>
                          {validationMessage}
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            </View>
          </Animated.View>

                    <RNAnimated.View style={{
            position: 'absolute',
            bottom: buttonBottomPosition,
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
              title={isValid === true ? "Continue" : "Skip & Continue"} 
              onPress={handleContinue}
              disabled={isValidating}
            />
          </RNAnimated.View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
} 