import { Platform } from 'react-native';

/**
 * Design Tokens for Kollector Mobile
 *
 * Mirror of web/src/index.css Stitch Design System
 * Centralized source of truth for consistent styling
 */

export const colors = {
  // Primary brand color
  primary: '#25f4d1',
  primaryHover: '#1ed9b9',
  primaryMuted: 'rgba(37, 244, 209, 0.1)',

  // Background colors (dark theme)
  backgroundDark: '#10221f',
  surfaceDark: '#162825',
  surfaceHighlight: '#203632',
  borderDark: '#283936',

  // Text colors
  textPrimary: '#ffffff',
  textSecondary: '#9cbab5',
  textMuted: '#6b8a85',

  // Status colors
  statusReady: '#10b981',      // emerald - for "active" status displayed as "Ready"
  statusProcessing: '#25f4d1', // primary - animated pulse
  statusFailed: '#ef4444',     // red
  statusArchived: '#6b7280',   // gray
  statusPartial: '#f59e0b',    // warning/amber
  statusDraft: '#9ca3af',      // gray

  // Semantic aliases
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#25f4d1',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 6,   // 0.375rem
  md: 8,   // 0.5rem
  lg: 12,  // 0.75rem
  xl: 16,  // 1rem
  full: 9999,
};

export const typography = {
  fontFamily: {
    sans: 'System', // Use system font on mobile for performance
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
};

export const shadows = Platform.OS === 'web'
  ? {
      sm: { boxShadow: '0px 1px 2px rgba(0,0,0,0.18)', elevation: 1 },
      md: { boxShadow: '0px 2px 4px rgba(0,0,0,0.23)', elevation: 4 },
      lg: { boxShadow: '0px 4px 8px rgba(0,0,0,0.3)', elevation: 8 },
    }
  : {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1.0,
        elevation: 1,
      },
      md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        elevation: 4,
      },
      lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
      },
    };

// Minimum touch target size for accessibility (44pt)
export const touchTargetSize = 44;

// ── Compatibility aliases ──
// Components use Tailwind-like naming; these map to the semantic tokens above.

// Neutral grayscale palette (used by Button, Input, Skeleton, etc.)
colors.neutral = {
  100: colors.surfaceDark,
  200: colors.surfaceHighlight,
  300: colors.borderDark,
  400: colors.textMuted,
  500: colors.textMuted,
  700: colors.textSecondary,
  800: colors.surfaceDark,
  900: colors.textPrimary,
};
colors.white = '#ffffff';

// Named gray shortcuts (used by ImageToggle, etc.)
colors.gray50 = colors.backgroundDark;
colors.gray100 = colors.surfaceDark;
colors.gray300 = colors.borderDark;
colors.gray500 = colors.textMuted;
colors.gray700 = colors.textSecondary;

// Typography plural aliases (components use fontSizes/fontWeights)
typography.fontSizes = typography.fontSize;
typography.fontWeights = typography.fontWeight;

// Body alias (used by ProcessingOverlay, ImageToggle)
typography.body = { fontSize: typography.fontSize.base };

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  touchTargetSize,
};
