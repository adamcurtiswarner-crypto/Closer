import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { mapCompletion, type HearthCompletion } from './useHearth';
import { useAuth } from './useAuth';

/** How far back a clarify question can surface on Today. */
const PENDING_CLARIFY_WINDOW = 30;

/**
 * Completions where my partner asked about MY answer and I haven't answered
 * yet — the Today discovery surface for clarify questions on older days
 * (today's own reveal carries its composer inline). Live listener over the
 * recent completion window; anti-guilt: this lists questions FOR me, never
 * anything my partner has or hasn't done.
 */
export function usePendingClarify() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const coupleId = user?.coupleId ?? null;
  const myUid = user?.id ?? '';
  const enabled = Boolean(coupleId && myUid);

  useEffect(() => {
    if (!enabled || !coupleId) return;
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'prompt_completions'),
        where('couple_id', '==', coupleId),
        orderBy('completed_at', 'desc'),
        limit(PENDING_CLARIFY_WINDOW)
      ),
      (snap) => {
        const pending = snap.docs
          .map((d) => mapCompletion(d.id, d.data()))
          .filter((c) =>
            c.clarify.some((e) => e.askerId !== myUid && e.answer === null)
          );
        queryClient.setQueryData<HearthCompletion[]>(
          ['pending-clarify', coupleId, myUid],
          pending
        );
      },
      () => {
        queryClient.setQueryData<HearthCompletion[]>(
          ['pending-clarify', coupleId, myUid],
          []
        );
      }
    );
    return unsubscribe;
  }, [enabled, coupleId, myUid, queryClient]);

  return useQuery<HearthCompletion[]>({
    queryKey: ['pending-clarify', coupleId, myUid],
    queryFn: () =>
      queryClient.getQueryData<HearthCompletion[]>([
        'pending-clarify',
        coupleId,
        myUid,
      ]) ?? [],
    enabled,
    staleTime: Infinity,
  });
}
