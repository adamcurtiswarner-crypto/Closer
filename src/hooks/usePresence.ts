import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { useAuth } from './useAuth';
import { useCouple } from './useCouple';

export interface PresenceState {
  status: 'online' | 'offline' | 'away';
  lastSeen: Date | null;
  isTyping: boolean;
  typingContext: 'prompt' | null;
  hasViewedTodayResponse: boolean;
}

interface PresenceDoc {
  user_id: string;
  status: 'online' | 'offline' | 'away';
  last_seen: Timestamp | null;
  is_typing: boolean;
  typing_context: 'prompt' | null;
  has_viewed_today_response: boolean;
}

export interface UsePresenceReturn {
  isPartnerOnline: boolean;
  isPartnerTyping: boolean;
  partnerTypingContext: 'prompt' | null;
  partnerLastSeen: Date | null;
  partnerHasViewedResponse: boolean;
  setTyping: (isTyping: boolean, context?: 'prompt' | null) => void;
  markResponseViewed: () => void;
}

export function usePresence(): UsePresenceReturn {
  const { user } = useAuth();
  const { data: couple } = useCouple();

  const [partnerPresence, setPartnerPresence] = useState<PresenceState | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const coupleId = couple?.id;
  const userId = user?.id;
  const partnerId = couple?.memberIds.find((id) => id !== userId);

  // Update own presence
  const updateOwnPresence = useCallback(
    async (status: 'online' | 'offline' | 'away', additionalData?: Partial<PresenceDoc>) => {
      if (!coupleId || !userId) return;

      const presenceRef = doc(db, 'presence', coupleId, 'members', userId);
      await setDoc(
        presenceRef,
        {
          user_id: userId,
          status,
          last_seen: serverTimestamp(),
          is_typing: false,
          typing_context: null,
          has_viewed_today_response: false,
          ...additionalData,
        },
        { merge: true }
      );
    },
    [coupleId, userId]
  );

  // Set typing status with debounce
  const setTyping = useCallback(
    (isTyping: boolean, context: 'prompt' | null = null) => {
      if (!coupleId || !userId) return;

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      const presenceRef = doc(db, 'presence', coupleId, 'members', userId);

      if (isTyping) {
        // Update typing status
        setDoc(
          presenceRef,
          {
            is_typing: true,
            typing_context: context,
            last_seen: serverTimestamp(),
          },
          { merge: true }
        );

        // Auto-clear typing after 5 seconds of no updates
        typingTimeoutRef.current = setTimeout(() => {
          setDoc(
            presenceRef,
            {
              is_typing: false,
              typing_context: null,
            },
            { merge: true }
          );
        }, 5000);
      } else {
        // Clear typing immediately
        setDoc(
          presenceRef,
          {
            is_typing: false,
            typing_context: null,
          },
          { merge: true }
        );
      }
    },
    [coupleId, userId]
  );

  // Mark response as viewed
  const markResponseViewed = useCallback(() => {
    if (!coupleId || !userId) return;

    const presenceRef = doc(db, 'presence', coupleId, 'members', userId);
    setDoc(
      presenceRef,
      {
        has_viewed_today_response: true,
      },
      { merge: true }
    );
  }, [coupleId, userId]);

  // Set online on mount, offline on unmount
  useEffect(() => {
    if (!coupleId || !userId) return;

    updateOwnPresence('online');

    return () => {
      // Update to offline when component unmounts
      const presenceRef = doc(db, 'presence', coupleId, 'members', userId);
      setDoc(
        presenceRef,
        {
          status: 'offline',
          last_seen: serverTimestamp(),
          is_typing: false,
          typing_context: null,
        },
        { merge: true }
      );
    };
  }, [coupleId, userId, updateOwnPresence]);

  // Listen to AppState changes
  useEffect(() => {
    if (!coupleId || !userId) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        updateOwnPresence('online');
      } else if (nextState === 'background') {
        updateOwnPresence('away');
      } else if (nextState === 'inactive') {
        updateOwnPresence('away');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [coupleId, userId, updateOwnPresence]);

  // Subscribe to partner's presence
  useEffect(() => {
    if (!coupleId || !partnerId) return;

    const partnerPresenceRef = doc(db, 'presence', coupleId, 'members', partnerId);

    const unsubscribe = onSnapshot(
      partnerPresenceRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as PresenceDoc;
          setPartnerPresence({
            status: data.status,
            lastSeen: data.last_seen?.toDate() || null,
            isTyping: data.is_typing,
            typingContext: data.typing_context,
            hasViewedTodayResponse: data.has_viewed_today_response,
          });
        } else {
          setPartnerPresence(null);
        }
      },
      (error) => {
        logger.error('Error listening to partner presence:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [coupleId, partnerId]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isPartnerOnline: partnerPresence?.status === 'online',
    isPartnerTyping: partnerPresence?.isTyping ?? false,
    partnerTypingContext: partnerPresence?.typingContext ?? null,
    partnerLastSeen: partnerPresence?.lastSeen ?? null,
    partnerHasViewedResponse: partnerPresence?.hasViewedTodayResponse ?? false,
    setTyping,
    markResponseViewed,
  };
}

// Separate hook for typing indicator with debounced updates
export function useTypingIndicator() {
  const { setTyping } = usePresence();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = useCallback(
    (text: string, context: 'prompt' | null = 'prompt') => {
      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (text.length > 0) {
        setTyping(true, context);

        // Clear typing after 2 seconds of no typing
        debounceRef.current = setTimeout(() => {
          setTyping(false);
        }, 2000);
      } else {
        setTyping(false);
      }
    },
    [setTyping]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setTyping(false);
    };
  }, [setTyping]);

  return { handleTextChange };
}
