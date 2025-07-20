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
interface RevenueCatEvent {
    type: 'INITIAL_PURCHASE' | 'RENEWAL' | 'BILLING_ISSUE' | 'CANCELLATION' | 'EXPIRATION' | string;
}
interface RevenueCatWebhookPayload {
    event: RevenueCatEvent;
    app_user_id: string;
    expires_at_ms: number | null;
    product_id: string;
    attributes?: {
        [key: string]: {
            value: string;
            updated_at_ms?: number;
        };
    };
}
/**
 * Validates and parses RevenueCat webhook event payload
 * @param payload Raw webhook payload
 * @returns Validated and typed event data
 * @throws Error if validation fails
 */
export declare function validateEvent(payload: any): RevenueCatWebhookPayload;
/**
 * Core webhook processing logic (separated for easier testing)
 * @param payload Validated webhook payload
 * @param db Firestore database instance
 * @returns Promise that resolves when processing is complete
 */
export declare function processWebhookEvent(payload: RevenueCatWebhookPayload, db: any): Promise<void>;
/**
 * Main webhook handler function
 * To be exported from index.ts as a Firebase Function
 */
export declare function handleRevenueCatWebhook(req: any, res: any, db: any, getSecret: () => string): Promise<void>;
export {};
//# sourceMappingURL=revenuecat.d.ts.map