import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { todayLocalISO } from '@utils/localDate';
import { logger } from '@/utils/logger';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';

export interface ExplorePrompt {
  id: string;
  text: string;
  hint: string | null;
  type: string;
  emotionalDepth: string;
}

/**
 * An explore assignment mapped at the read boundary. Enough state to derive
 * the card: who answered first (the "asker") and whether both have answered.
 */
export interface ExploreAssignment {
  id: string;
  promptId: string;
  promptText: string;
  promptHint: string | null;
  category: string;
  status: string;
  firstResponderId: string | null;
  responseCount: number;
  createdAt: Date | null;
}

export interface ExploreResponse {
  id: string;
  userId: string;
  text: string;
  isCurrentUser: boolean;
  submittedAt: Date | null;
}

// Thrown when a respond action needs a linked couple and there isn't one —
// lets the UI surface a quiet inline notice instead of matching error strings.
export class NoCoupleLinkedError extends Error {
  constructor() {
    super('No couple linked');
    this.name = 'NoCoupleLinkedError';
  }
}

// ─── Read-boundary mapping (Firestore snake_case → app camelCase) ───

function toDate(value: unknown): Date | null {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

export function mapExploreAssignment(
  id: string,
  data: Record<string, any>
): ExploreAssignment {
  return {
    id,
    promptId: data.prompt_id,
    promptText: typeof data.prompt_text === 'string' ? data.prompt_text : '',
    promptHint: data.prompt_hint ?? null,
    // Older explore docs never wrote category — fall back to prompt_type
    // (the backfill script sets category = prompt_type for those).
    category: data.category || data.prompt_type || '',
    status: (data.status as string) || 'delivered',
    firstResponderId: data.first_responder_id ?? null,
    responseCount: typeof data.response_count === 'number' ? data.response_count : 0,
    createdAt: toDate(data.created_at),
  };
}

/** Expired explore assignments behave as if they never happened. */
export function isLiveExploreAssignment(a: { status: string }): boolean {
  return a.status !== 'expired';
}

/**
 * Assignments where the PARTNER answered first and I haven't answered yet —
 * open questions waiting on me. Newest first.
 */
export function pendingPartnerQuestions(
  assignments: ExploreAssignment[] | undefined,
  myUserId: string | undefined
): ExploreAssignment[] {
  if (!assignments || !myUserId) return [];
  return assignments
    .filter(
      (a) =>
        a.status === 'partial' &&
        a.firstResponderId != null &&
        a.firstResponderId !== myUserId
    )
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
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

/**
 * Explore assignments for the couple — real-time. An onSnapshot listener
 * feeds the React Query cache (same pattern as useHearth/useTodayPrompt),
 * so a partner's answer flips the card without a refetch.
 */
export function useExploreAssignments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const coupleId = user?.coupleId;

  useEffect(() => {
    if (!coupleId) {
      queryClient.setQueryData(['exploreAssignments', coupleId], []);
      return;
    }

    const assignmentsQuery = query(
      collection(db, 'prompt_assignments'),
      where('couple_id', '==', coupleId),
      where('source', '==', 'explore')
    );

    const unsubscribe = onSnapshot(
      assignmentsQuery,
      (snap) => {
        const assignments = snap.docs.map((d) => mapExploreAssignment(d.id, d.data()));
        queryClient.setQueryData(['exploreAssignments', coupleId], assignments);
      },
      (error) => {
        logger.warn('Explore assignments listener failed:', error);
      }
    );

    return unsubscribe;
  }, [coupleId, queryClient]);

  return useQuery<ExploreAssignment[]>({
    queryKey: ['exploreAssignments', coupleId],
    queryFn: () =>
      queryClient.getQueryData<ExploreAssignment[]>(['exploreAssignments', coupleId]) ?? [],
    enabled: !!coupleId,
    // No refetchInterval — the snapshot listener owns freshness
    staleTime: Infinity,
  });
}

/**
 * Start an explore prompt — returns the assignment ID to respond against.
 *
 * Guard: if a live (non-expired) explore assignment already exists for this
 * (couple, prompt), REUSE it instead of creating a duplicate. This is also
 * the "answer the question your partner sent you" path — the partner's
 * assignment is the shared doc both responses hang off.
 */
export function useStartExplorePrompt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prompt: ExplorePrompt) => {
      if (!user?.coupleId) throw new NoCoupleLinkedError();

      // Existing-assignment guard — equality-only query, no composite index
      const ref = collection(db, 'prompt_assignments');
      const existingQuery = query(
        ref,
        where('couple_id', '==', user.coupleId),
        where('prompt_id', '==', prompt.id),
        where('source', '==', 'explore')
      );
      const existingSnap = await getDocs(existingQuery);
      const live = existingSnap.docs
        .map((d) => mapExploreAssignment(d.id, d.data()))
        .find(isLiveExploreAssignment);
      if (live) {
        return { assignmentId: live.id, prompt, reused: true };
      }

      const assignmentDoc = await addDoc(ref, {
        couple_id: user.coupleId,
        prompt_id: prompt.id,
        prompt_text: prompt.text,
        prompt_hint: prompt.hint,
        prompt_type: prompt.type,
        // Hearth completions group by category — write both so explore
        // completions land in their category tile like daily ones do.
        category: prompt.type,
        requires_conversation: false,
        assigned_date: todayLocalISO(),
        source: 'explore',
        status: 'delivered',
        completed_at: null,
        response_count: 0,
        first_response_at: null,
        second_response_at: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return { assignmentId: assignmentDoc.id, prompt, reused: false };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exploreAssignments'] });
      if (!data.reused) {
        logEvent('explore_prompt_started', {
          prompt_id: data.prompt.id,
          category: data.prompt.type,
        });
      }
    },
  });
}

/**
 * Fetch responses for an explore assignment.
 *
 * Fetches for 'partial' assignments too (so you can re-read YOUR answer while
 * waiting), but the seal is enforced here at the boundary: until the
 * assignment is 'completed', only the current user's own response is exposed.
 * The partner's words are never handed to the UI early.
 */
export function useExploreResponses(
  assignmentId: string | null,
  assignmentStatus?: string
) {
  const { user } = useAuth();
  const isComplete = assignmentStatus === 'completed';

  return useQuery({
    queryKey: ['exploreResponses', assignmentId, isComplete],
    queryFn: async () => {
      if (!assignmentId || !user?.coupleId) return null;

      // The couple_id filter is load-bearing: security rules authorize
      // prompt_responses reads via isCoupleMember(resource.data.couple_id),
      // and Firestore can only prove a QUERY safe when couple_id is pinned
      // in the filters — without it every read is permission-denied.
      // Sorted client-side (two docs) instead of orderBy, matching the
      // daily-flow listener and avoiding a composite index.
      const ref = collection(db, 'prompt_responses');
      const q = query(
        ref,
        where('couple_id', '==', user.coupleId),
        where('assignment_id', '==', assignmentId)
      );
      const snap = await getDocs(q);

      const responses: ExploreResponse[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.user_id as string,
            text: data.response_text,
            isCurrentUser: data.user_id === user.id,
            submittedAt: data.submitted_at?.toDate() || null,
          };
        })
        .sort(
          (a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0)
        );

      // Sealed until completed: expose only MY response while partial
      return isComplete ? responses : responses.filter((r) => r.isCurrentUser);
    },
    enabled: !!assignmentId && !!user?.coupleId,
  });
}
