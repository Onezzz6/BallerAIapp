export default {
  expo: {
    name: "BallerAI",
    slug: "ballerai",
    scheme: "ballerai",
    version: "1.0.0",
    orientation: "portrait",
    // ... other config
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID,
      openaiApiKey: process.env.OPENAI_API_KEY,
    },
    experiments: {
      tsconfigPaths: true,
    },
    android: {
      package: "com.ballerai.app"
    },
    ios: {
      bundleIdentifier: "com.ballerai.app"
    },
    jsEngine: "hermes",
    newArchEnabled: true,
    plugins: [
      'expo-font',
    ],
  },
}; 