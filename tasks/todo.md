# Stoke — Task Board
*Rewritten 2026-07-09 by CEO to mirror the worthiness review. Old feature-roadmap content was stale and contradicted PRODUCT-DIRECTION.md. Source of truth for findings: docs/reviews/2026-07-09-worthiness-review.md.*

## GATE 1 — SEV-0 fixes (before TestFlight resumes)
- [x] Content death spiral: exempt scale prompts from depth progression + LRU-random fallback (functions/src/prompts.ts, triggers.ts)
- [x] storage.rules: couple-membership on every couple-scoped path
- [x] Breakup model: isCoupleMember checks status; unlink → callable; purge embedded copies in completions/memories (+ BigQuery)
- [x] couple_invites: kill collection listing; accept via callable/code-keyed get
- [x] Reveal race: server-authoritative assignment status + distinct-uid count; deterministic response IDs; single-flight offline flush
- [x] Offline flush query: add couple_id filter; un-silence catch
- [x] Reminders: widen reminder-1 window (quiet hours defer); reminder-2 at count ≤1; reportError wrapper
- [x] Paywall moment (recommendation wired behind FEATURES.premiumGates=true — one flag to change) — FOUNDER DECISION, then wire
- [x] revenueCatWebhook fail-closed
- [x] runWith timeouts on all schedulers

## GATE 2 — SEV-1 pre-launch (parallel where possible)
- [x] Pairing-moment design (both sides) · Explore reveal = CompletionMoment · first-reveal beat · inline onboarding errors · copy pass
- [x] Invite chain: first-person share msg, ?from wiring, og:image, domain decision (FOUNDER), join.html skeptical-partner rebuild
- [x] Store: 7-screenshot narrative, listing surgery (add Hearth/Explore, first-3-lines, keyword swap), reviewer one-device path, uitest cleanup FROZEN until App Store approval (review credentials depend on these accounts)
- [x] Trust: privacy policy accuracy (add Expo; deletion claim), nutrition labels (incl. Sensitive Info), support@ + in-app Contact + /support page
- [x] Test seams: rules test suite (~30 query shapes), two-client emulator harness (5 flows), tz/DST shared matrix + jest TZ pin, manual device checklist, webhook tests
- [x] Observability: reportError on core trigger/reminders, non-push alert channel, Sentry DSN → EAS env, client_error events, synthetic canary
- [x] Note-field default emphasis; field-scope response/assignment updates

## GATE 3 — Ship
- [ ] Build 61+ cut → founder two-phone pass → screenshots → ASC assembly → submit (manual release) → 10-20-couple beta during review → release on exit criteria

## Post-launch 30 days (ordered)
1. Content batch 2 (60→180) + Explore depth + separate pools + Explore deepeners + no-repeat guard
2. Waiting-states → agency (v1.5 #1)
3. Scheduler bucketing; error-storm cap
4. Server-enforced reveal gating
5. Mixed-OS bridge decision
6. "The app that notices" copy test
