"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.revenuecatWebhook = exports.revenuecatProxy = exports.openaiProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const cors = require('cors');
const revenuecat_1 = require("./revenuecat");
// Define the secret parameters
const RC_AUTH_TOKEN = (0, params_1.defineSecret)('RC_AUTH_TOKEN');
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
// Initialize Firebase Admin SDK
admin.initializeApp();
// Get Firestore instance  
const db = admin.firestore();
// OpenAI Proxy Function
exports.openaiProxy = (0, https_1.onRequest)({
    secrets: [OPENAI_API_KEY],
    region: 'us-central1',
    cors: true,
}, async (req, res) => {
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
            }
            catch (error) {
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
            const processedMessages = messages.map((message) => {
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
            const requestBody = {
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
            }
            else {
                // Other models can use custom temperature
                requestBody.temperature = temperature !== undefined ? temperature : 0.7;
            }
            // Handle token limits based on model
            if (max_completion_tokens !== undefined) {
                requestBody.max_completion_tokens = max_completion_tokens;
            }
            else if (max_tokens !== undefined) {
                requestBody.max_tokens = max_tokens;
            }
            else {
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
        }
        catch (error) {
            console.error('Error in OpenAI proxy:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});
// RevenueCat API Proxy Functions
exports.revenuecatProxy = (0, https_1.onRequest)({
    region: 'us-central1',
    cors: true,
}, async (req, res) => {
    const corsHandler = cors({
        origin: true,
        methods: ['POST', 'GET'],
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
            let decodedToken;
            try {
                // Verify the Firebase ID token
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (error) {
                res.status(401).json({ error: 'Invalid token' });
                return;
            }
            const { action, platform, ...requestData } = req.body;
            if (!action || !platform) {
                res.status(400).json({ error: 'Missing action or platform' });
                return;
            }
            // Get the appropriate RevenueCat API key based on platform
            const functions = require('firebase-functions');
            const apiKey = platform === 'ios'
                ? functions.config().revenuecat?.ios_key
                : functions.config().revenuecat?.android_key;
            if (!apiKey) {
                res.status(500).json({ error: `RevenueCat API key not configured for ${platform}` });
                return;
            }
            let revenuecatUrl = '';
            let method = 'GET';
            let body = null;
            // Handle different RevenueCat API actions
            switch (action) {
                case 'getCustomerInfo':
                    revenuecatUrl = `https://api.revenuecat.com/v1/subscribers/${decodedToken.uid}`;
                    method = 'GET';
                    break;
                case 'getOfferings':
                    revenuecatUrl = `https://api.revenuecat.com/v1/subscribers/${decodedToken.uid}/offerings`;
                    method = 'GET';
                    break;
                case 'updateAttributes':
                    revenuecatUrl = `https://api.revenuecat.com/v1/subscribers/${decodedToken.uid}/attributes`;
                    method = 'POST';
                    body = JSON.stringify({ attributes: requestData.attributes });
                    break;
                default:
                    res.status(400).json({ error: `Unknown action: ${action}` });
                    return;
            }
            // Make the request to RevenueCat API
            const revenuecatResponse = await fetch(revenuecatUrl, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'X-Platform': platform,
                },
                ...(body && { body }),
            });
            const data = await revenuecatResponse.json();
            if (!revenuecatResponse.ok) {
                console.error('RevenueCat API error:', data);
                res.status(revenuecatResponse.status).json({
                    error: 'RevenueCat API error',
                    details: data.message || 'Unknown error'
                });
                return;
            }
            // Return the RevenueCat response to the client
            res.json(data);
        }
        catch (error) {
            console.error('Error in RevenueCat proxy:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});
// RevenueCat webhook function
exports.revenuecatWebhook = (0, https_1.onRequest)({
    secrets: [RC_AUTH_TOKEN],
    region: 'us-central1',
}, async (req, res) => {
    // Enable CORS
    const corsHandler = cors({ origin: true });
    corsHandler(req, res, async () => {
        // Get authorization token from Firebase secret
        const getSecret = () => {
            return RC_AUTH_TOKEN.value();
        };
        // Handle the webhook using our separated logic
        await (0, revenuecat_1.handleRevenueCatWebhook)(req, res, db, getSecret);
    });
});
//# sourceMappingURL=index.js.map