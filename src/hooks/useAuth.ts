import { useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { User, ToneCalibration } from '@/types';

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

export function useAuth(): AuthState & AuthActions {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user document from Firestore
  const fetchUserDoc = useCallback(async (uid: string): Promise<User | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          id: uid,
          email: data.email,
          displayName: data.display_name,
          partnerName: data.partner_name,
          coupleId: data.couple_id,
          notificationTime: data.notification_time || '19:00',
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          toneCalibration: data.tone_calibration || 'solid',
          isOnboarded: data.is_onboarded || false,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user doc:', error);
      return null;
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        const userData = await fetchUserDoc(fbUser.uid);
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
      await signInWithEmailAndPassword(auth, email, password);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign up with email/password
  const signUp = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);

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
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      const userData = await fetchUserDoc(firebaseUser.uid);
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
