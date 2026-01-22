/**
 * FilterChips Component
 * ======================
 * Horizontal scrolling filter chips with single-select behavior
 * Per Master UI Guidelines:
 * - Active chip: filled primary green
 * - Inactive chip: outlined green
 * - Always single-select
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { borderRadius, buttonHeight, colors, spacing } from '../theme';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  style?: object;
}

const FilterChips: React.FC<FilterChipsProps> = ({
  options,
  selectedId,
  onSelect,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((option) => {
          const isActive = option.id === selectedId;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.chip,
                isActive ? styles.chipActive : styles.chipInactive,
              ]}
              onPress={() => onSelect(option.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  isActive ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {option.label}
              </Text>
              {option.count !== undefined && (
                <View
                  style={[
                    styles.countBadge,
                    isActive ? styles.countBadgeActive : styles.countBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      isActive ? styles.countTextActive : styles.countTextInactive,
                    ]}
                  >
                    {option.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    minHeight: buttonHeight.sm,
    gap: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.textWhite,
  },
  chipTextInactive: {
    color: colors.primary,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countBadgeInactive: {
    backgroundColor: `${colors.primary}15`,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  countTextActive: {
    color: colors.textWhite,
  },
  countTextInactive: {
    color: colors.primary,
  },
});

export default FilterChips;
