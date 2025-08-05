import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
const cors = require('cors');

import { handleRevenueCatWebhook } from './revenuecat';

// Define the secret parameters
const RC_AUTH_TOKEN = defineSecret('RC_AUTH_TOKEN');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get Firestore instance  
const db = admin.firestore();

// OpenAI Proxy Function
export const openaiProxy = onRequest(
  {
    secrets: [OPENAI_API_KEY],
    region: 'us-central1',
    cors: true,
  },
  async (req, res) => {
    const corsHandler = cors({ 
      origin: true,
      methods: ['POST'],
      allowedHeaders: ['Content-Type', 'Authorization']
    });
    
    corsHandler(req, res, async () => {
      try {
        // Verify user is authenticated
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        
        try {
          // Verify the Firebase ID token
          await admin.auth().verifyIdToken(idToken);
        } catch (error) {
          res.status(401).json({ error: 'Invalid token' });
          return;
        }

        // Only allow POST requests
        if (req.method !== 'POST') {
          res.status(405).json({ error: 'Method not allowed' });
          return;
        }

        // Get the OpenAI request data from the client
        const { messages, model = 'gpt-3.5-turbo', max_tokens, max_completion_tokens, temperature } = req.body;

        if (!messages || !Array.isArray(messages)) {
          res.status(400).json({ error: 'Invalid request: messages array required' });
          return;
        }

        // Process messages to handle image data properly
        const processedMessages = messages.map((message: any) => {
          if (message.content && typeof message.content === 'string' && message.content.includes('IMAGE_DATA:')) {
            // Handle vision requests - extract image data and format properly
            const parts = message.content.split('IMAGE_DATA:');
            const textContent = parts[0].trim();
            const imageData = parts[1]?.trim();
            
            if (imageData) {
              return {
                role: message.role,
                content: [
                  {
                    type: 'text',
                    text: textContent
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: imageData
                    }
                  }
                ]
              };
            }
          }
          return message;
        });

        // Build request body based on model type
        const requestBody: any = {
          model,
          messages: processedMessages,
        };

        // Handle temperature based on model
        if (model === 'o3') {
          // o3 only supports temperature: 1 or no temperature (defaults to 1)
          if (temperature !== undefined && temperature !== 1) {
            console.warn(`o3 model only supports temperature: 1, received: ${temperature}, using default`);
          }
          // Don't set temperature for o3 - let it use default (1)
        } else {
          // Other models can use custom temperature
          requestBody.temperature = temperature !== undefined ? temperature : 0.7;
        }

        // Handle token limits based on model
        if (max_completion_tokens !== undefined) {
          requestBody.max_completion_tokens = max_completion_tokens;
        } else if (max_tokens !== undefined) {
          requestBody.max_tokens = max_tokens;
        } else {
          // Default for older models
          requestBody.max_tokens = 150;
        }

        // Make the request to OpenAI
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY.value()}`,
          },
          body: JSON.stringify(requestBody),
        });

        const data = await openaiResponse.json();

        if (!openaiResponse.ok) {
          console.error('OpenAI API error:', data);
          res.status(openaiResponse.status).json({ 
            error: 'OpenAI API error', 
            details: data.error?.message || 'Unknown error' 
          });
          return;
        }

        // Return the OpenAI response to the client
        res.json(data);

      } catch (error) {
        console.error('Error in OpenAI proxy:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }
);

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