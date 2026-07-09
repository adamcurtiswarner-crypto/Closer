# Worthiness Review — All-Department Audit
*2026-07-09 · Directive: "Review all agents and make recommendations to make this app worthy of people using."*
*Eight department heads audited the app as built against one bar: would a real couple keep using this every day for a month? CEO verified the two most consequential claims directly against production before accepting them.*

---

## Verdict

The product spine is right and parts of it are genuinely excellent (the reveal choreography, the anti-guilt doctrine, Hearth's ritual). But the review found **two catastrophic defects verified in production**, a cluster of trust/security holes, and a reliability layer that isn't ready for couples we don't sit next to. None of it is conceptual — it's all fixable in roughly two focused weeks. Ship nothing until the SEV-0 list is clear.

---

## SEV-0 — Verified product-breaking (all PRE-LAUNCH-BLOCKING)

| # | Finding | Verified | Fix shape | Effort |
|---|---|---|---|---|
| 1 | **Content death spiral.** All 60 live scored prompts are medium/deep; zero surface prompts exist; depth progression requires 3 surface completions to unlock medium. Every category a couple answers locks permanently (completions count toward a level that can never advance). Pool exhausts in ~2 weeks → fallback serves `poolDocs[0]` — the **same prompt every day, forever**, ignoring recency. Founder couple is already down to ~6 eligible prompts. No fresh couple has ever run this loop naturally. | ✔ prod data + code (`functions/src/prompts.ts:70-106`, `triggers.ts:160-196`, `shared.ts:62-72`) | Exempt scale prompts from depth progression; fallback = least-recently-used random; regression test | S |
| 2 | **Storage rules wide open.** `/responses/{coupleId}/…`, `/chat/{coupleId}/…`, `/partner-photos/…`: `allow read: if request.auth != null` — any Stoke account can read **and upload into** any couple's intimate photos. Comments claim couple-scoping; rules don't do it. | ✔ read `storage.rules` directly | Membership-verified reads/writes on every couple-scoped path | S |
| 3 | **Breakup model betrays users.** Unlink/delete never clears `member_ids` and `isCoupleMember()` ignores couple `status` → an ex retains permanent silent read (and some write) access to all shared history. Deletion purge skips embedded response copies in `prompt_completions`/`memory_artifacts` + BigQuery rows (GDPR erasure gap). Client unlink is also permission-broken mid-flow (partner doc write denied). | ✔ rules + `users.ts` + `useCouple.ts` (Ops) | `isCoupleMember` checks status; unlink → server callable; purge embedded copies (reuse anonymize logic) | M |
| 4 | **Invite enumeration / partner impersonation.** `couple_invites` is list-readable by any authed user; non-inviter may accept → a stranger can join a couple before the partner does. | ✔ rules :205-217 (Eng + Ops independently) | By-code get or accept-via-callable | S |
| 5 | **Reveal race → permanently stuck "waiting."** Both partners answering simultaneously: both clients read `response_count: 0`, write 1/partial; server trigger creates the completion but **never repairs assignment status**, and counts responses without distinct-user check (dupes can complete a "couple" of one person). Plus duplicate-response paths: two NetInfo flush listeners, mutation `retry: 2` re-running `addDoc`. | ✔ code (Eng) | Server-authoritative status write-back + distinct-uid count; deterministic response IDs (`assignmentId_userId`); single-flight flush | M |
| 6 | **Offline answers silently lost** (bug #5, same class as the explore-reveal bug). `hasExistingResponse` (`usePrompt.ts:481`) queries without `couple_id` → rules-denied → `flushOfflineQueue`'s silent catch eats it forever. | ✔ code (Testing) | Add couple_id filter; un-silence the catch | S |
| 7 | **Reminders never fire for default users.** Default delivery 19:00 → reminder-1 window (4-6h) lands entirely inside quiet hours; reminder 2 requires reminder 1. The partner-nudge engine of the daily loop is dead in production. | ✔ code (`notifications.ts`) | Widen reminder-1 to ≥4h (quiet hours defer, not kill); reminder 2 fires at count ≤1; wrap run in reportError | S |
| 8 | **The paywall is unreachable.** `isPremium` gates only hidden coaching; Paywall mounts only in Profile → tapping the plan row. No trial can start; trial→paid ≥8% target has no mechanism. `__DEV__` ORs premium on, masking this. | ✔ code (Product) | FOUNDER DECISION (see below) + wiring | M |
| 9 | **RevenueCat webhook fails open** when env var missing (`if (expectedKey && …)`). | ✔ code (Eng) | Hard-fail on missing key | S |

## SEV-1 — Pre-launch quality (worthiness, trust, review-pass)

**Emotional craft (Design):** the pairing moment is a silent `router.replace()` on both phones — design it (names + flame lights + one Success haptic; "{Name} is here" card for the inviter) [M]. Explore's both-answers view is a flat accordion — give it the CompletionMoment treatment [M]. First-ever reveal beat [S]. Replace iOS system alerts in onboarding with the inline pattern that already exists on the same screen; fix the `feedbackGiven` re-ask [S]. Copy pass: paywall subtitle, welcome flame/spark metaphor, Hearth cold-start grid [S].

**The invite chain (Marketing — highest-leverage funnel step):** share message is third-person robot voice; rewrite first-person. `?from=` personalization is dead code — wire it. join.html: add og:image, and rebuild for the skeptical partner (nothing's-wrong reframe, free-for-you, 3 min/day, private, one sample question). Real domain for invite links (decision below). All [S].

**Store presence (Marketing + PM):** 7-screenshot narrative (question → sealed → reveal → follow-up → Hearth → Explore → price; shots 3-5 are un-copyable). Listing surgery: Hearth/Explore into the description, differentiator in the first 3 lines, keyword swap (love/romance/closeness → check in/spouse/quiz). Reviewer one-device path: seed partner-A answers, grant demo accounts premium, **freeze the uitest-cleanup punch item**, rewrite review notes. Submit with web.app policy URLs (don't wait on DNS). 3.1.2 self-audit + nutrition labels incl. **Sensitive Info**. [S/M]

**Trust paperwork (Ops):** privacy policy: add Expo (receives names + prompt text in pushes), fix the deletion claim (or make code match — preferred). Stand up support@/privacy@, in-app "Contact us" row, /support page, 1-page triage doc. Purge the fictional "AES-256-CBC" claim from all plan docs — no encryption code exists. [S]

**Test the seams (Testing):** rules test suite (~30 client query shapes; 0 covered today) [M]; two-client emulator harness for the 5 couple flows (seal/reveal, explore, skip, Hearth mark, pairing) [M]; shared clock/tz scenario matrix + pin TZ in jest (current date tests fail on UTC CI) + DST cases (Nov 1 is 4 months out) [S]; commit the 45-min manual pre-submission device checklist; revenueCatWebhook unit tests [S].

**Observability (Eng + Ops):** reportError wrappers on `onResponseSubmitted` + `sendResponseReminders`; second alert channel independent of Expo push; Sentry DSN → EAS env; client permission-denied events + spike alert; nightly synthetic-couple canary (submit 2 → assert completion). `runWith({timeoutSeconds: 540})` on all schedulers (one line — delivery run dies at 60s today). [S/M]

**Product texture:** make the note field the visual default with per-category placeholder — all downstream value (reveal, reactions, follow-ups, Hearth starters) depends on words [S]. Field-scope `prompt_responses`/`prompt_assignments` updates (no silent post-reveal rewrites) [S].

## Founder decisions required

1. **Paywall moment.** Recommend: 14-day trial starts at pairing; after it, the daily question stays free forever; follow-ups + Hearth history + Explore-sending go premium. The less-engaged partner never hits a wall; the bought-in partner pays for the nervous system. (Alternative: declare v1 free and drop the 8% target.)
2. **Invite/link domain**: stoke.llc vs getstoke.io — codebase currently contains both futures. Pick one this week.
3. **Beta wave** (PM, recommended): submit with **manual release**, run 10-20 couples during Apple's review wait — ≥3 couples outside Eastern, ≥5 device models; exit criteria incl. pairing ≥70% and zero P0. Costs ~zero calendar time.
4. **Ex-partner data policy**: what survives a breakup (recommend: your own answers only; shared record anonymized).
5. Standing items: W-9 (the longest pole), IAP screenshots, legal-entity confirmations, RevenueCat webhook + email.

## Post-launch 30-day queue (ordered)
1. Content batch 2 (60→180 scored) + Explore depth (15/category) + separate recency pools + Explore fires deepeners + no-repeat/rephrase guard — repetition is the category's #1 documented churn driver and our pool is thin.
2. Waiting-states → agency (v1.5 #1; CI ranks it the #1 churn structural fix).
3. Delivery scheduler restructure (notification-time bucketing) before ~1k couples; error-storm cap.
4. Server-enforced reveal gating (seal integrity as a security property — an incumbent has publicly shipped this bug).
5. Mixed-OS bridge decision (partner web answer view before full Android).
6. "The app that notices" consumer copy test (20-couple 10-second comprehension).

## Competitive frame (CI)
Threat ORANGE. Wedge — the only loop that *reacts* to answers — is real, uncontested, and copyable by Paired in ~a quarter. Day-1 we lose on social proof (204K reviews vs 0), Android, games, content volume; we win week-6 IF the engine feels like being listened to. Anti-guilt and billing-trust (one sub both partners, one-tap cancel, history never held hostage) are free positioning no incumbent claims. Watch list update: drop Relish; add Flamme, CoupleWork, Resolve/LoveFix.

## Org hygiene (the "review all agents" part)
Every department charter was stale in load-bearing ways — wrong colors (#c97454 vs actual #D4522A), wrong fonts (Alexandria/Inter vs actual all-Nunito), wrong stack (SDK 52/RN 0.76/Node 20/FCM), pre-reset feature lists (streaks/games as live), a roadmap superseded by PRODUCT-DIRECTION.md, "AES-256-CBC" fiction, three generations of test counts, and a stale tasks/todo.md that contradicts the founder directive. Fixed via `.claude/agents/heads/CURRENT-STATE.md` (single authoritative context, dated) + pointers; tasks/todo.md to be rewritten to the critical path.
