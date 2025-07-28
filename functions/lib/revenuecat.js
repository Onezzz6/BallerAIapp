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
    // RevenueCat webhook structure has all fields inside the event object
    const event = payload.event;
    // TRANSFER events have a different structure - they don't have app_user_id or product_id
    if (event.type === 'TRANSFER') {
        // For TRANSFER events, we need transferred_to array
        if (!event.transferred_to || !Array.isArray(event.transferred_to) || event.transferred_to.length === 0) {
            throw new Error('Invalid payload: TRANSFER event missing transferred_to');
        }
        // Use the first transferred_to ID as the app_user_id for processing
        const normalizedPayload = {
            event: {
                type: event.type
            },
            app_user_id: event.transferred_to[0], // Use first transferred_to ID
            product_id: 'TRANSFER', // Placeholder for transfer events
            expires_at_ms: null,
            attributes: event.subscriber_attributes || {}
        };
        return normalizedPayload;
    }
    // For all other events, require standard fields
    if (!event.app_user_id || typeof event.app_user_id !== 'string') {
        throw new Error('Invalid payload: missing or invalid event.app_user_id');
    }
    if (!event.product_id || typeof event.product_id !== 'string') {
        throw new Error('Invalid payload: missing or invalid event.product_id');
    }
    // expiration_at_ms is the correct field name in RevenueCat webhooks
    const expiresAtMs = event.expiration_at_ms;
    if (expiresAtMs !== null && expiresAtMs !== undefined && (typeof expiresAtMs !== 'number' || expiresAtMs < 0)) {
        throw new Error('Invalid payload: expiration_at_ms must be null or a positive number');
    }
    // Normalize the payload structure for consistent processing
    const normalizedPayload = {
        event: {
            type: event.type
        },
        app_user_id: event.app_user_id,
        product_id: event.product_id,
        expires_at_ms: expiresAtMs || null,
        attributes: event.subscriber_attributes || {}
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
    // Handle TRANSFER events differently - they don't have subscription status
    if (payload.event.type === 'TRANSFER') {
        // For TRANSFER events, we only update referral code if present
        if (payload.attributes?.referral_code?.value) {
            const referralCode = payload.attributes.referral_code.value.trim().toUpperCase();
            const userRef = db.doc(`users/${payload.app_user_id}`);
            try {
                const userDoc = await userRef.get();
                const existingReferralCode = userDoc.data()?.referralCode;
                if (existingReferralCode !== referralCode) {
                    await userRef.set({
                        referralCode: referralCode,
                        updatedAt: new Date(),
                    }, { merge: true });
                    console.log(`Updated referral code for transferred user ${payload.app_user_id}: ${referralCode}`);
                }
            }
            catch (error) {
                console.warn('Error updating referral code for TRANSFER event:', error);
            }
        }
        console.log('Successfully processed TRANSFER event', {
            userId: payload.app_user_id,
            eventType: payload.event.type,
        });
        return;
    }
    // Handle regular subscription events
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
    await userRef.set(updateData, { merge: true });
    // CRITICAL: Clean up duplicate active subscriptions
    // When a subscription becomes ACTIVE for a user, ensure no other users have this subscription active
    if (subscriptionData.status === 'ACTIVE') {
        await cleanupDuplicateActiveSubscriptions(db, payload.app_user_id, payload.product_id);
    }
    console.log('Successfully updated user subscription', {
        userId: payload.app_user_id,
        status: subscriptionData.status,
        productId: subscriptionData.productId,
    });
}
/**
 * Clean up duplicate active subscriptions across different user accounts
 * This handles the case where RevenueCat transfers a subscription but Firestore documents are out of sync
 */
async function cleanupDuplicateActiveSubscriptions(db, currentUserId, productId) {
    try {
        console.log(`Cleaning up duplicate active subscriptions for product: ${productId}, current user: ${currentUserId}`);
        // Query for all users who have this product as active (excluding current user)
        const usersQuery = await db.collection('users')
            .where('subscription.productId', '==', productId)
            .where('subscription.status', '==', 'ACTIVE')
            .get();
        const duplicateUsers = [];
        usersQuery.forEach((doc) => {
            const userId = doc.id;
            // Skip the current user who should keep the active subscription
            if (userId !== currentUserId) {
                duplicateUsers.push(userId);
            }
        });
        if (duplicateUsers.length === 0) {
            console.log('No duplicate active subscriptions found');
            return;
        }
        console.log(`Found ${duplicateUsers.length} duplicate active subscriptions to clean up:`, duplicateUsers);
        // Mark all duplicate subscriptions as CANCELLED
        const batch = db.batch();
        for (const userId of duplicateUsers) {
            const userRef = db.doc(`users/${userId}`);
            batch.update(userRef, {
                'subscription.status': 'CANCELLED',
                'subscription.lastEvent': 'TRANSFER_CLEANUP',
                'subscription.updatedAt': new Date(),
            });
        }
        await batch.commit();
        console.log(`Successfully cleaned up ${duplicateUsers.length} duplicate active subscriptions`);
    }
    catch (error) {
        console.error('Error cleaning up duplicate subscriptions:', error);
        // Don't throw error - this is cleanup, shouldn't break the main webhook processing
    }
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