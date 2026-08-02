import { useQuery } from '@tanstack/react-query';
import {
  collection,
  documentId,
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
/** Firestore `in` queries accept at most 30 values per chunk. */
const IN_CHUNK = 30;

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
    promptText:
      typeof assignment?.prompt_text === 'string' ? assignment.prompt_text : '',
    category: typeof assignment?.category === 'string' ? assignment.category : null,
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
  coupleId: string
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
  const assignmentIds = [
    ...new Set(
      responseDocs
        .map((d) => d.data().assignment_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];

  const assignments = new Map<string, Record<string, any>>();
  for (const ids of chunk(assignmentIds, IN_CHUNK)) {
    const snap = await getDocs(
      query(
        collection(db, 'prompt_assignments'),
        where('couple_id', '==', coupleId),
        where(documentId(), 'in', ids)
      )
    );
    for (const doc of snap.docs) assignments.set(doc.id, doc.data());
  }

  return responseDocs.map((d) =>
    mapYourWordsEntry(d.id, d.data(), assignments.get(d.data().assignment_id))
  );
}

export function useYourWords() {
  const { user } = useAuth();
  const userId = user?.id;
  const coupleId = user?.coupleId;

  return useQuery({
    queryKey: ['your-words', userId],
    enabled: Boolean(userId && coupleId),
    // A journal doesn't need to be live — refresh on entry is enough.
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        return await fetchYourWords(userId!, coupleId!);
      } catch (error) {
        logger.error('Error loading your words:', error);
        throw error;
      }
    },
  });
}
