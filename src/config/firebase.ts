import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  Auth,
  connectAuthEmulator,
} from 'firebase/auth';
import type {
  Persistence,
  ReactNativeAsyncStorage as FirebaseRNAsyncStorage,
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// firebase@12 ships getReactNativePersistence in its React Native bundle
// (Metro resolves @firebase/auth via the package.json "react-native"
// condition at runtime), but omits it from the public web type surface
// (auth-public.d.ts), which TypeScript always resolves. Augment the module
// with the signature from @firebase/auth/dist/rn/index.rn.d.ts —
// ReactNativeAsyncStorage and Persistence are already in the public types.
declare module 'firebase/auth' {
  export function getReactNativePersistence(
    storage: FirebaseRNAsyncStorage
  ): Persistence;
}
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { logger } from '@/utils/logger';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAaS_Go2ZP7eKwOS-eo-PuJpFIsQHK71YQ',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'stoke-5f762.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'stoke-5f762',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'stoke-5f762.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1088752472801',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:1088752472801:web:2e894cb6d653ed0914dda0',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-GPN2QDMPYX',
};

// Initialize Firebase app (safe at module scope)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Explicitly initialize Auth instead of relying on getAuth(app)'s implicit
// component registration. In release bundles, Metro's production transforms
// (inline requires) can defer the side-effectful module execution that
// registers the auth component, crashing at launch with
// "Component auth has not been registered yet". initializeAuth registers it
// deterministically, and AsyncStorage persistence keeps the user signed in
// across app restarts (getAuth on React Native falls back to in-memory).
function createAuth(firebaseApp: FirebaseApp): Auth {
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (error) {
    // initializeAuth throws if auth is already initialized (e.g. hot reload).
    // Fall back to the existing instance.
    logger.warn('initializeAuth failed, falling back to getAuth:', error);
    return getAuth(firebaseApp);
  }
}

const auth: Auth = createAuth(app);
const db: Firestore = getFirestore(app);
const functions: Functions = getFunctions(app);
const storage: FirebaseStorage = getStorage(app);

// Use emulators in development
const USE_EMULATORS = process.env.EXPO_PUBLIC_USE_EMULATORS === 'true';
if (__DEV__ && USE_EMULATORS) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (e) {
    // Already connected (hot reload)
  }
}

// Configure Google Sign-In
try {
  GoogleSignin.configure({
    iosClientId: '1088752472801-qdv0p454v628s1bq3g7db9n4ik3m0972.apps.googleusercontent.com',
  });
} catch (error) {
  logger.error('Google Sign-In configuration failed:', error);
}

export { app, auth, db, functions, storage };
