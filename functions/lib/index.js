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
exports.revenuecatWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const cors = require('cors');
const revenuecat_1 = require("./revenuecat");
// Define the secret parameter
const RC_AUTH_TOKEN = (0, params_1.defineSecret)('RC_AUTH_TOKEN');
// Initialize Firebase Admin SDK
admin.initializeApp();
// Get Firestore instance  
const db = admin.firestore();
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