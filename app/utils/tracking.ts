import { Platform } from 'react-native';
import { requestTrackingPermission, getTrackingStatus } from 'react-native-tracking-transparency';

/**
 * Request app tracking transparency permission from the user
 * Only works on iOS 14+, otherwise resolves to 'authorized' on other platforms
 * 
 * @returns A promise that resolves to the tracking status
 */
export async function requestAppTrackingPermission() {
  // Only available on iOS
  if (Platform.OS !== 'ios') {
    console.log('App Tracking Transparency is only supported on iOS');
    return 'authorized';
  }

  try {
    const status = await requestTrackingPermission();
    console.log(`Tracking permission status: ${status}`);
    return status;
  } catch (error) {
    console.error('Error requesting tracking permission:', error);
    return 'unavailable';
  }
}

/**
 * Check the current app tracking transparency status
 * 
 * @returns A promise that resolves to the current tracking status
 */
export async function checkTrackingStatus() {
  // Only available on iOS
  if (Platform.OS !== 'ios') {
    console.log('App Tracking Transparency is only supported on iOS');
    return 'authorized';
  }

  try {
    const status = await getTrackingStatus();
    return status; 
  } catch (error) {
    console.error('Error checking tracking status:', error);
    return 'unavailable';
  }
} 