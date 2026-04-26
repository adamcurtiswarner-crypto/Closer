import { TextStyle } from 'react-native';

// ============================================
// COLOR TOKENS
// ============================================

export const colors = {
  // Surface
  surface: {
    background: '#fef7f4',
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
    primary: '#c97454',
    primaryLight: '#f9a07a',
    secondary: '#490f5f',
    secondaryLight: '#7b3f8d',
  },

  // Gradients (start, end)
  gradient: {
    warmGlow: ['#fef5f0', '#fce8dc'] as const,
    ember: ['#c97454', '#f5734a'] as const,
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
    accent: '#c97454',
  },

  // Skeleton
  skeleton: {
    base: '#e7e5e4',
    shimmer: 'rgba(255, 255, 255, 0.3)',
  },
} as const;

// ============================================
// SPACING
// ============================================

export const spacing = {
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
    shadowColor: '#c97454',
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
    backgroundColor: '#ffffff',
    borderRadius: 20,
    ...shadow.card,
  },
  accentBar: {
    height: 3,
    backgroundColor: '#c97454',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
