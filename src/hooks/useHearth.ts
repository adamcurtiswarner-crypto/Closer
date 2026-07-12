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
import { V1_PROMPT_CATEGORIES, toV1Category } from '@/config/promptCategories';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';
import { resolveSignal, type HearthSignal } from '@/utils/hearthSignal';
import { useAuth } from './useAuth';

const COMPLETIONS_LIMIT = 120;

/** Glowing: average of the N most recent scored completions must reach this. */
export const GLOWING_THRESHOLD = 7.5;

/** Glowing looks at the N most recent scored completions (fewer is fine). */
export const GLOWING_WINDOW = 3;

/** Tended: the latest mutual "we talked" mark must be within this window. */
export const TENDED_RECENT_DAYS = 7;

// ─── Types (app camelCase, mapped from Firestore snake_case) ───

export interface HearthResponseEntry {
  userId: string;
  responseText: string;
  responseScore: number | null;
  imageUrl: string | null;
  submittedAt: Date | null;
}

export interface HearthCompletion {
  /** Doc id — which IS the assignment id (triggers.ts creates the completion
   *  at prompt_completions/{assignment_id}; useReaction writes by it too). */
  id: string;
  category: string;
  promptText: string;
  isScale: boolean;
  responses: HearthResponseEntry[];
  /** Per-user reactions keyed by user id (same doc field useReaction writes). */
  reactions: Record<string, string>;
  signal: HearthSignal | null;
  /** Per-user "we talked" marks — key is the user id. */
  discussed: Record<string, Date>;
  /** Set server-side once BOTH partners have marked it. */
  discussedAt: Date | null;
  /** "Keep it for the couch" — flagged into the couch queue at the reveal. */
  couchFlagged: boolean;
  couchFlaggedBy: string | null;
  completedAt: Date | null;
}

/**
 * Tile state for a category — accumulated from the couple's completions.
 * Precedence (problems outrank glow — an open conversation needs the couch
 * before a strength gets to shine):
 *   1. talk     — any un-tended repair or couch-flagged entry
 *   2. compare  — any un-tended divergence entry
 *   3. glowing  — recent scored average ≥ GLOWING_THRESHOLD
 *   4. tended   — latest mutual "we talked" mark within TENDED_RECENT_DAYS
 *   5. steady   — answered, mid-range
 *   6. unlit    — zero completions
 */
export type HearthTileState =
  | 'talk'
  | 'compare'
  | 'glowing'
  | 'tended'
  | 'steady'
  | 'unlit';

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

  // Reactions live on the completion doc (useReaction writes reactions.{uid};
  // an un-react writes null — dropped here so consumers only see live ones).
  const reactions: Record<string, string> = {};
  if (data.reactions && typeof data.reactions === 'object') {
    for (const [uid, value] of Object.entries(data.reactions)) {
      if (typeof value === 'string') reactions[uid] = value;
    }
  }

  return {
    id,
    // Legacy category ids (pre-v1 prompts, old explore assignments) resolve
  // to their v1 tile so history always has a home on the grid.
  category: typeof data.category === 'string' ? toV1Category(data.category) : '',
    promptText: typeof data.prompt_text === 'string' ? data.prompt_text : '',
    isScale: data.is_scale === true,
    responses,
    reactions,
    signal: resolveSignal(
      data.signal,
      responses[0]?.responseScore ?? null,
      responses[1]?.responseScore ?? null
    ),
    discussed,
    discussedAt: toDate(data.discussed_at),
    couchFlagged: data.couch_flagged === true,
    couchFlaggedBy: typeof data.couch_flagged_by === 'string' ? data.couch_flagged_by : null,
    completedAt: toDate(data.completed_at),
  };
}

// ─── Derived selectors (pure — unit-tested directly) ───

export function isTended(completion: HearthCompletion): boolean {
  return completion.discussedAt != null;
}

