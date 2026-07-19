# "Us" Profile View — Premium Design Spec

**Date:** 2026-07-20
**Status:** Proposed
**Depends on:** premium gates (live), Hearth completions stream (live), RevenueCat configuration (pending — see docs/REVENUECAT-SETUP.md)

## Why

Competitive research (2026-07-20) showed every top couples app treats the profile as a
*couple identity page* — Paired shows quiz results side-by-side, Couply builds a whole
personality layer, Flamme/Agapé show effort-over-time. Our profile is a settings card.

Meanwhile we hold a data asset none of them have: **both partners' 1–10 scores on the
same question, every day, tagged by category.** Paired compares a love-language quiz
taken once; we can show where a couple converges and diverges *continuously*. The "Us"
view turns that into the visible face of Premium — the thing a couple opens the paywall
for and screenshots after.

## What it is

A premium screen that answers three questions in the couple's own data:

1. **Where are we close, where are we far?** — per-category alignment
2. **Which way is it moving?** — gap trend over time
3. **What did we do about it?** — follow-ups answered, hard ones tended

It is a *mirror*, not a *report card*. Nothing in this view scores the relationship.

## Data (no new server work for v1)

Everything derives client-side from what `useHearth` already streams
(`prompt_completions`, both responses embedded, `COMPLETIONS_LIMIT = 120`):

| Signal | Derivation |
|---|---|
| Per-completion gap | `abs(scoreA - scoreB)` where both `response_score` present (reuse the two-score filter in `scoredPoints()`, src/hooks/useHearth.ts) |
| Per-completion level | `(scoreA + scoreB) / 2` — identical to `scoredPoints()` |
| Category rollup | group by `category` (already `toV1Category`-normalized), trailing 90 days |
| Movement | mean gap in the older half of the window vs the newer half; delta ≥ 1.0 → "closing"/"opening", else "steady" |
| Follow-up story | completions whose `signal` is `repair`/`divergence` and are tended (`couchFlagged` / talked mark) — counts already computed for Hearth |
| Love languages | `user.loveLanguage` + partner fetch (already in ProfileCard) |
| Days together | `couple.anniversaryDate` (already collected) |

**Thresholds:** a category renders only with ≥ 3 two-score completions in the window.
Movement renders only with ≥ 3 points in *each* half. Below threshold the category shows
as "Still early" — never an empty chart, never a guess.

## Screen structure

Route: `app/(app)/us.tsx`. Entry points: a row at the top of ProfileCard (settings) and
the Hearth header. Feature flag: `FEATURES.usView`. Gate: new `usViewLocked` key in
`premiumGates()` — same lock condition as `hearthHistoryLocked`.

1. **Header — the couple, not the user.** Both avatars overlapping, names, days
   together. Quiet stats line reusing Hearth's answered/tended counts. (Free)
2. **Alignment map.** One row per v1 category with ≥ threshold data: category name,
   plain-language state from the gap × level quadrant, and a small gap glyph. States
   (brand voice, no grades):
   - low gap, high level → "Close, and strong here"
   - low gap, low level → "Close, and carrying this together"
   - high gap → "You two see this differently" (mirrors the follow-up context line)
   Tapping a row opens the existing `HearthCategoryDetail`. (Premium)
3. **Movement.** For up to 3 categories with the largest change: `HearthSparkline` of
   the gap (not the level) + one line: "This gap narrowed this month." (Premium)
4. **What you tended.** "You went back to 4 hard ones this month." — repair/divergence
   completions marked talked. Links to the couch queue. (Free current month, premium
   history — matches the existing Hearth split)
5. **Side by side.** Love languages of both partners as a comparison moment (both
   values exist today but never meet on one row). Anniversary. Room for future
   one-time mini-assessments. (Free — this is the table-stakes layer)

**Free-couple teaser (as built):** section 2 renders with real category names and the
blur treatment from `FollowUpLockedCard` (transparent glyphs + light text-shadow) over
the state words, with one quiet line and the paywall CTA. Section 3 (movement) is
premium-only and hidden while locked — sparklines don't blur honestly, and one teased
surface is enough. While entitlement resolves, the map holds a skeleton (never the
unlocked render — that would flash the content being sold). The couple sees the map
exists and is *about them* — the same honesty rule as the locked follow-up.

## Voice guardrails

- Never a single overall score, grade, percentage, or ranking. The Connection-Score
  pattern (Flamme) is explicitly rejected — it converts activity into anxiety.
- Divergence is information, not a problem — reuse the follow-up framing verbatim.
- No exclamation points, no streaks pressure, no "keep it up".
- Weather, not report card: states describe *now*, movement describes *direction*.

## Analytics

`us_view_opened` (source: settings | hearth), `gate_hit` with `{surface: 'us_view'}`
(the existing gate-event convention — build funnels against THIS, not a us_view_gate_hit
event), `us_view_category_opened` (category), `us_view_upgrade_tapped`. Funnel to
watch: gate_hit → paywall_shown → trial start, vs. the follow-up gate baseline.

## Build order

1. `deriveAlignment(completions)` util + tests (pure; the whole feature's logic)
2. `usViewLocked` gate key + tests (trivial extension of `premiumGates`)
3. Screen with header + side-by-side (free layer, no gate)
4. Alignment map + movement + teaser blur (premium layer)
5. Entry rows (ProfileCard, Hearth header), analytics, i18n keys

Steps 1–2 are safe to land immediately behind `FEATURES.usView: false`.

## Open questions

- Does the Us entry row show pre-pairing? (Proposed: no — profile card only shows it
  when `coupleId` exists, same as the anniversary row.)
- Widget follow-on: a home-screen widget showing one alignment state line is the
  natural second phase (competitors' most-shared surface) but needs a native build —
  sequence with the next runtimeVersion bump.
