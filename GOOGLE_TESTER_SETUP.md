# Google Tester Account Setup Guide

This guide explains how to set up Google tester accounts that can bypass the paywall in your BallerAI app.

## Overview

The tester account system allows designated email addresses to access premium features without requiring an active subscription. This is perfect for Google Play Console testers, internal team members, and beta testers.

## How It Works

The system checks if a user's email address is in the list of designated tester emails. If it is, they get full premium access without needing to purchase a subscription.

### Key Features:
- ✅ Bypasses all paywall checks
- ✅ Works throughout the entire app
- ✅ Maintains full premium functionality
- ✅ Easy to add/remove testers
- ✅ Environment-based configuration
- ✅ Detailed logging for debugging

## Setup Methods

### Method 1: Environment Variables (Recommended)

1. **Add tester emails to your environment variables:**
   ```bash
   # In your .env file
   GOOGLE_TESTER_EMAILS=tester1@gmail.com,tester2@company.com,internal@ballerai.com
   ```

2. **For EAS builds, add to eas.json:**
   ```json
   {
     "build": {
       "production": {
         "env": {
           "GOOGLE_TESTER_EMAILS": "tester1@gmail.com,tester2@company.com"
         }
       }
     }
   }
   ```

### Method 2: Code Configuration

1. **Edit the tester list in code:**
   Open `/services/testerAccounts.ts` and add emails to the `GOOGLE_TESTER_EMAILS` array:
   ```typescript
   const GOOGLE_TESTER_EMAILS = [
     'tester1@gmail.com',
     'tester2@company.com',
     'internal.tester@ballerai.com',
     // Add more emails here
   ];
   ```

## Adding Google Play Console Testers

1. **Get tester email addresses from Google Play Console:**
   - Go to Google Play Console
   - Navigate to Testing > Internal testing (or Closed testing)
   - Copy the email addresses of your testers

2. **Add them using either method above**

3. **Testers will automatically get premium access when they:**
   - Sign up with their tester email address
   - Or sign in if they already have an account

## Testing the System

### For Testers:
1. Download the app
2. Sign up or sign in with your designated tester email
3. You should see premium features without any paywall
4. Look for console logs mentioning "🧪 TESTER ACCOUNT" for confirmation

### For Developers:
Check the logs for these messages:
- `🧪 TESTER ACCOUNT DETECTED: email@example.com - Will bypass paywall`
- `🧪 GRANTING PREMIUM ACCESS TO TESTER: email@example.com`
- `✅ TESTER ACCOUNT ACCESS GRANTED`

## Firestore Integration

The system automatically updates the user's Firestore document with tester status:
```json
{
  "isTester": true,
  "testerGrantedAt": "2024-01-15T10:30:00.000Z",
  "email": "tester@example.com"
}
```

This helps with:
- Tracking who has tester access
- Analytics and debugging
- Future tester management features

## Security Considerations

- ✅ Tester emails are case-insensitive and trimmed
- ✅ Empty emails are automatically rejected
- ✅ System falls back to subscription-only access if tester check fails
- ✅ Environment variables keep sensitive data out of code
- ✅ Tester status is logged for audit purposes

## Debugging

### Common Issues:

1. **Tester not getting access:**
   - Check if email exactly matches (case-insensitive)
   - Verify environment variables are loaded correctly
   - Check console logs for tester detection messages

2. **Environment variables not working:**
   - Ensure you've rebuilt the app after adding env vars
   - Check that `GOOGLE_TESTER_EMAILS` is properly set
   - Verify comma separation with no spaces around commas

3. **Still seeing paywall:**
   - Check if user signed up with the correct email
   - Verify the email is in the tester list
   - Look for error messages in console logs

### Debug Commands:

```typescript
// Check configured tester emails
import { getAllConfiguredTesterEmails } from '../services/testerAccounts';
console.log('Configured testers:', getAllConfiguredTesterEmails());

// Add runtime tester (for testing only)
import { addTesterEmailRuntime } from '../services/testerAccounts';
addTesterEmailRuntime('test@example.com');
```

## Production Deployment

1. **Set environment variables in your deployment system**
2. **Update EAS build configuration**
3. **Deploy the updated app**
4. **Test with a tester account before releasing**

## Example Complete Setup

### .env file:
```bash
GOOGLE_TESTER_EMAILS=john@testteam.com,sarah@company.com,beta.tester@gmail.com
```

### eas.json:
```json
{
  "build": {
    "production": {
      "env": {
        "GOOGLE_TESTER_EMAILS": "john@testteam.com,sarah@company.com,beta.tester@gmail.com"
      }
    }
  }
}
```

### Expected behavior:
- Users with these emails get immediate premium access
- No paywall is shown to them
- All premium features are unlocked
- Console shows tester confirmation messages

## Support

If you encounter issues:
1. Check the console logs for tester-related messages
2. Verify email addresses match exactly
3. Ensure environment variables are properly configured
4. Test with a simple email first to verify the system works

## Files Modified

- `/services/testerAccounts.ts` - Main tester service
- `/app.config.js` - Environment variable configuration
- `/types/env.d.ts` - TypeScript definitions
- `/app/(onboarding)/paywall.tsx` - Paywall bypass logic
- `/app/(onboarding)/profile-complete.tsx` - Onboarding bypass
- `/app/_layout.tsx` - Subscription context updates

The system is now fully integrated and ready to use!
