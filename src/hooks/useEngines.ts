import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { functions, db } from '@/config/firebase';
import { useAuth } from './useAuth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckIn {
  id: string;
  userId: string;
  coupleId: string;
  choice: string;
  forecast: string;
  createdAt: Date;
}

export interface Spark {
  id: string;
  senderId: string;
  coupleId: string;
  word: string;
  guess: string | null;
  revealed: boolean;
  createdAt: Date;
}

export interface Reflection {
  id: string;
  userId: string;
  coupleId: string;
  score: number;
  helped: string[];
  date: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Callable references
// ---------------------------------------------------------------------------

const submitMorningCheckin = httpsCallable(functions, 'submitMorningCheckin');
const sendSparkCallable = httpsCallable(functions, 'sendSpark');
const submitSparkGuess = httpsCallable(functions, 'submitSparkGuess');
const submitReflectionCallable = httpsCallable(functions, 'submitReflection');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayDateString(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// useCheckInEngine
// ---------------------------------------------------------------------------

export function useCheckIn() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { choice: string }) => {
      const result = await submitMorningCheckin(data);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engines', 'checkin'] });
    },
  });

  return {
    submit: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
  };
}

// ---------------------------------------------------------------------------
// useSpark
// ---------------------------------------------------------------------------

export function useSpark() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const coupleId = user?.coupleId ?? null;

  const sendMutation = useMutation({
    mutationFn: async (data: { word: string }) => {
      const result = await sendSparkCallable(data);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engines', 'spark'] });
    },
  });

  const guessMutation = useMutation({
    mutationFn: async (data: { sparkId: string; guess: string }) => {
      const result = await submitSparkGuess(data);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engines', 'spark'] });
    },
  });

  const { data: todaysSpark = null } = useQuery({
    queryKey: ['engines', 'spark', coupleId, todayDateString()],
    queryFn: async (): Promise<Spark | null> => {
      if (!coupleId) return null;

      const today = todayDateString();
      const startOfDay = new Date(`${today}T00:00:00`);
      const endOfDay = new Date(`${today}T23:59:59.999`);

      const q = query(
        collection(db, 'couples', coupleId, 'sparks'),
        where('created_at', '>=', startOfDay),
        where('created_at', '<=', endOfDay),
        orderBy('created_at', 'desc'),
        limit(1),
      );

      const snap = await getDocs(q);
      if (snap.empty) return null;

      const docSnap = snap.docs[0];
      const data = docSnap.data();
      return {
        id: docSnap.id,
        senderId: data.sender_id,
        coupleId: data.couple_id,
        word: data.word,
        guess: data.guess ?? null,
        revealed: data.revealed ?? false,
        createdAt: data.created_at?.toDate() ?? new Date(),
      };
    },
    enabled: !!coupleId,
  });

  return {
    sendSpark: sendMutation.mutateAsync,
    submitGuess: guessMutation.mutateAsync,
    todaysSpark,
    isSending: sendMutation.isPending,
    isGuessing: guessMutation.isPending,
  };
}

// ---------------------------------------------------------------------------
// useReflection
// ---------------------------------------------------------------------------

export function useReflection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const coupleId = user?.coupleId ?? null;
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: async (data: { score: number; helped: string[] }) => {
      const result = await submitReflectionCallable(data);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engines', 'reflection'] });
    },
  });

  const { data: todaysReflection = null } = useQuery({
    queryKey: ['engines', 'reflection', coupleId, userId, todayDateString()],
    queryFn: async (): Promise<Reflection | null> => {
      if (!coupleId || !userId) return null;

      const today = todayDateString();
      const q = query(
        collection(db, 'couples', coupleId, 'reflections'),
        where('user_id', '==', userId),
        where('date', '==', today),
        orderBy('created_at', 'desc'),
        limit(1),
      );

      const snap = await getDocs(q);
      if (snap.empty) return null;

      const docSnap = snap.docs[0];
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.user_id,
        coupleId: data.couple_id,
        score: data.score,
        helped: data.helped ?? [],
        date: data.date,
        createdAt: data.created_at?.toDate() ?? new Date(),
      };
    },
    enabled: !!coupleId && !!userId,
  });

  return {
    submit: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    todaysReflection,
  };
}
