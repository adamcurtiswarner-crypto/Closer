import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { User, ToneCalibration, RelationshipStage } from '@/types';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthInternal();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState & AuthActions {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function useAuthInternal(): AuthState & AuthActions {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user document from Firestore, auto-creating if missing
  const fetchUserDoc = useCallback(async (fbUser: FirebaseUser): Promise<User | null> => {
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      let userSnap = await getDoc(userRef);

      // Safety net: if Auth account exists but Firestore doc is missing, create it
      if (!userSnap.exists()) {
        logger.warn('User doc missing for authenticated user, creating:', fbUser.uid);
        await setDoc(userRef, {
          email: (fbUser.email || '').toLowerCase(),
          display_name: null,
          partner_name: null,
          couple_id: null,
          notification_time: '19:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          tone_calibration: 'solid',
          push_tokens: [],
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          last_active_at: serverTimestamp(),
          onboarding_completed_at: null,
          is_onboarded: false,
          is_deleted: false,
          photo_url: null,
          partner_photo_url: null,
          love_language: null,
          relationship_stage: null,
          pending_check_in: false,
        });
        userSnap = await getDoc(userRef);
      }

      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          id: fbUser.uid,
          email: data.email,
          displayName: data.display_name,
          partnerName: data.partner_name,
          coupleId: data.couple_id,
          notificationTime: data.notification_time || '19:00',
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          toneCalibration: data.tone_calibration || 'solid',
          isOnboarded: data.is_onboarded || false,
          photoUrl: data.photo_url || null,
          partnerPhotoUrl: data.partner_photo_url || null,
          loveLanguage: data.love_language || null,
          locale: data.locale || null,
          relationshipStage: data.relationship_stage || null,
          pendingCheckIn: data.pending_check_in || false,
        };
      }
      return null;
    } catch (error) {
      logger.error('Error fetching user doc:', error);
      return null;
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        const userData = await fetchUserDoc(fbUser);
        setUser(userData);
      } else {
        setUser(null);
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, [fetchUserDoc]);

  // Sign in with email/password
  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: fbUser } = await signInWithEmailAndPassword(auth, email, password);
      // Explicitly fetch and set user doc (matching signUp behavior)
      // so state is ready before callers navigate away
      const userData = await fetchUserDoc(fbUser);
      setUser(userData);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserDoc]);

  // Sign up with email/password
  const signUp = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);

      // Send verification email (non-blocking)
      sendEmailVerification(newUser).catch((err) =>
        logger.warn('Could not send verification email:', err)
      );

      // Create user document in Firestore
      const userRef = doc(db, 'users', newUser.uid);
      await setDoc(userRef, {
        email: email.toLowerCase(),
        display_name: null,
        partner_name: null,
        couple_id: null,
        notification_time: '19:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        tone_calibration: 'solid',
        push_tokens: [],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        last_active_at: serverTimestamp(),
        onboarding_completed_at: null,
        is_onboarded: false,
        is_deleted: false,
        photo_url: null,
        partner_photo_url: null,
        love_language: null,
        relationship_stage: null,
        pending_check_in: false,
      });

      // Fetch user doc now that it exists — onAuthStateChanged may have
      // already fired before setDoc completed, leaving user as null
      const userData = await fetchUserDoc(newUser);
      setUser(userData);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserDoc]);

  // Sign out
  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (firebaseUser) {
      const userData = await fetchUserDoc(firebaseUser);
      setUser(userData);
    }
  }, [firebaseUser, fetchUserDoc]);

  return {
    user,
    firebaseUser,
    isLoading,
    isAuthenticated: !!firebaseUser,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshUser,
  };
}
