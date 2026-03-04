# Figma Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adopt the Figma design style across the entire Stoke app — new color palette (bright orange `#ef5323` + deep purple `#490f5f`), custom fonts (Alexandria + Inter), hand-drawn illustrations, and updated screen layouts.

**Architecture:** Theme Swap approach — update `theme.ts` with new palette and typography tokens, install custom fonts via `expo-font`, then do a screen-by-screen pass to propagate changes and add new visual elements. Existing component architecture stays intact.

**Tech Stack:** React Native, Expo SDK 52, expo-font, react-native-reanimated, StyleSheet

**Design Doc:** `docs/plans/2026-03-04-figma-redesign-design.md`

---

## Task 1: Download and Install Custom Fonts

**Files:**
- Create: `src/assets/fonts/Alexandria-SemiBold.ttf`
- Create: `src/assets/fonts/Alexandria-Bold.ttf`
- Create: `src/assets/fonts/Inter-Regular.ttf`
- Create: `src/assets/fonts/Inter-Medium.ttf`
- Create: `src/assets/fonts/Inter-SemiBold.ttf`
- Modify: `app/_layout.tsx:1-20` (imports), `app/_layout.tsx:52-82` (splash/font loading)

**Step 1: Create fonts directory and download font files**

```bash
mkdir -p src/assets/fonts
```

Download the fonts from Google Fonts:
- Alexandria: https://fonts.google.com/specimen/Alexandria (SemiBold 600, Bold 700)
- Inter: https://fonts.google.com/specimen/Inter (Regular 400, Medium 500, SemiBold 600)

Extract the `.ttf` files and place them in `src/assets/fonts/` with these exact names:
- `Alexandria-SemiBold.ttf`
- `Alexandria-Bold.ttf`
- `Inter-Regular.ttf`
- `Inter-Medium.ttf`
- `Inter-SemiBold.ttf`

**Step 2: Install expo-font if not already installed**

```bash
npx expo install expo-font
```

**Step 3: Add font loading to root layout**

In `app/_layout.tsx`, add the `useFonts` hook. The splash screen should stay visible until fonts load.

Add import at top:
```typescript
import { useFonts } from 'expo-font';
```

Inside the `RootLayout` component (before the existing `useEffect` for splash screen), add:
```typescript
const [fontsLoaded] = useFonts({
  'Alexandria-SemiBold': require('../src/assets/fonts/Alexandria-SemiBold.ttf'),
  'Alexandria-Bold': require('../src/assets/fonts/Alexandria-Bold.ttf'),
  'Inter-Regular': require('../src/assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium': require('../src/assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold': require('../src/assets/fonts/Inter-SemiBold.ttf'),
});
```

Modify the splash screen hide logic in `AppBootstrap` to also wait for fonts:
- Pass `fontsLoaded` as a prop or use context
- Only call `SplashScreen.hideAsync()` when both auth is resolved AND `fontsLoaded === true`

**Step 4: Verify fonts load correctly**

```bash
npm start
```

Expected: App launches, splash screen stays until fonts load, no font loading errors in console.

**Step 5: Commit**

```bash
git add src/assets/fonts/ app/_layout.tsx
git commit -m "feat: install Alexandria and Inter custom fonts via expo-font"
```

---

## Task 2: Update Theme Color Tokens

**Files:**
- Modify: `src/config/theme.ts:7-62` (colors object)

**Step 1: Update color tokens in theme.ts**

Replace these values in the `colors` object:

```typescript
// Lines ~27-30: accent colors
accent: {
  primary: '#ef5323',      // was '#c97454' — bright orange
  primaryLight: '#f9a07a', // was '#e9b8a3'
  secondary: '#490f5f',    // was '#8b7355' — deep purple
  secondaryLight: '#7b3f8d', // was '#b8a88a'
},

// Lines ~12-14: surface warm tints
surface: {
  background: '#fafaf9',   // KEEP
  card: '#ffffff',         // KEEP
  warmTint: '#fef5f0',    // was '#fef7f4'
  warmTintDeep: '#fce8dc', // was '#fceee7'
},

// Lines ~52-54: border accent
border: {
  default: '#e7e5e4',     // KEEP
  subtle: '#f5f5f4',      // KEEP
  accent: '#ef5323',      // was '#c97454'
},

// Lines ~56-62: gradients
gradient: {
  warmGlow: ['#fef5f0', '#fce8dc'],   // updated tints
  ember: ['#ef5323', '#f5734a'],       // was ['#c97454', '#d4956f']
  sunrise: ['#fce8dc', '#fef5f0'],     // updated tints
},
```

