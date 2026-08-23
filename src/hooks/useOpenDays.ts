import { useQuery } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { db } from '@/config/firebase';
import { mapAssignment, type PromptAssignment } from './usePrompt';
import { todayLocalISO } from '@/utils/localDate';
import { chunk } from './useYourWords';
import { logger } from '@/utils/logger';
import { useAuth } from './useAuth';

// Open days (founder feature 2026-08-02): a question a partner missed stays
// answerable for a rolling week, surfaced quietly on Today. Anti-guilt by
// construction: this hook returns only days *I* haven't answered — it can
// never render a list of what my partner missed. Server expiry matches the
// same 7-day window (functions/src/prompts.ts expireStalePrompts).

export const OPEN_DAYS_WINDOW = 7;
/** Firestore `in` accepts up to 30 values; 10 keeps a comfortable margin. */
export const OPEN_DAYS_IN_CHUNK = 10;
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

        // Which of these have I already answered?
        //
        // This used to look the responses up by document id
        // (`where(documentId(),'in', …)`), which was the one shape that
        // could never work here: an OPEN day is by definition a day with no
        // response doc, Firestore evaluates the rules once per key in the
        // list including keys with no document, and a null `resource` fails
        // the whole query with permission-denied. The hook therefore
        // returned a non-empty list only in a branch it could never reach —
        // Open Days rendered nothing from the day it shipped.
        //
        // Query by VALUE instead: only documents that exist can come back,
        // and `user_id == me` satisfies the rules on ownership alone (no
        // couple membership needed, so it survives an unlink). Matches the
        // existing (assignment_id, user_id) index.
        const answered = new Set<string>();
        for (const ids of chunk(candidates.map((a) => a.id), OPEN_DAYS_IN_CHUNK)) {
          const respSnap = await getDocs(
            query(
              collection(db, 'prompt_responses'),
              where('user_id', '==', userId),
              where('assignment_id', 'in', ids)
            )
          );
          for (const d of respSnap.docs) {
            const assignmentId = d.data().assignment_id;
            if (typeof assignmentId === 'string') answered.add(assignmentId);
          }
        }

        return candidates.filter((a) => !answered.has(a.id));
      } catch (error) {
        // Catch-up is additive: a failure here must never break Today.
        logger.reportQueryDenied('useOpenDays', error);
        return [];
      }
    },
  });
}
