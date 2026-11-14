// Pure derivation for the redesigned Us view.
//
// The November tile grid rendered `deriveRadarData` — raw per-partner
// averages — and invented its own status words and colours on top, which
// produced a 12-tile report card: green "GOOD" pills and one-decimal scores
// like 5.9 vs 7.4 computed from one or two completions. False precision
// dressed as insight, and a grade, which is the one thing
// PRODUCT-DIRECTION says this view must never be ("a mirror, not a report
// card").
//
// The honest engine already existed and was still running: `deriveAlignment`
// gives per-category state, movement, counts, and an `early` state for
// categories without enough data to speak about. Its output was computed on
// every render and then thrown away for everyone except the locked teaser.
//
// This joins the two — alignment for what we may SAY, radar for where the
// two dots SIT — and decides what the screen leads with.

import type { CategoryAlignment, RadarCategoryPoint } from './alignment';
import { ALIGNMENT_MIN_SCORED } from './alignment';

export interface UsCategoryRow {
  category: string;
  /** Both partners' trailing averages — the two dots on the shared rail. */
  myAvg: number;
  partnerAvg: number;
  /** |myAvg − partnerAvg|, the distance the rail draws. */
  gap: number;
  /** Two-score completions behind this row. */
  count: number;
  movement: 'closing' | 'opening' | 'steady' | null;
}

export interface UsStillForming {
  category: string;
  count: number;
  /** How many two-score answers a category needs before we say anything. */
  needed: number;
}

export interface UsView {
  /** The widest gap worth leading with, or null when nothing qualifies. */
  lead: UsCategoryRow | null;
  /** The clearest movement, excluding whatever already leads. */
  movement: UsCategoryRow | null;
  /** Everything with enough data, widest gap first. Includes the lead. */
  rows: UsCategoryRow[];
  /** Categories still below the threshold, most answers first. */
  stillForming: UsStillForming[];
  /** Count of rows whose partners are close (gap under the apart threshold). */
  closeCount: number;
}

/**
 * A gap this wide is worth putting on the screen as the lead. Deliberately
 * lower than ALIGNMENT_APART_GAP (2.5, the threshold for calling a category
 * "apart"): a couple can be close everywhere and still have a widest gap
 * worth a conversation, which is exactly the founders' own data — nothing
 * of theirs is "apart", and a screen that therefore led with nothing would
 * be useless to them.
 */
export const US_LEAD_MIN_GAP = 0.75;

export function deriveUsView(
  alignments: CategoryAlignment[],
  radar: RadarCategoryPoint[]
): UsView {
  const radarByCategory = new Map(radar.map((r) => [r.category, r]));

  const rows: UsCategoryRow[] = [];
  const stillForming: UsStillForming[] = [];

  for (const alignment of alignments) {
    const point = radarByCategory.get(alignment.category);

    // `early` means deriveAlignment does not have enough two-score
    // completions to make a claim. Saying "1 of 3 answers" is more useful
    // than printing an average of one number, and it tells a couple what
    // would make the row appear.
    if (alignment.state === 'early' || !point) {
      stillForming.push({
        category: alignment.category,
        count: alignment.count,
        needed: ALIGNMENT_MIN_SCORED,
      });
      continue;
    }

    rows.push({
      category: alignment.category,
      myAvg: point.myAvg,
      partnerAvg: point.partnerAvg,
      gap: Math.abs(point.myAvg - point.partnerAvg),
      count: alignment.count,
      movement: alignment.movement,
    });
  }

  // Widest gap first: distance is the whole point of the view, and the
  // conversation worth having sits at the top of that order.
  rows.sort((a, b) => b.gap - a.gap || b.count - a.count);
  stillForming.sort((a, b) => b.count - a.count);

  const lead = rows.length > 0 && rows[0].gap >= US_LEAD_MIN_GAP ? rows[0] : null;

  // Movement is the one thing a static picture cannot show, so it gets its
  // own card — but never the same category as the lead, which would say the
  // same thing twice.
  const movement =
    rows.find(
      (r) =>
        r.category !== lead?.category &&
        (r.movement === 'closing' || r.movement === 'opening')
    ) ?? null;

  const closeCount = rows.filter((r) => r.gap < US_LEAD_MIN_GAP).length;

  return { lead, movement, rows, stillForming, closeCount };
}