Add new `brand` section after `gradient`:
```typescript
brand: {
  purple: '#490f5f',
  purpleLight: '#6b2d7b',
},
```

**Step 2: Update typography tokens to use custom fonts**

Replace the `typography` export (lines ~68-111) with font family references:

```typescript
export const typography = {
  hero: {
    fontSize: 38,
    fontFamily: 'Alexandria-SemiBold',
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  display: {
    fontSize: 32,
    fontFamily: 'Alexandria-SemiBold',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Alexandria-SemiBold',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
    letterSpacing: 0,
  },
  overline: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    lineHeight: 14,
    letterSpacing: 0.7,
  },
} as const;
```

**Step 3: Verify TypeScript compiles**

```bash
npm run typecheck
```

Expected: No new type errors from theme changes.

**Step 4: Commit**

```bash
git add src/config/theme.ts
git commit -m "feat: update theme colors to Figma palette and add custom font typography"
```

---

## Task 3: Raw Hex Color Cleanup — Button and Input Components

**Files:**
- Modify: `src/components/Button.tsx:89,100-162`
- Modify: `src/components/Input.tsx:46,60-98`

**Step 1: Update Button component colors**

In `src/components/Button.tsx`:

- L89: Change `'#c97454'` to `'#ef5323'` (ActivityIndicator color)
- L114: Change `'#d4a48e'` to `'#f9a07a'` (primaryDisabled backgroundColor)
- L118: Change `'#c97454'` to `'#ef5323'` (primaryButton backgroundColor)
- L150: Change `'#c97454'` to `'#ef5323'` (ghostText color)

Add font families to text styles:
- L137 (base text): add `fontFamily: 'Inter-SemiBold'`

**Step 2: Update Input component colors**

In `src/components/Input.tsx`:

- L46: Change `placeholderTextColor="#a8a29e"` — KEEP (still muted)
- L65: `label.color` — KEEP `'#57534e'`
- L82: Change `'#c97454'` to `'#ef5323'` (inputFocused borderColor)
- L65: Add `fontFamily: 'Inter-Medium'` to label style
- L75: Add `fontFamily: 'Inter-Regular'` to input style

**Step 3: Verify visually**

```bash
npm start
```

Expected: Buttons are now bright orange, inputs show orange focus border, text uses Inter font.

**Step 4: Commit**

```bash
git add src/components/Button.tsx src/components/Input.tsx
git commit -m "feat: update Button and Input to new Figma colors and Inter font"
```

---

## Task 4: Raw Hex Cleanup — Tab Bar Layout

**Files:**
- Modify: `app/(app)/_layout.tsx:62,132-133,225-264`

**Step 1: Update tab bar colors**

In `app/(app)/_layout.tsx`:

- L62: Change active color `'#c97454'` to `'#ef5323'`
- L62: Inactive `'#a8a29e'` — KEEP
- L132: Change `tabBarActiveTintColor: '#c97454'` to `'#ef5323'`
- L133: `tabBarInactiveTintColor: '#a8a29e'` — KEEP
- L251: Change indicator `backgroundColor: '#c97454'` to `'#ef5323'`
- L225: `container.backgroundColor: '#fafaf9'` — KEEP
- L227: `container.borderTopColor: '#e7e5e4'` — KEEP

Add font to tab label style if there is one, or add:
```typescript
tabLabel: {
  fontFamily: 'Inter-Medium',
  fontSize: 12,
  marginTop: 4,
},
```

**Step 2: Verify tab bar**

```bash
npm start
```

Expected: Active tab icon/label is bright orange, sliding dot is orange.

**Step 3: Commit**

```bash
git add app/\(app\)/_layout.tsx
git commit -m "feat: update tab bar to Figma orange accent color"
```

---

## Task 5: Raw Hex Cleanup — Today Screen

**Files:**
- Modify: `app/(app)/today.tsx:409-582` (inline colors), `app/(app)/today.tsx:651-886` (styles)

**Step 1: Update inline color references**

In `app/(app)/today.tsx`, find and replace all instances:
- `'#c97454'` → `'#ef5323'` (accent color — ~8 instances: L409, L418, L463, L478, L517, L582, L718, L781, L852, L860)

