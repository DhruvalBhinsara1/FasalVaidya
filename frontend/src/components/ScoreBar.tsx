/**
 * Score Bar Component
 * ====================
 * Visual bar showing NPK deficiency score with color coding
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';

interface ScoreBarProps {
  label: string;
  score: number; // 0-100
  confidence: number; // 0-100
  severity: 'healthy' | 'attention' | 'critical';
}

const ScoreBar: React.FC<ScoreBarProps> = ({
  label,
  score,
  confidence,
  severity,
}) => {
  const getBarColor = () => {
    switch (severity) {
      case 'healthy':
        return colors.healthy;
      case 'attention':
        return colors.attention;
      case 'critical':
        return colors.critical;
      default:
        return colors.textTertiary;
    }
  };

  const barColor = getBarColor();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color: barColor }]}>
            {score.toFixed(0)}%
          </Text>
          <Text style={styles.confidence}>
            ({confidence.toFixed(0)}% conf.)
          </Text>
        </View>
      </View>
      
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(score, 100)}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
  },
  confidence: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  barBackground: {
    height: 12,
    backgroundColor: colors.disabledBackground,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});

export default ScoreBar;
