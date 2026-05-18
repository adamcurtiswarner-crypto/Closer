# Stoke Studio Status
*Last updated: 2026-05-18 — CEO review*

## Current Sprint
- **Focus**: App Store submission — validate latest TestFlight build, test payments, submit for review
- **Sprint goal**: App Store submission
- **Status**: GREEN. Latest build uploaded to App Store Connect via local Xcode (May 17). All major features shipped. 12/12 production layers covered. EAS free builds exhausted (resets June 1), using local Xcode builds.

## What Shipped (May 15-17)

### Together Tab Redesign
- Renamed Home → "Together" with handshake icon
- CoupleHero: overlapping 92px photos with "+" badge, names in Pacifico script font ("Adam & Masha")
- RelationshipStats: 3-column card (days together, prompts shared, best streak)
- Love languages: side-by-side card showing both partners' love languages
- MilestoneBadges: achieved badges + next milestone progress bar
- Days together now uses anniversary date when set
- ProfileCard moved to Settings

### Monthly Calendar Streak Tracker
- Replaced 7-dot weekly tracker with full monthly calendar view
- 6 day states: completed (orange + gold outline), partial-you (blue), partial-partner (blue), missed (pink + X), today (pulsing), upcoming (gray)
- Flame permanently animated with infinite wiggle
- Streak count at top of calendar
- Calendar aligned to real Mon-Sun grid
- Data from prompt_assignments (status, first_responder_id, assigned_date)

### Welcome Screen
- New design: Stoke logo, couple illustration from Figma, warm copy
- "Tend to the moments, keep the Flame."

### Production Infrastructure
- Rate limiting on 3 callable functions (30s, 5min, 1hr cooldowns)
- Error monitoring: reportError utility, checkErrorAlerts (5min), monitorErrors (15min), cleanupErrorLogs (daily)
- Storage rules hardened: 10MB max, image-only, deny-all catch
- Firestore indexes for date_nights and wishlist_items subcollections
- 12/12 production stack layers covered

### Bug Fixes
- Invite link: removed stoke.app domain (not owned), share code directly
- Date nights/wishlist not showing after save (missing indexes)
- Partner love language not refreshing (added to pull-to-refresh)
- Partner account re-linked (Adam + Masha Gmail), old data migrated

## Latest Build
- Built locally via Xcode Release archive + export
- Uploaded to App Store Connect via xcodebuild (not EAS or Transporter)
- Contains: monthly calendar, Together redesign, welcome screen, all fixes

## Key Metrics
- Test suites: 24/24 passing (140 tests)
- TypeScript errors: 0
- Cloud Functions: 35 deployed (added error monitoring)
- Expo SDK: 55
- Firebase: 12.13.0
- CI: GitHub Actions active
- Production layers: 12/12
- EAS builds: 0 remaining (resets June 1)

## What Needs Attention

### Before App Store Submission
| Priority | Item | Status |
|----------|------|--------|
| NOW | Validate latest TestFlight build (monthly calendar, Together tab) | Adam — install and test |
| NOW | Test push notifications with partner | 5+ weeks overdue |
| NOW | Test payment flow (RevenueCat not configured yet) | Needs API key + App Store products |
| THIS WEEK | Submit for App Review | After validation |

### Post-Launch
| Priority | Item |
|----------|------|
| NEXT | iOS Widgets (Swift code built, bridge disabled) |
| NEXT | Create staging Firebase project |
| LATER | Relationship Courses (#4) |
| LATER | Expo SDK 56 upgrade (when stable) |

## Roadmap
Together Redesign (DONE) → Calendar Streak (DONE) → Infrastructure (DONE) → **Validate + Submit (NOW)** → iOS Widgets → Courses
