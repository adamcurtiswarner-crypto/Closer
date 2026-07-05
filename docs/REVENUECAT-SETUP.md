# RevenueCat Setup — v1 Launch Runbook

Status (2026-07-05): **NOT CONFIGURED.** No `EXPO_PUBLIC_REVENUECAT_IOS_KEY` exists in `.env`
or EAS env. In current builds `configurePurchases()` (src/config/purchases.ts) silently
no-ops, `useSubscription` gets no offerings, and the paywall CTA stays disabled. The app
does not crash without the key — purchases just don't work.

## Decision locked by CEO (2026-07-05)
**14-day free trial** on the annual plan (spec choice; couples must experience at least one
follow-up branch before paying). Paywall copy already updated to 14-day. The App Store
intro offer MUST be configured as 2 weeks to match the copy.

## What the code expects (do not deviate)
| Thing | Value | Where used |
|---|---|---|
| Entitlement identifier | `premium` | src/hooks/useSubscription.ts:12 |
| Offering | the **current/default** offering with standard `annual` + `monthly` packages | useSubscription reads `offerings.current`, Paywall reads `offering.annual` / `offering.monthly` |
| Prices in copy | $49.99/year ($4.17/mo), $9.99/month | Paywall.tsx + en.json (update copy if ASC prices differ) |
| App user id | Firebase auth uid (`Purchases.logIn(userId)`) | src/config/purchases.ts |
| Env var | `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (public Apple SDK key, `appl_...`) | src/config/purchases.ts |
| Webhook | `revenueCatWebhook` — deployed at `https://us-central1-stoke-5f762.cloudfunctions.net/revenueCatWebhook`; validates `Authorization: Bearer <revenuecat.webhook_key>` from functions config (skips validation if unset) | functions/src/admin.ts:303 |

## Steps (dashboard work — needs Adam or an authenticated browser)

### 1. App Store Connect (appleid: adamcurtiswarner@gmail.com, team 7F8CUS39VP, app 6759679330)
1. Features → In-App Purchases → Subscriptions: create subscription group "Stoke Premium".
2. Add auto-renewable subscriptions:
   - `stoke_premium_annual` — $49.99/year — **Intro offer: 14 days free** (Free Trial, 2 weeks)
   - `stoke_premium_monthly` — $9.99/month (no trial, or same 14-day if desired — copy currently only promises trial on annual)
3. Fill localization + review notes; add the subscription screenshot later with the App Store submission.
4. Users and Access → Integrations → App Store Connect API: create (or reuse) an API key with App Manager role for RevenueCat; also note the In-App Purchase Key (Subscriptions key) — RevenueCat setup asks for it.

### 2. RevenueCat dashboard (app.revenuecat.com)
1. Create project "Stoke" → add Apple App Store app, bundle id `io.getstoke.app`; upload the ASC API key + In-App Purchase key.
2. Copy the **Apple public SDK key** (`appl_...`).
3. Products: import `stoke_premium_annual`, `stoke_premium_monthly`.
4. Entitlements: create `premium`; attach both products.
5. Offerings: in the `default` offering add packages — `$rc_annual` → stoke_premium_annual, `$rc_monthly` → stoke_premium_monthly. Mark `default` as current.
6. Integrations → Webhooks: URL `https://us-central1-stoke-5f762.cloudfunctions.net/revenueCatWebhook`, Authorization header value `Bearer <generate a long random secret>`.

### 3. Wire secrets (CLI — Claude can run these once keys exist)
```bash
# App key into EAS production env (public — plain visibility is fine)
eas env:create production --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_XXXX --visibility plaintext
# Local dev
echo 'EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_XXXX' >> .env
# Webhook secret into functions config, then redeploy the webhook
firebase functions:config:set revenuecat.webhook_key="<the random secret>" --project stoke-5f762
firebase deploy --only functions:revenueCatWebhook --project stoke-5f762
```

### 4. Verify
- Sandbox tester account in ASC → TestFlight build → purchase annual with sandbox account →
  `useSubscription.isPremium` flips true; RevenueCat dashboard shows the event; webhook
  fires (check `firebase functions:log` for revenueCatWebhook) and the couple doc gains
  premium state.
- Cancel + restore flow via the paywall "Restore purchases".

## Note
A new EAS build is required AFTER the env var exists (EXPO_PUBLIC_* is baked at build
time). Sequence the TestFlight build accordingly — either add the key first, or plan a
second build for the purchase-enabled version.
