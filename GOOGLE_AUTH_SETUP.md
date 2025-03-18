# Google Authentication Setup

## Prerequisites

Before you can use Google Sign-in in your app, you need to:

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google Sign-in API
3. Create OAuth 2.0 credentials for your app

## Step 1: Create OAuth 2.0 Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select the appropriate application type:
   - Web application (for Web client ID)
   - iOS (for iOS client ID)
   - Android (for Android client ID)
6. Fill in the required details:
   - For Web: Add authorized JavaScript origins and redirect URIs
   - For iOS: Add your Bundle ID
   - For Android: Add your package name and SHA-1 signing certificate

## Step 2: Configure Your App

1. Open `app/components/WelcomeScreen.tsx`
2. Update the Google Auth Request configuration with your client IDs:

```typescript
const [request, response, promptAsync] = Google.useAuthRequest({
  clientId: 'YOUR_WEB_CLIENT_ID', // Google Web client ID
  androidClientId: 'YOUR_ANDROID_CLIENT_ID', // Google Android client ID
  iosClientId: 'YOUR_IOS_CLIENT_ID', // Google iOS client ID
});
```

## Step 3: Testing

1. Run your app with `npx expo start`
2. Navigate to the Sign-in screen
3. Tap the "Continue with Google" button
4. You should see the Google Sign-in flow

## Troubleshooting

If you encounter the error "Google.useAuthRequest is not a function", make sure:

1. You have installed the required dependencies:
   ```
   npx expo install expo-auth-session expo-web-browser expo-crypto
   ```

2. You're using the correct imports:
   ```typescript
   import * as WebBrowser from 'expo-web-browser';
   import * as Google from 'expo-auth-session/providers/google';
   ```

3. You initialize WebBrowser:
   ```typescript
   WebBrowser.maybeCompleteAuthSession();
   ```

For "Cannot find native module 'ExpoCrypto'" errors, try:

1. Rebuild your app entirely:
   ```
   npx expo prebuild --clean
   npx expo run:ios  # or run:android
   ```

Remember that Google Sign-in will work differently in development versus production environments. The redirect URIs must be configured correctly for each.

## Resources

- [Expo Auth Session Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google Sign-In Documentation](https://developers.google.com/identity/sign-in/web/sign-in)
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth) 