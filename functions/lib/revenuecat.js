"use strict";
/**
 * RevenueCat Webhook Handler
 * Processes subscription events from RevenueCat, validates HMAC signatures, and updates user subscription status in Firestore.
 *
 * Local testing:
 * curl -X POST http://localhost:5001/your-project/europe-west3/revenuecatWebhook \
 *   -H "Content-Type: application/json" \
 *   -H "X-RevCat-Signature: your_hmac_signature" \
 *   -d '{"event":{"type":"INITIAL_PURCHASE"},"app_user_id":"test_uid","product_id":"BallerAIOneMonth","expires_at_ms":1234567890000}'
 */
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
exports.validateEvent = validateEvent;
exports.processWebhookEvent = processWebhookEvent;
exports.handleRevenueCatWebhook = handleRevenueCatWebhook;
const crypto = __importStar(require("crypto"));
// Event type to status mapping
const EVENT_STATUS_MAP = {
    'INITIAL_PURCHASE': 'ACTIVE',
    'RENEWAL': 'ACTIVE',
    'BILLING_ISSUE': 'PAST_DUE',
    'CANCELLATION': 'CANCELLED',
    'EXPIRATION': 'EXPIRED',
};
/**
 * Validates and parses RevenueCat webhook event payload
 * @param payload Raw webhook payload
 * @returns Validated and typed event data
 * @throws Error if validation fails
 */
function validateEvent(payload) {
    // Check required top-level fields
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid payload: must be an object');
    }
    if (!payload.event || typeof payload.event !== 'object') {
        throw new Error('Invalid payload: missing or invalid event object');
    }
    if (!payload.event.type || typeof payload.event.type !== 'string') {
        throw new Error('Invalid payload: missing or invalid event.type');
    }
    // Handle both real webhooks and test events - app_user_id can be at top level or inside event
    const appUserId = payload.app_user_id || payload.event.app_user_id;
    if (!appUserId || typeof appUserId !== 'string') {
        throw new Error('Invalid payload: missing or invalid app_user_id');
    }
    // Handle both real webhooks and test events - product_id can be at top level or inside event  
    const productId = payload.product_id || payload.event.product_id;
    if (!productId || typeof productId !== 'string') {
        throw new Error('Invalid payload: missing or invalid product_id');
    }
    // Handle both real webhooks and test events - expires_at_ms can be at top level or inside event
    const expiresAtMs = payload.expires_at_ms !== undefined ? payload.expires_at_ms : payload.event.expiration_at_ms;
    if (expiresAtMs !== null && expiresAtMs !== undefined && (typeof expiresAtMs !== 'number' || expiresAtMs < 0)) {
        throw new Error('Invalid payload: expires_at_ms must be null or a positive number');
    }
    // Normalize the payload structure for consistent processing
    const normalizedPayload = {
        event: payload.event,
        app_user_id: appUserId,
        product_id: productId,
        expires_at_ms: expiresAtMs || null,
        attributes: payload.attributes || payload.event.subscriber_attributes || {}
    };
    return normalizedPayload;
}
/**
 * Verifies Authorization header from RevenueCat
 * @param authHeader Authorization header from request
 * @param expectedToken Expected authorization token
 * @returns True if authorization is valid
 */
function verifyAuthorizationHeader(authHeader, expectedToken) {
    if (!authHeader || !expectedToken) {
        return false;
    }
    try {
        // Support both "Bearer token" and just "token" formats
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
        const expected = expectedToken.startsWith('Bearer ') ? expectedToken.substring(7) : expectedToken;
        // Use timing-safe comparison to prevent timing attacks
        if (token.length !== expected.length) {
            return false;
        }
        return crypto.timingSafeEqual(Buffer.from(token, 'utf8'), Buffer.from(expected, 'utf8'));
    }
    catch (error) {
        console.error('Error verifying authorization header:', error);
        return false;
    }
}
/**
 * Determines platform from product ID or other indicators
 * @param productId Product identifier
 * @returns Platform string
 */
function determinePlatform(productId) {
    // Simple heuristic - can be enhanced based on your product naming
    if (productId.toLowerCase().includes('android')) {
        return 'android';
    }
    return 'ios'; // Default to iOS for BallerAI
}
/**
 * Core webhook processing logic (separated for easier testing)
 * @param payload Validated webhook payload
 * @param db Firestore database instance
 * @returns Promise that resolves when processing is complete
 */
async function processWebhookEvent(payload, db) {
    console.log('Processing RevenueCat webhook', {
        eventType: payload.event.type,
        userId: payload.app_user_id,
        productId: payload.product_id,
    });
    // Determine subscription status from event type
    const status = EVENT_STATUS_MAP[payload.event.type];
    if (!status) {
        console.warn(`Unknown event type: ${payload.event.type}`);
        return; // Return without error to prevent RevenueCat retries
    }
    // Prepare subscription data
    const subscriptionData = {
        status,
        productId: payload.product_id,
        expiresAt: payload.expires_at_ms ? new Date(payload.expires_at_ms) : null,
        platform: determinePlatform(payload.product_id),
        lastEvent: payload.event.type,
        updatedAt: new Date(),
    };
    // Prepare Firestore update object
    const updateData = {
        subscription: subscriptionData,
    };
    // Handle referral code update if present and different
    if (payload.attributes?.referral_code?.value) {
        const referralCode = payload.attributes.referral_code.value.trim().toUpperCase();
        // Check if referral code is different from existing one
        const userRef = db.doc(`users/${payload.app_user_id}`);
        try {
            const userDoc = await userRef.get();
            const existingReferralCode = userDoc.data()?.referralCode;
            if (existingReferralCode !== referralCode) {
                updateData.referralCode = referralCode;
                console.log(`Updating referral code for user ${payload.app_user_id}: ${referralCode}`);
            }
        }
        catch (error) {
            console.warn('Error checking existing referral code:', error);
            // Continue with subscription update even if referral code check fails
        }
    }
    // Update Firestore
    const userRef = db.doc(`users/${payload.app_user_id}`);
    await userRef.update(updateData);
    console.log('Successfully updated user subscription', {
        userId: payload.app_user_id,
        status: subscriptionData.status,
        productId: subscriptionData.productId,
    });
}
/**
 * Main webhook handler function
 * To be exported from index.ts as a Firebase Function
 */
async function handleRevenueCatWebhook(req, res, db, getSecret) {
    try {
        // Only accept POST requests
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        // Get authorization header for verification
        const authHeader = req.get('Authorization');
        if (!authHeader) {
            console.warn('Missing Authorization header');
            res.status(401).json({ error: 'Missing authorization header' });
            return;
        }
        // Verify authorization header
        const expectedToken = getSecret();
        if (!expectedToken) {
            console.error('Authorization token not configured');
            res.status(500).json({ error: 'Server configuration error' });
            return;
        }
        if (!verifyAuthorizationHeader(authHeader, expectedToken)) {
            console.warn('Invalid authorization header');
            res.status(401).json({ error: 'Invalid authorization' });
            return;
        }
        // Parse and validate the payload
        let payload;
        try {
            const jsonPayload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            payload = validateEvent(jsonPayload);
        }
        catch (error) {
            console.warn('Invalid webhook payload:', error);
            res.status(400).json({ error: 'Invalid payload format' });
            return;
        }
        // Process the webhook event
        await processWebhookEvent(payload, db);
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Error processing RevenueCat webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=revenuecat.js.map