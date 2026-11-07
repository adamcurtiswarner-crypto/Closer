# Stoke Production Launch Checklist

*CEO directive: 2026-11-06. Every item must be GREEN before App Store submission.*
*Owner: Adam Warner unless marked (Studio).*

---

## PHASE 1: Hard blockers (submission will be rejected without these)

### 1.1 Domain and hosting (Adam)
- [ ] **Decision: stoke.llc or web.app fallback.** stoke.llc/privacy and stoke.llc/terms return 404. Either repoint the domain to Firebase Hosting (registrar creds, up to 48hr propagation + cert) or switch STORE_METADATA.md URLs to `stoke-5f762.web.app/privacy` and `stoke-5f762.web.app/terms`. The web.app path removes every external dependency.
- [ ] **Deploy privacy.html and terms.html to Firebase Hosting.** The in-app screens are updated (Nov 2026) but Apple fetches the *URL* during review.
- [ ] **Verify support URL resolves.** `stoke.llc/support` is also referenced.
- [ ] **Verify support email receives mail.** `support@getstoke.io` — confirm MX records work by sending a test email.

### 1.2 App Store Connect (Adam)
- [ ] **W-9 and banking.** 24-48hr processing. Subscriptions cannot go live without active agreements.
- [ ] **IAP products created and approved.** Annual ($49.99) and monthly ($9.99) in App Store Connect. RevenueCat products linked.
- [ ] **Subscription display names.** Set in ASC for both products.
- [ ] **App Store screenshots.** 16 frames shot against the production binary (not TestFlight). Must include the new Us tab and waiting-card small moves.
- [ ] **App preview video** (optional but recommended for conversion).
- [ ] **ASC metadata reviewed.** Description, keywords, category, age rating, content rights.

### 1.3 Legal (Adam)
- [ ] **Entity confirmed.** Omnific Collective LLC (already in terms.html).
- [ ] **Governing law confirmed.** Georgia (already in terms.html).
- [ ] **Privacy policy accurate.** Rewritten Nov 2026 — verify it matches the shipped app.
- [ ] **EULA decision.** Use Apple's standard EULA or host custom terms.

---

## PHASE 2: Security review (Studio — must complete before submission)

### 2.1 Firestore rules
- [ ] **(Studio) Full rules audit.** 558 lines of firestore.rules. Verify every collection has auth checks. Test: unauthenticated read/write denied on all paths.
- [ ] **(Studio) Ex-partner access.** Verify a dissolved couple member cannot read the new partner's responses, completions, or clarify exchanges. The `wasCoupleMember()` rule should only allow reading the dissolved couple doc itself.
- [ ] **(Studio) Invite code enumeration.** Verify couple_invites cannot be listed or guessed by an attacker. Rules should deny list operations.
- [ ] **(Studio) Reaction forgery.** Verify a member cannot write a reaction under the partner's uid (fixed Aug 2026, verify the fix is live in deployed rules).
- [ ] **(Studio) Admin-only callables.** Verify `getDashboardMetrics`, `managePrompt`, `createExperiment`, `triggerBigQueryExport` all check `/admins/{uid}`.

### 2.2 Storage rules
- [ ] **(Studio) Image-only enforcement.** Verify `isValidImage()` blocks non-image uploads. Test: upload a .txt file — should be denied.
- [ ] **(Studio) Size limit.** 10MB cap enforced in rules.
- [ ] **(Studio) Cross-couple isolation.** Verify couple A cannot read couple B's photos/responses. Test with two test couples.
- [ ] **(Studio) Deny-all fallback.** Verify the catch-all `match /{allPaths=**}` denies everything not explicitly allowed.

### 2.3 Cloud Functions
- [ ] **(Studio) Auth check on every callable.** All 42 `context.auth` checks present and fail-closed (throw unauthenticated, not return null).
- [ ] **(Studio) Webhook secret validation.** `revenueCatWebhook` verifies `REVENUECAT_WEBHOOK_KEY` and fails closed when missing (already confirmed).
- [ ] **(Studio) Rate limiting.** Data export (1/24hr), AI generation (1hr cooldown), pulse computation (5min cooldown) — verify all enforced.
- [ ] **(Studio) Input validation.** 103 `HttpsError` throws — spot-check the 10 most critical callables for missing validation (deleteAccount, exportUserData, managePrompt).
- [ ] **(Studio) No secrets in client bundle.** Verify ANTHROPIC_API_KEY is only in functions environment, never in client .env. Verify no API keys leaked in the JS bundle.

