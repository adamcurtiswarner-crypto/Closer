// Reaction learning signals (PRODUCT-DIRECTION.md v1.5 #2): derive which
// reactions land on which categories. No new UI in this layer — consumers
// (Us view, future bid engine) read the derived data.

import type { HearthCompletion } from '@/hooks/useHearth';
import type { ReactionType } from '@/hooks/useReaction';

const CURATED_REACTIONS = new Set<string>(['heart', 'fire', 'laughing', 'teary']);

function isCurated(value: string): value is ReactionType {
  return CURATED_REACTIONS.has(value);
}

/** Aggregated reaction profile for a single category. */
export interface CategoryReactionProfile {
  category: string;
  /** Total reactions (curated + custom) across all completions in this category. */
  total: number;
  /** Curated reaction counts: heart, fire, laughing, teary. */
  curated: Record<ReactionType, number>;
  /** The dominant curated reaction (most frequent). Null if no curated reactions. */
  dominant: ReactionType | null;
  /** Custom emoji count (non-curated). */
  customCount: number;
  /** Reaction rate: fraction of completions in this category that received
   *  at least one reaction (0-1). */
  reactionRate: number;
  /** Number of completions in this category. */
  completionCount: number;
}

/** Couple-level reaction summary across all categories. */
export interface ReactionSignals {
  /** Per-category profiles, ordered by total reaction count descending. */
  categories: CategoryReactionProfile[];
  /** Overall dominant reaction across all categories. */
  overallDominant: ReactionType | null;
  /** Overall reaction rate (fraction of completions with >= 1 reaction). */
  overallReactionRate: number;
  /** Categories where the dominant reaction DIFFERS from the overall dominant
   *  — these are the interesting learning signals ("heart lands everywhere
   *  except money, where teary dominates"). */
  outliers: CategoryReactionProfile[];
}

const EMPTY_CURATED: Record<ReactionType, number> = {
  heart: 0,
  fire: 0,
  laughing: 0,
  teary: 0,
};

/**
 * How many curated reactions a category needs before its "different"
 * reaction means anything. Three taps is noise at this sample size.
 */
export const OUTLIER_MIN_REACTIONS = 6;

/** At most this many outliers — a short list of real signals, not a catalogue. */
export const OUTLIER_MAX = 2;

function dominantReaction(
  curated: Record<ReactionType, number>
): ReactionType | null {
  let best: ReactionType | null = null;
  let bestCount = 0;
  for (const [type, count] of Object.entries(curated)) {
    if (count > bestCount) {
      best = type as ReactionType;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Derive reaction learning signals from the couple's completions.
 * Pure function — no side effects, no Firestore reads.
 */
export function deriveReactionSignals(
  completions: HearthCompletion[]
): ReactionSignals {
  const byCategory = new Map<
    string,
    {
      curated: Record<ReactionType, number>;
      customCount: number;
      total: number;
      withReaction: number;
      completionCount: number;
    }
  >();

  const globalCurated = { ...EMPTY_CURATED };
  let globalTotal = 0;
  let globalWithReaction = 0;

  for (const c of completions) {
    if (!c.category) continue;

    const bucket = byCategory.get(c.category) ?? {
      curated: { ...EMPTY_CURATED },
      customCount: 0,
      total: 0,
      withReaction: 0,
      completionCount: 0,
    };
    bucket.completionCount++;

    const reactionValues = Object.values(c.reactions);
    if (reactionValues.length > 0) {
      bucket.withReaction++;
      globalWithReaction++;
    }

    for (const r of reactionValues) {
      bucket.total++;
      globalTotal++;
      if (isCurated(r)) {
        bucket.curated[r]++;
        globalCurated[r]++;
      } else {
        bucket.customCount++;
      }
    }

    byCategory.set(c.category, bucket);
  }

  const overallDominant = dominantReaction(globalCurated);
  const totalCompletions = completions.filter((c) => c.category).length;

  const categories: CategoryReactionProfile[] = Array.from(byCategory.entries())
    .map(([category, b]) => ({
      category,
      total: b.total,
      curated: b.curated,
      dominant: dominantReaction(b.curated),
      customCount: b.customCount,
      reactionRate:
        b.completionCount > 0 ? b.withReaction / b.completionCount : 0,
      completionCount: b.completionCount,
    }))
    .sort((a, b) => b.total - a.total);

  // Tightened 2026-11-14. At `total >= 3` with one dominant reaction
  // elsewhere, almost any category qualifies on a handful of taps, and the
  // Us view printed the SAME sentence — "Spark lands here most (Love
  // everywhere else)" — under four different categories. Four rows saying
  // one thing is noise, and restating a tally is not an insight.
  //
  // A category now has to carry real weight (OUTLIER_MIN_REACTIONS) AND
  // have its dominant reaction actually dominate (a majority of that
  // category's curated reactions, not merely the top of a three-way split).
  // Only the strongest few are returned, because the point is "this one is
  // different", not a catalogue.
  const outliers = categories
    .filter((c) => {
      if (c.dominant === null || overallDominant === null) return false;
      if (c.dominant === overallDominant) return false;
      if (c.total < OUTLIER_MIN_REACTIONS) return false;
      const dominantCount = c.curated[c.dominant] ?? 0;
      return dominantCount * 2 > c.total;
    })
    .slice(0, OUTLIER_MAX);

  return {
    categories,
    overallDominant,
    overallReactionRate:
      totalCompletions > 0 ? globalWithReaction / totalCompletions : 0,
    outliers,
  };
}
