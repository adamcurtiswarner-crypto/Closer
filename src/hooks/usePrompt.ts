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
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';

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

export function useTodayPrompt() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['todayPrompt', user?.coupleId],
    queryFn: async (): Promise<TodayPrompt> => {
      if (!user?.coupleId) {
        return {
          assignment: null,
          myResponse: null,
          partnerResponse: null,
          partnerHasResponded: false,
          isComplete: false,
          nextPromptAt: null,
        };
      }

      const today = new Date().toISOString().split('T')[0];

      // Get today's assignment
      const assignmentsRef = collection(db, 'prompt_assignments');
      const assignmentQuery = query(
        assignmentsRef,
        where('couple_id', '==', user.coupleId),
        where('assigned_date', '==', today),
        limit(1)
      );
      const assignmentSnap = await getDocs(assignmentQuery);

      if (assignmentSnap.empty) {
        return {
          assignment: null,
          myResponse: null,
          partnerResponse: null,
          partnerHasResponded: false,
          isComplete: false,
          nextPromptAt: `${today}T${user.notificationTime}:00`,
        };
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

      // Get responses
      const responsesRef = collection(db, 'prompt_responses');
      const responsesQuery = query(
        responsesRef,
        where('assignment_id', '==', assignment.id)
      );
      const responsesSnap = await getDocs(responsesQuery);

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

        if (data.user_id === user.id) {
          myResponse = response;
        } else {
          partnerResponse = response;
        }
      }

      return {
        assignment,
        myResponse,
        partnerResponse,
        partnerHasResponded: !!partnerResponse?.submittedAt,
        isComplete: assignment.status === 'completed',
        nextPromptAt: null,
      };
    },
    enabled: !!user?.coupleId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useSubmitResponse() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      responseText,
    }: {
      assignmentId: string;
      responseText: string;
    }) => {
      if (!user?.coupleId) throw new Error('No couple linked');

      // Get the assignment to get prompt_id
      const assignmentRef = doc(db, 'prompt_assignments', assignmentId);
      const assignmentSnap = await getDoc(assignmentRef);

      if (!assignmentSnap.exists()) {
        throw new Error('Assignment not found');
      }

      const assignmentData = assignmentSnap.data();

      // Create response
      const responsesRef = collection(db, 'prompt_responses');
      const responseDoc = await addDoc(responsesRef, {
        assignment_id: assignmentId,
        couple_id: user.coupleId,
        user_id: user.id,
        prompt_id: assignmentData.prompt_id,
        response_text: responseText,
        response_text_encrypted: responseText, // TODO: Add encryption
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
