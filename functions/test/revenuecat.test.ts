/**
 * RevenueCat Webhook Tests
 * 
 * To run tests:
 * npm test
 * 
 * To run with coverage:
 * npm run test:coverage
 */

import { validateEvent, processWebhookEvent, handleRevenueCatWebhook } from '../src/revenuecat';

// Mock Firebase Admin
const mockUpdate = jest.fn();
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({
  update: mockUpdate,
  set: mockSet,
  get: mockGet,
}));

const mockDb = {
  doc: mockDoc,
};

// Test data
const TEST_AUTH_TOKEN = 'test-auth-token-12345';
const TEST_PAYLOAD = {
  event: { 
    type: 'INITIAL_PURCHASE'
  },
  app_user_id: 'firebase_uid_test_123',
  product_id: 'BallerAIOneMonth',
  expires_at_ms: 1734567890000, // Future date
  attributes: {
    referral_code: {
      value: 'TESTCODE',
      updated_at_ms: 1591121853000
    },
  },
};

// Raw webhook payload for testing validateEvent
const RAW_WEBHOOK_PAYLOAD = {
  api_version: "1.0",
  event: {
    type: 'INITIAL_PURCHASE',
    app_user_id: 'firebase_uid_test_123',
    product_id: 'BallerAIOneMonth',
    expiration_at_ms: 1734567890000,
    subscriber_attributes: {
      referral_code: {
        value: 'TESTCODE',
        updated_at_ms: 1591121853000
      },
    },
  },
};

// Mock request/response objects
function createMockRequest(payload: any, authHeader?: string): any {
  return {
    method: 'POST',
    body: payload,
    get: jest.fn().mockImplementation((header: string) => {
      if (header === 'Authorization') return authHeader;
      return undefined;
    }),
  };
}

