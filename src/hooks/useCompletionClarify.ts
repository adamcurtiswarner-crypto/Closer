import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { watchCompletionDoc } from '@/utils/completionWatch';
import { mapClarify, type ClarifyExchange } from './useClarify';
import { logger } from '@/utils/logger';
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

    return watchCompletionDoc(
      assignmentId,
      (snap) => {
        queryClient.setQueryData<ClarifyExchange[]>(
          ['clarify', assignmentId],
          snap.exists() ? mapClarify(snap.data()?.clarify) : []
        );
      },
      (error) => {
        // Clarify is additive — the reveal renders without it, but a denial
        // that survives the retry ramp must still surface.
        logger.reportQueryDenied('useCompletionClarify.listener', error);
        queryClient.setQueryData<ClarifyExchange[]>(['clarify', assignmentId], []);
      }
    );
  }, [assignmentId, enabled, queryClient]);

  return useQuery<ClarifyExchange[]>({
    queryKey: ['clarify', assignmentId],
    queryFn: () =>
      queryClient.getQueryData<ClarifyExchange[]>(['clarify', assignmentId]) ?? [],
    enabled,
    staleTime: Infinity,
  });
}
