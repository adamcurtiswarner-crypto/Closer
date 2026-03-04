# Stoke App Full Redesign — Figma Style Implementation

**Date:** 2026-03-04
**Approach:** Theme Swap (update theme.ts + add custom fonts, then screen-by-screen polish)

## Summary

Adopt the Figma design style across the entire Stoke app. This involves a new color palette (bright orange + deep purple), custom fonts (Alexandria + Inter), hand-drawn illustrations, and updated screen layouts matching the Figma mockups.

---

## 1. Color Palette

### Replaced Tokens

| Token | Old | New |
|---|---|---|
| `accent.primary` | `#c97454` | `#ef5323` (bright orange) |
| `accent.primaryLight` | `#e9b8a3` | `#f9a07a` |
| `accent.secondary` | `#8b7355` | `#490f5f` (deep purple) |
| `accent.secondaryLight` | `#b8a88a` | `#7b3f8d` |
| `surface.warmTint` | `#fef7f4` | `#fef5f0` |
| `surface.warmTintDeep` | `#fceee7` | `#fce8dc` |
| `gradient.ember` | `['#c97454', '#d4956f']` | `['#ef5323', '#f5734a']` |
| `border.accent` | `#c97454` | `#ef5323` |

### Kept As-Is

| Token | Value | Reason |
|---|---|---|
| `surface.background` | `#fafaf9` | Warm off-white works with both palettes |
| `surface.card` | `#ffffff` | Standard card bg |
| `text.primary` | `#1c1917` | Dark text contrast still good |
| `semantic.destructive` | `#ef4444` | Red for danger is universal |
| `semantic.success` | `#22c55e` | Green for success is universal |

### New Tokens

| Token | Value | Usage |
|---|---|---|
| `brand.purple` | `#490f5f` | Welcome/splash bg, feature backgrounds |
| `brand.purpleLight` | `#6b2d7b` | Gradients, lighter purple elements |

### Raw Hex Cleanup

Find and replace all ~15 instances of raw `#c97454` with `theme.colors.accent.primary` reference, so future palette changes propagate automatically.

---

## 2. Typography

### Font Installation

Add via `expo-font` in the root layout:

- **Alexandria-SemiBold.ttf** (600)
- **Alexandria-Bold.ttf** (700)
- **Inter-Regular.ttf** (400)
- **Inter-Medium.ttf** (500)
- **Inter-SemiBold.ttf** (600)

Font files stored in `src/assets/fonts/`.

### Updated Type Scale

| Token | Size | Font | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| `hero` (new) | 38px | Alexandria | SemiBold | 46 | -0.5 |
| `display` | 32px | Alexandria | SemiBold | 38 | -0.5 |
| `heading` | 28px | Alexandria | SemiBold | 34 | -0.3 |
| `title` | 17px | Inter | SemiBold | 22 | -0.3 |
| `body` | 16px | Inter | Regular | 24 | 0 |
| `caption` | 13px | Inter | Regular | 18 | 0 |
| `overline` | 12px | Inter | Medium | 14 | 0.7 |

### Button Text

All button labels use Inter SemiBold. Overline/tracking style for uppercase labels (SIGN UP, SAVE, etc.) uses 0.7px letter spacing.

---

## 3. Illustrations & Assets

### From Figma (download and bundle)

- Couple high-fiving illustration (welcome/landing hero)
- Starburst vector shapes (decorative)
- Heart outline vector (welcome screen)
- Abstract blob shapes (sign-up/sign-in header)
- Stoke logo (white wordmark variant for purple backgrounds)
- Topic card imagery (mood illustrations)

### AI-Generated Extras (matching style)

- Empty state illustrations (no prompts, no memories, etc.)
- Achievement/completion illustrations
- Error state illustrations
- Audio recording screen background art

### Asset Format

- PNG for complex illustrations (2x, 3x for retina)
- SVG where possible for simple shapes (starbursts, blobs)
- Store in `src/assets/illustrations/`

---

## 4. Screen-by-Screen Changes

### 4a. Welcome / Landing Screen

- Full-bleed deep purple (`#490f5f`) background
- Stoke logo (white wordmark) centered at top
- Couple high-five illustration as hero (centered, large)
- Orange starburst + heart vectors as decorative elements
- Tagline: "Tend to the moments, keep the Flame." — Alexandria SemiBold 28px, `#3f414e`
- Subtitle: "Stoke curiosity. Keep the spark alive." — Inter 16px, `#3f4553`
- Bright orange SIGN UP pill button (`#ef5323`, borderRadius: 38)
- "ALREADY HAVE AN ACCOUNT? LOG IN" — Inter Medium 14px, orange for "LOG IN"

### 4b. Sign Up Screen