**Step 2: Add font families to key text styles**

In the styles block (starting L651):
- `greeting` (~L677): add `fontFamily: 'Alexandria-SemiBold'`
- `dateText` (~L681): add `fontFamily: 'Inter-Regular'`
- `emptyTitle` (~L704): add `fontFamily: 'Alexandria-SemiBold'`
- `emptySubtitle` (~L709): add `fontFamily: 'Inter-Regular'`
- `sealedTitle` (~L762): add `fontFamily: 'Alexandria-SemiBold'`
- `sealedSubtitle` (~L765): add `fontFamily: 'Inter-Regular'`
- `feedbackTitle` (~L812): add `fontFamily: 'Inter-Medium'`
- `streakCelebrationText` (~L860): add `fontFamily: 'Inter-SemiBold'`

**Step 3: Update warm tint references**

- Any `'#fef7f4'` → `'#fef5f0'`
- Any `'#fceee7'` → `'#fce8dc'`

**Step 4: Verify today screen**

```bash
npm start
```

Navigate to Today tab. Expected: Orange accents, Alexandria headings, Inter body text.

**Step 5: Commit**

```bash
git add app/\(app\)/today.tsx
git commit -m "feat: update Today screen to Figma colors and typography"
```

---

## Task 6: Raw Hex Cleanup — Auth Screens

**Files:**
- Modify: `app/(auth)/welcome.tsx:57-100`
- Modify: `app/(auth)/sign-in.tsx:153-199`
- Modify: `app/(auth)/sign-up.tsx:154-204`

**Step 1: Update welcome.tsx**

