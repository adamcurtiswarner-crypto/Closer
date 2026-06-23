# Stoke Redesign Plan — Four Engines
*Created: 2026-06-23 — CEO review*
*Source: Designer handoff (stoke-handoff.html + StokeScreens.jsx)*

## Overview

Redesign Stoke from a single daily-prompt loop to a four-engine daily relationship operating system. This plan covers the design system migration and new screen builds.

## Phases

### Phase 1: Design System Foundation (No Visual Changes Yet)
**Goal**: Update all design tokens so every subsequent change inherits the new system.

**1A. Font Migration**
- Download Nunito font files (400, 600, 700, 800, 900, italic 700) as TTF
- Add to `src/assets/fonts/`
- Update `app/_layout.tsx` useFonts to load Nunito variants
- Keep old fonts loaded temporarily for gradual migration

**1B. Theme Token Update** (`src/config/theme.ts`)
- Colors:
  - `accent.primary`: `#c97454` → `#D4522A` (coral)
  - `accent.primaryLight`: `#f9a07a` → `#FDF1ED` (coral tint)
  - `accent.secondary`: `#490f5f` → `#3D2870` (purple)
  - `surface.background`: `#fef7f4` → `#F5F2EE` (warm white)
  - `surface.warmTint`: `#fef5f0` → `#FDF1ED`
  - `text.secondary`: `#57534e` → `#6B6B7A` (mid)
  - `text.muted`: `#a8a29e` → `#B8B8C4` (hint)
  - `border.default`: `#e7e5e4` → `#E2DED8`
  - Add `semantic.green`: `#7BAE7F`
- Typography:
  - `hero`: Alexandria-SemiBold → Nunito-Black (900), 32px, -0.5 tracking
  - `display`: Alexandria-SemiBold → Nunito-Black (900), 28px
  - `heading`: Alexandria-SemiBold → Nunito-ExtraBold (800), 20px
  - `title`: Inter-SemiBold → Nunito-Bold (700), 16px
  - `body`: Inter-Regular → Nunito-SemiBold (600), 13px, 1.5 line-height
  - `caption`: Inter-Regular → Nunito-SemiBold (600), 11px
  - `overline`/eyebrow: Inter-Medium → Nunito-ExtraBold (800), 9px, 0.12em tracking, uppercase
  - Add `btn`: Nunito-Black (900), 12px, 0.14em tracking, uppercase
- Radius:
  - `hero`: 20 (new)
  - `card`: 16 (was xl: 20)
  - `choice`: 14 (new)
  - `input`: 12 (was md: 12) — same
  - `pill`: 50 (was full: 9999) — functionally same but explicit
  - `nav`: 9 (new)
- Spacing:
  - `screen`: 20 (new)
  - `section`: 16 (= md)
  - `cardPad`: 20 (new)
  - `itemGap`: 8 (= sm)

**1C. Hardcoded Color Sweep**
- 86 files reference hardcoded color values
- Replace all `#c97454` → `colors.accent.primary` (or import from theme)
- Replace all `#fef7f4` → `colors.surface.background`
- Replace all `#490f5f` → `colors.accent.secondary`
- This ensures the theme token update in 1B cascades everywhere

**1D. Hardcoded Font Sweep**
- 79 files reference font families directly
- Replace all `Alexandria-SemiBold` → theme typography references
- Replace all `Inter-Regular`, `Inter-Medium`, `Inter-SemiBold` → theme typography references
- Many files will need `fontFamily` updated in StyleSheet.create blocks

**Estimated scope**: ~86 files touched, mostly find-and-replace with manual review
**Risk**: Low — purely cosmetic, all logic unchanged
**Verification**: `npx tsc --noEmit` + `npm test` + visual spot-check

---

### Phase 2: Tab Bar + Navigation Update
**Goal**: Update tab bar to match new design system.

- Update tab bar in `app/(app)/_layout.tsx`:
  - Background: white (not warm tint)
  - Active color: `#D4522A` (new coral)
  - Inactive color: `#B8B8C4` (hint)
  - Active tab gets coral-tinted background pill (9px radius)
  - Font: Nunito-ExtraBold, 8-9px, uppercase
  - Icons: stroke-based (match handoff SVGs)
- Tab names stay: Home, Today, Memories, Insights, Settings
- Tab icons update to match handoff line-art style

**Estimated scope**: 1 file primary, tab bar component
**Risk**: Low
**Verification**: Visual comparison to handoff nav bar

---

### Phase 3: Tone-on-Tone Shapes Component
**Goal**: Create reusable organic shape background component.

- Build `src/components/ToneShapes.tsx`:
  - SVG-based background overlay (react-native-svg)
  - Props: `variant` ('coral' | 'black' | 'purple'), `opacity` override
  - Renders ellipses + rotated band at correct opacities
  - Positioned absolute, pointer-events none
- Rules from handoff:
  - Always ellipses and/or one rotated wide rectangle
  - Never geometric lines or hard angles
  - Opacity: 0.04 to 0.12
  - Coral bg: 0.08-0.10 white shapes
  - Black bg: 0.04-0.05 white shapes
  - Purple bg: 0.05-0.07 white shapes

**Estimated scope**: 1 new component
**Risk**: Low — needs react-native-svg (already a dependency via expo)
**Verification**: Visual rendering on hero cards

---

### Phase 4: New Engine Screens (Core Product)
**Goal**: Build the 6 new screens from the designer handoff.

**4A. Morning Check-in (Engine 1 — Learn)**
- Route: modal overlay, triggered by push at 8am
- UI: question card (black bg + shapes), choice rows, privacy forecast card
- Data: new Firestore collection or extend existing check-in system
- Backend: Cloud Function for morning delivery + forecast generation (AI)

