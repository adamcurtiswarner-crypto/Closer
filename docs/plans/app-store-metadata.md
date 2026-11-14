# App Store Metadata — Stoke

*Rewritten 2026-11-14 against the shipped app (build 75 + OTA `13263588`). Every
claim below was checked against code or production data; the "Verified" section
at the bottom records how. Paste-ready for App Store Connect except where a line
is marked BLOCKED.*

The previous draft (2026-11-07) described the app as it was before the Nov 11
restructure: 12 explore categories, a separate Hearth tab, a radar chart. All
three were replaced. It also pointed Apple at `stoke.llc/privacy.html`, which
**404s** — the extensionless `/privacy` is the live URL. That alone would have
failed review.

---

## App Name

Stoke: Couples Connection

## Subtitle (30 chars max)

Tend your relationship daily

## Description (4000 chars max)

One question a day. Both of you answer. Then you see what the other said.

Stoke is a daily ritual for couples who want to stay close — not through grand gestures, but through small, honest moments. Every day, you and your partner answer the same question, rate it from 1 to 10, and add a note. Your answers stay sealed until you both respond. Then they open together.

What happens next is the part that matters.

Stoke reads the two scores, not just the words. Score it high together and a deeper question follows. If either of you scores it low, a gentler repair question arrives the next day. If your scores land far apart, you get a question built around that gap — because the distance between two answers is usually the conversation worth having.

Over time, those answers build a picture of your relationship across 12 dimensions — communication, intimacy, affection, money, family, friends, fun, dreams, everyday life, conflict, appreciation, and growth. The Us view shows where you are close, where you differ, and which way things are moving. It is a mirror, not a report card.

There are no streaks. Nothing turns red if you miss a day. Skipping a question is a normal thing to do, and the app says so. Stoke is warm, quiet and direct, and it will never nag you about your own relationship.

What you get free, forever:
- A new question every day, sealed until you both answer
- Your first follow-up conversation
- Three questions a month to send your partner from the Explore library
- Reactions on every answer — Love, Spark, Smile, Moved

What Premium adds:
- Unlimited follow-up conversations — the deepener, the repair, the divergence question
- Your full history and score trends
- The Us view: your alignment map across all 12 dimensions, and how it moves
- Unlimited Explore questions to send
- One subscription covers both of you. Your partner unlocks automatically.

More than 400 questions, written for couples who are already past the beginning.

Explore is organized into six collections: Get to Know You, Love and Appreciation, Talk It Through, Dream Together, Life Together, and Fun and Play. Send one whenever you want to ask something the daily question would not have reached.

Stoke is not therapy. It is not a quiz. It is not a game. It is the daily practice of paying attention to the person you chose.

Private by design: your answers are shared with your partner and no one else. We never send what you write to an AI service, we do not sell your data, and there are no ads or trackers in the app.

Just the two of you, tending what matters.

## Promotional Text (170 chars max, updatable without a build)

A question a day for the two of you. Score it, write a note, see what the other said. Where you are close. Where you differ. Which way it is moving.

## Keywords (100 chars max, comma-separated)

relationship,marriage,married,husband,wife,conversation starters,daily questions,intimacy,partner

Dropped from the previous list: `couples` and `connection` (both already in the
app name — Apple indexes the name, so repeating them wastes slots) and
`date night` (that feature is flagged off; keywording a feature the app does
not ship invites a 2.3.1 mismatch).

## What's New

**Not used for the 1.0 submission** — App Store Connect does not show release
notes on a first release. Hold this for the first update:

> Follow-up questions now show the question and both answers that produced them, so you can see what you actually said before you answer the next one. Revisit in Explore opens properly. Plus quieter fixes to notifications and history.

## Category

Primary: Lifestyle
Secondary: Health & Fitness

## Age Rating

17+ — relationship and intimate themes, freeform text between partners.

No unrestricted web access · no gambling or simulated gambling · no horror
themes · no profanity or crude humor · no alcohol, drug or tobacco references ·
no contests · no medical or treatment information.

Note for the questionnaire: Stoke accepts freeform text between two linked
adults and detects crisis language to surface support resources. That is a
safety feature, not medical content.

## Privacy Policy URL

https://stoke.llc/privacy

**Verified 200 on 2026-11-14.** Do NOT use `/privacy.html` — it returns 404.
Fallback if the apex ever stops resolving: https://stoke-5f762.web.app/privacy

**BLOCKED:** the page currently served is dated July 9, 2026. The rewrite is
committed (`hosting/privacy.html`) and not deployed, pending a legal read and a
working contact address — `stoke.llc` has no MX records, so the
`privacy@stoke.llc` printed on the page receives nothing.

## Support URL

https://stoke.llc/support

**Verified 200.** Same MX problem: the page's contact address does not receive
mail. Apple expects a support contact that works.

## Marketing URL

https://stoke.llc

## Copyright

2026 Omnific Collective, LLC

## Subscriptions to attach to the version

| Product | Price | Notes |
|---|---|---|
| `stoke_premium_annual` | $49.99/year | **BLOCKED:** the paywall says a 21-day free trial; the last recorded ASC configuration is 14 days. Make them match before submitting — a trial length in the app that differs from the StoreKit product is a 3.1.2 rejection. |
| `stoke_premium_monthly` | $9.99/month | Confirm whether the trial applies here too, or only to annual. |

