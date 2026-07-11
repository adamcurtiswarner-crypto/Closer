import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';
import { useAuth } from './useAuth';

// ─── Types (app camelCase, mapped from Firestore snake_case) ───

export interface CouchFlagState {
  couchFlagged: boolean;
  couchFlaggedBy: string | null;
}

/** Read-boundary mapping for the couch-flag fields on a completion doc. */
export function mapCouchFlagState(data: Record<string, unknown>): CouchFlagState {
  return {
    couchFlagged: data.couch_flagged === true,
    couchFlaggedBy:
      typeof data.couch_flagged_by === 'string' ? data.couch_flagged_by : null,
  };
}

/**
 * Whether this completion is already kept for the couch — by EITHER partner.
 * Once flagged, the reveal row settles into its quiet confirmation.
 */
export function isCouchFlagged(state: CouchFlagState | null | undefined): boolean {
  return state?.couchFlagged === true;
}

/**
 * Flag state for the reveal (CompletionMoment). Same one-shot getDoc pattern
 * as useCompletionReactions — non-critical, the reveal renders without it.
 */
export function useCouchFlagState(assignmentId: string | null) {
  const { user } = useAuth();

  return useQuery<CouchFlagState | null>({
    queryKey: ['couchFlag', assignmentId],
    queryFn: async () => {
      if (!assignmentId) return null;
      try {
        const snap = await getDoc(doc(db, 'prompt_completions', assignmentId));
        return snap.exists() ? mapCouchFlagState(snap.data()) : null;
      } catch {
        // Non-critical — the reveal renders without the flag state
        return null;
      }
    },
    enabled: !!assignmentId && !!user?.coupleId,
  });
}

/**
 * "Keep it for the couch" — flag a completion into the Hearth couch queue.
 *
 * Reads the doc first: steady completions are created WITHOUT a `discussed`
 * field, and the Hearth "we talked" rules require the field to pre-exist —
 * so the flag write ADDS `discussed: {}` only when it is absent, and never
 * touches an existing map (the rules enforce the same). Optimistic — the
 * confirmation shows immediately, rolled back on failure. No unflag in v1:
 * flagging is a commitment, and the "we talked" ritual retires it.
 */
export function useCouchFlag() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const coupleId = user?.coupleId;

  return useMutation({
    mutationFn: async ({ assignmentId }: { assignmentId: string }) => {
      if (!user?.id) throw new Error('Not signed in');

      const completionRef = doc(db, 'prompt_completions', assignmentId);
      const snap = await getDoc(completionRef);
      const data = snap.exists() ? snap.data() : null;
      const hasDiscussed = data != null && data.discussed !== undefined;

      const update: Record<string, unknown> = {
        couch_flagged: true,
        couch_flagged_by: user.id,
        couch_flagged_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      if (!hasDiscussed) {
        // Seed the retirement ritual: the "we talked" rules only allow
        // writing into a discussed map that already exists.
        update.discussed = {};
      }
      await updateDoc(completionRef, update);
      return { assignmentId };
    },
    onMutate: async ({ assignmentId }) => {
      const key = ['couchFlag', assignmentId];
      const previous = queryClient.getQueryData<CouchFlagState | null>(key);
      queryClient.setQueryData<CouchFlagState | null>(key, {
        couchFlagged: true,
        couchFlaggedBy: user?.id ?? null,
      });
      return { previous };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(
        ['couchFlag', variables.assignmentId],
        context?.previous ?? null
      );
      logger.warn('Couch flag failed:', error);
      Alert.alert('Could not keep it', 'Something went wrong. Please try again.');
    },
    onSuccess: (data) => {
      logEvent('couch_flagged', { assignment_id: data.assignmentId });
      queryClient.invalidateQueries({ queryKey: ['couchFlag', data.assignmentId] });
      // The couch queue reads flagged entries — settle the Hearth cache
      // (its snapshot listener owns freshness, this nudges immediate reads).
      queryClient.invalidateQueries({ queryKey: ['hearth', coupleId] });
    },
  });
}
