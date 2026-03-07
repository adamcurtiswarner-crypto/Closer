import { TextStyle } from 'react-native';

// ============================================
// COLOR TOKENS
// ============================================

export const colors = {
  // Surface
  surface: {
    background: '#fafaf9',
    card: '#ffffff',
    warmTint: '#fef5f0',
    warmTintDeep: '#fce8dc',
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
    primary: '#ef5323',
    primaryLight: '#f9a07a',
    secondary: '#490f5f',
    secondaryLight: '#7b3f8d',
  },

  // Gradients (start, end)
  gradient: {
    warmGlow: ['#fef5f0', '#fce8dc'] as const,
    ember: ['#ef5323', '#f5734a'] as const,
    sunrise: ['#fce8dc', '#fef5f0'] as const,
  },

  // Brand
  brand: {
    purple: '#490f5f',
    purpleLight: '#6b2d7b',
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
    accent: '#ef5323',
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
  hero: {
    fontSize: 38,
    fontFamily: 'Alexandria-SemiBold',
    lineHeight: 46,
    letterSpacing: -0.5,
  } as TextStyle,

  display: {
    fontSize: 32,
    fontFamily: 'Alexandria-SemiBold',
    lineHeight: 38,
    letterSpacing: -0.5,
  } as TextStyle,

  heading: {
    fontSize: 28,
    fontFamily: 'Alexandria-SemiBold',
    lineHeight: 34,
    letterSpacing: -0.3,
  } as TextStyle,

  title: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    lineHeight: 22,
    letterSpacing: -0.3,
  } as TextStyle,

  body: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
    letterSpacing: 0,
  } as TextStyle,

  caption: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
    letterSpacing: 0,
  } as TextStyle,

  overline: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    lineHeight: 14,
    letterSpacing: 0.7,
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