function createMockResponse(): any {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('RevenueCat Webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockClear();
    mockSet.mockClear();
    mockGet.mockClear();
  });

  describe('validateEvent', () => {
    it('should validate a correct payload', () => {
      const result = validateEvent(RAW_WEBHOOK_PAYLOAD);
      expect(result.app_user_id).toBe('firebase_uid_test_123');
      expect(result.product_id).toBe('BallerAIOneMonth');
      expect(result.expires_at_ms).toBe(1734567890000);
      expect(result.event.type).toBe('INITIAL_PURCHASE');
    });

    it('should throw error for missing event object', () => {
      const invalidPayload = { ...RAW_WEBHOOK_PAYLOAD };
      delete (invalidPayload as any).event;
      
      expect(() => validateEvent(invalidPayload)).toThrow('missing or invalid event object');
    });

    it('should throw error for missing event type', () => {
      const invalidPayload = {
        ...RAW_WEBHOOK_PAYLOAD,
        event: {},
      };
      
      expect(() => validateEvent(invalidPayload)).toThrow('missing or invalid event.type');
    });

    it('should throw error for missing app_user_id', () => {
      const invalidPayload = { 
        ...RAW_WEBHOOK_PAYLOAD,
        event: {
          ...RAW_WEBHOOK_PAYLOAD.event
        }
      };
      delete (invalidPayload.event as any).app_user_id;
      
      expect(() => validateEvent(invalidPayload)).toThrow('missing or invalid event.app_user_id');
    });

    it('should throw error for missing product_id', () => {
      const invalidPayload = { 
        ...RAW_WEBHOOK_PAYLOAD,
        event: {
          ...RAW_WEBHOOK_PAYLOAD.event
        }
      };
      delete (invalidPayload.event as any).product_id;
      
      expect(() => validateEvent(invalidPayload)).toThrow('missing or invalid event.product_id');
    });

    it('should accept null expires_at_ms', () => {
      const payloadWithNullExpiry = {
        ...RAW_WEBHOOK_PAYLOAD,
        event: {
          ...RAW_WEBHOOK_PAYLOAD.event,
          expiration_at_ms: null,
        }
      };
      
      const result = validateEvent(payloadWithNullExpiry);
      expect(result.expires_at_ms).toBeNull();
    });

    it('should throw error for invalid expires_at_ms', () => {
      const invalidPayload = {
        ...RAW_WEBHOOK_PAYLOAD,
        event: {
          ...RAW_WEBHOOK_PAYLOAD.event,
          expiration_at_ms: -1,
        }
      };
      
      expect(() => validateEvent(invalidPayload)).toThrow('expiration_at_ms must be null or a positive number');
    });
  });

  describe('processWebhookEvent', () => {
    it('should process INITIAL_PURCHASE event correctly', async () => {
      mockGet.mockResolvedValue({
        data: () => ({ referralCode: 'OLDCODE' }),
      });

      await processWebhookEvent(TEST_PAYLOAD, mockDb);

      expect(mockDoc).toHaveBeenCalledWith('users/firebase_uid_test_123');
      expect(mockSet).toHaveBeenCalledWith({
        subscription: {
          status: 'ACTIVE',
          productId: 'BallerAIOneMonth',
          expiresAt: new Date(1734567890000),
          platform: 'ios',
          lastEvent: 'INITIAL_PURCHASE',
          updatedAt: expect.any(Date),
        },
        referralCode: 'TESTCODE',
      }, { merge: true });
    });

    it('should process RENEWAL event correctly', async () => {
      const renewalPayload = {
        ...TEST_PAYLOAD,
        event: { type: 'RENEWAL' },
      };

      mockGet.mockResolvedValue({
        data: () => ({}),
      });

      await processWebhookEvent(renewalPayload, mockDb);

      expect(mockSet).toHaveBeenCalledWith({
        subscription: expect.objectContaining({
          status: 'ACTIVE',
          lastEvent: 'RENEWAL',
        }),
        referralCode: 'TESTCODE',
      }, { merge: true });
    });

    it('should process CANCELLATION event correctly', async () => {
      const cancellationPayload = {
        ...TEST_PAYLOAD,
        event: { type: 'CANCELLATION' },
      };

      mockGet.mockResolvedValue({
        data: () => ({}),
      });

      await processWebhookEvent(cancellationPayload, mockDb);

      expect(mockSet).toHaveBeenCalledWith({
        subscription: expect.objectContaining({
          status: 'CANCELLED',
          lastEvent: 'CANCELLATION',
        }),
        referralCode: 'TESTCODE',
      }, { merge: true });
    });

    it('should process EXPIRATION event correctly', async () => {
      const expirationPayload = {
        ...TEST_PAYLOAD,
        event: { type: 'EXPIRATION' },
      };

      mockGet.mockResolvedValue({
        data: () => ({}),
      });

      await processWebhookEvent(expirationPayload, mockDb);

      expect(mockSet).toHaveBeenCalledWith({
        subscription: expect.objectContaining({
          status: 'EXPIRED',
          lastEvent: 'EXPIRATION',
        }),
        referralCode: 'TESTCODE',
      }, { merge: true });
    });

    it('should handle unknown event types gracefully', async () => {
      const unknownEventPayload = {
        ...TEST_PAYLOAD,
        event: { type: 'UNKNOWN_EVENT' },
      };

      // Should not throw and not call update
      await processWebhookEvent(unknownEventPayload, mockDb);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should not update referral code if it matches existing', async () => {
      mockGet.mockResolvedValue({
        data: () => ({ referralCode: 'TESTCODE' }),
      });

      await processWebhookEvent(TEST_PAYLOAD, mockDb);

      expect(mockSet).toHaveBeenCalledWith({
        subscription: expect.any(Object),
        // referralCode should not be included if it's the same
      }, { merge: true });
      
      const updateCall = mockSet.mock.calls[0][0];
      expect(updateCall).not.toHaveProperty('referralCode');
    });

    it('should handle payload without referral code', async () => {
      const payloadWithoutReferral = {
        ...TEST_PAYLOAD,
        attributes: {},
      };

      mockGet.mockResolvedValue({
        data: () => ({}),
      });

      await processWebhookEvent(payloadWithoutReferral, mockDb);

      expect(mockSet).toHaveBeenCalledWith({
        subscription: expect.any(Object),
      }, { merge: true });
      
      const updateCall = mockSet.mock.calls[0][0];
      expect(updateCall).not.toHaveProperty('referralCode');
    });
  });

  describe('handleRevenueCatWebhook', () => {
    it('should return 200 for valid webhook with correct authorization', async () => {
      const req = createMockRequest(RAW_WEBHOOK_PAYLOAD, TEST_AUTH_TOKEN);
      const res = createMockResponse();
      const getSecret = () => TEST_AUTH_TOKEN;

      mockGet.mockResolvedValue({
        data: () => ({}),
      });

      await handleRevenueCatWebhook(req, res, mockDb, getSecret);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should return 401 for invalid authorization', async () => {
      const req = createMockRequest(RAW_WEBHOOK_PAYLOAD, 'invalid_token');
      const res = createMockResponse();
      const getSecret = () => TEST_AUTH_TOKEN;

      await handleRevenueCatWebhook(req, res, mockDb, getSecret);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid authorization' });
    });

    it('should return 401 for missing authorization', async () => {
      const req = createMockRequest(RAW_WEBHOOK_PAYLOAD); // No auth header
      const res = createMockResponse();
      const getSecret = () => TEST_AUTH_TOKEN;

      await handleRevenueCatWebhook(req, res, mockDb, getSecret);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization header' });
    });

    it('should return 400 for invalid payload', async () => {
      const invalidPayload = { invalid: 'payload' };
      const req = createMockRequest(invalidPayload, TEST_AUTH_TOKEN);
      const res = createMockResponse();
      const getSecret = () => TEST_AUTH_TOKEN;

      await handleRevenueCatWebhook(req, res, mockDb, getSecret);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid payload format' });
    });

    it('should return 405 for non-POST requests', async () => {
      const req = { ...createMockRequest(RAW_WEBHOOK_PAYLOAD), method: 'GET' };
      const res = createMockResponse();
      const getSecret = () => TEST_AUTH_TOKEN;

      await handleRevenueCatWebhook(req, res, mockDb, getSecret);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });

    it('should return 500 when token is not configured', async () => {
      const req = createMockRequest(RAW_WEBHOOK_PAYLOAD, TEST_AUTH_TOKEN);
      const res = createMockResponse();
      const getSecret = () => ''; // Empty token

      await handleRevenueCatWebhook(req, res, mockDb, getSecret);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Server configuration error' });
    });

    it('should return 500 when database update fails', async () => {
      const req = createMockRequest(RAW_WEBHOOK_PAYLOAD, TEST_AUTH_TOKEN);
      const res = createMockResponse();
      const getSecret = () => TEST_AUTH_TOKEN;

      mockGet.mockResolvedValue({
        data: () => ({}),
      });
      mockSet.mockRejectedValue(new Error('Database error'));

      await handleRevenueCatWebhook(req, res, mockDb, getSecret);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
}); 