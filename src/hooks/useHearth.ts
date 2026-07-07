import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { V1_PROMPT_CATEGORIES } from '@/config/promptCategories';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';
import { resolveSignal, type HearthSignal } from '@/utils/hearthSignal';
import { useAuth } from './useAuth';

const COMPLETIONS_LIMIT = 120;

/** A deepener ember keeps its glow on the category tile for this long. */
export const RECENT_DEEPENER_DAYS = 14;

// ─── Types (app camelCase, mapped from Firestore snake_case) ───

export interface HearthResponseEntry {
  userId: string;
  responseText: string;
  responseScore: number | null;
  imageUrl: string | null;
  submittedAt: Date | null;
}

export interface HearthCompletion {
  id: string;
  category: string;
  promptText: string;
  isScale: boolean;
  responses: HearthResponseEntry[];
  signal: HearthSignal | null;
  /** Per-user "we talked" marks — key is the user id. */
  discussed: Record<string, Date>;
  /** Set server-side once BOTH partners have marked it. */
  discussedAt: Date | null;
  completedAt: Date | null;
}

/** Tile state for a category — worst un-tended entry wins. */
export type CategoryEmberState = 'repair' | 'divergence' | 'deepener' | 'steady';

// ─── Read-boundary mapping (null-tolerant of missing new fields) ───

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

export function mapCompletion(id: string, data: Record<string, any>): HearthCompletion {
  const rawResponses = Array.isArray(data.responses) ? data.responses : [];
  const responses: HearthResponseEntry[] = rawResponses.map((r: Record<string, any>) => ({
    userId: r?.user_id ?? '',
    responseText: r?.response_text ?? '',
    responseScore: typeof r?.response_score === 'number' ? r.response_score : null,
    imageUrl: r?.image_url ?? null,
    submittedAt: toDate(r?.submitted_at),
  }));

  const discussed: Record<string, Date> = {};
  if (data.discussed && typeof data.discussed === 'object') {
    for (const [uid, ts] of Object.entries(data.discussed)) {
      const mark = toDate(ts);
      if (mark) discussed[uid] = mark;
    }
  }

  return {
    id,
    category: typeof data.category === 'string' ? data.category : '',
    promptText: typeof data.prompt_text === 'string' ? data.prompt_text : '',
    isScale: data.is_scale === true,
    responses,
    signal: resolveSignal(
      data.signal,
      responses[0]?.responseScore ?? null,
      responses[1]?.responseScore ?? null
    ),
    discussed,
    discussedAt: toDate(data.discussed_at),
    completedAt: toDate(data.completed_at),
  };
}

// ─── Derived selectors (pure — unit-tested directly) ───

export function isTended(completion: HearthCompletion): boolean {
  return completion.discussedAt != null;
}

/** Repair/divergence entries wait in the couch queue until both mark "we talked". */
export function needsCouch(completion: HearthCompletion): boolean {
  return (
    (completion.signal === 'repair' || completion.signal === 'divergence') &&
    !isTended(completion)
  );
}

export function couchQueue(completions: HearthCompletion[]): HearthCompletion[] {
  return completions.filter(needsCouch);
}

export function categoryEntries(
  completions: HearthCompletion[],
  category: string
): HearthCompletion[] {
  return completions.filter((c) => c.category === category);
}

/**
 * Tile state precedence: un-tended repair > un-tended divergence >
 * recent deepener > steady.
 */
export function categoryState(
  entries: HearthCompletion[],
  now: Date = new Date()
): CategoryEmberState {
  if (entries.some((c) => c.signal === 'repair' && !isTended(c))) return 'repair';
  if (entries.some((c) => c.signal === 'divergence' && !isTended(c))) return 'divergence';
  const recentCutoff = now.getTime() - RECENT_DEEPENER_DAYS * 86400000;
  if (
    entries.some(
      (c) => c.signal === 'deepener' && (c.completedAt?.getTime() ?? 0) >= recentCutoff
    )
  ) {
    return 'deepener';
  }
  return 'steady';
}

export function perCategoryState(
  completions: HearthCompletion[],
  now: Date = new Date()
): Record<string, CategoryEmberState> {
  return Object.fromEntries(
    V1_PROMPT_CATEGORIES.map((cat) => [
      cat.type,
      categoryState(categoryEntries(completions, cat.type), now),
    ])
  );
}

