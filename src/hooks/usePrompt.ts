import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { db, functions } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';
import { getCoupleKey, encrypt } from '@/services/encryption';

const OFFLINE_QUEUE_KEY = '@closer_offline_responses';

interface PromptAssignment {
  id: string;
  coupleId: string;
  promptId: string;
  promptText: string;
  promptHint: string | null;
  promptType: string;
  requiresConversation: boolean;
  assignedDate: string;
  status: 'delivered' | 'partial' | 'completed' | 'expired';
}

interface PromptResponse {
  id: string;
  responseText: string;
  submittedAt: Date | null;
  status: 'draft' | 'submitted';
}

interface TodayPrompt {
  assignment: PromptAssignment | null;
  myResponse: PromptResponse | null;
  partnerResponse: PromptResponse | null;
  partnerHasResponded: boolean;
  isComplete: boolean;
  nextPromptAt: string | null;
}

const EMPTY_TODAY: TodayPrompt = {
  assignment: null,
  myResponse: null,
  partnerResponse: null,
  partnerHasResponded: false,
  isComplete: false,
  nextPromptAt: null,
};

export function useTodayPrompt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const coupleId = user?.coupleId;
  const userId = user?.id;
  const notificationTime = user?.notificationTime;

  // Set up real-time listeners
  useEffect(() => {
    if (!coupleId || !userId) {
      queryClient.setQueryData(['todayPrompt', coupleId], EMPTY_TODAY);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Listen for today's assignment
    const assignmentsRef = collection(db, 'prompt_assignments');
    const assignmentQuery = query(
      assignmentsRef,
      where('couple_id', '==', coupleId),
      where('assigned_date', '==', today),
      limit(1)
    );

    const unsubAssignment = onSnapshot(assignmentQuery, (assignmentSnap) => {
      if (assignmentSnap.empty) {
        queryClient.setQueryData(['todayPrompt', coupleId], {
          ...EMPTY_TODAY,
          nextPromptAt: `${today}T${notificationTime || '19:00'}:00`,
        });
        return;
      }

      const assignmentDoc = assignmentSnap.docs[0];
      const assignmentData = assignmentDoc.data();

      const assignment: PromptAssignment = {
        id: assignmentDoc.id,
        coupleId: assignmentData.couple_id,
        promptId: assignmentData.prompt_id,
        promptText: assignmentData.prompt_text,
        promptHint: assignmentData.prompt_hint,
        promptType: assignmentData.prompt_type,
        requiresConversation: assignmentData.requires_conversation,
        assignedDate: assignmentData.assigned_date,
        status: assignmentData.status,
      };

      // Listen for responses on this assignment
      const responsesRef = collection(db, 'prompt_responses');
      const responsesQuery = query(
        responsesRef,
        where('assignment_id', '==', assignment.id)
      );

      // Nested listener for responses — cleaned up when assignment changes
      const unsubResponses = onSnapshot(responsesQuery, (responsesSnap) => {
        let myResponse: PromptResponse | null = null;
        let partnerResponse: PromptResponse | null = null;

        for (const responseDoc of responsesSnap.docs) {
          const data = responseDoc.data();
          const response: PromptResponse = {
            id: responseDoc.id,
            responseText: data.response_text,
            submittedAt: data.submitted_at?.toDate() || null,
            status: data.status,
          };

          if (data.user_id === userId) {
            myResponse = response;
          } else {
            partnerResponse = response;
          }
        }

        // Re-read assignment status from the latest snapshot
        const latestStatus = assignmentSnap.docs[0]?.data()?.status || assignment.status;

        queryClient.setQueryData(['todayPrompt', coupleId], {
          assignment: { ...assignment, status: latestStatus },
          myResponse,
          partnerResponse,
          partnerHasResponded: !!partnerResponse?.submittedAt,
          isComplete: latestStatus === 'completed',
          nextPromptAt: null,
        } as TodayPrompt);
      });

      // Store the responses unsubscribe so we can clean it up
      return () => unsubResponses();
    });

    return () => {
      unsubAssignment();
    };
  }, [coupleId, userId, notificationTime, queryClient]);

  // useQuery reads from the cache populated by onSnapshot above
  return useQuery({
    queryKey: ['todayPrompt', coupleId],
    queryFn: (): TodayPrompt => {
      // Return whatever is already in cache, or empty
      return queryClient.getQueryData(['todayPrompt', coupleId]) || EMPTY_TODAY;
    },
    enabled: !!coupleId,
    // No refetchInterval — real-time updates handle this
    staleTime: Infinity,
  });
}

