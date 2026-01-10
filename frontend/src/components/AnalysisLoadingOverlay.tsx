/**
 * Analysis Loading Overlay
 * -------------------------
 * Friendly, icon-first loading experience for low-literacy users.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing } from '../theme';

interface AnalysisLoadingOverlayProps {
  visible: boolean;
}

const AnalysisLoadingOverlay: React.FC<AnalysisLoadingOverlayProps> = ({ visible }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;

    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2400,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.96,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    spinLoop.start();
    pulseLoop.start();

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
      spinAnim.setValue(0);
      pulseAnim.setValue(1);
    };
  }, [visible, spinAnim, pulseAnim]);

  if (!visible) return null;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Analyzing…</Text>
        <View style={styles.meterContainer}>
          <Animated.View
            style={[
              styles.ring,
              {
                transform: [{ rotate: spin }, { scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.dot} />
          </Animated.View>
          <View style={styles.face}>
            <Ionicons name="happy-outline" size={48} color={colors.primary} />
            <View style={styles.progressPill}>
              <Text style={styles.progressText}>72%</Text>
            </View>
          </View>
        </View>

        <View style={styles.nutrientRow}>
          <View style={[styles.nutrientPill, styles.nPill]}>
            <Ionicons name="flask" size={16} color="#fff" />
            <Text style={styles.nutrientText}>N</Text>
          </View>
          <View style={[styles.nutrientPill, styles.pDisabled]}>
            <Text style={styles.nutrientTextDisabled}>P</Text>
          </View>
          <View style={[styles.nutrientPill, styles.kDisabled]}>
            <Text style={styles.nutrientTextDisabled}>K</Text>
          </View>
        </View>

        <View style={styles.bottomPanel}>
          <View style={styles.bottomRow}>
            <Ionicons name="checkmark-done" size={20} color="#7FF0B1" />
            <Text style={styles.bottomTitle}>Checking nutrient levels</Text>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="sync" size={18} color="#7FF0B1" />
            </Animated.View>
          </View>
          <Text style={styles.bottomSub}>AI is reviewing your leaf</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 99,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...{
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 24,
      elevation: 10,
    },
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  meterContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ring: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 10,
    borderColor: '#E7F6ED',
    borderTopColor: colors.primary,
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 70,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
  },
  face: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F2FBF6',
    alignItems: 'center',
    justifyContent: 'center',
    ...{
      shadowColor: '#7FF0B1',
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 16,
      elevation: 8,
    },
  },
  progressPill: {
    position: 'absolute',
    bottom: -12,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    ...{
      shadowColor: colors.primary,
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 6,
    },
  },
  progressText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  nutrientRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  nutrientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  nPill: {
    backgroundColor: colors.primary,
  },
  pDisabled: {
    backgroundColor: '#F0F1F3',
  },
  kDisabled: {
    backgroundColor: '#F0F1F3',
  },
  nutrientText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  nutrientTextDisabled: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  bottomPanel: {
    width: '100%',
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bottomTitle: {
    flex: 1,
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  bottomSub: {
    color: '#C7D0D6',
    fontSize: 13,
  },
});

export default AnalysisLoadingOverlay;
