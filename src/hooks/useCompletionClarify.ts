import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { mapClarify, type ClarifyExchange } from './useClarify';
import { useAuth } from './useAuth';

/**
 * Live clarify exchanges on a completion doc — same listener-owns-the-cache
 * pattern as useCompletionReactions, so the partner's question or answer
 * lands in an open reveal without a reopen. (A second listener on the same
 * doc as the reactions one; reveals are transient surfaces, so the cost is
 * one extra watch while a sheet is up.)
 */
export function useCompletionClarify(assignmentId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!assignmentId && !!user?.coupleId;

  useEffect(() => {
    if (!enabled || !assignmentId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'prompt_completions', assignmentId),
      (snap) => {
        queryClient.setQueryData<ClarifyExchange[]>(
          ['clarify', assignmentId],
          snap.exists() ? mapClarify(snap.data()?.clarify) : []
        );
      },
      () => {
        // Clarify is additive — the reveal renders without it.
        queryClient.setQueryData<ClarifyExchange[]>(['clarify', assignmentId], []);
      }
    );
    return unsubscribe;
  }, [assignmentId, enabled, queryClient]);

  return useQuery<ClarifyExchange[]>({
    queryKey: ['clarify', assignmentId],
    queryFn: () =>
      queryClient.getQueryData<ClarifyExchange[]>(['clarify', assignmentId]) ?? [],
    enabled,
    staleTime: Infinity,
  });
}
