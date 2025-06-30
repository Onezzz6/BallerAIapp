import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
const cors = require('cors');

import { handleRevenueCatWebhook } from './revenuecat';

// Define the secret parameter
const RC_AUTH_TOKEN = defineSecret('RC_AUTH_TOKEN');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get Firestore instance  
const db = admin.firestore();

// RevenueCat webhook function
export const revenuecatWebhook = onRequest(
  {
    secrets: [RC_AUTH_TOKEN],
    region: 'us-central1',
  },
  async (req, res) => {
    // Enable CORS
    const corsHandler = cors({ origin: true });
    
    corsHandler(req, res, async () => {
      // Get authorization token from Firebase secret
      const getSecret = (): string => {
        return RC_AUTH_TOKEN.value();
      };
      
      // Handle the webhook using our separated logic
      await handleRevenueCatWebhook(req, res, db, getSecret);
    });
  }
); 