- L60: `container.backgroundColor` — KEEP `'#fafaf9'` (we'll rebuild this screen later, but for now update colors)
- L94: Change `inviteLink.color: '#c97454'` to `'#ef5323'`
- Add font families:
  - L66 (title style or equivalent): `fontFamily: 'Alexandria-SemiBold'`
  - L78 (tagline): `fontFamily: 'Inter-Regular'`
  - L84 (description): `fontFamily: 'Inter-Regular'`

**Step 2: Update sign-in.tsx**

- L169: `title.color` — KEEP `'#1c1917'`, add `fontFamily: 'Alexandria-SemiBold'`
- L180: Change `forgotText.color: '#c97454'` to `'#ef5323'`
- L195: Change `footerLink.color: '#c97454'` to `'#ef5323'`
- L193: `footerText` — add `fontFamily: 'Inter-Regular'`

**Step 3: Update sign-up.tsx**

- L169: `title.color` — KEEP, add `fontFamily: 'Alexandria-SemiBold'`
- L188: Change `termsLink.color: '#c97454'` to `'#ef5323'`
- L200: Change `footerLink.color: '#c97454'` to `'#ef5323'`
- L182: `terms` — add `fontFamily: 'Inter-Regular'`
- L197: `footerText` — add `fontFamily: 'Inter-Regular'`

**Step 4: Verify auth screens**

```bash
npm start
```

Navigate through auth flow. Expected: Orange links, Alexandria titles, Inter body.

**Step 5: Commit**

```bash
git add app/\(auth\)/welcome.tsx app/\(auth\)/sign-in.tsx app/\(auth\)/sign-up.tsx
git commit -m "feat: update auth screens to Figma colors and typography"
```

---

## Task 7: Raw Hex Cleanup — Onboarding Screens

**Files:**
- Modify: `app/(onboarding)/preferences.tsx:132-203`
- Modify: `app/(onboarding)/value-prop.tsx:14,42,48-89`
- Modify: `app/(onboarding)/invite-partner.tsx:176-246`
- Modify: `app/(onboarding)/ready.tsx:58,86-117`
- Modify: All other onboarding files with `#c97454` references

**Step 1: Update preferences.tsx**

- L168-169: Change `optionRowSelected` borderColor `'#c97454'` to `'#ef5323'`, backgroundColor `'#fef7f4'` to `'#fef5f0'`
- L185: Change `selectedCheck.color: '#c97454'` to `'#ef5323'`
- L191: Change `optionTextSelected.color: '#9a5a3a'` to a new orange-dark variant, e.g. `'#b5370f'`
- L145: `title` — add `fontFamily: 'Alexandria-SemiBold'`
- L155: `timeLabel` — add `fontFamily: 'Inter-Medium'`
- L180: `optionText` — add `fontFamily: 'Inter-Regular'`

**Step 2: Update value-prop.tsx**

- L14, L42: Change icon color `'#c97454'` to `'#ef5323'`
- L64: `title` — add `fontFamily: 'Alexandria-SemiBold'`
- L70: `subtitle` — add `fontFamily: 'Inter-Regular'`
- L86: `featureText` — add `fontFamily: 'Inter-Regular'`

**Step 3: Update invite-partner.tsx**

- L213: Change `codeText.color: '#c97454'` to `'#ef5323'`
- L235: Change `linkText.color: '#c97454'` to `'#ef5323'`
- L194: `title` — add `fontFamily: 'Alexandria-SemiBold'`
- L198: `subtitle` — add `fontFamily: 'Inter-Regular'`

**Step 4: Update ready.tsx**

- L58: Change icon color `'#c97454'` to `'#ef5323'`
- L104: `title` — add `fontFamily: 'Alexandria-SemiBold'`
- L110: `subtitle` — add `fontFamily: 'Inter-Regular'`

**Step 5: Sweep remaining onboarding files**

Run a grep for `#c97454` across all onboarding files and replace with `'#ef5323'`:
```bash
grep -rn "#c97454" app/\(onboarding\)/
```
Replace all instances. Also grep for `#fef7f4` → `#fef5f0` and `#fceee7` → `#fce8dc`.

**Step 6: Verify onboarding flow**

```bash
npm start
```

Walk through onboarding. Expected: Orange accents, Alexandria headings, Inter body.

**Step 7: Commit**

```bash
git add app/\(onboarding\)/
git commit -m "feat: update all onboarding screens to Figma colors and typography"
```

---

## Task 8: Raw Hex Cleanup — Remaining Components

**Files:**
- All files in `src/components/` that reference `#c97454`, `#8b7355`, `#fef7f4`, `#fceee7`

**Step 1: Find all remaining raw hex references**

```bash
grep -rn "#c97454\|#8b7355\|#fef7f4\|#fceee7" src/components/
```

**Step 2: Replace systematically**

For each file found:
- `#c97454` → `#ef5323`
- `#8b7355` → `#490f5f` (BUT: review each usage — GoalTracker accent bar may want a distinct color. If secondary accent is used for partner-related elements, keep using `accent.secondary` token concept but with the new purple value)
- `#fef7f4` → `#fef5f0`
- `#fceee7` → `#fce8dc`

Key components likely affected:
- `PromptCard.tsx` — accent bar, type colors
- `GoalTracker.tsx` — accent bar (`#8b7355`), completed colors
- `WishlistCard.tsx` — accent bar
- `InsightCard.tsx` — accent bar
- `CompletionMoment.tsx` — accent bar, celebration colors
- `StreakRing.tsx` — ring color
- `ChatBubble.tsx` — own message bg
- `ConnectionHeader.tsx` — avatar colors
- `AnimatedCheckbox.tsx` — check color
- `SocialAuthButtons.tsx` — if any accent colors

**Step 3: Add font families to component text styles**

For each component with text, add appropriate `fontFamily`:
- Headings/titles: `'Alexandria-SemiBold'`
- Body text: `'Inter-Regular'`
- Labels/captions: `'Inter-Medium'`
- Button-like text: `'Inter-SemiBold'`

**Step 4: Verify components render correctly**

```bash
npm start
```

Check each screen that uses these components. Expected: Consistent orange accent, purple secondary, custom fonts throughout.

**Step 5: Commit**

```bash
git add src/components/
git commit -m "feat: update all components to Figma colors and typography"
```

---

## Task 9: Raw Hex Cleanup — Remaining Screens

**Files:**
- All files in `app/(app)/` besides today.tsx and _layout.tsx
- Any other screens with raw color references

**Step 1: Find all remaining raw hex references across app/**

```bash
grep -rn "#c97454\|#8b7355\|#fef7f4\|#fceee7" app/
```

**Step 2: Replace in each file**

Same replacements as Task 8. Key screens likely affected:
- `app/(app)/memories.tsx` or similar
- `app/(app)/insights.tsx` or similar
- `app/(app)/settings.tsx` or similar
- `app/(app)/chat.tsx`
- `app/(app)/wishlist.tsx`
- `app/(app)/resources.tsx`

**Step 3: Add font families to screen text styles**

Same pattern — Alexandria for headings, Inter for body.

**Step 4: Final sweep — any remaining old colors anywhere**

```bash
grep -rn "#c97454\|#8b7355\|#e9b8a3\|#b8a88a" src/ app/
```

Replace any stragglers.

**Step 5: Verify all screens**

```bash
npm start
```

Navigate through every tab and screen. Expected: No trace of old warm rust `#c97454` anywhere.

**Step 6: Commit**

```bash
git add app/ src/
git commit -m "feat: complete color and typography migration across all screens"
```

---

## Task 10: Rebuild Welcome/Landing Screen to Match Figma

**Files:**
- Modify: `app/(auth)/welcome.tsx` (complete rewrite of JSX and styles)
- Create: `src/assets/illustrations/` directory
- Create: `src/assets/illustrations/couple-highfive.png` (from Figma export)
- Create: `src/assets/logo-white.png` (white variant for purple bg)

**Step 1: Download illustration assets from Figma**

Using the Figma MCP or manual export:
- Export the couple high-fiving illustration as `couple-highfive.png` (2x, 3x)
- Export the Stoke logo in white as `logo-white.png`
- Export starburst/heart decorative vectors if available

Place in `src/assets/illustrations/`.

**Step 2: Rewrite welcome.tsx layout**

Replace the current welcome screen with the Figma design:

```typescript
import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Button } from '@components';

const coupleImage = require('../../src/assets/illustrations/couple-highfive.png');
const logoWhite = require('../../src/assets/logo-white.png');

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Purple hero section */}
      <View style={styles.heroSection}>
        <Animated.Image
          entering={FadeIn.duration(600)}
          source={logoWhite}
          style={styles.logo}
          resizeMode="contain"
        />
        <Animated.Image
          entering={FadeInUp.duration(500).delay(200)}
          source={coupleImage}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </View>

      {/* White content section */}
      <View style={styles.contentSection}>
        <Animated.Text entering={FadeInUp.duration(400).delay(300)} style={styles.tagline}>
          Tend to the moments,{'\n'}keep the Flame.
        </Animated.Text>
        <Animated.Text entering={FadeInUp.duration(400).delay(400)} style={styles.subtitle}>
          Stoke curiosity. Keep the spark alive.
        </Animated.Text>

        <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.actions}>
          <Button
            title="SIGN UP"
            onPress={() => router.push('/(auth)/sign-up')}
            size="lg"
          />
          <Pressable onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={styles.loginText}>
              <Text style={styles.loginTextMuted}>ALREADY HAVE AN ACCOUNT? </Text>
              <Text style={styles.loginTextAccent}>LOG IN</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  heroSection: {
    flex: 1,
    backgroundColor: '#490f5f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  logo: {
    width: 200,
    height: 76,
    marginBottom: 24,
  },
  heroImage: {
    width: 300,
    height: 300,
  },
  contentSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  tagline: {
    fontFamily: 'Alexandria-SemiBold',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
    color: '#3f414e',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#3f4553',
    textAlign: 'center',
    marginBottom: 40,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  loginText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    letterSpacing: 0.7,
  },
  loginTextMuted: {
    color: '#a1a4b2',
  },
  loginTextAccent: {
    color: '#ef5323',
  },
});
```

**Step 3: Verify welcome screen**

```bash
npm start
```

Expected: Purple hero section with logo and illustration, white bottom with tagline, orange SIGN UP button.

**Step 4: Commit**

```bash
git add src/assets/illustrations/ src/assets/logo-white.png app/\(auth\)/welcome.tsx
git commit -m "feat: rebuild welcome screen to match Figma design with purple hero"
```

---

## Task 11: Update Sign Up and Sign In Screens

**Files:**
- Modify: `app/(auth)/sign-in.tsx` (layout restructure)
- Modify: `app/(auth)/sign-up.tsx` (layout restructure)

**Step 1: Update sign-in.tsx layout**

Key changes to match Figma:
- Add decorative blob/vector at top (use a simple orange-tinted gradient or shape if illustration not available)
- Title: "Welcome Back!" — Alexandria SemiBold 28px
- Social auth buttons (Facebook, Google) as full-width pills
- "OR LOG IN WITH EMAIL" divider
- Email + password inputs — keep borderRadius 12 for in-app (or increase to 38 for auth pill style per design doc)
- Orange LOG IN button
- "Forgot Password?" link in orange
- "ALREADY HAVE AN ACCOUNT? SIGN UP" footer

Update input borderRadius to 38 for auth screens by passing a `style` prop override:
```typescript
<Input
  label="Email address"
  style={{ borderRadius: 38 }}
  // ... other props
