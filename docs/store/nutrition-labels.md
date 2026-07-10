# App Privacy "Nutrition Labels" — exact ASC questionnaire answers (v1)

*Per the 2026-07-09 worthiness review (Ops audit). Answer the App Store Connect
App Privacy questionnaire exactly as below. Every category is **collected**,
**linked to the user's identity** (everything is keyed to the Firebase uid),
and **NOT used for tracking** (no cross-app tracking, no ad networks, no data
brokers — no ATT prompt required). Purposes are App Functionality and
Analytics only; nothing is used for Third-Party Advertising or Developer's
Advertising.*

| ASC category | Data type(s) to declare | Linked to you | Tracking | Justification (actual SDK / flow) |
|---|---|---|---|---|
| **Contact Info** | Email Address; Name | Yes | No | Firebase Auth account (email/password, Sign in with Apple, Google Sign-In); display name stored on `/users/{uid}` and used in partner-facing copy and pushes |
| **User Content** | Photos or Videos; Other User Content | Yes | No | Photos: optional response images and partner photos uploaded to Firebase Storage. Other: daily prompt answers and notes, Explore questions sent to a partner, reactions — stored in Firestore (`prompt_responses`, `prompt_completions`, etc.) |
| **Sensitive Info** | Sensitive Info (declare it) | Yes | No | The product's core data is relationship wellbeing: 1–10 scores and free-text notes about intimacy, conflict, money, and family. This is sensitive personal information and must be declared — omitting it is a rejection and a trust risk |
| **Identifiers** | User ID; Device ID | Yes | No | User ID: Firebase uid (also the RevenueCat app user id). Device ID: Expo push token / device identifier stored for push delivery via Expo Push Service |
| **Purchases** | Purchase History | Yes | No | RevenueCat manages the subscription; purchase/renewal state lands in `/subscriptions/{uid}` via the RevenueCat webhook and gates premium |
| **Usage Data** | Product Interaction | Yes | No | First-party analytics events (snake_case) written to the `/events` collection and exported to BigQuery — screens viewed, prompts answered, funnel steps |
| **Diagnostics** | Crash Data; Performance Data | Yes | No | Sentry (React Native SDK) with PII scrubbing configured — crash reports and performance traces; events are still linked via user/device context |

## Categories we do NOT collect (answer "not collected")

- Health & Fitness (we are wellness-positioned, but collect no HealthKit/medical
  data — relationship answers are declared under Sensitive Info instead)
- Financial Info (Apple processes payment; we never see payment details)
- Location (precise or coarse — not collected)
- Contacts, Messages (SMS/email content), Browsing History, Search History
- Audio Data, Gameplay Content
- Advertising Data

## The three global toggles, per collected category

1. **Used for tracking?** → **No**, for every category. We have no ad SDKs, no
   fingerprinting, and share nothing with data brokers. (Sentry, Firebase,
   RevenueCat, and Expo all act as service providers processing on our behalf.)
2. **Linked to the user's identity?** → **Yes**, for every category. Everything
   above is keyed to the Firebase uid — claiming "not linked" would be false.
3. **Purposes** → App Functionality for all; add Analytics for Usage Data and
   Diagnostics. Never select Third-Party Advertising or Developer's Advertising.

## Consistency checks before submitting

- The privacy policy at the Privacy Policy URL must mention every processor
  named above — **including Expo** (push payloads carry names and prompt text)
  and Sentry — and must accurately describe deletion (see the Ops audit item on
  the deletion claim).
- `deleteAccount` / `exportUserData` callables are the deletion/export story;
  the labels' "linked to you" answers are consistent with account-level deletion.
- If any new SDK ships before submission, re-audit this table.
