/**
 * Crop Selector Component
 * ========================
 * Horizontal scroll crop selection with icons
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Crop } from '../api/scans';
import { getCropName } from '../i18n';
import { colors, spacing } from '../theme';
import { getCropIcon } from '../utils/cropIcons';

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
    <View style={styles.container}>
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
            <View style={[styles.iconContainer, isSelected && styles.selectedIconContainer]}>
              {(() => {
                const src = getCropIcon(crop.name);
                return src ? (
                  <Image source={src} style={styles.cropIconImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.cropIcon}>{crop.icon}</Text>
                );
              })()}
            </View>
            <Text
              style={[
                styles.cropName,
                isSelected && styles.selectedText,
              ]}
              numberOfLines={1}
            >
              {getCropName(crop.name)}
            </Text>
            {isSelected && (
              <View style={styles.checkmarkBadge}>
                <Ionicons name="checkmark" size={12} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg, // Increased gap for airy feel
    justifyContent: 'flex-start',
  },
  cropItem: {
    width: '28%', // Slightly narrower to fit 3 comfortably with larger gaps
    alignItems: 'center',
    justifyContent: 'flex-start',
    // Removed background, border, shadow for minimalist look
    paddingVertical: spacing.xs, 
    marginBottom: spacing.sm,
  },
  selectedItem: {
    // No container style change for selection in this design
  },
  iconContainer: {
    width: 64, // Larger icon circle
    height: 64,
    borderRadius: 32, // Perfect circle
    backgroundColor: '#F3F4F6', // Light gray default
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  selectedIconContainer: {
    backgroundColor: `${colors.primary}15`, // Light primary tint
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cropIcon: {
    fontSize: 32,
  },
  cropIconImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  cropName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  selectedText: {
    color: colors.primary,
    fontWeight: '700',
  },
  checkmarkBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
});

export default CropSelector;
