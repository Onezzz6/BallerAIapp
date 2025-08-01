import { Platform } from 'react-native';
import { requestTrackingPermission, getTrackingStatus } from 'react-native-tracking-transparency';

// Guard to prevent multiple concurrent requests
let isRequestingPermission = false;
let permissionPromise: Promise<string> | null = null;

/**
 * Request app tracking transparency permission from the user
 * Only works on iOS 14+, otherwise resolves to 'authorized' on other platforms
 * Prevents multiple concurrent requests
 * 
 * @returns A promise that resolves to the tracking status
 */
export async function requestAppTrackingPermission() {
  // Only available on iOS
  if (Platform.OS !== 'ios') {
    console.log('App Tracking Transparency is only supported on iOS');
    return 'authorized';
  }

  // If already requesting, return the existing promise
  if (isRequestingPermission && permissionPromise) {
    console.log('Tracking permission request already in progress, waiting...');
    return permissionPromise;
  }

  // Check if we already have permission status
  try {
    const currentStatus = await getTrackingStatus();
    if (currentStatus !== 'not-determined') {
      console.log(`Tracking permission already determined: ${currentStatus}`);
      return currentStatus;
    }
  } catch (error) {
    console.log('Could not get current tracking status, proceeding with request');
  }

  // Set up the request
  isRequestingPermission = true;
  permissionPromise = (async () => {
    try {
      const status = await requestTrackingPermission();
      console.log(`Tracking permission status: ${status}`);
      return status;
    } catch (error) {
      console.error('Error requesting tracking permission:', error);
      return 'unavailable';
    } finally {
      isRequestingPermission = false;
      permissionPromise = null;
    }
  })();

  return permissionPromise;
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