# Stoke — App Store Listing (v1.0)

Paste-ready copy for App Store Connect. Voice: warm, quiet, direct. No exclamation
points, no emojis. Every claim below reflects what v1 actually does — no hidden
features (streaks, games, coaching, chat, etc.), no "research/Gottman/encrypted"
claims. Keep it that way; App Review rejects described features that aren't present.

---

## App Name (max 30 chars)
**Stoke: Couples Connection**  *(25)*

Alternatives if you prefer:
- `Stoke: For Couples` (18)
- `Stoke — Grow Closer` (19)
- `Stoke` (5, minimal)

*(ASC internal app name is currently "StokeApp"; this is the public store name in App Information → Localizable → Name.)*

## Subtitle (max 30 chars)
**One question a day, together**  *(28)*

## Promotional Text (max 170 chars, editable anytime without review)
Each day, one question — you both answer privately, then see each other. When it lands high or low, a gentle follow-up helps you go a little deeper.

## Keywords (max 100 chars, comma-separated)
`relationship,intimacy,marriage,partner,conversation,date night,communication,check in,spouse,quiz`

*(97 chars. Swapped low-intent mood words — love, romance, closeness — for the terms couples actually search: check in, spouse, quiz. Avoids repeating words already in the name/subtitle — stoke, couples, connection, question, day, together — since Apple indexes those separately.)*

---

## Description (max 4000 chars)

Stoke is a quieter way to tend your relationship. One question a day, answered privately by both of you, then revealed side by side. And when an answer lands high or low, Stoke does something about it.

Long-term love isn't kept alive by grand gestures. It's the small, honest moments — noticing what's working, naming what's hard, staying curious about each other. Stoke gives you one of those moments every day.

HOW IT WORKS
Each day, you and your partner get the same question — about communication, intimacy, money, home life, the future, and more. You each answer privately on a simple 1 to 10 scale, add a sentence if you want, and only see each other's answer once you've both replied. No performing, no keeping score — just an honest read on where you both are.

WHEN SOMETHING STANDS OUT, GO DEEPER
The follow-ups are the heart of Stoke:
- When you both rate something high, a short prompt helps you name exactly what is working, so you can do more of it.
- When something lands low, a gentle two-step walkthrough helps you understand each side and pick one small next step. Always skippable, never a lecture.
- When your answers land far apart, a perspective-taking prompt invites each of you to imagine what the other might be seeing. Different numbers usually mean different vantage points, not different commitment.

EXPLORE, WHEN YOU HAVE A QUESTION OF YOUR OWN
Some days you don't want to wait to be asked — there's something you've been meaning to bring up. Explore holds questions across twelve parts of a relationship: communication, intimacy, affection, money, family, friends, fun, the future, everyday life, conflict and repair, appreciation and trust, and growing as your own people. Find the one you've been circling, send it to your partner, and answer it together.

THE HEARTH
Daily questions come and go; some of the answers shouldn't. The Hearth holds onto the conversations you owe each other, kept warm until you've actually had them — the moments worth sitting down for, waiting quietly, never nagging. When the two of you have talked one through, you set it down together.

PRIVATE BY DESIGN
Stoke is just for the two of you. Your answers stay private between partners.

NOT THERAPY
Stoke is for tending a healthy relationship, not treating a crisis. If something in your relationship ever feels unsafe, Stoke will quietly point you toward real support.

SUBSCRIPTION
The daily question is free, forever — for both of you. Stoke Premium adds the parts that act on your answers: the follow-ups, your Hearth history, and sending Explore questions.
- 14-day free trial, then $49.99 per year or $9.99 per month
- One subscription covers both partners
- Payment is charged to your Apple ID at confirmation of purchase
- Your subscription renews automatically unless turned off at least 24 hours before the end of the current period, and your account is charged for renewal within 24 hours of the end of the current period
- Manage or cancel anytime in your Apple ID Account Settings

Terms of Use (EULA): https://stoke.llc/terms
Privacy Policy: https://stoke.llc/privacy

---

## What's New (version 1.0 release notes, max 4000 chars)

Welcome to Stoke. One question a day, answered together — with gentle follow-ups when something is going well or could use some care. This is our first release, and we would love to hear what you think.

---

## Categories
- Primary: **Lifestyle**
- Secondary: **Health & Fitness**