### 2.4 Client-side
- [ ] **(Studio) Crisis lexicon coverage.** Now covers: main response (usePrompt), clarify ask (useClarify), clarify answer (useClarify), server follow-up check (followUps.ts). Verify no other free-text input paths exist.
- [ ] **(Studio) Push notification content.** Verify no intimate free-text content appears in lock-screen notifications without redaction. (P0 #7 — currently a founder decision to accept as-is.)
- [ ] **(Studio) Offline queue security.** Queued responses in AsyncStorage are not encrypted. Acceptable for v1 but document the risk.
- [ ] **(Studio) Token lifecycle.** Sign-out unregisters push token (shipped build 73). Verify no token sharing across accounts.

### 2.5 Sentry and monitoring
- [ ] **(Studio) Add `environment` to Sentry.init.** Currently missing — prod and preview errors are mixed. Add `environment: __DEV__ ? 'development' : 'production'`.
- [ ] **(Studio) Sentry alert rule.** Issue alert on `firestore_code:permission-denied`, >3 in 1hr, email + push. ~10 min in Adam's Sentry account.
- [ ] **(Studio) Cloud Monitoring alert.** Log-based metric on `checkErrorAlerts` console.error. The only alerting path with no dependency on Adam.

---

## PHASE 3: Production readiness (Studio + Adam)

### 3.1 Build
- [ ] **(Studio) Cut a new production build.** Build 73 is from Aug 23 — 75 days and 7 OTAs old. Cut build 74 from current main with all today's work. Use `EXPO_NO_CAPABILITY_SYNC=1`.
- [ ] **(Studio) Decide on runtimeVersion.** If any native code changed since build 73 (new pods, native modules, app.json native fields), bump from "2.0.0". If JS-only, keep "2.0.0".
- [ ] **(Adam) 45-minute two-device verification pass.** Both founders' phones, risk-ordered:
  1. Answer today's prompt → verify {partner} renders as real name
  2. Complete a scored prompt → verify follow-up fires (deepener if both ≥9)
  3. Free user: verify 1st follow-up is free, 2nd is locked
  4. Free user: verify 3 explore sends, 4th is locked
  5. Paywall: verify therapy anchor copy, 21-day trial CTA, both plans show prices
  6. Us tab: verify radar chart renders all 12 categories
  7. Small moves: verify waiting card shows personalized suggestion
  8. Open Days: skip 2 days, verify catch-up chips appear
  9. Your Words: verify journal shows prompt text
  10. Push notifications: verify daily delivery, partner-responded, follow-up ready
  11. RevenueCat: verify subscription flow (sandbox purchase)
  12. Sign out + sign in: verify push token lifecycle
  13. Privacy policy + terms: verify updated Nov 2026 content
  14. Safety: type crisis language in a response → verify SafetyResources modal appears
  15. Clarify: type crisis language in a clarify question → verify SafetyResources appears

### 3.2 RevenueCat configuration (Adam)
- [ ] **Trial duration.** Change from 14 days to 21 days in App Store Connect subscription offer.
- [ ] **Lifetime product.** Create $149.99 lifetime product in ASC + link in RevenueCat.
- [ ] **Verify sandbox purchases work.** Test annual, monthly, and lifetime in sandbox.
- [ ] **Verify couple-scoped entitlement.** Partner of subscriber sees premium without their own purchase.

### 3.3 Data hygiene (Studio — done today)
- [x] `/admins` doc created — error alerting live
- [x] BigQuery dataset created + 3,862 events backfilled
- [x] Test fixture couples paused in production
- [x] Masha duplicate push token removed
- [ ] **(Studio) `last_active_at` field.** Dead since Feb 2026 on both users. Either update it in a trigger or remove it from the schema — cannot ship claiming D7/D30 metrics if the field is stale.
- [ ] **(Studio) Clean up `seed-prompts-v7.json` and `seed-prompts-v6-generic-backup.json`.** Either remove from repo (they're backups) or gitignore them.

### 3.4 Events and alerting verification
- [ ] **(Studio) Verify next `exportEventsToBigQuery` run succeeds.** Check after 4 AM PT.
- [ ] **(Studio) Verify `checkErrorAlerts` delivers to the new admin doc.** Trigger a test error and confirm push arrives.
- [ ] **(Studio) Verify canary pipeline still healthy.** Already confirmed 2026-11-06.

---

## PHASE 4: Submission (Adam)

- [ ] **Screenshots captured** against the final binary (build 74+).
- [ ] **App Store listing finalized.** Description, keywords, "What's New" text.
- [ ] **Submit for review.** `eas submit --platform ios --id <build-id> --non-interactive`
- [ ] **Monitor review status.** Typical turnaround 24-48hrs. Watch for metadata rejection (URLs, screenshots, privacy) vs binary rejection (crashes, functionality).
- [ ] **Respond to review feedback** within 24hrs if rejected.

---

## PHASE 5: Post-launch (first 30 days)

### Metrics to track from day 1
- [ ] Install → trial start rate (target: ≥18%)
- [ ] Trial → paid conversion rate (target: ≥8%, strong: ≥30%)
- [ ] Couple pairing rate within 48hr (target: ≥70%)
- [ ] Couple-complete rate D7 (target: ≥50%)
- [ ] D7 retention (target: ≥40%)
- [ ] D30 retention (target: ≥20%)
- [ ] Annual vs monthly split (target: 70/30)
- [ ] Monthly churn (target: <8%)

### Feature monitoring
- [ ] Track `gate_hit` events by surface — which gate drives the most upgrades?
- [ ] Track `safety_resources_shown` — volume and context
- [ ] Track `waiting_cta_tapped` vs small-move impressions — is the new feature used?
- [ ] Track Us view opens — does the radar chart drive engagement?
- [ ] Monitor follow-up taste conversion — does the free taste drive upgrades?

### Week 1 actions
- [ ] Respond to every App Store review within 24hrs
- [ ] Monitor Sentry for new error patterns
- [ ] Check BigQuery export is running daily
- [ ] Verify push delivery rates (Expo dashboard)
- [ ] First ASO keyword check

### Week 2-4 actions
- [ ] First pricing experiment if conversion data supports it
- [ ] Share alignment map social feature (if engagement warrants)
- [ ] Valentine's Day planning (if launch is Nov-Dec)
- [ ] v1.5 #3 "Being remembered" callbacks — next product feature
