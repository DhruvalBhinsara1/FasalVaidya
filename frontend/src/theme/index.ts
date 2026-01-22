/**
 * FasalVaidya Theme Configuration
 * ================================
 * Design system based on Master UI/UX Guidelines
 * Colors communicate meaning, not decoration.
 */

export const colors = {
  // === PRIMARY PALETTE (Master UI Approved) ===
  primary: '#4C763B',           // Primary Green
  primaryDark: '#043915',       // Secondary Green (darker)
  primaryDarker: '#032D11',     // Even darker variant
  
  // === SECONDARY / SURFACE ===
  secondary: '#043915',         // Secondary Green
  surfaceDark: '#043915',       // Dark surface (history screen bg)
  surfaceMuted: '#0A4A1C',      // Muted dark surface
  
  // === POSITIVE / SUCCESS TONES ===
  lightPositive: '#DBFFCB',     // Light positive background
  positiveGreen: '#BEE4D0',     // Positive green tint
  accentSoft: '#B0CE88',        // Soft accent green
  
  // === SEMANTIC COLORS ===
  success: '#4C763B',           // Same as primary
  error: '#FF6363',             // Dark Red
  warning: '#FA8112',           // Caution orange
  info: '#3B82F6',              // Info blue (unchanged)
  
  // === SEVERITY COLORS ===
  critical: '#FF6363',          // Dark Red - urgent only
  criticalSoft: '#FF8282',      // Soft Red - less urgent
  attention: '#FA8112',         // Caution orange
  healthy: '#4C763B',           // Primary green
  
  // === HIGHLIGHT ===
  highlight: '#FFFD8F',         // Highlight Yellow
  
  // === NEUTRAL COLORS ===
  background: '#F4F8F4',        // Light background
  card: '#FFFFFF',              // Card white
  border: '#E5E7EB',            // Border gray
  shadow: 'rgba(0,0,0,0.12)',   // Shadow
  
  // === TEXT COLORS ===
  textPrimary: '#222222',       // Text Black (Master UI)
  textSecondary: '#6B7280',     // Secondary text
  textTertiary: '#9CA3AF',      // Tertiary/muted text
  textWhite: '#FFFFFF',         // White text
  
  // === DISABLED ===
  disabled: '#9CA3AF',
  disabledBackground: '#EFF1F3',
  
  // === STATUS BADGE BACKGROUNDS ===
  healthyBg: '#DBFFCB',         // Light green for healthy cards
  criticalBg: '#FFE5E5',        // Light red for critical cards
  attentionBg: '#FFF3E0',       // Light orange for attention cards
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,    // Horizontal padding (fixed per Master UI)
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 6,
  md: 12,    // Card border radius (12-16px per Master UI)
  lg: 16,    // Card border radius
  xl: 24,
  full: 999, // Pill-shaped buttons
};

// Button minimum height: 44px (Master UI guideline)
export const buttonHeight = {
  sm: 36,
  md: 44,    // Minimum per Master UI
  lg: 52,
};

export const typography = {
  // Screen Title - Bold, largest
  display: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 43,
    fontFamily: 'Inter',
  },
  // Section Header - Medium, dark green
  h1: {
    fontSize: 30,
    fontWeight: '700' as const,
    lineHeight: 36,
    fontFamily: 'Inter',
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 29,
    fontFamily: 'Inter',
  },
  // Card Title - Bold, dark text
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 24,
    fontFamily: 'Inter',
  },
  large: {
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 27,
    fontFamily: 'Inter',
  },
  // Body Text - Regular
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    fontFamily: 'Inter',
  },
  small: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    fontFamily: 'Inter',
  },
  // Metadata - Smaller, muted
  tiny: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    fontFamily: 'Inter',
  },
};

export const shadows = {
  // Very soft shadow only (Master UI guideline)
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Health score thresholds (Master UI guideline)
export const healthThresholds = {
  healthy: 80,    // >= 80 is green/healthy
  attention: 50,  // 50-79 is orange/attention
  critical: 0,    // < 50 is red/critical
};

// Get color based on health score
export const getHealthColor = (score: number): string => {
  if (score >= healthThresholds.healthy) return colors.healthy;
  if (score >= healthThresholds.attention) return colors.attention;
  return colors.critical;
};

// Get background color for cards based on status
export const getStatusBackground = (status: 'healthy' | 'attention' | 'critical'): string => {
  switch (status) {
    case 'healthy': return colors.healthyBg;
    case 'attention': return colors.attentionBg;
    case 'critical': return colors.criticalBg;
    default: return colors.card;
  }
};

export default {
  colors,
  spacing,
  borderRadius,
  buttonHeight,
  typography,
  shadows,
  healthThresholds,
  getHealthColor,
  getStatusBackground,
};
