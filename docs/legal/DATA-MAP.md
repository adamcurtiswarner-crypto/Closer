# Stoke Data Map

*Studio draft 2026-07-22, built from the live schema (`specs/types.ts`, Firestore
rules, storage rules) — not from intentions. This is the source document the
Privacy Policy describes. Update it whenever a collection or field is added.*

**Data states** (every field carries exactly one):
- **Private** — only that user ever sees it
- **Shared** — the partner sees it, by the product's mutual-consent ritual
- **System** — the app uses it; never displayed raw to the partner

## The map

| Data | Why collected | State | Where it lives | Vendor exposure | Retention |
|---|---|---|---|---|---|
| Email | Account, sign-in, couple linking | System | Firebase Auth + `/users` | Google (Firebase) | Until account deletion |
| Display name | Personalization ({partner}/{me} tokens render client-side) | Shared | `/users` | Google | Until deletion |
| Partner pet-name override | How you refer to your partner | Private to author | `/users.partner_name` | Google | Until deletion |
| Profile photo, partner photo | Avatars | Shared within couple | Firebase Storage (couple-scoped rules) | Google | Until deletion |
| Anniversary date | Days-together display | Shared | `/couples` | Google | Until deletion |
| Love language | Side-by-side display, prompt selection | Shared (by design; both partners see) | `/users` | Google | Until deletion |
| Timezone + locale | User-local "today", 8AM delivery | System | `/users` | Google | Until deletion |
| Push tokens | The two notification events | System | `/users.push_tokens` | Expo Push Service, Apple APNs | Pruned on invalidation; deleted with account |
| Tone calibration + relationship length | Prompt selection | System | `/users`, `/couples` | Google | Until deletion |
| Daily answer: 1–10 score | The core ritual; follow-up triggers; Us view | Shared after both answer (sealed until then) | `/prompt_responses`, embedded in `/prompt_completions` | Google | Until deletion (memories are the product — no silent expiry) |
| Daily answer: optional note (freeform) | The material of the reveal | Shared after both answer | same | Google | Until deletion; user can `anonymizeMyResponses` |
| Response photo (optional) | Part of an answer | Shared after both answer | Firebase Storage (couple-scoped) | Google | Until deletion |
| Emotional feedback on a reveal (warm/okay/hard) | Product tuning | **Private** — never shown to partner | `/prompt_responses.emotional_response` | Google | Until deletion |
| "We talked" marks | Hearth tending ritual | Shared | `/prompt_completions.discussed` | Google | Until deletion |
| Reactions (Love/Spark/Smile/Moved) | Reveal acknowledgment | Shared | `/prompt_completions.reactions` | Google | Until deletion |
| Presence / typing | Live "partner is here" dot | Shared (boolean only) | `/presence` | Google | Ephemeral |
| Subscription entitlement | Premium for both partners | System | RevenueCat + `/subscriptions`, `/couples.premium_until` | RevenueCat, Apple | Per RevenueCat retention |
| Analytics events (snake_case, first-party) | Product metrics (WMEER, funnels) | System | `/events` → BigQuery | Google (own project) | Aggregated; raw events per BigQuery policy |
| Crash/error logs | Stability | System | Sentry | Sentry | Per Sentry retention |

## What we deliberately do NOT collect

Location · contacts · calendar (removed 2026-07-12) · therapy/diagnosis/trauma
history · children's data · voice notes · financial details (Apple IAP only —
we never see payment instruments) · session replay · advertising identifiers ·
any third-party tracking pixel. We do not sell data. There is no data sharing
with any AI vendor: Claude generates prompt *content* offline; **user answers
are never sent to AI services** (the one feature that would, AI coaching, is
disabled and its functions are deleted from production).

## Design position on freeform answers (documented, not hidden)

A sealed daily answer between consenting partners is not a private journal:
the structured 1–10 scale is the primary input, the note is optional and
short-form, both stay sealed until BOTH partners have answered, a crisis
lexicon suppresses follow-ups and surfaces support resources when needed, and
users can anonymize their response history or delete the account at any time.
We accept freeform answers because they are the product; we mitigate them
deliberately.

## User controls (all live in production)

`deleteAccount` (full deletion) · `exportUserData` (rate-limited 1/24h) ·
`anonymizeMyResponses` · `unlinkCouple` (no partner approval required; ex
loses access) · partner-response notification toggle · skip anything, no
penalty.