export interface HearthMonthlyStats {
  answered: number;
  tended: number;
}

export function monthlyStats(
  completions: HearthCompletion[],
  now: Date = new Date()
): HearthMonthlyStats {
  const sameMonth = (d: Date | null) =>
    d != null && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  return {
    answered: completions.filter((c) => sameMonth(c.completedAt)).length,
    tended: completions.filter((c) => sameMonth(c.discussedAt)).length,
  };
}

export interface TrendPoint {
  date: Date;
  value: number;
}

/**
 * Score trend for a category: per-completion average of the two scores,
 * chronological, capped to the most recent `maxPoints`.
 */
export function trendSeries(
  completions: HearthCompletion[],
  category: string,
  maxPoints = 10
): TrendPoint[] {
  const points = categoryEntries(completions, category)
    .map((c) => {
      if (!c.completedAt) return null;
      const scores = c.responses
        .map((r) => r.responseScore)
        .filter((s): s is number => typeof s === 'number');
      if (scores.length !== 2) return null;
      return { date: c.completedAt, value: (scores[0] + scores[1]) / 2 };
    })
    .filter((p): p is TrendPoint => p != null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return points.slice(-maxPoints);
}

/** Convenience for meta lines and score chips: my score vs my partner's. */
export function scoresFor(
  completion: HearthCompletion,
  myUid: string
): { mine: number | null; theirs: number | null } {
  const mine = completion.responses.find((r) => r.userId === myUid)?.responseScore ?? null;
  const theirs =
    completion.responses.find((r) => r.userId !== myUid)?.responseScore ?? null;
  return { mine, theirs };
}

// ─── Hooks ───

/**
 * Real-time completions feed: onSnapshot on prompt_completions drives the
 * React Query cache (same pattern as useTodayPrompt — no polling).
 */
export function useHearth() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const coupleId = user?.coupleId;

  useEffect(() => {
    if (!coupleId) {
      queryClient.setQueryData(['hearth', coupleId], []);
      return;
    }

    const completionsQuery = query(
      collection(db, 'prompt_completions'),
      where('couple_id', '==', coupleId),
      orderBy('completed_at', 'desc'),
      limit(COMPLETIONS_LIMIT)
    );

    const unsubscribe = onSnapshot(
      completionsQuery,
      (snap) => {
        const completions = snap.docs.map((d) => mapCompletion(d.id, d.data()));
        queryClient.setQueryData(['hearth', coupleId], completions);
      },
      (error) => {
        logger.warn('Hearth completions listener failed:', error);
      }
    );

    return unsubscribe;
  }, [coupleId, queryClient]);

  return useQuery<HearthCompletion[]>({
    queryKey: ['hearth', coupleId],
    queryFn: () =>
      queryClient.getQueryData<HearthCompletion[]>(['hearth', coupleId]) ?? [],
    enabled: !!coupleId,
    // No refetchInterval — the snapshot listener owns freshness
    staleTime: Infinity,
  });
}

/**
 * Write my "we talked" mark. Rules only allow writing my own key; the
 * server sets discussed_at once the partner's mark exists. Optimistic —
 * the waiting state shows immediately, rolled back on failure.
 */
export function useMarkDiscussed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const coupleId = user?.coupleId;

  return useMutation({
    mutationFn: async ({ completionId }: { completionId: string }) => {
      if (!user?.id) throw new Error('Not signed in');
      const completionRef = doc(db, 'prompt_completions', completionId);
      await updateDoc(completionRef, {
        [`discussed.${user.id}`]: serverTimestamp(),
      });
      return { completionId };
    },
    onMutate: async ({ completionId }) => {
      const key = ['hearth', coupleId];
      const previous = queryClient.getQueryData<HearthCompletion[]>(key);
      if (previous && user?.id) {
        const myUid = user.id;
        queryClient.setQueryData<HearthCompletion[]>(
          key,
          previous.map((c) =>
            c.id === completionId
              ? { ...c, discussed: { ...c.discussed, [myUid]: new Date() } }
              : c
          )
        );
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['hearth', coupleId], context.previous);
      }
      logger.warn('Mark discussed failed:', error);
      Alert.alert('Could not mark it', 'Something went wrong. Please try again.');
    },
    onSuccess: (data) => {
      logEvent('marked_discussed', { completion_id: data.completionId });
    },
  });
}
