# LLC Account Migration Runbook

*Studio draft 2026-07-22. Order is by blast radius — each step says what can
break and how to avoid it. Prerequisite: create the LLC email (e.g.
ops@stoke.llc — the domain is on Squarespace) and get the LLC card. Do NOT
recreate any project/account; transfer ownership of the existing ones.*

## 0. Before touching anything

- [ ] LLC email created, with its own strong password + 2FA in a password manager
- [ ] LLC card in hand; note which services bill today against a personal card
- [ ] D-U-N-S lookup for the LLC (dnb.com — free): needed for Apple org
      enrollment; the bank may have already triggered one

## 1. Firebase / Google Cloud — HIGHEST blast radius, safest mechanism

The project `stoke-5f762` holds prod data. Never recreate it — add an owner.
- [ ] Google account for the LLC email → Firebase console → Project settings →
      Users and permissions → add LLC email as **Owner**
- [ ] Same in Google Cloud IAM (BigQuery lives here too)
- [ ] Billing: switch the GCP billing account's payment method to the LLC card
- [ ] Keep the personal account as owner until everything below is verified,
      then demote it to Editor (or remove) deliberately
- Breakage risk: none if you add-then-demote. Everything (functions, rules,
  data, hosting) is project-scoped, not account-scoped.

## 2. Apple Developer — the strategic decision

Current: individual enrollment, team 7F8CUS39VP, adamcurtiswarner@gmail.com.
- Option A (clean): enroll [LLC legal name] as an **organization** (requires
  D-U-N-S + legal entity verification, days–weeks), then transfer the app.
  App transfer moves the app id, TestFlight, and IAP config; check the
  current transfer criteria for apps with auto-renewable subscriptions BEFORE
  RevenueCat products go live to real users — transferring before public paid
  launch is far simpler than after.
- Option B (pragmatic): finish TestFlight beta on the individual account;
  submit 1.0 only after org enrollment; never take public revenue on the
  personal identity.
- [ ] Decision recorded: ____
- After transfer: EAS credentials (`eas credentials`), ASC API keys for
  RevenueCat, and the push key must be re-issued under the org team —
  budget an hour of studio work + one new build.

## 3. Expo / EAS

- [ ] Create an Expo **organization** owned by the LLC email; transfer the
      `stoke` project into it (Expo supports project transfer between accounts)
- [ ] Update `owner` in app.json + EAS project link; new builds then publish
      under the org (runtime/OTA channels carry over; verify `eas build`
      once before relying on it)
- [ ] Billing → LLC card

## 4. RevenueCat

- [ ] Add LLC email as **Admin** collaborator → verify → transfer project
      ownership / billing to it
- [ ] If/when the Apple team changes (step 2), re-upload the ASC API + IAP
      keys from the new team. Webhook URL and entitlement config are unchanged.

## 5. GitHub

- [ ] Create a GitHub **organization** under the LLC email; transfer
      `adamcurtiswarner-crypto/Closer` into it (transfers preserve history;
      old remote URLs redirect, but update `origin` on dev machines)
- [ ] Update any EAS secrets / CI references to the repo path

## 6. Domain (Squarespace) + web

- [ ] Move stoke.llc registration into an account owned by the LLC email
      (Squarespace supports transfer between accounts) — DNS records ride
      along; Firebase Hosting is untouched
- [ ] Google Workspace or forwarding for support@stoke.llc → confirm it's the
      address in privacy/terms/support.html

## 7. The rest (15 minutes total)

- [ ] Anthropic console: LLC email as org owner; API key billing → LLC card
- [ ] Sentry: transfer org ownership to LLC email
- [ ] Any Google Sign-In OAuth consent screen contact emails → LLC email

## 8. Money hygiene (from the action plan, ongoing)

- [ ] Every service above billing the LLC card — audit once after migration
- [ ] Past personal spend on Stoke (EAS credits, Apple fee, domain, Anthropic)
      booked as owner contribution in the bookkeeping software
- [ ] Revenue (RevenueCat → Apple payouts) lands in the LLC bank account —
      set the banking info in ASC Agreements once the W-9/banking clears

## Verification pass (studio can run after each step)

`firebase projects:list` under the LLC Google account · `eas whoami` /
`eas build:list` under the org · git push to the new remote · RevenueCat
dashboard reachable as LLC admin · test build installs and purchases in
sandbox.
