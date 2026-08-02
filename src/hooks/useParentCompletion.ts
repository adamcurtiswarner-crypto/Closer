import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { mapCompletion, scoresFor, type HearthCompletion } from '@/hooks/useHearth';
import { logger } from '@/utils/logger';
import { useAuth } from './useAuth';

export interface ParentCompletionContext {
  promptText: string;
  mine: number | null;
  theirs: number | null;
}

/**
 * The completion a follow-up chains from (completion doc id IS the parent
 * assignment id). Feeds the responding screen's trail block — the original
 * question and both scores, so the couple answers the follow-up against the
 * right context. Null while loading, on error, or when the parent completion
 * doesn't exist (should not happen — follow-ups are only created from
 * completions — but a missing doc must never block answering).
 */
export function useParentCompletion(parentAssignmentId: string | null) {
  const { user } = useAuth();
  const myUid = user?.id ?? '';

  return useQuery<ParentCompletionContext | null>({
    queryKey: ['parent-completion', parentAssignmentId],
    enabled: Boolean(parentAssignmentId),
    // The parent completion is immutable once the follow-up exists.
    staleTime: Infinity,
    queryFn: async () => {
      try {
        const snap = await getDoc(
          doc(db, 'prompt_completions', parentAssignmentId!)
        );
        if (!snap.exists()) return null;
        const completion: HearthCompletion = mapCompletion(snap.id, snap.data());
        const { mine, theirs } = scoresFor(completion, myUid);
        return { promptText: completion.promptText, mine, theirs };
      } catch (error) {
        // Context is a nice-to-have — never block the editor on it.
        logger.reportQueryDenied('useParentCompletion', error);
        return null;
      }
    },
  });
}
