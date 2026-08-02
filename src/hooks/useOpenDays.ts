import { useQuery } from '@tanstack/react-query';
import {
  collection,
  documentId,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { db } from '@/config/firebase';
import { mapAssignment, responseDocId, type PromptAssignment } from './usePrompt';
import { todayLocalISO } from '@/utils/localDate';
import { logger } from '@/utils/logger';
import { useAuth } from './useAuth';

// Open days (founder feature 2026-08-02): a question a partner missed stays
// answerable for a rolling week, surfaced quietly on Today. Anti-guilt by
// construction: this hook returns only days *I* haven't answered — it can
// never render a list of what my partner missed. Server expiry matches the
// same 7-day window (functions/src/prompts.ts expireStalePrompts).

export const OPEN_DAYS_WINDOW = 7;
/** How many open days the UI surfaces at once — never a pile. */
export const OPEN_DAYS_VISIBLE = 3;

export function openDaysWindowStart(now: Date = new Date()): string {
  return format(subDays(now, OPEN_DAYS_WINDOW), 'yyyy-MM-dd');
}

/**
 * Recent daily/follow-up assignments still open for ME: delivered or
 * partial, within the window, before today (today's card and yesterday's
 * open-day chip own their own surfaces), and missing my response.
 */
export function useOpenDays(excludeIds: string[] = []) {
  const { user } = useAuth();
  const userId = user?.id;
  const coupleId = user?.coupleId ?? null;
  const today = todayLocalISO();

  return useQuery<PromptAssignment[]>({
    queryKey: ['open-days', coupleId, userId, today],
    enabled: Boolean(userId && coupleId),
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'prompt_assignments'),
            where('couple_id', '==', coupleId),
            where('status', 'in', ['delivered', 'partial']),
            where('assigned_date', '>=', openDaysWindowStart()),
            orderBy('assigned_date', 'desc')
          )
        );
        const candidates = snap.docs
          .map((d) => mapAssignment(d.id, d.data()))
          .filter(
            (a) =>
              a.assignedDate < today &&
              // Follow-ups own their lifecycle (skip semantics, "it'll
              // keep") — never resurfaced here.
              a.assignmentKind !== 'follow_up' &&
              // Explore questions have their own discovery card, never nag.
              a.source !== 'explore' &&
              !excludeIds.includes(a.id)
          );

        if (candidates.length === 0) return [];

        // Which of these have I already answered? Deterministic response ids
        // make this a direct chunked lookup, no index needed.
        const ids = candidates.map((a) => responseDocId(a.id, userId!));
        const answered = new Set<string>();
        for (let i = 0; i < ids.length; i += 30) {
          const chunk = ids.slice(i, i + 30);
          const respSnap = await getDocs(
            query(
              collection(db, 'prompt_responses'),
              where('couple_id', '==', coupleId),
              where(documentId(), 'in', chunk)
            )
          );
          for (const d of respSnap.docs) answered.add(d.id);
        }

        return candidates.filter(
          (a) => !answered.has(responseDocId(a.id, userId!))
        );
      } catch (error) {
        logger.error('Error loading open days:', error);
        return [];
      }
    },
  });
}
