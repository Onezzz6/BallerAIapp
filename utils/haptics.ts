import * as Haptics from 'expo-haptics';

export const useHaptics = () => {
  const light = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const medium = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const heavy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const success = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const error = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const warning = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  return {
    light,
    medium,
    heavy,
    success,
    error,
    warning,
  };
}; 