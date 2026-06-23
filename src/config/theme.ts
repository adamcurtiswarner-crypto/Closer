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
    warmTintDeep: '#FDF1ED',
  },

  // Text
  text: {
    primary: '#1E1E2E',
    secondary: '#6B6B7A',
    tertiary: '#6B6B7A',
    muted: '#B8B8C4',
    inverse: '#FFFFFF',
  },

  // Accent
  accent: {
    primary: '#D4522A',
    primaryLight: '#FDF1ED',
    secondary: '#3D2870',
    secondaryLight: '#3D2870',
  },

  // Gradients (start, end)
  gradient: {
    warmGlow: ['#F5F2EE', '#FDF1ED'] as const,
    ember: ['#D4522A', '#D4522A'] as const,
    sunrise: ['#FDF1ED', '#F5F2EE'] as const,
  },

  // Brand
  brand: {
    purple: '#3D2870',
    purpleLight: '#3D2870',
    green: '#7BAE7F',
  },

  // Semantic
  semantic: {
    success: '#22c55e',
    successLight: '#dcfce7',
    destructive: '#ef4444',
    destructiveLight: '#fef2f2',
    neutral: '#f59e0b',
    neutralLight: '#fefce8',
  },

  // Border
  border: {
    default: '#E2DED8',
    subtle: '#E2DED8',
    accent: '#D4522A',
  },

  // Skeleton
  skeleton: {
    base: '#E2DED8',
    shimmer: 'rgba(255, 255, 255, 0.3)',
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
  accentBar: {
    height: 3,
    backgroundColor: '#D4522A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
} as const;

// ============================================
// TYPOGRAPHY SCALE
// ============================================

export const typography = {
  hero: {
    fontSize: 32,
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
    letterSpacing: -0.5,
  } as TextStyle,

  display: {
    fontSize: 28,
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
    letterSpacing: -0.3,
  } as TextStyle,

  heading: {
    fontSize: 20,
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
  } as TextStyle,

  h3: {
    fontSize: 16,
    fontFamily: 'Nunito-ExtraBold',
    fontWeight: '800',
  } as TextStyle,

  body: {
    fontSize: 13,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '600',
    lineHeight: 20,
  } as TextStyle,

  caption: {
    fontSize: 11,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '600',
    lineHeight: 17,
  } as TextStyle,

  eyebrow: {
    fontSize: 9,
    fontFamily: 'Nunito-ExtraBold',
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,

  btn: {
    fontSize: 12,
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
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