/>
```

Or add a `variant="pill"` prop to Input if cleaner.

**Step 2: Update sign-up.tsx layout**

Similar to sign-in:
- "Create your account" — Alexandria SemiBold 28px
- Social auth buttons
- Username, email, password fields (pill radius)
- Privacy policy checkbox
- Orange GET STARTED button

**Step 3: Verify auth screens**

```bash
npm start
```

Expected: Both screens match Figma layout with pill inputs, orange buttons, Alexandria headings.

**Step 4: Commit**

```bash
git add app/\(auth\)/sign-in.tsx app/\(auth\)/sign-up.tsx
git commit -m "feat: update sign-in and sign-up screens to match Figma layout"
```

---

## Task 12: Update Onboarding — Add Choose Topic Screen

**Files:**
- Create or modify: `app/(onboarding)/relationship-stage.tsx` (may already exist — this maps to "choose topic")

**Step 1: Check if relationship-stage.tsx is the right file**

Read `app/(onboarding)/relationship-stage.tsx` to see if it's the mood/topic selector.

**Step 2: Rebuild to match Figma "choose topic" design**

Key elements:
- Decorative wavy header (organic blob shapes — can use a simple gradient background or placeholder illustration)
- "What does your relationship feel like right now?" — Alexandria SemiBold 28px
- Masonry-style grid (2 columns) of selectable cards:
  - "Comfortable but busy", "New and exciting", "A little disconnected", "Going through a lot", "Deep and steady", "In a bit of a rut", "Reduce Stress"
  - Rounded 20px, varying heights
  - Selectable: orange border + warm tint on selection
  - Each card can have a subtle background illustration (placeholder for now)

Implementation approach:
- Use a `ScrollView` with two columns via `flexWrap: 'wrap'`
- Cards use `Pressable` with animated selection state
- Selected card gets `borderColor: '#ef5323'`, `backgroundColor: '#fef5f0'`

**Step 3: Verify**

```bash
npm start
```

Walk through onboarding to the topic screen. Expected: Masonry grid, selectable cards, orange selection state.

**Step 4: Commit**

```bash
git add app/\(onboarding\)/relationship-stage.tsx
git commit -m "feat: rebuild relationship stage screen with Figma masonry card design"
```

---

## Task 13: Update Onboarding — Reminders Screen

**Files:**
- Modify: `app/(onboarding)/preferences.tsx` (this is likely the reminders/time picker screen)

**Step 1: Update preferences.tsx to match Figma reminders design**

Key changes:
- "What times would you prefer to engage with Stoke?" — Alexandria SemiBold 28px
- Time picker: use `@react-native-picker/picker` or a custom wheel picker in a rounded container
- "Which day would you like to receive prompts?" — Alexandria SemiBold heading
- Day-of-week circles: 7 circular toggles (SU, M, T, W, TH, F, S)
  - Default: outline circle, Inter Medium text
  - Selected: filled orange circle, white text
- Orange SAVE pill button
- "NO THANKS" text link below in muted color

Day circle component:
```typescript
const DayCircle = ({ label, selected, onPress }) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.dayCircle,
      selected && styles.dayCircleSelected,
    ]}
  >
    <Text style={[
      styles.dayLabel,
      selected && styles.dayLabelSelected,
    ]}>
      {label}
    </Text>
  </Pressable>
);

