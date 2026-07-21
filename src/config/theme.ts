import { TextStyle } from 'react-native';

// ============================================
// COLOR TOKENS
// ============================================

export const colors = {
  // Surface
  surface: {
    background: '#F5F2EE',
    card: '#FFFFFF',
    warmTint: '#FDF1ED',
    ink: '#1E1E2E',
  },

  // On-ink / on-coral — tone-on-tone white opacities for hero surfaces
  onDark: {
    body: 'rgba(255,255,255,0.72)',
    muted: 'rgba(255,255,255,0.5)',
    faint: 'rgba(255,255,255,0.35)',
    outline: 'rgba(255,255,255,0.25)',
    field: 'rgba(255,255,255,0.08)',
  },

  // Text
  text: {
    primary: '#1E1E2E',
    secondary: '#6B6B7A',
    // muted is NOT for copy — reserved for disabled states, inactive tab
    // tint, and decorative glyphs. Darkened from #B8B8C4 so UI components
    // pass 3:1 on white/warm surfaces (3.4:1 / 3.1:1). Readable copy uses
    // text.secondary.
    muted: '#8A8A96',
    inverse: '#FFFFFF',
  },

  // Accent
  accent: {
    primary: '#D4522A',
    primaryLight: '#FDF1ED',
    secondary: '#3D2870',
    secondaryLight: '#F3ECF6',
  },

  // Gradients (start, end)
  gradient: {
    warmGlow: ['#F5F2EE', '#FDF1ED'] as const,
    sunrise: ['#FDF1ED', '#F5F2EE'] as const,
  },

  // Brand
  brand: {
    purple: '#3D2870',
    purpleLight: '#F3ECF6',
    green: '#7BAE7F',
    greenLight: '#EDF4EE',
  },

  // Semantic — warm-shifted family (same roles, warmer hues)
  semantic: {
    success: '#4E7E52',
    successLight: '#EAF2EB',
    destructive: '#BA4234',
    destructiveLight: '#F9EDEB',
    neutral: '#f59e0b',
    neutralLight: '#fefce8',
  },

  // Border
  border: {
    default: '#E2DED8',
    accent: '#D4522A',
  },

  // Skeleton
  skeleton: {
    base: '#E2DED8',
    shimmer: 'rgba(255, 255, 255, 0.3)',
  },

  // Third-party brand colors (fixed by external brand guidelines)
  external: {
    google: '#4285F4',
    apple: '#000000',
  },

  // Badge tiers
  badgeTier: {
    seed: { fill: '#f0ebe6', tint: '#8b7355', border: '#d6ccbc' },
    bloom: { fill: '#FDF1ED', tint: '#D4522A', border: '#f5c4a8' },
    flame: { fill: '#FDF1ED', tint: '#D4522A', border: '#f09060' },
    keeper: { fill: '#f3ecf6', tint: '#3D2870', border: '#c49bd0' },
  },
} as const;

// ============================================
// SPACING
// ============================================

export const spacing = {
  // Named semantic spacing
  screen: 20,
  section: 16,
  cardPad: 20,
  itemGap: 8,

  // Backward-compatible numeric scale
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const radius = {
  // Named semantic radii
  hero: 20,
  card: 16,
  choice: 14,
  input: 12,
  pill: 50,
  nav: 9,

  // Backward-compatible scale
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardSubtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  accent: {
    shadowColor: '#D4522A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

// ============================================
// CARD PRESETS
// ============================================

export const card = {
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    ...shadow.card,
  },
  standard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...shadow.card,
  },
  // Canonical 3px accent bar — render via <AccentBar /> (src/components/AccentBar.tsx).
  // Only the primary card of a screen carries it. Parent needs overflow: 'hidden'.
  accentBar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#D4522A',
  },
} as const;

// ============================================
// TYPOGRAPHY SCALE
// ============================================

// One true type scale. Line-heights are baked in — never override
// fontSize / lineHeight / fontFamily / fontWeight at a usage site.
// Text styles compose as `...typography.X` plus color/textAlign/margins only.
export const typography = {
  hero: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
    letterSpacing: -0.5,
  } as TextStyle,

  display: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
    letterSpacing: -0.3,
  } as TextStyle,

  headingLg: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
  } as TextStyle,

  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
  } as TextStyle,

  h3: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Nunito-ExtraBold',
    fontWeight: '800',
  } as TextStyle,

  body: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '600',
  } as TextStyle,

  // Reading-weight body — reveal answers and other passages the couple
  // actually sits with. One step up from body, same quiet SemiBold.
  bodyLg: {
    fontSize: 17,
    lineHeight: 25,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '600',
  } as TextStyle,

  bodySm: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '600',
  } as TextStyle,

  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '600',
  } as TextStyle,

  eyebrow: {
    fontSize: 9,
    lineHeight: 13,
    fontFamily: 'Nunito-ExtraBold',
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,

  btn: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  } as TextStyle,

  // Monospace invite-code display (hero readout on invite/accept screens)
  code: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 4,
  } as TextStyle,

  // Monospace invite-code inline (settings partnership row)
  codeInline: {
    fontFamily: 'Courier',
    fontWeight: '600',
    letterSpacing: 2,
  } as TextStyle,
} as const;

// ============================================
// ICON SIZES
// ============================================

export const iconSize = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
} as const;
