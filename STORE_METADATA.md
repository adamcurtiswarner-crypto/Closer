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

## Keywords (max 100 chars, comma-separated, no spaces)
`relationship,intimacy,marriage,partner,conversation,love,date night,communication,closeness,romance`

*(Avoids repeating words already in the name/subtitle — stoke, couples, connection, question, day, together — since Apple indexes those separately.)*

---

## Description (max 4000 chars)

Stoke is a quieter way to tend your relationship. One question a day, answered by both of you.

Long-term love isn't kept alive by grand gestures. It's the small, honest moments — noticing what's working, naming what's hard, staying curious about each other. Stoke gives you one of those moments every day.

HOW IT WORKS
Each day, you and your partner get the same question — about communication, intimacy, money, home life, the future, and more. You each answer privately on a simple 1 to 10 scale, add a sentence if you want, and only see each other's answer once you've both replied. No performing, no keeping score — just an honest read on where you both are.

WHEN SOMETHING STANDS OUT, GO DEEPER
The follow-ups are the heart of Stoke:
- When you both rate something high, a short prompt helps you name exactly what is working, so you can do more of it.
- When something lands low, a gentle two-step walkthrough helps you understand each side and pick one small next step. Always skippable, never a lecture.
- When your answers land far apart, a perspective-taking prompt invites each of you to imagine what the other might be seeing. Different numbers usually mean different vantage points, not different commitment.

TWELVE PARTS OF A RELATIONSHIP
Communication, intimacy, affection, money, family, friends, fun, the future, everyday life, conflict and repair, appreciation and trust, and growing as your own people. Stoke moves through all of them, and you can steer toward what matters most to you.

PRIVATE BY DESIGN
Stoke is just for the two of you. Your answers stay private between partners.

NOT THERAPY
Stoke is for tending a healthy relationship, not treating a crisis. If something in your relationship ever feels unsafe, Stoke will quietly point you toward real support.

SUBSCRIPTION
Stoke Premium unlocks the full daily experience.
- 14-day free trial, then $49.99 per year or $9.99 per month
- One subscription covers both partners
- Payment is charged to your Apple ID at confirmation of purchase
- Your subscription renews automatically unless turned off at least 24 hours before the end of the current period, and your account is charged for renewal within 24 hours of the end of the current period
- Manage or cancel anytime in your Apple ID Account Settings

Terms of Use (EULA): https://getstoke.io/terms
Privacy Policy: https://getstoke.io/privacy

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
Collected and linked to identity: email (account), user content (responses/notes), usage/analytics, diagnostics (Sentry). Not used for third-party advertising. Data is used for app functionality and analytics. (Confirm against your actual Firebase/Sentry/RevenueCat data flows before submitting.)

## URLs (must be live before submission — Apple loads the privacy URL)
- Support URL: https://getstoke.io/support
- Marketing URL: https://getstoke.io
- Privacy Policy URL: https://getstoke.io/privacy
- Terms of Use: use Apple's standard EULA, or host https://getstoke.io/terms

⚠️ getstoke.io URLs are not verified live yet — stand up at minimum a working Privacy Policy page before submitting, or Apple will reject in metadata review.

---

## App Review Notes (critical — the reviewer must be able to test a paired couple)

Stoke requires two partners linked into a couple; the daily question and the reveal only work once both have answered. To make review easy, we have a pre-paired demo couple with history already seeded:

- Partner A: stoke.uitest.a@example.com / StokeUITest2026!
- Partner B: stoke.uitest.b@example.com / StokeUITest2026!

These two accounts are already linked. Sign in as Partner A on one device and Partner B on another (or two simulators) to see the full loop: answer today's question on each, then watch both answers reveal side by side, and see a follow-up appear.

Notes for the reviewer:
- Subscriptions are handled via RevenueCat + StoreKit; use a sandbox Apple ID to test the 14-day free trial and purchase. The full daily experience is behind Stoke Premium (trial available).
- Stoke is a relationship wellness app, not medical or therapeutic. A safety off-ramp detects crisis language in a written note and quietly surfaces support resources instead of continuing.
- Notifications are requested only after the first answer is submitted (with a pre-prompt), not at launch.
- Account deletion and data export are available in Settings.

## Screenshot Guidance (v1 — capture from build 57)
Recommended set (6.7" and 6.5" required; 5.5" optional):
1. Welcome screen — the flame illustration and "Tend to the moments, keep the Flame."
2. Today — the daily question on the ink card with the 1–10 scale
3. The reveal — both partners' scores side by side ("You 9 / Blake 10")
4. A follow-up — the appreciation deepener or the gentle repair step
5. Categories — the twelve areas to explore
6. Paywall — "Try 14 days free" with the both-partners line

Optional captions (short, on-brand, no exclamation points):
1. "One question a day, together"
2. "Answer privately, then see each other"
3. "An honest read on where you both are"
4. "Go deeper when it matters"
5. "Twelve parts of your relationship"
6. "One subscription. Both of you."

---

## Pre-submission checklist (blocks the actual Submit, not the copy)
- [ ] Privacy Policy URL live and loading
- [ ] W-9 tax form complete (Paid Apps Agreement active) — required for a paid/subscription app
- [ ] Both subscription products have review screenshots (clears "Missing Metadata")
- [ ] Attach both subscriptions to the version on the App Store version page (first submission requires this)
- [ ] App Privacy nutrition labels answered
- [ ] Age rating questionnaire answered
- [ ] Screenshots uploaded (6.7" + 6.5")
- [ ] `ITSAppUsesNonExemptEncryption` correct in app config
- [ ] Build 57 selected as the version's build
