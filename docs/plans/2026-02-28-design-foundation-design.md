# Design Foundation: Headspace-Warm Visual Elevation

**Date:** 2026-02-28
**Approach:** Phosphor Icons + Design Tokens (Approach A)
**Direction:** Headspace warm — soft gradients, rounded icon style, pastel warmth

## Problem

Stoke's architecture and animation quality are strong, but the visual surface undermines its premium feel. Every UI icon is an emoji (blurry at small sizes, platform-inconsistent, clashing colors). Typography, color, and loading states are ad-hoc rather than systematized. The app reads as "indie" rather than the premium, emotionally resonant product the competitive analysis calls for.

## Scope

Build the design system primitives — icon set, color tokens, typography scale, skeleton consistency — then apply screen by screen in subsequent work.

---

## 1. Icon System

**Package:** `phosphor-react-native` — SVG-based, crisp at every size, 6 weight variants.

**Wrapper:** `src/components/Icon.tsx` — maps semantic names to Phosphor icons. Screens never import Phosphor directly.

**Size tiers:**
| Tier | Size | Use |
|------|------|-----|
| `xs` | 14px | Inline with caption text, status indicators |
| `sm` | 18px | Card header icons, pill icons |
| `md` | 22px | Action buttons, list row icons |
| `lg` | 28px | Empty state focal point |
| `xl` | 36px | Onboarding hero icons |

**Weight:** `light` default (thin strokes = warmth), `regular` for active/emphasized, `bold` for tab bar.

**Emoji replacement map:**

| Current | Phosphor Icon | Context |
|---------|--------------|---------|
| `🔥` | `Flame` | Streak ring, streak pills, ConnectionHeader |
| `🎯` | `Target` | GoalTracker header |
| `✨` / `🌟` | `Sparkle` | WishlistCard header, empty states |
| `🎲` | `GameController` | DateNightCard header |
| `🤔 🧠 🔥` | Single `GameController` | DateNightCard hero (replace 3-emoji row) |
| `☄️` | `Coffee` or `Compass` | Today empty state |
| `⏳` | `Hourglass` | Waiting states |
| `📷` | `Camera` | Photo attach, profile edit |
| `☀️ ☁️ 🌧️` | `SunDim`, `Cloud`, `CloudRain` | Emotion feedback buttons |
| `🔭` | `Binoculars` | Insights empty state |
| `🔒` | `Lock` | Milestone lock overlay |
| `📅` | `CalendarBlank` | Anniversary, date displays |
| `❤️` | `Heart` | Love language, couple stats |
| `🏆` | `Trophy` | Insight cards |
| `💬` | `ChatCircle` | Chat-related insights |
| `>` / `›` | `CaretRight` | Settings rows, ResourceCard |
| `✓` / `✓✓` | `Check` / `Checks` | Message status, completion |
| `×` | `X` | Close/dismiss |

---

## 2. Color Tokens

**File:** `src/config/theme.ts` — flat constants, no Context provider.

### Surface
| Token | Value | Use |
|-------|-------|-----|
| `background` | `#fafaf9` | Screen bg |
| `card` | `#ffffff` | Card bg |
| `warmTint` | `#fef7f4` | Active/selected bg |
| `warmTintDeep` | `#fceee7` | Hover/pressed states |

### Text
| Token | Value | Use |
|-------|-------|-----|
| `primary` | `#1c1917` | Headings, primary content |
| `secondary` | `#57534e` | Body text, descriptions |
| `tertiary` | `#78716c` | Metadata, helper text |
| `muted` | `#a8a29e` | Timestamps, placeholders |
| `inverse` | `#ffffff` | Text on filled buttons |

### Accent
| Token | Value | Use |
|-------|-------|-----|
| `primary` | `#c97454` | Rust — buttons, progress, active states |
| `primaryLight` | `#e9b8a3` | Light fills, borders |
| `secondary` | `#8b7355` | Brown — partner accents |
| `secondaryLight` | `#b8a88a` | Subtle brown accents |

### Gradients
| Token | Values | Use |
|-------|--------|-----|
| `warmGlow` | `['#fef7f4', '#fceee7']` | Warm wash behind empty states, cards |
| `ember` | `['#c97454', '#d4956f']` | Button/CTA gradient |
| `sunrise` | `['#fceee7', '#fef7f4']` | Reversed warmGlow |

### Semantic
| Token | Value / Light | Use |
|-------|--------------|-----|
| `success` | `#22c55e` / `#dcfce7` | Completion, online status |
| `destructive` | `#ef4444` / `#fef2f2` | Delete, errors |
| `neutral` | `#f59e0b` / `#fefce8` | Amber feedback |

### Border
| Token | Value | Use |
|-------|-------|-----|
| `default` | `#e7e5e4` | Card borders, dividers |
| `subtle` | `#f5f5f4` | Very light dividers |
| `accent` | `#c97454` | 3px card accent bar |

### Skeleton
| Token | Value | Use |
|-------|-------|-----|
| `base` | `#f5f5f4` | Skeleton background |
| `shimmer` | `#e7e5e4` | Shimmer highlight |

---

## 3. Typography Scale

**Added to `src/config/theme.ts`** — named presets, StyleSheet-compatible objects.

| Name | Size | Weight | Spacing | Height | Use |
|------|------|--------|---------|--------|-----|
| `display` | 32 | 700 | -0.5 | 38 | Celebrations, completion reveals, milestones |
| `heading` | 24 | 700 | -0.3 | 30 | Screen titles |
| `title` | 17 | 600 | -0.3 | 22 | Card headers, section titles, modal titles |
| `body` | 15 | 400 | 0 | 22 | Content text, descriptions |
| `caption` | 13 | 400 | 0 | 18 | Secondary info, timestamps |
| `overline` | 11 | 600 | 0.8 | 14 | Uppercase labels, stat labels, badge text |

**Changes from current:**
- `display` is new — gives celebration moments bigger typographic punch (currently max is 28px)
- `title` at 17/600 replaces current 15/700 card headers — slightly larger, lighter weight, more refined
- `overline` formalizes the existing uppercase label pattern
- No custom fonts — system San Francisco, just systematized

**Usage:** Import `typography.display` etc., spread into StyleSheet definitions. No wrapper components.

---

## 4. Skeleton Consistency

**Problem:** GoalTracker and WishlistCard use `ActivityIndicator` while everything else uses shimmer skeletons. Creates visual jank on Today screen.

**Fix:**
- `GoalTrackerSkeleton` — card shape with accent bar + header row skeleton + 3 pill-shaped skeleton bars
- `WishlistCardSkeleton` — card shape with accent bar + header row skeleton + 2 skeleton text rows
- Both reuse existing `Skeleton` shimmer component (1200ms repeat)
- Replace `ActivityIndicator` in both components

---

## Out of Scope (Future Work)

These become straightforward once the foundation exists:
- Empty state redesign (swap emoji for Icon component + warm gradient bg)
- Onboarding screen personality (Icon heroes, gradient headers)
- Today screen state transitions (cross-fade between modes)
- Tab bar icons (swap to Phosphor bold weight)
- Completion celebration moment (display typography + haptics)
