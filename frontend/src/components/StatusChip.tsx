/**
 * Status Chip Component
 * ======================
 * Displays severity status (Healthy/Attention/Critical)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
import { t } from '../i18n';

type Severity = 'healthy' | 'attention' | 'critical';

interface StatusChipProps {
  status: Severity;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

const StatusChip: React.FC<StatusChipProps> = ({
  status,
  size = 'medium',
  showIcon = true,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          backgroundColor: `${colors.healthy}20`,
          textColor: colors.healthy,
          icon: '✓',
          label: t('healthy'),
        };
      case 'attention':
        return {
          backgroundColor: `${colors.attention}20`,
          textColor: colors.attention,
          icon: '⚠',
          label: t('attention'),
        };
      case 'critical':
        return {
          backgroundColor: `${colors.critical}20`,
          textColor: colors.critical,
          icon: '!',
          label: t('critical'),
        };
      default:
        return {
          backgroundColor: colors.disabledBackground,
          textColor: colors.textSecondary,
          icon: '?',
          label: 'Unknown',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.chip,
        styles[size],
        { backgroundColor: config.backgroundColor },
      ]}
    >
      {showIcon && (
        <Text style={[styles.icon, { color: config.textColor }]}>
          {config.icon}
        </Text>
      )}
      <Text style={[styles.label, styles[`${size}Text`], { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    gap: 4,
  },
  small: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  medium: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 4,
  },
  large: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  icon: {
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    fontWeight: '600',
  },
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 12,
  },
  largeText: {
    fontSize: 14,
  },
});

export default StatusChip;
