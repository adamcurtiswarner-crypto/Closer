import { useQuery } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { useAuth } from './useAuth';

// "Your words" — the user's own answers, reciprocated or not (Hooked audit
// 2026-08-02: an answer the partner never matched used to vanish when its
// assignment expired; this surface keeps the user's investment). It is a
// personal journal: no partner responses, no partner state, no labels about
// what the partner did or didn't do — never a resentment ledger.

const WORDS_LIMIT = 100;

export interface YourWordsEntry {
  /** Response doc id. */
  id: string;
  assignmentId: string;
  promptText: string;
  category: string | null;
  responseText: string;
  responseScore: number | null;
  submittedAt: Date | null;
}

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

export function mapYourWordsEntry(
  id: string,
  data: Record<string, any>,
  assignment: Record<string, any> | undefined
): YourWordsEntry {
  return {
    id,
    assignmentId: typeof data.assignment_id === 'string' ? data.assignment_id : '',
    // The response carries its own copy of the question from 2026-08-23
    // onward; the assignment is only consulted for answers written before
    // that, and is unreadable once the couple it belonged to is dissolved.
    promptText:
      typeof data.prompt_text === 'string' && data.prompt_text.length > 0
        ? data.prompt_text
        : typeof assignment?.prompt_text === 'string'
          ? assignment.prompt_text
          : '',
    category:
      typeof data.category === 'string'
        ? data.category
        : typeof assignment?.category === 'string'
          ? assignment.category
          : null,
    responseText: typeof data.response_text === 'string' ? data.response_text : '',
    responseScore:
      typeof data.response_score === 'number' ? data.response_score : null,
    submittedAt: toDate(data.submitted_at),
  };
}

/** Split a list into chunks of at most `size` (Firestore `in` limit). */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function fetchYourWords(
  userId: string,
  coupleId: string | null
): Promise<YourWordsEntry[]> {
  // Ordering by submitted_at naturally excludes drafts (no submitted_at);
  // the status filter below is defensive belt-and-suspenders.
  const responsesSnap = await getDocs(
    query(
      collection(db, 'prompt_responses'),
      where('user_id', '==', userId),
      orderBy('submitted_at', 'desc'),
      limit(WORDS_LIMIT)
    )
  );
  const responseDocs = responsesSnap.docs.filter(
    (d) => d.data().status !== 'draft'
  );

  // Join to assignments for the prompt text — responses only carry ids.
  // After an unlink, coupleId is null and the security rules no longer allow
  // reading the old couple's assignments; the answers still show, with the
  // same empty-prompt fallback as a deleted assignment. The user's words
  // never vanish (the whole point of this feature).
  const assignments = new Map<string, Record<string, any>>();
  try {
    await joinAssignments(responseDocs, assignments);
  } catch (error) {
    // The join only supplies prompt text for pre-2026-08-23 answers, so a
    // failure here must degrade to date + answer — never empty the journal.
    logger.reportQueryDenied('useYourWords.assignmentJoin', error);
  }

  return responseDocs.map((d) =>
    mapYourWordsEntry(d.id, d.data(), assignments.get(d.data().assignment_id))
  );
}

/**
 * Backfill prompt text for answers written before the response doc carried
 * its own copy.
 *
 * This used to be `where('couple_id','==',c), where(documentId(),'in',ids)`.
 * Firestore evaluates the rules once per key in that list — including keys
 * with no document, where `resource` is null and `resource.data.couple_id`
 * raises an evaluation error — and fails the WHOLE query with
 * permission-denied. A user's history legitimately spans dissolved couples,
 * so the list always contained unreadable ids and the join never once
 * succeeded for either founder. There is also a hard cap near 20 keys, and
 * this chunked at 30.
 *
 * Per-id reads under allSettled instead: one unreadable assignment costs
 * that single card its question, never the whole journal.
 */
async function joinAssignments(
  responseDocs: { data: () => Record<string, any> }[],
  assignments: Map<string, Record<string, any>>
): Promise<void> {
  const assignmentIds = [
    ...new Set(
      responseDocs
        .filter((d) => typeof d.data().prompt_text !== 'string')
        .map((d) => d.data().assignment_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];
  if (assignmentIds.length === 0) return;

  const results = await Promise.allSettled(
    assignmentIds.map((id) => getDoc(doc(db, 'prompt_assignments', id)))
  );
  for (const result of results) {
    if (result.status !== 'fulfilled' || !result.value.exists()) continue;
    assignments.set(result.value.id, result.value.data() as Record<string, any>);
  }
}

export function useYourWords() {
  const { user } = useAuth();
  const userId = user?.id;
  const coupleId = user?.coupleId ?? null;

  return useQuery({
    // coupleId is part of the key: an unlink (coupleId → null) must not
    // serve the paired query's cache and vice versa.
    queryKey: ['your-words', userId, coupleId],
    // Gated on the user only — after an unlink the journal must survive
    // (see fetchYourWords for the degraded join).
    enabled: Boolean(userId),
    // A journal doesn't need to be live — refresh on entry is enough.
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        return await fetchYourWords(userId!, coupleId);
      } catch (error) {
        // reportQueryDenied captures the real exception (with its Firestore
        // code) AND, on a rules denial, writes a server-visible client_error
        // event — the signal a bare logger.error cannot give us.
        logger.reportQueryDenied('useYourWords.responses', error);
        throw error;
      }
    },
  });
}
