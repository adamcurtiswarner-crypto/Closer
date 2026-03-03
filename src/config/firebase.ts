import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { logger } from '@/utils/logger';

// Firebase configuration — env vars override for local dev, production values hardcoded
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAaS_Go2ZP7eKwOS-eo-PuJpFIsQHK71YQ',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'stoke-5f762.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'stoke-5f762',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'stoke-5f762.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1088752472801',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:1088752472801:web:2e894cb6d653ed0914dda0',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-GPN2QDMPYX',
};

// Initialize Firebase (prevent multiple initializations)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let storage: FirebaseStorage;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);
functions = getFunctions(app);
storage = getStorage(app);

// Use emulators in development (must be called before any other Firestore operations)
if (__DEV__) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (e) {
    // Already connected (hot reload)
  }
}


// Configure Google Sign-In (iOS client ID from GoogleService-Info.plist)
GoogleSignin.configure({
  iosClientId: '1088752472801-qdv0p454v628s1bq3g7db9n4ik3m0972.apps.googleusercontent.com',
});

export { app, auth, db, functions, storage };