- Abstract decorative vector blobs at top
- "Create your account" — Alexandria SemiBold 28px
- Continue with Facebook button (pill, with FB icon)
- Continue with Google button (pill, with Google icon)
- "OR LOG IN WITH EMAIL" divider text
- Input fields: username, email, password — pill-shaped (borderRadius: 38), white bg, border
- Privacy policy checkbox
- Orange GET STARTED button

### 4c. Sign In Screen

- Same decorative header as sign up
- "Welcome Back!" — Alexandria SemiBold 28px
- Social auth buttons (Facebook, Google)
- Email + password fields
- Orange LOG IN button
- "Forgot Password?" link
- "ALREADY HAVE AN ACCOUNT? SIGN UP" link

### 4d. Onboarding — Choose Topic

- Wavy organic shape header (purple/orange tinted blobs)
- "What does your relationship feel like right now?" — Alexandria SemiBold 28px
- Masonry grid of topic cards:
  - Rounded corners (~20px), varying heights
  - Each card has subtle illustration/image bg
  - Labels: "Comfortable but busy", "New and exciting", "A little disconnected", "Going through a lot", "Deep and steady", "In a bit of a rut", "Reduce Stress"
- Selectable (tap to select, highlight with orange border)

### 4e. Onboarding — Reminders

- "What times would you prefer to engage with Stoke?" — Alexandria SemiBold 28px
- Helper text: "Any time you can choose but we recommend first thing in the morning." — Inter 16px
- Time picker wheel (hours / minutes / AM-PM) in rounded container
- "Which day would you like to receive prompts?" — Alexandria SemiBold heading
- "Everyday is best, but we recommend picking at least four." — Inter 16px
- Day-of-week circles: SU, M, T, W, TH, F, S — circular toggles
- Orange SAVE pill button
- "NO THANKS" text link below

### 4f. Home / Today Screen

- "Good Morning, Adam" — Alexandria SemiBold 28px
- "We hope you have a good day" — Inter 16px, secondary color
- Featured prompt card: large, rounded 20px, with mood illustration bg
  - Mood label: "Comfortable but busy"
  - "3-10 MIN" badge
  - Decorative path/vector element
- "Daily Thought" activity card — dark illustration bg, rounded
  - Title + "ACTIVITY" + "3-10 MIN" labels
  - Play button overlay
- "Recommended for you" section header
- Horizontal scroll of content cards:
  - Image top (rounded 20px top corners), title below
  - "ACTIVITY" / "MEDITATION" + duration labels
- Tab bar: 5 tabs (Home, Today, Memories, Insights, Settings) with icons

### 4g. Audio Recording Screen (New)

- Large circular illustration as hero background
- "A Message for you, Adam" — Alexandria SemiBold 28px, centered
- Transport controls: skip-back-15, play/pause (large), skip-forward-15
- Progress bar with scrub handle
- Timestamps: "0:12" / "0:56"
- Top bar: back button, share button, bookmark button

### 4h. Existing Screens — Global Updates

All existing screens receive:
- **Card accent bars**: `#c97454` → `#ef5323`
- **CTA buttons**: warm rust → bright orange
- **Tab bar active color**: `#ef5323`
- **All headings**: system font → Alexandria
- **All body text**: system font → Inter
- **Chat own-bubble**: `#c97454` → `#ef5323`
- **Focused input borders**: `#c97454` → `#ef5323`
- **Streak ring accent**: `#c97454` → `#ef5323`

---

## 5. Component Updates

### Button
- Background: `#ef5323` (primary variant)
- Text: Inter SemiBold, uppercase with 0.7px tracking for overline buttons
- Shadow: `shadowColor: '#ef5323'` for colored glow variant
- Border radius stays 38px (pill)

### Input
- Border radius: 38px (pill-shaped, up from 12px) for auth screens
- Keep 12px for in-app forms (settings, modals) — auth is more expressive
- Focused border: `#ef5323`

### Card
- Keep borderRadius 20, shadow pattern, overflow hidden
- Accent bar color: `#ef5323`
- No structural changes needed

### Tab Bar
- Active icon/label color: `#ef5323`
- Sliding dot: `#ef5323`

---

## 6. Animation Patterns

Keep all existing animation patterns (FadeIn/FadeInUp, springs, cascading delays). They complement the new visual style well. No animation changes needed.

---

## 7. Implementation Order

1. **Theme.ts swap** — colors, typography tokens, new tokens
2. **Font installation** — download fonts, add expo-font loading, splash screen hold
3. **Raw hex cleanup** — find/replace all hardcoded color values
4. **Welcome/landing screen** — complete rebuild to match Figma
5. **Sign up / sign in screens** — layout + illustration updates
6. **Onboarding screens** — choose topic + reminders
7. **Home/Today screen** — layout adjustments, new card patterns
8. **Illustrations** — download Figma assets, generate extras
9. **Remaining screens** — memories, insights, settings, chat (mostly auto-updated via theme)
10. **Audio recording screen** — new screen build
11. **QA pass** — verify all screens, fix edge cases
