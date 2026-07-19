# App Store Screenshot Shot List (v1)

*From the 2026-07-09 worthiness review (Marketing); updated 2026-07-20 for build 65.
Eight shots that tell the loop in order: question → sealed → reveal → follow-up →
Us view → Hearth → Explore → price. Shots 3–5 are the ones no competitor can
copy — do not bury them. (Apple allows 10; the Us view earns the extra frame —
it is the surface built from the data no competitor has.)*

## Ground rules

- **Device sizes required:** 6.7" (e.g. iPhone Pro Max, 1290 × 2796) **and**
  6.5" (e.g. iPhone 11 Pro Max / XS Max, 1242 × 2688). 5.5" optional. Capture
  both sets — Apple will not scale one into the other for you.
- **Capture from the latest build** on a real device or simulator with the
  demo couple staged (see "Staging" below). Status bar clean: full battery,
  no carrier oddities, 9:41 if you retouch.
- **Shots 1–3 share ONE continuing question.** The same prompt text must
  appear in shot 1 (unanswered), shot 2 (sealed), and shot 3 (revealed) — the
  sequence reads as a story, not a feature list.
- Captions: warm, quiet, direct. **No exclamation points**, no emojis, sentence
  case. Keep them short enough to survive the store's caption crop.

## Staging (tie to the seed script)

Run `cd functions && npx ts-node src/scripts/seedReviewerCouple.ts --apply`
the morning of the capture session (PT local day). It guarantees:

- today's daily assignment on a warm scale prompt (deepener templates verified),
- Partner A's response already submitted (score 9 + a believable note),
- premium entitlement for the couple (no paywall interruptions mid-capture —
  the paywall itself is staged separately for shot 7),
- Hearth/Explore history report (the script warns if there is nothing to browse).

Sign-in per shot:
- **Partner B** (stoke.uitest.b@example.com) for shots 1, 3, 4, 5, 6, 7.
- **Partner A** (stoke.uitest.a@example.com) for shot 2 only — A has answered
  and sees the sealed "waiting for your partner" state.

## The seven shots

| # | Shot | Caption (exact) | Screen / state to stage | Demo data needed |
|---|------|-----------------|--------------------------|------------------|
| 1 | The question | One question a day, together | Today tab as Partner B, before answering: the day's question on the ink card with the 1–10 scale visible, untouched | Seed script: today's assignment exists; B has not answered |
| 2 | Sealed | Answer privately — sealed until you both have | Today tab as Partner A, after answering: A's answer submitted, partner's side sealed/waiting | Seed script: A's response submitted (score 9 + note); B has not answered; **same question as shot 1** |
| 3 | The reveal | Then see each other, side by side | The reveal moment as Partner B, immediately after submitting a 9: both scores and both notes side by side | B answers 9 on the device during capture; **same question as shots 1–2** |
| 4 | The follow-up | When it lands high or low, Stoke does something about it | The same-day deepener that appears after shot 3's reveal (both scores ≥ 9) | A seeded at 9 + B answering 9/10 fires the deepener; category verified to have live templates by the seed script |
| 5 | The Us view | Where you're close, where you differ — never a grade | Us view as Partner B (Profile → Us): alignment map with a believable mix of states (close, apart, one movement chip), couple header visible | Seed script must backfill ~3 months of scored history across several categories so alignment states render (not "Still early here" everywhere); premium entitlement already staged |
| 6 | Hearth | The conversations you owe each other, kept warm | Hearth tab as Partner B, with several completed conversations to show (mix of signals so the screen has texture) | Seeded history — the seed script warns if `prompt_completions` is empty; backfill with the sandbox seeder before capture if so |
| 7 | Explore | Twelve parts of a relationship — ask the one you have been circling | Explore tab: the twelve category grid, nothing modal, nothing mid-send | None beyond an authed, paired account |
| 8 | Paywall | One subscription, both of you | The paywall (Profile → plan row): trial CTA with the post-trial price visible in the same frame — "Try 14 days free, then $49.99/year", monthly option, restore link, renewal note + legal links visible | Capture on an account WITHOUT the demo premium grant (or before running the seed), otherwise the plan row shows the active state |

## Capture-day order

1. Run the seed script (--apply), confirm the summary shows assignment staged,
   A's response seeded, and non-zero Hearth/Explore history.
2. Sign in as **Partner A** → capture shot 2 (sealed) FIRST, before B answers.
3. Sign in as **Partner B** → capture shot 1 (question), then answer with a 9
   → capture shot 3 (reveal) → the deepener appears → capture shot 4.
4. Capture shot 5 (Us view: Profile → Us) in the same session — verify the map
   shows mixed states, not "Still early here" everywhere, before shooting.
5. Capture shots 6 (Hearth) and 7 (Explore) in the same session.
6. Capture shot 8 (paywall) on the non-premium account/state.
7. Repeat the set on the second device size.

## Rejection guards

- Every screen shown must exist in the submitted build (no mockups, no hidden
  features — streaks/games/chat surfaces must not appear anywhere).
- Shot 7's frame must show price and trial terms together (3.1.2 — see
  docs/store/3.1.2-checklist.md).
- Notes visible in shots 2–4 are the seed script's warm demo copy — believable,
  non-explicit, safe for the 12+/17+ rating answered in ASC.
