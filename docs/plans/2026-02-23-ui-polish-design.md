# UI Polish Pass — Design

**Goal:** Elevate the less-polished edges of the app — loading states, error states, the completion moment, paywall, and onboarding selectors — to match the quality of the main screens.

**Approach:** Polish Pass — enhance each component in-place without new abstractions or design system extraction.

---

## 1. Skeleton Shimmer

Replace opacity-pulse animation with a left-to-right shimmer highlight sweep.

- Translating white highlight overlay (no extra dependencies)
- Base color `#e7e5e4`, highlight `#f5f5f4`
- 1.2s loop, ease-in-out
- Same API: `Skeleton`, `PromptCardSkeleton`, `MemoryCardSkeleton`

## 2. QueryError Redesign

Current: plain text + gray retry button.

New:
- Soft rounded card container (matches app card style, borderRadius 20)
- Muted warning icon at top (unicode character)
- Title "Something went wrong" in semibold
- Subtitle with specific error message in lighter weight
- Retry button as accent-colored outline pill (`#c97454` border)
- FadeIn entrance animation

## 3. OfflineBanner Polish

Current: gray bar with white text.

New:
- Warmer stone color `#57534e` (darker, more intentional)
- Warning indicator icon with subtle pulsing opacity
- SafeAreaView-aware positioning below the notch

## 4. CompletionMoment Enhancement

The emotional peak of the app — both partners responded. Should feel special.

- Warm radial tint behind the card (subtle `#fef7f4` to transparent)
- Sparkle particles: 6-8 small animated dots floating up and fading around the header (reanimated shared values, no library)
- Scale-in entrance on the card (0.95 -> 1.0 spring)
- Haptic feedback (`NotificationFeedbackType.Success`) on mount
- Existing staggered FadeInUp on responses stays — celebratory wrapper added around it

## 5. Paywall Redesign

Current: basic feature list with "+" markers.

New:
- Accent bar at top of sheet (3px `#c97454`)
- Warm tint header area (`#fef7f4` behind title/subtitle)
- Checkmark circles replace "+" (small filled `#c97454` circles with white checkmark)
- Feature descriptions: 1-line subtitle in lighter text below each feature
- Entrance animations: FadeInUp stagger on features, spring on CTA
- CTA button gets subtle shadow for depth

## 6. Onboarding Selectors

Current: basic circle radio buttons and option rows.

New:
- Pill-style selectors matching AddGoalModal pattern (`#fef7f4` warm tint when active, `#c97454` border)
- Subtle scale spring on selection
- Existing entrance animations preserved
