# Development Analytics Configuration Guide

This guide explains how to control analytics and tracking services when working in development mode to prevent polluting production data.

## Overview

The app automatically detects when running in development mode (`__DEV__` flag) and disables analytics services to prevent sending test data to production Firebase Analytics, AppsFlyer, and Crashlytics.

## Configuration

### Main Configuration File: `app/config/development.ts`

This file contains all development flags and settings:

```typescript
// Main development flag - automatically detects if running in development
export const IS_DEVELOPMENT = __DEV__;

// Analytics flags
export const ANALYTICS_CONFIG = {
  // Disable Firebase Analytics in development
  DISABLE_FIREBASE_ANALYTICS: IS_DEVELOPMENT,
  
  // Disable AppsFlyer in development
  DISABLE_APPSFLYER: IS_DEVELOPMENT,
  
  // Disable Crashlytics in development
  DISABLE_CRASHLYTICS: IS_DEVELOPMENT,
  
  // Log what would have been sent instead of sending
  LOG_DISABLED_EVENTS: IS_DEVELOPMENT,
};
```

## Services Affected

### 1. Firebase Analytics (`app/services/analytics.ts`)
- **Events**: `logEvent()` - Custom analytics events
- **User Properties**: `setUserProperties()` - User characteristic data
- **User ID**: `setUserId()` - User identification
- **Screen Views**: `logScreenView()` - Screen navigation tracking

### 2. AppsFlyer (`app/config/appsflyer.ts`)
- **Events**: `logAppsFlyerEvent()` - Attribution tracking events
- **Initialization**: `initializeAppsFlyer()` - SDK setup
- **User Registration**: `logUserRegistrationEvent()` - Sign-up tracking
- **Purchase Events**: `logPurchaseEvent()` - Revenue tracking

### 3. Crashlytics (`app/services/analytics.ts`)
- **Error Logging**: `logError()` - Crash and error reporting
- **User ID**: `setUserId()` - User identification for crash reports
- **Initialization**: `initializeCrashReporting()` - SDK setup

## How It Works

### Development Mode (Default)
When running in development (`__DEV__ = true`):
- ✅ **Analytics are DISABLED** - No data sent to production
- ✅ **Console logging enabled** - See what would have been sent
- ✅ **Performance preserved** - No network requests to analytics services

### Production Mode
When running in production (`__DEV__ = false`):
- ✅ **Analytics are ENABLED** - Data sent to production services
- ✅ **Full tracking active** - All events, user properties, and errors logged
- ✅ **Attribution tracking** - AppsFlyer campaigns and conversions tracked

## Console Output Examples

### Development Mode Console Output:
```
[FIREBASE ANALYTICS DISABLED] Would have logged event: sign_up {email: "test@example.com"}
[APPSFLYER DISABLED] Would have logged event: af_complete_registration
[CRASHLYTICS DISABLED] Would have initialized
```

### Production Mode Console Output:
```
Analytics event logged: sign_up {email: "test@example.com"}
AppsFlyer event logged successfully: af_complete_registration
Crashlytics initialized
```

## Manual Control (Advanced)

If you need to override the automatic detection, you can modify the flags in `app/config/development.ts`:

```typescript
// Force enable analytics in development (NOT recommended)
export const ANALYTICS_CONFIG = {
  DISABLE_FIREBASE_ANALYTICS: false,  // Enable Firebase Analytics
  DISABLE_APPSFLYER: true,           // Keep AppsFlyer disabled
  DISABLE_CRASHLYTICS: false,        // Enable Crashlytics
  LOG_DISABLED_EVENTS: true,         // Still log what's disabled
};
```

## Testing Analytics

### Development Testing
In development mode, you can see all analytics calls in the console without sending data:
1. Open your development console
2. Perform actions that trigger analytics
3. Look for `[SERVICE DISABLED]` messages
4. Verify the correct data would be sent

### Production Testing
For production analytics testing:
1. Build for production or staging
2. Use Firebase Analytics Debug View
3. Use AppsFlyer Debug Mode
4. Monitor real-time analytics dashboards

## Best Practices

### ✅ Do
- Keep analytics disabled in development (default behavior)
- Review console logs to ensure correct data structure
- Test analytics thoroughly in staging environment
- Use the centralized `development.ts` configuration

### ❌ Don't
- Enable production analytics in development
- Modify analytics calls directly in service files
- Skip testing analytics before production deployment
- Forget to verify analytics are working in production

## Troubleshooting

### Analytics Not Working in Production
1. Check `__DEV__` flag is `false`
2. Verify Firebase/AppsFlyer configuration keys
3. Check network connectivity
4. Review console for error messages

### Too Much Console Output in Development
1. Set `LOG_DISABLED_EVENTS: false` in `development.ts`
2. This will silent the disabled service messages

### Need to Test Analytics in Development
1. Temporarily set flags to `false` in `development.ts`
2. Remember to revert before committing
3. Consider using staging environment instead

## Files Modified

- `app/config/development.ts` - Main configuration file
- `app/services/analytics.ts` - Firebase Analytics service
- `app/config/appsflyer.ts` - AppsFlyer configuration
- All onboarding screens - Using analytics service

## Environment Detection

The system automatically detects the environment using React Native's `__DEV__` flag:
- `__DEV__ = true` - Development mode (Metro bundler, debugging)
- `__DEV__ = false` - Production mode (release builds)

This ensures analytics are automatically disabled during development and enabled in production without manual intervention. 