import { TextStyle } from 'react-native';

// ============================================
// COLOR TOKENS
// ============================================

export const colors = {
  // Surface
  surface: {
    background: '#fafaf9',
    card: '#ffffff',
    warmTint: '#fef7f4',
    warmTintDeep: '#fceee7',
  },

  // Text
  text: {
    primary: '#1c1917',
    secondary: '#57534e',
    tertiary: '#78716c',
    muted: '#a8a29e',
    inverse: '#ffffff',
  },

  // Accent
  accent: {
    primary: '#c97454',
    primaryLight: '#e9b8a3',
    secondary: '#8b7355',
    secondaryLight: '#b8a88a',
  },

  // Gradients (start, end)
  gradient: {
    warmGlow: ['#fef7f4', '#fceee7'] as const,
    ember: ['#c97454', '#d4956f'] as const,
    sunrise: ['#fceee7', '#fef7f4'] as const,
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
    default: '#e7e5e4',
    subtle: '#f5f5f4',
    accent: '#c97454',
  },

  // Skeleton
  skeleton: {
    base: '#e7e5e4',
    shimmer: 'rgba(255, 255, 255, 0.3)',
  },
} as const;

// ============================================
// TYPOGRAPHY SCALE
// ============================================

export const typography = {
  display: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 38,
  } as TextStyle,

  heading: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 30,
  } as TextStyle,

  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 22,
  } as TextStyle,

  body: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 22,
  } as TextStyle,

  caption: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 18,
  } as TextStyle,

  overline: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    lineHeight: 14,
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
