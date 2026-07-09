# Stoke — Product Direction

*Written 2026-07-09, after founder review of the "relationship translation loop" concept doc.
Owner: Adam Warner. Revisit trigger: v1 App Store launch + first 30 days of retention data.*

---

## 1. Where we stand (v1, submission-ready)

The shipped spine is a **shared daily ritual with a nervous system**:

- **One scored question a day** for the couple. Answers seal until both respond.
- **Scores trigger action** — this is the part Paired doesn't have:
  - both high (≥9) → same-day *deepener*
  - either low (≤4) → next-day *repair* (with step-2 chaining)
  - far apart (gap ≥4) → next-day *divergence* conversation
- **Explore** — either partner sends the other a question from any of 12 categories.
  One-sided initiation, human push ("Adam sent you a question: …"), no waiting states.
- **Hearth** — every answered prompt becomes an ember, color-coded by signal
  (talk-about-it / compare-notes / tended / steady). Couch queue with read-aloud
  starters. Mutual "we talked" ritual. Score trends per category.
- **Reactions** — Love / Spark / Smile / Moved. Light, no homework.
- **Anti-guilt doctrine, already enforced in code**: no streaks, no scores-as-judgment,
  quiet hours 8am–9pm, skipped follow-ups "keep" without nagging, explore questions
  never nag, partner sees "set this one aside — it'll keep" instead of dead air.
- Payments (14-day trial → $49.99/yr / $9.99/mo), safety off-ramp, name
  personalization ({partner}/{me} tokens), 12 categories, 422 prompts + 132 follow-up
  templates.

**Positioning today**: Paired compares answers. Stoke *acts* on them.

---

## 2. The concept doc, reviewed

The doc proposes re-centering the product on a "relationship translation loop":
*notice → translate → act → sense response → learn* — a bid-builder where one partner
uses Stoke privately to make better moves toward the other, with a
moment-type screen, a partner-preference ("landing styles") model, a suggestion
engine, and light feedback loops.

### What it gets right

1. **Waiting is the enemy.** Every hard bug and every founder complaint this week was
   a waiting state (desync, dead-end hourglass, "hasn't answered yet"). The line
   *"replace 'your partner hasn't answered' with 'want to make a small move toward
   them?'"* is the single best sentence in the doc.
2. **One partner must be able to use Stoke meaningfully alone.** Requiring
   synchronized participation is structurally fragile.
3. **"Being remembered" as a love language** is a genuinely original, ownable idea —
   and it is *the* Stoke idea. Hearth is already its seed.
4. **Light reactions as feedback** ("Love Receipt") — already built as our reaction row.
5. **No guilt, no streaks, no resentment loops** — already our doctrine.

### What it gets wrong

1. **It is a v2 wearing an MVP costume.** ~20 screens, a taxonomy, a preference model,
   a rules engine, a learning loop, new onboarding. Adopting it now means months of
   delay days before submission, trading a tested product for unvalidated surface.
2. **A rules-table "translation engine" can't clear its own quality bar.**
   "Take one thing off their plate" feels intelligent once; by week two it's a
   fortune-cookie generator. Partner-specific suggestions require *data about this
   couple* — which only the current Q&A loop generates. **The ritual is the data
   engine that makes the translation engine possible.** Skip the corpus and the bid
   builder has nothing partner-specific to say.
3. **App-scripted gestures carry an authenticity risk.** "Stoke told you to say
   that?" collapses "you know me" into its opposite. Bids must be scaffolding for
   the user's own words, never a script (see Design Constraints).
4. **Retention economics favor the shared ritual.** A daily two-person habit is a
   couple's subscription with a built-in pairing loop. A solo "reach for your
   partner" utility is opened sporadically. Great *feature*, risky *spine*.

### Verdict

**Do not pivot. Absorb.** The daily ritual + follow-up engine + Hearth remain the
spine. The doc becomes the v1.5 north star: grow the relationship-intelligence layer
*out of* the data the ritual generates, and convert every passive moment into agency.

---

## 3. Roadmap

### v1 — NOW: ship it
Submit to the App Store as built. No scope additions. Validate: pairing rate,
couple-complete rate, follow-up completion, Hearth engagement, trial→paid.

### v1.5 — the bridge (post-launch, in order)

1. **Waiting states → agency** *(cheapest, highest leverage)*
   While your answer is sealed and you're waiting, the card offers **one small move**
   toward your partner, seeded from their love language (already collected at
   onboarding) + today's category. Not a library, not a mode — one quiet suggestion
   where dead air used to be. This absorbs the doc's core emotional insight without
   touching the spine.

2. **Reactions become learning signals**
   Log which reaction lands on which prompt category / follow-up branch / move type.
   No new UI. This is "Stoke learns what worked," quietly. Consider adding
   "Needed that" as a fifth reaction when data justifies it.

3. **"Being remembered" grows out of Hearth**
   Callbacks generated from the couple's own history:
   *"Three weeks ago mornings scored a 3. Ask how it's going."*
   *"Masha said calm Sundays mattered. This Saturday, suggest one."*
   Proprietary by construction — no competitor has the data.

4. **Revive `sendSpark` as the first true bid feature**
   The code exists (hidden Four Engines feature). Reframe: a Spark = a small
   partner-aware move (text it / do it / plan it), drawn from the moment
   ("hard day," "missing them," "flirt") × partner's landing style × Hearth history.
   Ship only after 1–3 prove the appetite.

### v2 — only if v1.5 signals demand it
Moment-type screen, landing-styles model (the doc's seven, including Being
Remembered), secret sync / mirror sync variants, tiny missions (hidden
`missions`/date-nights code is a head start). By then the suggestion engine is fed by
a real corpus + reaction signals + Claude, not a rules table.

---

## 4. Design constraints (bind all future bid/suggestion work)

1. **Scaffold, never script.** Suggestions are starting points the user edits into
   their own voice. Send-verbatim should feel slightly discouraged (e.g., editable
   field pre-focused, no one-tap-send of unedited copy).
2. **The receiving partner gets a human moment, not an assignment.** Push copy names
   the sender and the gesture, never the app's machinery.
3. **Nothing one partner does privately is ever visible as a grade on the other.**
   No "your partner is trying harder than you" surfaces, ever.
4. **No guilt mechanics.** No streaks, no completion scores, no "your partner missed
   this." Timing failures are reframed ("it'll keep," "fresh start?").
5. **Frameworks stay under the hood.** Gottman, love languages, Perel inform the
   engine; the UI never lectures.
6. **Learning requires consent-shaped moments.** "Should Stoke remember this tends
   to land?" — explicit, small, skippable.

---

## 5. Explicitly not building (unchanged from doc §16 + our own list)

Full AI coach · giant prompt library UI · relationship scores · streaks · therapy
mode · calendar/location integration · anything that makes inactivity visible as
blame · framework lectures in UI.

---

## 6. Positioning

> **Paired compares answers. Stoke acts on them.**
> A question a day with a nervous system: low scores become repairs, gaps become
> conversations, answers become a fire you tend together — and next, the app that
> remembers what lands starts helping you reach for your person on the days the
> question isn't enough.

The doc's sharpest positioning line, kept for v1.5 marketing:
*"Stoke helps you know what to do when you want to reach for your person — without
sending another generic 'how was your day?'"*
