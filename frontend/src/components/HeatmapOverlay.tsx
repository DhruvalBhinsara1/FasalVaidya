/**
 * HeatmapOverlay Component
 * ========================
 * Displays the analyzed leaf image with problem area highlighting
 * Includes toggle functionality to show/hide heatmap
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { borderRadius, colors, shadows, spacing } from '../theme';

interface HeatmapOverlayProps {
  originalImage: string;
  heatmapImage?: string | null;
  severity: 'healthy' | 'low' | 'medium' | 'high' | 'critical';
  nutrient?: string;
  isHindi?: boolean;
  onFullScreen?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const imageSize = screenWidth - spacing.lg * 2;

const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({
  originalImage,
  heatmapImage,
  severity,
  nutrient,
  isHindi = false,
  onFullScreen,
}) => {
  // State: Show heatmap by default if available, otherwise show original
  const hasHeatmap = !!heatmapImage && heatmapImage.length > 0;
  const hasOriginal = !!originalImage && originalImage.length > 0;
  const [showHeatmap, setShowHeatmap] = useState(hasHeatmap);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Debug: Log when images change
  React.useEffect(() => {
    console.log('[HeatmapOverlay] Image props updated:', {
      hasHeatmap,
      hasOriginal,
      heatmapLength: heatmapImage?.length || 0,
      originalLength: originalImage?.length || 0,
      heatmapPrefix: heatmapImage?.substring(0, 50) || 'N/A',
    });
  }, [heatmapImage, originalImage, hasHeatmap, hasOriginal]);
  
  // Add timeout to prevent infinite loading (5 seconds)
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (imageLoading) {
        console.warn('[HeatmapOverlay] Image load timeout - forcing load complete');
        setImageLoading(false);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [imageLoading, showHeatmap]);

  // Update showHeatmap when heatmap availability changes
  React.useEffect(() => {
    if (hasHeatmap) {
      setShowHeatmap(true);
    } else if (hasOriginal) {
      setShowHeatmap(false);
    }
  }, [hasHeatmap, hasOriginal]);

  const getSeverityColor = () => {
    switch (severity) {
      case 'healthy':
        return '#4CAF50';
      case 'low':
        return '#8BC34A';
      case 'medium':
        return '#FFC107';
      case 'high':
        return '#FF9800';
      case 'critical':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  };

  const getSeverityLabel = () => {
    const labels = {
      healthy: isHindi ? 'स्वस्थ' : 'Healthy',
      low: isHindi ? 'हल्की कमी' : 'Low Deficiency',
      medium: isHindi ? 'मध्यम कमी' : 'Medium Deficiency',
      high: isHindi ? 'गंभीर कमी' : 'High Deficiency',
      critical: isHindi ? 'अति गंभीर' : 'Critical Deficiency',
    };
    return labels[severity] || severity;
  };

  const getNutrientLabel = () => {
    if (!nutrient) return '';
    const labels: Record<string, string> = {
      N: isHindi ? 'नाइट्रोजन' : 'Nitrogen',
      P: isHindi ? 'फॉस्फोरस' : 'Phosphorus',
      K: isHindi ? 'पोटेशियम' : 'Potassium',
      Mg: isHindi ? 'मैग्नीशियम' : 'Magnesium',
    };
    return labels[nutrient] || nutrient;
  };

  // Display logic: 
  // - If showHeatmap is true and heatmap exists, show heatmap
  // - Otherwise show original image (or heatmap as fallback if no original)
  const displayImage: string | undefined = showHeatmap && hasHeatmap 
    ? heatmapImage! 
    : (hasOriginal ? originalImage : (hasHeatmap ? heatmapImage! : undefined));
  
  // We have a valid image if we have either heatmap or original
  const hasValidImage = hasHeatmap || hasOriginal;
  
  // Can toggle only if we have BOTH images
  const canToggle = hasHeatmap && hasOriginal;
  
  // Handle toggle
  const handleToggle = () => {
    if (canToggle) {
      setImageLoading(true);
      setImageError(false);
      setShowHeatmap(!showHeatmap);
    }
  };

  return (
    <View style={styles.container}>
      {/* Image Container */}
      <View style={styles.imageWrapper}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onFullScreen}
          style={styles.imageContainer}
        >
          {/* Show loading only when we have a valid image to load */}
          {imageLoading && hasValidImage && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          
          {/* Show placeholder if no valid image */}
          {!hasValidImage && (
            <View style={styles.noImagePlaceholder}>
              <Ionicons name="leaf-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.noImageText}>
                {isHindi ? 'छवि उपलब्ध नहीं' : 'Image not available'}
              </Text>
            </View>
          )}
          
          {hasValidImage && (
            <Image
              source={{ uri: displayImage }}
              style={styles.image}
              resizeMode="cover"
              onLoadStart={() => {
                console.log('[HeatmapOverlay] Image load started');
                setImageLoading(true);
              }}
              onLoadEnd={() => {
                console.log('[HeatmapOverlay] Image load completed successfully');
                setImageLoading(false);
              }}
              onError={(error) => {
                console.error('[HeatmapOverlay] Image load error:', error.nativeEvent.error);
                setImageLoading(false);;
                setImageError(true);
              }}
            />
          )}
          
          {/* Error message if image fails to load */}
          {imageError && hasValidImage && (
            <View style={styles.errorPlaceholder}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
              <Text style={styles.errorText}>
                {isHindi ? 'छवि लोड करने में विफल' : 'Failed to load image'}
              </Text>
            </View>
          )}
          
          {/* Severity Badge - only show when image is visible */}
          {hasValidImage && !imageLoading && (
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor() },
              ]}
            >
              <Ionicons
                name={severity === 'healthy' ? 'checkmark-circle' : 'warning'}
                size={14}
                color={colors.textWhite}
              />
              <Text style={styles.severityText}>{getSeverityLabel()}</Text>
            </View>
          )}

          {/* Nutrient Label - only show when image is visible */}
          {nutrient && hasValidImage && !imageLoading && (
            <View style={styles.nutrientLabel}>
              <Text style={styles.nutrientText}>{getNutrientLabel()}</Text>
            </View>
          )}

          {/* Fullscreen Icon - only show when image is visible */}
          {onFullScreen && hasValidImage && !imageLoading && (
            <TouchableOpacity style={styles.fullscreenButton} onPress={onFullScreen}>
              <Ionicons name="expand-outline" size={20} color={colors.textWhite} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Heatmap Legend (when heatmap is shown) - Updated for blue-to-red scale */}
        {showHeatmap && hasHeatmap && (
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>
              {isHindi ? 'पोषक तत्व कमी हीटमैप' : 'Nutrient Deficiency Heatmap'}
            </Text>
            <View style={styles.legendGradient}>
              {/* Gradient bar from blue to red */}
              <View style={styles.gradientBar}>
                <View style={[styles.gradientSegment, { backgroundColor: '#1E88E5' }]} />
                <View style={[styles.gradientSegment, { backgroundColor: '#00BCD4' }]} />
                <View style={[styles.gradientSegment, { backgroundColor: '#8BC34A' }]} />
                <View style={[styles.gradientSegment, { backgroundColor: '#FFEB3B' }]} />
                <View style={[styles.gradientSegment, { backgroundColor: '#FF9800' }]} />
                <View style={[styles.gradientSegment, { backgroundColor: '#F44336' }]} />
              </View>
              <View style={styles.gradientLabels}>
                <Text style={styles.gradientLabel}>
                  {isHindi ? 'स्वस्थ' : 'Healthy'}
                </Text>
                <Text style={styles.gradientLabel}>
                  {isHindi ? 'गंभीर कमी' : 'Deficient'}
                </Text>
              </View>
            </View>
            <Text style={styles.legendHint}>
              {isHindi 
                ? 'लाल/पीला क्षेत्र = पोषक तत्वों की कमी' 
                : 'Red/Yellow areas indicate nutrient deficiency'}
            </Text>
          </View>
        )}
      </View>

      {/* Toggle Button - only show if we can toggle between both images */}
      {canToggle && (
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              showHeatmap && styles.toggleButtonActive,
            ]}
            onPress={handleToggle}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showHeatmap ? 'eye' : 'eye-off'}
              size={18}
              color={showHeatmap ? colors.textWhite : colors.primary}
            />
            <Text
              style={[
                styles.toggleText,
                showHeatmap && styles.toggleTextActive,
              ]}
            >
              {showHeatmap
                ? isHindi
                  ? 'मूल छवि दिखाएं'
                  : 'Show Original'
                : isHindi
                ? 'हीटमैप दिखाएं'
                : 'Show Heatmap'}
            </Text>
          </TouchableOpacity>

          <View style={styles.viewModeIndicator}>
            <Ionicons
              name={showHeatmap ? 'analytics' : 'image'}
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.viewModeText}>
              {showHeatmap
                ? isHindi
                  ? 'विश्लेषण दृश्य'
                  : 'Analysis View'
                : isHindi
                ? 'मूल छवि'
                : 'Original Image'}
            </Text>
          </View>
        </View>
      )}

      {/* No Heatmap Message */}
      {!hasHeatmap && (
        <View style={styles.noHeatmapMessage}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.noHeatmapText}>
            {isHindi
              ? 'इस छवि के लिए हीटमैप उपलब्ध नहीं है'
              : 'Heatmap not available for this image'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  imageWrapper: {
    position: 'relative',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background,
    ...shadows.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  noImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  noImageText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    zIndex: 2,
  },
  errorText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  severityBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  severityText: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  nutrientLabel: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  nutrientText: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: '500',
  },
  fullscreenButton: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: spacing.xs,
    borderRadius: borderRadius.full,
  },
  legend: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  legendTitle: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendItems: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    color: colors.textWhite,
    fontSize: 10,
  },
  legendHint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 9,
    marginTop: 6,
    fontStyle: 'italic',
  },
  // New gradient legend styles
  legendGradient: {
    marginVertical: 4,
  },
  gradientBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  gradientSegment: {
    flex: 1,
  },
  gradientLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  gradientLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 9,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  toggleTextActive: {
    color: colors.textWhite,
  },
  viewModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewModeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noHeatmapMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  noHeatmapText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default HeatmapOverlay;
