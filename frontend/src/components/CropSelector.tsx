/**
 * Crop Selector Component
 * ========================
 * Horizontal scroll crop selection with icons
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../theme';
import { Crop } from '../api/scans';
import { getCropName } from '../i18n';

interface CropSelectorProps {
  crops: Crop[];
  selectedCropId: number;
  onSelectCrop: (cropId: number) => void;
}

const CropSelector: React.FC<CropSelectorProps> = ({
  crops,
  selectedCropId,
  onSelectCrop,
}) => {

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {crops.map((crop) => {
        const isSelected = crop.id === selectedCropId;
        
        return (
          <TouchableOpacity
            key={crop.id}
            style={[
              styles.cropItem,
              isSelected && styles.selectedItem,
            ]}
            onPress={() => onSelectCrop(crop.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.cropIcon}>{crop.icon}</Text>
            <Text
              style={[
                styles.cropName,
                isSelected && styles.selectedText,
              ]}
            >
              {getCropName(crop.name)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  cropItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.sm,
  },
  selectedItem: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  cropIcon: {
    fontSize: 22,
  },
  cropName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  selectedText: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default CropSelector;