**4B. Today's Spark (Engine 2 — Action)**
- Route: `app/(app)/today.tsx` (replaces current Today screen)
- UI: coral hero card + shapes, word grid (3-col), text input, send button
- Data: new `sparks` or extend `prompt_assignments` with spark type
- Backend: notification to partner when word sent

**4C. Partner Guess (Engine 2 continuation)**
- Route: new screen `app/(app)/partner-guess.tsx` or modal
- UI: black word reveal card + shapes, radio choice rows, submit
- Data: links to spark assignment, stores guess
- Backend: reveal trigger, AI conversation nudge generation

**4D. Evening Reflection (Engine 3 — Reflect)**
- Route: modal overlay, triggered by push at 9pm
- UI: black hero card with heart score (1-5 tappable), chip selection, purple insight card
- Data: new `reflections` collection (date, score, chips, couple_id)
- Backend: insight generation from reflection patterns over time

**4E. Coach Insights (Engine 4 — Coach)**
- Route: `app/(app)/insights.tsx` (replaces current Insights screen)
- UI: coral hero recommendation card, black stat card with big number, momentum bars
- Data: aggregated from reflections, sparks, check-ins
- Backend: extend existing `coaching.ts` Cloud Functions

**4F. Surprise Mission (Bonus)**
- Route: full-screen modal
- UI: full coral screen + shapes, mission text, "I'm in" / "Skip" buttons
- Data: mission library (seed data), delivery tracking
- Backend: random push notification delivery (new scheduled function)

**4G. Curiosity Loop (Bonus)**
- Route: sub-screen within Today tab
- UI: binary preference cards, partner knowledge score
- Data: preference questions library, guess history
- Backend: scoring algorithm

**Estimated scope**: 6-7 new screen files + supporting hooks/services
**Risk**: Medium — new data models, new Cloud Functions, AI integration
**Verification**: Per-screen visual match to handoff + functional testing

---

### Phase 5: Existing Screen Restyling
**Goal**: Update all existing screens to use new design language.

- Home (Together) tab: apply new typography, colors, card styles, shapes
- Settings: new typography, spacing
- Auth screens (welcome, sign-in, sign-up, forgot-password): new brand colors, font
- Onboarding (10 screens): new font, colors, choice row style, button style
- Paywall: update colors, typography
- All modal screens: new styling

**Estimated scope**: ~30 screens
**Risk**: Medium — large surface area, many small changes
**Verification**: Visual review of every screen

---

### Phase 6: Backend — New Engine Data Models + Cloud Functions
**Goal**: Support the four-engine cycle with backend infrastructure.

- New Firestore collections:
  - `/couples/{coupleId}/check_ins/{checkInId}` — morning mood, forecast
  - `/couples/{coupleId}/sparks/{sparkId}` — word, guess, reveal
  - `/couples/{coupleId}/reflections/{reflectionId}` — score, chips, date
  - `/couples/{coupleId}/missions/{missionId}` — mission, accepted, completed
- New/updated Cloud Functions:
  - `deliverMorningCheckin` — scheduled 8am push
  - `generateForecast` — AI translates mood to partner forecast
  - `deliverEveningReflection` — scheduled 9pm push
  - `deliverSurpriseMission` — random push (2-3x/week)
  - Update `computeRelationshipPulse` to use reflection data
- Seed data:
  - Surprise mission library (50+ missions)
  - Curiosity loop preference questions

**Estimated scope**: 4-6 new/updated Cloud Functions, Firestore security rules
**Risk**: Medium — new data models need careful schema design
**Verification**: Function unit tests + emulator integration tests

---

## Execution Order

```
Phase 1A (fonts)     ─┐
Phase 1B (tokens)     ├─ Can run in parallel ─→ Phase 1C + 1D (sweep) ─→ Phase 2 (tab bar)
Phase 3 (shapes)     ─┘
                                                                           ↓
Phase 4A-4F (new screens) ←── depends on Phases 1-3 complete
                                                                           ↓
Phase 5 (restyle existing) ←── can overlap with Phase 4
                                                                           ↓
Phase 6 (backend) ←── can start data modeling in parallel with Phase 4
```

## What We Keep

- All existing backend infrastructure (35 Cloud Functions)
- Firestore data models (users, couples, prompts, etc.)
- Auth flow + onboarding flow (restyled)
- Push notification infrastructure
- Analytics + error monitoring
- Encryption, data export, account deletion
- RevenueCat integration (code-complete)
- Badge system (restyled)
- Streak system (integrated with new reflections)

## What Changes

- Design system: colors, fonts, spacing, radius, shadows
- Tab bar: new styling + icon set
- Today screen: completely replaced by Spark engine
- Insights screen: completely replaced by Coach engine
- Home screen: restyled, add Daily Thought / engine entry cards
- New modal screens: Morning Check-in, Evening Reflection, Surprise Mission
- New sub-screens: Partner Guess, Curiosity Loop

## What's New

- Tone-on-tone organic shapes (visual identity)
- Morning Check-in engine (8am daily)
- Word Spark + Partner Guess game
- Heart score Evening Reflection (9pm daily)
- AI Coach with pattern insights + momentum bars
- Surprise Missions (random push)
- Curiosity Loop (partner knowledge game)

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Phase tokens first, screens second | Ensures new screens inherit correct system from day one |
| Keep old fonts loaded during migration | Prevents crashes from missing fonts on unmigrated screens |
| Extend existing Cloud Functions where possible | Avoid duplication, reuse rate limiting and notification infrastructure |
| Build new screens as separate files | Don't touch existing screens until Phase 5 to reduce blast radius |