// Flush any queued offline responses
async function flushOfflineQueue(userId: string, coupleId: string) {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;
    const queue: { assignmentId: string; responseText: string }[] = JSON.parse(raw);
    if (queue.length === 0) return;

    for (const item of queue) {
      const assignmentRef = doc(db, 'prompt_assignments', item.assignmentId);
      const assignmentSnap = await getDoc(assignmentRef);
      if (!assignmentSnap.exists()) continue;
      const assignmentData = assignmentSnap.data();

      let encryptedText = item.responseText;
      const coupleKey = await getCoupleKey(coupleId);
      if (coupleKey) {
        encryptedText = encrypt(item.responseText, coupleKey);
      }

      const responsesRef = collection(db, 'prompt_responses');
      await addDoc(responsesRef, {
        assignment_id: item.assignmentId,
        couple_id: coupleId,
        user_id: userId,
        prompt_id: assignmentData.prompt_id,
        response_text: item.responseText,
        response_text_encrypted: encryptedText,
        status: 'submitted',
        submitted_at: serverTimestamp(),
        emotional_response: null,
        talked_about_it: null,
        response_length: item.responseText.length,
        time_to_respond_seconds: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      const newCount = (assignmentData.response_count || 0) + 1;
      const updates: Record<string, any> = {
        response_count: newCount,
        updated_at: serverTimestamp(),
      };
      if (newCount === 1) {
        updates.first_response_at = serverTimestamp();
        updates.status = 'partial';
      } else if (newCount === 2) {
        updates.second_response_at = serverTimestamp();
        updates.status = 'completed';
        updates.completed_at = serverTimestamp();
      }
      await updateDoc(assignmentRef, updates);
    }

    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (error) {
    // Silently fail — will retry next reconnect
  }
}

export function useSubmitResponse() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Listen for reconnection to flush offline queue
  useEffect(() => {
    if (!user?.id || !user?.coupleId) return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        flushOfflineQueue(user.id, user.coupleId!);
      }
    });

    return () => unsubscribe();
  }, [user?.id, user?.coupleId]);

  return useMutation({
    mutationFn: async ({
      assignmentId,
      responseText,
    }: {
      assignmentId: string;
      responseText: string;
    }) => {
      if (!user?.coupleId) throw new Error('No couple linked');

      // Check if offline — queue the response
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = raw ? JSON.parse(raw) : [];
        queue.push({ assignmentId, responseText });
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        return { responseId: 'offline-queued', isComplete: false, isOffline: true };
      }

      // Get the assignment to get prompt_id
      const assignmentRef = doc(db, 'prompt_assignments', assignmentId);
      const assignmentSnap = await getDoc(assignmentRef);

      if (!assignmentSnap.exists()) {
        throw new Error('Assignment not found');
      }

      const assignmentData = assignmentSnap.data();

      // Encrypt response text if key is available
      let encryptedText = responseText;
      const coupleKey = await getCoupleKey(user.coupleId);
      if (coupleKey) {
        encryptedText = encrypt(responseText, coupleKey);
      }

      // Create response
      const responsesRef = collection(db, 'prompt_responses');
      const responseDoc = await addDoc(responsesRef, {
        assignment_id: assignmentId,
        couple_id: user.coupleId,
        user_id: user.id,
        prompt_id: assignmentData.prompt_id,
        response_text: responseText,
        response_text_encrypted: encryptedText,
        status: 'submitted',
        submitted_at: serverTimestamp(),
        emotional_response: null,
        talked_about_it: null,
        response_length: responseText.length,
        time_to_respond_seconds: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      // Update assignment response count
      const newResponseCount = (assignmentData.response_count || 0) + 1;
      const updates: Record<string, any> = {
        response_count: newResponseCount,
        updated_at: serverTimestamp(),
      };

      if (newResponseCount === 1) {
        updates.first_response_at = serverTimestamp();
        updates.status = 'partial';
      } else if (newResponseCount === 2) {
        updates.second_response_at = serverTimestamp();
        updates.status = 'completed';
        updates.completed_at = serverTimestamp();
      }

      await updateDoc(assignmentRef, updates);

      return { responseId: responseDoc.id, isComplete: newResponseCount === 2 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['todayPrompt'] });
      logEvent('prompt_response_submitted', { response_id: data.responseId });
      if (data.isComplete) {
        logEvent('prompt_completed', { response_id: data.responseId });
      }
    },
  });
}

export function useSubmitFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      responseId,
      emotionalResponse,
      talkedAboutIt,
    }: {
      responseId: string;
      emotionalResponse: 'positive' | 'neutral' | 'negative';
      talkedAboutIt?: boolean;
    }) => {
      const responseRef = doc(db, 'prompt_responses', responseId);
      await updateDoc(responseRef, {
        emotional_response: emotionalResponse,
        talked_about_it: talkedAboutIt ?? null,
        updated_at: serverTimestamp(),
      });
      return { responseId, emotionalResponse };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['todayPrompt'] });
      logEvent('emotional_response_submitted', {
        response_id: data.responseId,
        emotional_response: data.emotionalResponse,
      });
    },
  });
}

export function useTriggerPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const triggerPrompt = httpsCallable(functions, 'triggerPromptDelivery');
      const result = await triggerPrompt();
      return result.data as { success: boolean; coupleId: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayPrompt'] });
    },
  });
}
