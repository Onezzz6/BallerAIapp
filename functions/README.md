# Firebase Functions - BallerAI Backend

## Setup

1. **Install dependencies:**
   ```bash
   cd functions
   npm install
   ```

2. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

3. **Start the emulator:**
   ```bash
   npm run serve
   ```

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run lint` - Check code quality
- `npm run serve` - Start Firebase emulator
- `npm run test` - Run tests
- `npm run shell` - Open Firebase Functions shell
- `npm start` - Alias for shell

## RevenueCat Webhook

The main webhook function is located at:
- Source: `src/revenuecat.ts`
- Tests: `test/revenuecat.test.ts`

After building, deploy with:
```bash
firebase deploy --only functions:revenuecatWebhook
```

## Environment Setup

Set the RevenueCat HMAC secret:
```bash
firebase functions:secrets:set RC_HMAC_SECRET
```

## Testing

Run tests locally:
```bash
npm test
```

Test the webhook endpoint:
```bash
curl -X POST http://localhost:5001/your-project/us-central1/revenuecatWebhook \
  -H "Content-Type: application/json" \
  -H "X-RevCat-Signature: your_hmac_signature" \
  -d '{"event":{"type":"INITIAL_PURCHASE"},"app_user_id":"test_uid","product_id":"BallerAIOneMonth","expires_at_ms":1234567890000}'
``` 