// styles
dayCircle: {
  width: 41,
  height: 41,
  borderRadius: 20.5,
  borderWidth: 1,
  borderColor: '#e7e5e4',
  alignItems: 'center',
  justifyContent: 'center',
},
dayCircleSelected: {
  backgroundColor: '#ef5323',
  borderColor: '#ef5323',
},
dayLabel: {
  fontFamily: 'Inter-Medium',
  fontSize: 13,
  color: '#57534e',
},
dayLabelSelected: {
  color: '#ffffff',
},
```

**Step 2: Verify**

```bash
npm start
```

Expected: Updated preferences screen with day circles and Figma styling.

**Step 3: Commit**

```bash
git add app/\(onboarding\)/preferences.tsx
git commit -m "feat: update preferences screen with Figma reminders design"
```

---

## Task 14: Create Illustration Assets Directory and Placeholders

**Files:**
- Create: `src/assets/illustrations/` (if not done in Task 10)
- Create placeholder files for future illustrations

**Step 1: Ensure illustrations directory exists**

```bash
mkdir -p src/assets/illustrations
```

**Step 2: Download available Figma assets**

Using Figma MCP `get_design_context` tool, export these assets:
- Couple high-fiving (from welcome screen node `2325:46`)
- Stoke logo white variant (from node `2315:2`)
- Decorative vectors (starbursts, hearts)

Save as:
- `src/assets/illustrations/couple-highfive.png`
- `src/assets/illustrations/starburst.png`
- `src/assets/illustrations/heart-outline.png`
- `src/assets/logo-white.png`

**Step 3: For screens needing illustrations we don't have, create placeholder approach**

Add a comment in each screen file where an illustration is needed:
```typescript
// TODO: Replace with matching-style illustration
// Placeholder: use a simple gradient or colored shape
```

**Step 4: Commit**

```bash
git add src/assets/illustrations/ src/assets/logo-white.png
git commit -m "feat: add illustration assets from Figma exports"
```

---

## Task 15: Global Sweep and Type Check

**Files:**
- Any remaining files with old color/font references

**Step 1: Final grep for any remaining old colors**

```bash
grep -rn "#c97454\|#8b7355\|#e9b8a3\|#b8a88a\|#d4a48e\|#9a5a3a" src/ app/ --include="*.tsx" --include="*.ts"
```

Replace any remaining instances following the color mapping from the design doc.

**Step 2: Run TypeScript check**

```bash
npm run typecheck
```

Fix any type errors introduced by theme changes (e.g., if components reference removed/renamed tokens).

**Step 3: Run linter**

```bash
npm run lint
```

Fix any lint issues.

**Step 4: Run tests**

```bash
npm test
```

Fix any test failures (likely snapshot tests that reference old colors).

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: final sweep — fix remaining old colors, types, lint, and tests"
```

