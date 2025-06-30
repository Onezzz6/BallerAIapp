export default {
  expo: {
    name: "BallerAI",
    slug: "ballerai",
    scheme: "ballerai",
    version: "1.0.6",
    orientation: "portrait",
    // ... other config
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    experiments: {
      tsconfigPaths: true,
    },
    developmentClient: {
      silentLaunch: false
    },
    development: {
      developmentClient: true,
      distribution: "internal",
      ios: {
        resourceClass: "m1-medium"
      }
    },
    android: {
      package: "com.ballerai.app",
      versionCode: 33,
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    ios: {
      bundleIdentifier: "com.ballerbizoy.ballerai",
      buildNumber: "33",
      googleServicesFile: "./GoogleService-Info.plist",
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera to analyze your meals for nutritional information.",
        NSPhotoLibraryUsageDescription: "This app accesses your photos to analyze your meals for nutritional information.",
        NSUserTrackingUsageDescription: "This app uses tracking to improve your experience and provide personalized content.",
        UIBackgroundModes: ["fetch"],
        ITSAppUsesNonExemptEncryption: false,
        LSApplicationQueriesSchemes: ["instagram-stories", "instagram"]
      }
    },
    jsEngine: "hermes",
    newArchEnabled: true,
    plugins: [
      "@react-native-firebase/app",
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ],
      'expo-font',
      'expo-camera',
      'expo-image-picker',
      'expo-file-system',
      'expo-notifications',
      'expo-apple-authentication'
    ],
    web: {
      favicon: "./assets/favicon.png"
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      "**/*"
    ],
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
      googleApiKey: process.env.GOOGLE_API_KEY,
      deepseekApiKey: process.env.DEEPSEEK_API_KEY,
      eas: {
        projectId: "eca84105-519c-4832-902e-d87afe59e858"
      }
    },
    description: "BallerAI is a personalized AI coach for athletes to optimize recovery, nutrition, and performance."
  }
}; 