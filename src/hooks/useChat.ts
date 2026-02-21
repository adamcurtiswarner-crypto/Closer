import { useEffect, useRef, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
  increment,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getCoupleKey } from '@/services/encryption';
import { encrypt, decrypt } from '@/services/encryption';
import { uploadChatImage } from '@/services/imageUpload';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';
import { useAuth } from './useAuth';
import { useCouple } from './useCouple';

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  imageUrl: string | null;
  type: 'text' | 'image';
  isDeleted: boolean;
  createdAt: Date;
}

interface ChatMessageDoc {
  sender_id: string;
  text: string;
  text_encrypted: string;
  image_url: string | null;
  type: 'text' | 'image';
  is_deleted: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

const PAGE_SIZE = 50;

export function useMessages() {
  const { user } = useAuth();
  const { data: couple } = useCouple();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const coupleKeyRef = useRef<string | null>(null);

  const coupleId = couple?.id;

  // Pre-fetch couple key
  useEffect(() => {
    if (!coupleId) return;
    getCoupleKey(coupleId).then((key) => {
      coupleKeyRef.current = key;
    });
  }, [coupleId]);

  // Real-time listener for recent messages
  useEffect(() => {
    if (!coupleId) return;

    const messagesRef = collection(db, 'couples', coupleId, 'messages');
    const q = query(messagesRef, orderBy('created_at', 'desc'), limit(PAGE_SIZE));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ChatMessageDoc;
          let text = '';

          if (data.is_deleted) {
            text = '[message removed]';
          } else if (data.text_encrypted && coupleKeyRef.current) {
            text = decrypt(data.text_encrypted, coupleKeyRef.current);
          } else if (data.text !== '[encrypted]') {
            text = data.text;
          }

          msgs.push({
            id: docSnap.id,
            senderId: data.sender_id,
            text,
            imageUrl: data.image_url,
            type: data.type,
            isDeleted: data.is_deleted,
            createdAt: data.created_at?.toDate() ?? new Date(),
          });
        });

        setMessages(msgs);
        setIsLoading(false);
      },
      (error) => {
        logger.error('Error listening to chat messages:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [coupleId]);

  return { messages, isLoading };
}

export function useLoadOlderMessages() {
  const { data: couple } = useCouple();
  const coupleKeyRef = useRef<string | null>(null);

  const coupleId = couple?.id;

  useEffect(() => {
    if (!coupleId) return;
    getCoupleKey(coupleId).then((key) => {
      coupleKeyRef.current = key;
    });
  }, [coupleId]);

  return useMutation({
    mutationFn: async ({
      oldestTimestamp,
      currentMessages,
    }: {
      oldestTimestamp: Date;
      currentMessages: ChatMessage[];
    }) => {
      if (!coupleId) throw new Error('No couple');

      const messagesRef = collection(db, 'couples', coupleId, 'messages');
      const q = query(
        messagesRef,
        orderBy('created_at', 'desc'),
        startAfter(Timestamp.fromDate(oldestTimestamp)),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const olderMsgs: ChatMessage[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ChatMessageDoc;
        let text = '';

        if (data.is_deleted) {
          text = '[message removed]';
        } else if (data.text_encrypted && coupleKeyRef.current) {
          text = decrypt(data.text_encrypted, coupleKeyRef.current);
        } else if (data.text !== '[encrypted]') {
          text = data.text;
        }

        olderMsgs.push({
          id: docSnap.id,
          senderId: data.sender_id,
          text,
          imageUrl: data.image_url,
          type: data.type,
          isDeleted: data.is_deleted,
          createdAt: data.created_at?.toDate() ?? new Date(),
        });
      });

      return [...currentMessages, ...olderMsgs];
    },
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const { data: couple } = useCouple();
  const coupleKeyRef = useRef<string | null>(null);

  const coupleId = couple?.id;
  const userId = user?.id;

  useEffect(() => {
    if (!coupleId) return;
    getCoupleKey(coupleId).then((key) => {
      coupleKeyRef.current = key;
    });
  }, [coupleId]);

  return useMutation({
    mutationFn: async ({
      text,
      imageUri,
    }: {
      text: string;
      imageUri?: string | null;
    }) => {
      if (!coupleId || !userId) throw new Error('Not authenticated');
      if (!coupleKeyRef.current) throw new Error('No encryption key');

      let imageUrl: string | null = null;
      let messageType: 'text' | 'image' = 'text';

      if (imageUri) {
        imageUrl = await uploadChatImage(coupleId, userId, imageUri);
        messageType = text.trim() ? 'text' : 'image';
        logEvent('chat_image_sent');
      }

      const encryptedText = text.trim()
        ? encrypt(text.trim(), coupleKeyRef.current)
        : '';

      const messagesRef = collection(db, 'couples', coupleId, 'messages');
      await addDoc(messagesRef, {
        sender_id: userId,
        text: text.trim() ? '[encrypted]' : '',
        text_encrypted: encryptedText,
        image_url: imageUrl,
        type: messageType,
        is_deleted: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      // Update couple metadata for badge
      const coupleRef = doc(db, 'couples', coupleId);
      const partnerId = couple?.memberIds.find((id) => id !== userId);
      if (partnerId) {
        await updateDoc(coupleRef, {
          last_message_at: serverTimestamp(),
          last_message_sender_id: userId,
          [`unread_count_${partnerId}`]: increment(1),
        });
      }

      logEvent('chat_message_sent');
    },
  });
}

export function useMarkMessagesRead() {
  const { user } = useAuth();
  const { data: couple } = useCouple();

  const coupleId = couple?.id;
  const userId = user?.id;

  return useCallback(async () => {
    if (!coupleId || !userId) return;

    // Update read cursor
    const cursorRef = doc(db, 'couples', coupleId, 'chat_read_cursors', userId);
    await setDoc(cursorRef, {
      user_id: userId,
      last_read_at: serverTimestamp(),
    }, { merge: true });

    // Reset unread count
    const coupleRef = doc(db, 'couples', coupleId);
    await updateDoc(coupleRef, {
      [`unread_count_${userId}`]: 0,
    });
  }, [coupleId, userId]);
}

export function useUnreadCount() {
  const { user } = useAuth();
  const { data: couple } = useCouple();
  const [count, setCount] = useState(0);

  const coupleId = couple?.id;
  const userId = user?.id;

  useEffect(() => {
    if (!coupleId || !userId) return;

    const coupleRef = doc(db, 'couples', coupleId);
    const unsubscribe = onSnapshot(
      coupleRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setCount(data[`unread_count_${userId}`] || 0);
        }
      },
      (error) => {
        logger.error('Error listening to unread count:', error);
      }
    );

    return () => unsubscribe();
  }, [coupleId, userId]);

  return count;
}

export function useDeleteMessage() {
  const { data: couple } = useCouple();
  const coupleId = couple?.id;

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!coupleId) throw new Error('No couple');

      const messageRef = doc(db, 'couples', coupleId, 'messages', messageId);
      await updateDoc(messageRef, {
        is_deleted: true,
        text: '[removed]',
        text_encrypted: '',
        image_url: null,
        updated_at: serverTimestamp(),
      });
    },
  });
}
