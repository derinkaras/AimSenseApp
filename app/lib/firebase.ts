// app/lib/firebase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
// @ts-expect-error getReactNativePersistence is only typed in the React Native build of firebase/auth (Metro resolves that one at runtime)
import { getReactNativePersistence, initializeAuth, getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error("Missing Firebase environment variables (see .env.example)");
}

const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// initializeAuth/initializeFirestore may only be called once per app. Fast Refresh
// re-evaluates this module, so fall back to the existing instances on re-runs.
export const auth = isFirstInit
    ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
    : getAuth(app);

export const db = isFirstInit
    ? initializeFirestore(app, {
          // React Native has no WebChannel streaming support in some networks
          experimentalAutoDetectLongPolling: true,
          // Optional fields (e.g. gunPhotoUri) can be undefined without throwing
          ignoreUndefinedProperties: true,
      })
    : getFirestore(app);