## Age Rating (App Store Connect questionnaire)
Expect **17+** (or 12+ with "Infrequent/Mild Mature/Suggestive Themes"): the app discusses intimacy and lets partners exchange free-text notes. Answer honestly:
- Sexual Content or Nudity → Infrequent/Mild (intimacy is a topic, no explicit content)
- Medical/Treatment Information → None (position it as wellness, not medical)
- Unrestricted Web Access → No
- User-generated content is private 1:1 between two linked partners (not public/social), so guideline 1.2 UGC moderation requirements are light — but the crisis safety off-ramp and the ability to skip/leave are worth mentioning in review notes.

## App Privacy (nutrition labels — answer in ASC)
The exact questionnaire answers, category by category with justifications, live in
**docs/store/nutrition-labels.md**. Headline: Contact Info, User Content (including
a Sensitive Info declaration for relationship wellbeing answers), Identifiers,
Purchases, Usage Data, and Diagnostics — all linked to identity, none used for
tracking, no third-party advertising.

## URLs (must be live before submission — Apple loads the privacy URL)
- Support URL: https://stoke.llc/support
- Marketing URL: https://stoke.llc
- Privacy Policy URL: https://stoke.llc/privacy
- Terms of Use: use Apple's standard EULA, or host https://stoke.llc/terms

⚠️ stoke.llc URLs are not verified live yet — stand up at minimum a working Privacy Policy page before submitting, or Apple will reject in metadata review.

---

## App Review Notes (critical — the full loop is testable on ONE device)

Stoke pairs two partners into a couple; the daily question stays sealed until both have answered. For review we maintain a pre-paired demo couple, staged so the entire experience works on a single device (run `functions/src/scripts/seedReviewerCouple.ts --apply` each morning of the review window to keep it staged):

- Sign in as Partner B: stoke.uitest.b@example.com / StokeUITest2026!
- Partner A (already answered today — no need to sign in): stoke.uitest.a@example.com / StokeUITest2026!

One-device path, signed in as Partner B:
1. The Today tab shows today's question. Partner A has already answered — their response is sealed until you reply.
2. Answer on the 1 to 10 scale and add a short note. The reveal opens immediately: both answers side by side.
3. Score a 9 or 10 and a same-day follow-up question (a "deepener") appears after the reveal — this follow-up engine is the heart of the app.
4. The Hearth and Explore tabs have seeded history to browse, and from Explore you can send Partner A a new question.

Notes for the reviewer:
- The demo couple has already been granted a premium entitlement, so every premium surface is open without a purchase. The paywall itself is reachable from Profile → the plan row; subscriptions are handled via RevenueCat + StoreKit, and a sandbox Apple ID can test the 14-day free trial and purchase.
- Stoke is a relationship wellness app, not medical or therapeutic. A safety off-ramp detects crisis language in a written note and quietly surfaces support resources instead of continuing.
- User-generated content is private 1:1 between two linked partners (never public or social). Notifications are requested only after the first answer is submitted (with a pre-prompt), not at launch.
- Account deletion and data export are available in Settings.

## Screenshot Guidance (v1 — capture from the latest build)

The full 7-shot sequence — captions, staging state, demo data, and device sizes —
lives in **docs/store/screenshot-shot-list.md**. Summary: question → sealed →
reveal → follow-up → Hearth → Explore categories → paywall, with shots 1–3
telling one continuing story on the same question. 6.7" and 6.5" sets required.

---

## Pre-submission checklist (blocks the actual Submit, not the copy)
- [ ] Privacy Policy URL live and loading
- [ ] W-9 tax form complete (Paid Apps Agreement active) — required for a paid/subscription app
- [ ] Both subscription products have review screenshots (clears "Missing Metadata")
- [ ] Attach both subscriptions to the version on the App Store version page (first submission requires this)
- [ ] App Privacy nutrition labels answered (per docs/store/nutrition-labels.md)
- [ ] Age rating questionnaire answered
- [ ] Screenshots uploaded (6.7" + 6.5", per docs/store/screenshot-shot-list.md)
- [ ] `ITSAppUsesNonExemptEncryption` correct in app config
- [ ] Latest build selected as the version's build
- [ ] Guideline 3.1.2 self-audit passed (docs/store/3.1.2-checklist.md)
- [ ] Reviewer demo couple staged: `cd functions && npx ts-node src/scripts/seedReviewerCouple.ts --apply`
