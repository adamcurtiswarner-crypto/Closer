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
} from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';

interface CompletionResponse {
  user_id: string;
  response_text: string;
  submitted_at: Date | null;
}

interface Completion {
  id: string;
  assignmentId: string;
  coupleId: string;
  promptId: string;
  promptText: string;
  responses: CompletionResponse[];
  week: string;
  isMemorySaved: boolean;
  completedAt: Date | null;
}

interface Memory {
  id: string;
  completionId: string;
  promptText: string;
  responses: { userId: string; displayName: string; responseText: string }[];
  week: string;
  savedAt: Date | null;
  completedAt: Date | null;
}

export function useWeeklyRecap(week?: string) {
  const { user } = useAuth();
  const currentWeek = week || format(new Date(), "yyyy-'W'ww");

  return useQuery({
    queryKey: ['weeklyRecap', user?.coupleId, currentWeek],
    queryFn: async (): Promise<Completion[]> => {
      if (!user?.coupleId) return [];

      const completionsRef = collection(db, 'prompt_completions');
      const completionsQuery = query(
        completionsRef,
        where('couple_id', '==', user.coupleId),
        where('week', '==', currentWeek)
      );
      const snap = await getDocs(completionsQuery);

      const completions: Completion[] = [];

      for (const docSnap of snap.docs) {
        const data = docSnap.data();

        // Get the prompt text from the assignment
        let promptText = '';
        if (data.assignment_id) {
          const assignmentDoc = await getDoc(doc(db, 'prompt_assignments', data.assignment_id));
          if (assignmentDoc.exists()) {
            promptText = assignmentDoc.data().prompt_text;
          }
        }

        completions.push({
          id: docSnap.id,
          assignmentId: data.assignment_id,
          coupleId: data.couple_id,
          promptId: data.prompt_id,
          promptText,
          responses: (data.responses || []).map((r: any) => ({
            user_id: r.user_id,
            response_text: r.response_text,
            submitted_at: r.submitted_at?.toDate() || null,
          })),
          week: data.week,
          isMemorySaved: data.is_memory_saved || false,
          completedAt: data.completed_at?.toDate() || null,
        });
      }

      return completions.sort((a, b) => {
        if (!a.completedAt || !b.completedAt) return 0;
        return b.completedAt.getTime() - a.completedAt.getTime();
      });
    },
    enabled: !!user?.coupleId,
  });
}

export function useSavedMemories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['memories', user?.coupleId],
    queryFn: async (): Promise<Memory[]> => {
      if (!user?.coupleId) return [];

      const memoriesRef = collection(db, 'memory_artifacts');
      const memoriesQuery = query(
        memoriesRef,
        where('couple_id', '==', user.coupleId),
        where('is_deleted', '==', false)
      );
      const snap = await getDocs(memoriesQuery);

      return snap.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            completionId: data.completion_id,
            promptText: data.prompt_text,
            responses: (data.responses || []).map((r: any) => ({
              userId: r.user_id,
              displayName: r.display_name,
              responseText: r.response_text,
            })),
            week: data.week,
            savedAt: data.saved_at?.toDate() || null,
            completedAt: data.completed_at?.toDate() || null,
          };
        })
        .sort((a, b) => {
          if (!a.savedAt || !b.savedAt) return 0;
          return b.savedAt.getTime() - a.savedAt.getTime();
        });
    },
    enabled: !!user?.coupleId,
  });
}

export function useSaveMemory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (completion: Completion) => {
      if (!user?.coupleId) throw new Error('No couple linked');

      // Create memory artifact
      const memoriesRef = collection(db, 'memory_artifacts');
      const memoryDoc = await addDoc(memoriesRef, {
        couple_id: user.coupleId,
        completion_id: completion.id,
        week: completion.week,
        prompt_text: completion.promptText,
        responses: completion.responses.map((r) => ({
          user_id: r.user_id,
          display_name: '', // Could be enriched later
          response_text: r.response_text,
        })),
        completed_at: completion.completedAt,
        saved_by: user.id,
        saved_at: serverTimestamp(),
        is_deleted: false,
      });

      // Mark completion as memory saved
      const completionRef = doc(db, 'prompt_completions', completion.id);
      await updateDoc(completionRef, {
        is_memory_saved: true,
      });

      return { memoryId: memoryDoc.id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['weeklyRecap'] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      logEvent('memory_saved', { memory_id: data.memoryId });
    },
  });
}