---

## Task 16: Visual QA Pass

**Step 1: Walk through every screen and verify**

Check each screen on the iOS simulator:

1. Welcome/Landing — purple hero, orange CTA
2. Sign In — Alexandria heading, orange button, pill inputs
3. Sign Up — same styling
4. Onboarding flow — all screens use new colors/fonts
5. Today tab — orange accents, Alexandria greeting
6. Memories tab — orange accents
7. Insights tab — orange accents
8. Settings tab — orange accents
9. Chat — orange own-bubble
10. Wishlist — orange accents
11. Goals — verify secondary color (purple) works for partner elements

**Step 2: Document any visual issues**

Create a checklist of anything that needs fixing. Address each one.

**Step 3: Final commit**

```bash
git add -A
git commit -m "fix: visual QA fixes from full app redesign review"
```

---

## Summary

| Task | Description | Key Files |
|---|---|---|
| 1 | Install custom fonts | `src/assets/fonts/`, `app/_layout.tsx` |
| 2 | Update theme tokens | `src/config/theme.ts` |
| 3 | Update Button + Input | `src/components/Button.tsx`, `Input.tsx` |
| 4 | Update tab bar | `app/(app)/_layout.tsx` |
| 5 | Update Today screen | `app/(app)/today.tsx` |
| 6 | Update auth screens | `app/(auth)/welcome.tsx`, `sign-in.tsx`, `sign-up.tsx` |
| 7 | Update onboarding screens | `app/(onboarding)/*.tsx` |
| 8 | Update all components | `src/components/*.tsx` |
| 9 | Update remaining screens | `app/(app)/*.tsx` |
| 10 | Rebuild welcome screen | `app/(auth)/welcome.tsx`, illustrations |
| 11 | Update sign-in/sign-up layout | `app/(auth)/sign-in.tsx`, `sign-up.tsx` |
| 12 | Rebuild choose topic screen | `app/(onboarding)/relationship-stage.tsx` |
| 13 | Update reminders screen | `app/(onboarding)/preferences.tsx` |
| 14 | Add illustration assets | `src/assets/illustrations/` |
| 15 | Global sweep + type check | All files |
| 16 | Visual QA pass | All screens |
