# Pre-Submission Manual Checklist (Two Devices, ~45 min)

The seams no automated suite can cover: real APNs delivery, RevenueCat
sandbox billing, OS-level app lifecycle, and Universal Links. Run this on
**two physical iOS devices** (Device A = inviter, Device B = partner) with a
**production-profile build** (TestFlight or local Release install) before
every App Store submission.

Conventions:
- "Fresh install" = delete the app first (Settings > General > iPhone Storage
  > Stoke > Delete App), then install.
- Use disposable accounts; note the emails at the top of your run log.
- Check a box only when the **Expected** column matched exactly. Anything
  else goes in the Notes line under the item — a mismatch on items 1-6 is
  submission-blocking.

Automated coverage that backs this list (run first, all green):
`npx tsc --noEmit` · `npm test` · `npm run test:rules` · `npm run test:flows`
· `cd functions && npm run build && npm test`.

---

## 1. Fresh-install push flow

- [ ] Device A: fresh install → sign up → complete onboarding through the
      notification pre-prompt → accept the OS permission dialog.
- [ ] Firestore check (console): the user doc has exactly ONE
      `push_tokens` entry, and it matches `ExponentPushToken[...]`.
- [ ] Device B: answer the shared daily prompt first (pair via item 8 if not
      yet paired). Device A **locked, app backgrounded**.

**Expected:** Device A receives the "answered today's prompt" push within
~30s. No duplicate push. Token format is Expo (never a raw 64-char APNs/FCM
hex token).

Notes:

## 2. One push per device (no duplicates)

- [ ] With both devices paired and signed in, trigger each push type once:
      partner-responded (one side answers), completion reveal (second side
      answers), reaction (react to a revealed answer), Hearth "we talked"
      nudge (mark a repair/divergence completion discussed on one device).

**Expected:** every event produces exactly ONE banner on the target device.
Two banners for one event = stale token duplication — STOP and check
`push_tokens` for that user (should be one per physical device).

Notes:

## 3. Reinstall token prune

- [ ] Device A: note the current `push_tokens` array, delete the app,
      reinstall, sign back into the SAME account, re-accept notifications.
- [ ] Firestore check: array eventually holds only the NEW token for this
      device (old token pruned on next send — trigger one push from Device B
      to force it).
- [ ] Device A still receives exactly one push (not zero, not two).

**Expected:** stale token removed after the first send to it
(DeviceNotRegistered prune in `sendPushNotification`); no duplicate
delivery, no silent dead-token state.

Notes:

## 4. Foreground / background / killed delivery + deep links

Trigger a partner-responded push at Device A in each app state:

- [ ] **Foreground:** in-app handling only — no lock-screen banner
      surprises, no crash.
- [ ] **Background:** banner arrives; tapping it opens the app on the
      correct screen (Today for daily; Explore tab for `explore_question` /
      `explore_complete` pushes).
- [ ] **Killed (swipe-closed):** banner arrives; cold-start tap lands on the
      correct screen, not a blank Today or the login screen.
- [ ] Deep-link data survives: for an explore push, the OPENED assignment is
      the one from the push, not just the tab.

**Expected:** all three states deliver; tap routing is correct from a cold
start; no double-navigation or flash of the wrong screen.

Notes:

## 5. Sandbox purchase → entitlement → webhook → gate opens

Use a Sandbox Apple ID (App Store Connect > Users and Access > Sandbox).

- [ ] Device A: open the paywall (Profile > plan row), buy the annual plan
      with the sandbox account. Purchase sheet shows the 14-day trial.
- [ ] RevenueCat dashboard: customer shows the `premium` entitlement active.
- [ ] Firestore check: the RevenueCat webhook wrote the subscription doc
      (check `subscriptions/` for the user; webhook must NOT be a 401 — see
      functions logs).
- [ ] Device A: the premium gate opens WITHOUT reinstalling or re-signing-in
      (at most an app foreground cycle).
- [ ] Device B (the partner, same couple, no purchase): premium features the
      couple shares are available per the couple-entitlement policy.

**Expected:** purchase completes; entitlement + webhook + client gate all
agree within ~1 min. A fail-open webhook (200 with no auth) is
submission-blocking — verify the key is configured in prod env.

Notes:

## 6. Restore purchases on a second device

- [ ] Device B (or Device A after a fresh reinstall): sign into the SAME
      app account that purchased in item 5, do NOT buy again, tap "Restore
      purchases".

**Expected:** entitlement restores with no new charge sheet; gate opens.
App Review tests this path — it must not dead-end.

Notes:

## 7. 8 PM ET boundary on device

Run after 8 PM Eastern (or set the device clock/timezone to 20:30
America/New_York — settings change, then relaunch the app):

- [ ] Today screen still shows TODAY's prompt (answered this morning: shows
      the revealed/completed state, not a new prompt and not blank).
- [ ] No "Today's prompt is ready." push arrives at ~8 PM ET for a prompt
      already answered today.
- [ ] Next morning (or clock forward past local midnight + delivery time):
      the NEW day's prompt appears exactly once.

**Expected:** the user-local calendar day governs everything; UTC rollover
at 8 PM ET must be invisible. (Automated twin: the tz matrix in
`src/__tests__/localDate.test.ts` + `functions/src/__tests__/prompts.tz.test.ts`.)

Notes:

## 8. Invite link — with and without the app installed

- [ ] Device A: create an invite, share via Messages to Device B.
- [ ] Device B **without the app installed**: tap the link → lands on the
      join page (`/join/...`) with sensible copy + App Store route; the
      invite code is visible/copyable.
- [ ] Device B: install the app, sign up, enter the code (or hit the link
      again with the app installed) → paired.
- [ ] Device B **with the app installed**: tapping a fresh invite link opens
      the app directly into the accept flow with the code prefilled.
- [ ] Both devices land on the paired state (partner name visible); Device
      A is notified/updated without a manual refresh.

**Expected:** the skeptical-partner path (no app, cold link) never
dead-ends; pairing completes end to end from a Messages tap. (Automated
twin: `src/__tests__/flows/pairing.flow.test.ts` covers the callable; this
covers the OS link plumbing.)

Notes:

---

## Sign-off

| Field | Value |
|---|---|
| Date / build (version + build number) | |
| Devices (models + iOS versions) | |
| Tester | |
| Items 1-6 all green (blocking) | |
| Items 7-8 all green | |
| Follow-ups filed | |
