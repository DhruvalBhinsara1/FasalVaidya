/**
 * FasalVaidya Theme Configuration
 * ================================
 * Design system colors, typography, and spacing based on Dev Guidelines
 */

export const colors = {
  // Primary Greens (brighter per mockup)
  primary: '#0FC15F',
  primaryDark: '#0BA752',
  primaryDarker: '#0A8E45',
  
  // Secondary / surface
  secondary: '#0F1C14',
  surfaceDark: '#0F1C14',
  surfaceMuted: '#111B13',
  
  // Semantic Colors
  success: '#0FC15F',
  error: '#D63D3D',
  warning: '#F5A623',
  info: '#3B82F6',
  
  // Severity Colors
  critical: '#D63D3D',
  attention: '#F5A623',
  healthy: '#0FC15F',
  
  // Neutral Colors
  background: '#F4F8F4',
  card: '#FFFFFF',
  border: '#E5E7EB',
  shadow: 'rgba(0,0,0,0.12)',
  
  // Text Colors
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textWhite: '#FFFFFF',
  
  // Disabled
  disabled: '#9CA3AF',
  disabledBackground: '#EFF1F3',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
};

export const typography = {
  display: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 43,
  },
  h1: {
    fontSize: 30,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 29,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  large: {
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 27,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  tiny: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};