/**
 * Repair/divergence entries — and anything a partner flagged with "Keep it
 * for the couch" — wait in the couch queue until both mark "we talked".
 * Queue membership is independent of ember color: a flagged steady entry
 * stays gray on the grid but still shows up here.
 */
export function needsCouch(completion: HearthCompletion): boolean {
  return (
    (completion.signal === 'repair' ||
      completion.signal === 'divergence' ||
      completion.couchFlagged) &&
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
 * Scored points for a set of completions: per-completion average of the two
 * partners' scores, chronological ascending. Entries missing a date or
 * either score (old/text completions) are skipped. Shared by the tile state,
 * the tally trend, and trendSeries so they can never disagree on what
 * "scored" means.
 */
export function scoredPoints(entries: HearthCompletion[]): TrendPoint[] {
  return entries
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
}

/**
 * Accumulated tile state for a category. See HearthTileState for the
 * precedence table. The talk/compare branches filter with the exact
 * needsCouch predicate the couch queue uses — every queued entry drives its
 * tile to talk or compare, so the tile and the queue can never contradict
 * each other (a couch-flagged steady entry says "Talk about it" in both).
 */
export function categoryTileState(
  entries: HearthCompletion[],
  now: Date = new Date()
): HearthTileState {
  if (entries.length === 0) return 'unlit';

  const waiting = entries.filter(needsCouch);
  if (waiting.some((c) => c.signal === 'repair' || c.couchFlagged)) return 'talk';
  if (waiting.some((c) => c.signal === 'divergence')) return 'compare';

  // Glowing: the average across the min(GLOWING_WINDOW, available) most
  // recent scored completions. One 8/8 day is enough to light it.
  const points = scoredPoints(entries);
  if (points.length >= 1) {
    const windowPoints = points.slice(-GLOWING_WINDOW);
    const avg = windowPoints.reduce((sum, p) => sum + p.value, 0) / windowPoints.length;
    if (avg >= GLOWING_THRESHOLD) return 'glowing';
  }

  // Tended: the couple's most recent mutual "we talked" mark on a
  // repair/divergence/flagged entry, within the last TENDED_RECENT_DAYS.
  // (Any un-tended one would have returned talk/compare above.)
  const tendedMarks = entries
    .filter(
      (c) =>
        (c.signal === 'repair' || c.signal === 'divergence' || c.couchFlagged) &&
        c.discussedAt != null
    )
    .map((c) => (c.discussedAt as Date).getTime());
  const recentCutoff = now.getTime() - TENDED_RECENT_DAYS * 86400000;
  if (tendedMarks.length > 0 && Math.max(...tendedMarks) >= recentCutoff) {
    return 'tended';
  }

  return 'steady';
}

export function perCategoryTileState(
  completions: HearthCompletion[],
  now: Date = new Date()
): Record<string, HearthTileState> {
  return Object.fromEntries(
    V1_PROMPT_CATEGORIES.map((cat) => [
      cat.type,
      categoryTileState(categoryEntries(completions, cat.type), now),
    ])
  );
}

export interface HearthTileTally {
  /** Every completion counts as answered — text and scored alike. */
  answered: number;
  /**
   * Latest scored average vs the prior one: up → warming, down → settling,
   * flat (or fewer than two scored completions) → null. Never negative
   * language — "settling", not "declining".
   */
  trend: 'warming' | 'settling' | null;
}

export function tileTally(entries: HearthCompletion[]): HearthTileTally {
  const points = scoredPoints(entries);
  let trend: HearthTileTally['trend'] = null;
  if (points.length >= 2) {
    const latest = points[points.length - 1].value;
    const prior = points[points.length - 2].value;
    if (latest > prior) trend = 'warming';
    else if (latest < prior) trend = 'settling';
  }
  return { answered: entries.length, trend };
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
  return scoredPoints(categoryEntries(completions, category)).slice(-maxPoints);
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
        logger.reportQueryDenied('useHearth.listener', error);
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
