// Pure derivation for the "Us" view (docs/plans/2026-07-20-us-profile-view-design.md).
//
// Everything computes client-side from the completions Hearth already
// streams: per-category gap (|scoreA − scoreB|) and level ((a+b)/2) over a
// trailing window, plus which way the gap is moving. No single overall
// score exists on purpose — the view is a mirror, not a report card.

/** Chronological point — structurally compatible with useHearth's TrendPoint. */
export interface AlignmentPoint {
  date: Date;
  value: number;
}

/** The minimal completion shape the derivation needs (HearthCompletion fits). */
export interface AlignmentInput {
  category: string;
  completedAt: Date | null;
  responses: { responseScore: number | null }[];
}

export const ALIGNMENT_WINDOW_DAYS = 90;
/** A category renders a state only with this many two-score completions. */
export const ALIGNMENT_MIN_SCORED = 3;
/** Movement renders only with this many points in EACH half of the window. */
export const ALIGNMENT_MIN_HALF = 3;
/** Average gap at/above this reads as "you two see this differently". */
export const ALIGNMENT_APART_GAP = 2.5;
/** Average level at/above this reads as "strong here". */
export const ALIGNMENT_STRONG_LEVEL = 7;
/** Half-to-half average-gap change at/above this reads as closing/opening. */
export const ALIGNMENT_MOVEMENT_DELTA = 1.0;

export type AlignmentState = 'close_strong' | 'close_tender' | 'apart' | 'early';
export type AlignmentMovement = 'closing' | 'opening' | 'steady';

export interface CategoryAlignment {
  /** v1 category id (inputs are already toV1Category-normalized). */
  category: string;
  /** Two-score completions inside the window. */
  count: number;
  avgGap: number;
  avgLevel: number;
  state: AlignmentState;
  /** null when either half is below ALIGNMENT_MIN_HALF. */
  movement: AlignmentMovement | null;
  /** Older-half avg gap minus newer-half avg gap: positive = closing. */
  movementDelta: number;
  /** Chronological |scoreA − scoreB| per completion (sparkline input). */
  gapSeries: AlignmentPoint[];
}

const STATE_ORDER: Record<AlignmentState, number> = {
  apart: 0,
  close_tender: 1,
  close_strong: 2,
  early: 3,
};

function bothScores(entry: AlignmentInput): [number, number] | null {
  const scores = entry.responses
    .map((r) => r.responseScore)
    .filter((s): s is number => typeof s === 'number');
  return scores.length === 2 ? [scores[0], scores[1]] : null;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Per-category alignment over the trailing window, ordered by attention:
 * apart first, then tender, then strong, then early — ties broken by
 * count (more data first), then category id for stability.
 */
export function deriveAlignment(
  completions: AlignmentInput[],
  now: Date = new Date()
): CategoryAlignment[] {
  const windowStart = new Date(
    now.getTime() - ALIGNMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  // Chronological two-score points inside the window, grouped by category.
  const byCategory = new Map<string, { date: Date; gap: number; level: number }[]>();
  for (const entry of completions) {
    if (!entry.category || entry.completedAt == null) continue;
    if (entry.completedAt < windowStart || entry.completedAt > now) continue;
    const scores = bothScores(entry);
    if (!scores) continue;
    const points = byCategory.get(entry.category) ?? [];
    points.push({
      date: entry.completedAt,
      gap: Math.abs(scores[0] - scores[1]),
      level: (scores[0] + scores[1]) / 2,
    });
    byCategory.set(entry.category, points);
  }

  const alignments: CategoryAlignment[] = [];
  for (const [category, points] of byCategory) {
    points.sort((a, b) => a.date.getTime() - b.date.getTime());
    const gaps = points.map((p) => p.gap);
    const avgGap = average(gaps);
    const avgLevel = average(points.map((p) => p.level));

    let state: AlignmentState;
    if (points.length < ALIGNMENT_MIN_SCORED) state = 'early';
    else if (avgGap >= ALIGNMENT_APART_GAP) state = 'apart';
    else if (avgLevel >= ALIGNMENT_STRONG_LEVEL) state = 'close_strong';
    else state = 'close_tender';

    // Movement: older half vs newer half of the window's points.
    const mid = Math.floor(points.length / 2);
    const older = gaps.slice(0, mid);
    const newer = gaps.slice(mid);
    let movement: AlignmentMovement | null = null;
    let movementDelta = 0;
    if (older.length >= ALIGNMENT_MIN_HALF && newer.length >= ALIGNMENT_MIN_HALF) {
      movementDelta = average(older) - average(newer);
      if (movementDelta >= ALIGNMENT_MOVEMENT_DELTA) movement = 'closing';
      else if (movementDelta <= -ALIGNMENT_MOVEMENT_DELTA) movement = 'opening';
      else movement = 'steady';
    }

    alignments.push({
      category,
      count: points.length,
      avgGap,
      avgLevel,
      state,
      movement,
      movementDelta,
      gapSeries: points.map((p) => ({ date: p.date, value: p.gap })),
    });
  }

  return alignments.sort(
    (a, b) =>
      STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
      b.count - a.count ||
      a.category.localeCompare(b.category)
  );
}

/**
 * The categories whose gap moved the most — closing or opening only,
 * largest absolute change first. Feeds the "Which way it's moving" section.
 */
export function movementPicks(
  alignments: CategoryAlignment[],
  max: number = 3
): CategoryAlignment[] {
  return alignments
    .filter((a) => a.movement === 'closing' || a.movement === 'opening')
    .sort((a, b) => Math.abs(b.movementDelta) - Math.abs(a.movementDelta))
    .slice(0, max);
}
