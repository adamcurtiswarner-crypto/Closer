import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';

export interface ExplorePrompt {
  id: string;
  text: string;
  hint: string | null;
  type: string;
  emotionalDepth: string;
}

// Fetch all active prompts for a given category
export function usePromptsByCategory(category: string | null) {
  return useQuery({
    queryKey: ['explorePrompts', category],
    queryFn: async () => {
      if (!category) return [];
      const promptsRef = collection(db, 'prompts');
      const q = query(
        promptsRef,
        where('type', '==', category),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          text: data.text,
          hint: data.hint || null,
          type: data.type,
          emotionalDepth: data.emotional_depth,
        } as ExplorePrompt;
      });
    },
    enabled: !!category,
  });
}

// Fetch explore assignments for the couple (to show completion state)
export function useExploreAssignments() {
  const { user } = useAuth();
  const coupleId = user?.coupleId;

  return useQuery({
    queryKey: ['exploreAssignments', coupleId],
    queryFn: async () => {
      if (!coupleId) return [];
      const ref = collection(db, 'prompt_assignments');
      const q = query(
        ref,
        where('couple_id', '==', coupleId),
        where('source', '==', 'explore')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        id: d.id,
        promptId: d.data().prompt_id,
        status: d.data().status as string,
      }));
    },
    enabled: !!coupleId,
  });
}

// Start an explore prompt — creates assignment, returns assignment ID
export function useStartExplorePrompt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prompt: ExplorePrompt) => {
      if (!user?.coupleId) throw new Error('No couple linked');
      const today = new Date().toISOString().split('T')[0];
      const ref = collection(db, 'prompt_assignments');
      const assignmentDoc = await addDoc(ref, {
        couple_id: user.coupleId,
        prompt_id: prompt.id,
        prompt_text: prompt.text,
        prompt_hint: prompt.hint,
        prompt_type: prompt.type,
        requires_conversation: false,
        assigned_date: today,
        source: 'explore',
        status: 'delivered',
        completed_at: null,
        response_count: 0,
        first_response_at: null,
        second_response_at: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return { assignmentId: assignmentDoc.id, prompt };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exploreAssignments'] });
      logEvent('explore_prompt_started', {
        prompt_id: data.prompt.id,
        category: data.prompt.type,
      });
    },
  });
}