Display name in ASC should carry the couple framing — "Stoke Premium (Couple)" —
because one subscription covering both partners is the thing competitors do not
do, and the review notes should say so plainly.

The $149.99 lifetime product listed in the launch checklist does not exist in
the code or in any ASC record I can see. Recommend cutting it from v1.

---

## Screenshot shot list (rewritten — the old list described screens that no longer exist)

6.7" is required. A 6.1" set is optional but recommended.

**Capture against build 75 + OTA `13263588` or later.** Every surface in the
previous shot list was redesigned between Nov 6 and Nov 14.

| # | Screen | What it must show | Caption |
|---|---|---|---|
| 1 | Today — daily question | The ink hero card, score dots, note field, partner's name rendered | One question a day. Both of you answer. |
| 2 | Today — sealed | Sealed state while you wait, with the Try This card below | Your answer waits until theirs arrives. |
| 3 | Today — reveal | Both answers side by side with both scores | See what the other said. |
| 4 | Follow-up — divergence | The follow-up card with the source block OPEN, showing the originating question and both answers | When your scores disagree, that is the conversation. |
| 5 | Us — the lead card | The ink card for the widest gap, with both scores on the shared rail | Where you are close. Where you differ. |
| 6 | Us — the map | The shared-scale rows, widest gap first, legend visible | Every dimension on one scale. |
| 7 | Explore — collections | The six collections | Six collections. More than 400 questions. |
| 8 | Explore — reveal | A question you sent, both answers open | Ask what the daily question would not have reached. |
| 9 | Reactions | The reaction row on a revealed answer | Love. Spark. Smile. Moved. |
| 10 | Pairing | The invite-partner screen | It only works with the two of you. |
| 11 | Paywall | The premium card, couple-scoped line visible | One subscription covers you both. |
| 12 | Onboarding | The welcome hero | Tend your relationship daily. |

Frames 5 and 6 replace the old "Hearth grid" and "Hearth reveal": Hearth was
merged into Us on Nov 11 and is no longer a tab. They also replace the
12-tile grid, which was itself retired on Nov 14 — the Us view now leads with
the widest gap as an ink card and shows every dimension on one shared scale
beneath it. The old frames 7 and 8 showed a radar chart, unmounted since the
November restructure and now deleted. The old frame 9 said "12 category
cards"; Explore has six collections.

**Nothing in this shot list has been captured yet**, and three of the twelve
surfaces changed on Nov 14 alone. Shoot them against the live OTA, not from
memory of an earlier build.

Frame 4 is the one to shoot carefully — the source block is the clearest
single image of what makes Stoke different from an app that just compares
answers, and it shipped on 2026-11-14.

---

## BLOCKED — do not submit until these are settled

1. **Trial length.** App copy says 21 days; last recorded ASC config says 14.
2. **Support and privacy contact.** `stoke.llc` has no MX records; both published
   addresses bounce.
3. **The hosted privacy policy** is still the July version.
4. **Free-vs-premium for the merged Us/Hearth.** `premiumGates.ts` intends the
   current month of history to be free ("never advertised in the header and then
   locked"), but with Hearth no longer a tab, a free couple can only reach it
   through the Us grid — which is locked for them — or a queue pill that renders
   only when the queue is non-empty. **This listing therefore does NOT claim
   current-month history as a free benefit**, because that claim is currently
   false. Either open the free path or leave the claim out; the gate copy
   (`gates.hearthBody`, "This month glows right here") has the same problem.

## Claims deliberately left out

- **"No other app does this."** Unverifiable comparative claim against Paired,
  Agapé and Flamme. A 2.3.1 risk and not worth defending.
- **The progressive trial** (days 8-21 throttling). `src/utils/trialPhase.ts`
  exists and `computeTrialState` is called from nowhere outside its own test.
  It is not in the product, so it is not in the listing.
- **Insights.** `FEATURES.insights` is false; the paywall string that mentions
  "insights" should be corrected separately.
- **Encryption.** There is no field-level or end-to-end encryption. "Private by
  design" is the honest line and the one used above.
- **Streaks.** Flagged off and doctrine-violating. Not claimed anywhere.

## Verified for this rewrite (2026-11-14)

| Claim | How it was checked |
|---|---|
| 400+ questions | Production Firestore: 405 docs with `response_format == 'scale'`, matching the seed exactly |
| Six Explore collections | `src/config/exploreCollections.ts` labels; all six populated in production (65/75/25/25/130/25 = 345) |
| Free tier | `premiumGates.ts`: `FREE_FOLLOW_UP_TASTE = 1`, `FREE_EXPLORE_SENDS_PER_MONTH = 3`, daily loop and reactions always free, answering a received question never gated |
| Premium tier | `premiumGates.ts`: unlimited follow-ups and sends, history and trends, Us alignment map |
| One subscription covers both | Entitlement is couple-scoped end-to-end (webhook → `couples.premium_until` + `/subscriptions`) |
| 12 dimensions | The scoring taxonomy, unchanged by the Explore restructure |
| No AI sees your answers | Only `generateAIPrompts` and `autoGeneratePrompts` are deployed, and both send library prompt text; `generateCoachingInsight` and `computeRelationshipPulse` are not deployed |
| No ads or trackers | No advertising or analytics SDKs in the dependency tree; events are first-party |
| Privacy/support URLs | `curl`: `/privacy` 200, `/privacy.html` **404**, `/support` 200, `/terms` 200 |
