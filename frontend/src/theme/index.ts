/**
 * FasalVaidya Theme Configuration
 * ================================
 * Design system colors, typography, and spacing based on Dev Guidelines
 */

export const colors = {
  // Primary Colors
  primary: '#208F78',
  primaryDark: '#1B7A66',
  primaryDarker: '#166B58',
  
  // Secondary Colors
  secondary: '#1B4D3E',
  
  // Semantic Colors
  success: '#208F78',
  error: '#D63D3D',
  warning: '#F5A623',
  info: '#3B82F6',
  
  // Severity Colors
  critical: '#D63D3D',
  attention: '#F5A623',
  healthy: '#208F78',
  
  // Neutral Colors
  background: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  
  // Text Colors
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textWhite: '#FFFFFF',
  
  // Disabled
  disabled: '#9CA3AF',
  disabledBackground: '#F3F4F6',
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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const typography = {
  display: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 43,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
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
