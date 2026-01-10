/**
 * ProductCard Component
 * ======================
 * Displays fertilizer product recommendations with buy links
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { borderRadius, colors, shadows, spacing } from '../theme';

export interface Product {
  id: string;
  name: string;
  name_hi: string;
  description: string;
  description_hi: string;
  price: string;
  rating: number;
  image: string;
  buyUrl: string;
  nutrient: 'N' | 'P' | 'K' | 'Mg';
  brand: string;
}

interface ProductCardProps {
  product: Product;
  isHindi?: boolean;
  onPress?: () => void;
  recommended?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isHindi = false,
  onPress,
  recommended = false,
}) => {
  const [imageError, setImageError] = React.useState(false);
  
  const handleBuyPress = async () => {
    try {
      const supported = await Linking.canOpenURL(product.buyUrl);
      if (supported) await Linking.openURL(product.buyUrl);
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const getNutrientColor = (nutrient: string) => {
    switch (nutrient) {
      case 'N':
        return '#E53935'; // Red for Nitrogen
      case 'P':
        return '#FB8C00'; // Orange for Phosphorus
      case 'K':
        return '#43A047'; // Green for Potassium
      case 'Mg':
        return '#8E24AA'; // Purple for Magnesium
      default:
        return colors.primary;
    }
  };

  const getNutrientLabel = (nutrient: string) => {
    switch (nutrient) {
      case 'N':
        return isHindi ? 'नाइट्रोजन' : 'Nitrogen';
      case 'P':
        return isHindi ? 'फॉस्फोरस' : 'Phosphorus';
      case 'K':
        return isHindi ? 'पोटेशियम' : 'Potassium';
      case 'Mg':
        return isHindi ? 'मैग्नीशियम' : 'Magnesium';
      default:
        return nutrient;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress || handleBuyPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {!imageError ? (
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="leaf" size={40} color={colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.nutrientBadge,
            { backgroundColor: getNutrientColor(product.nutrient) },
          ]}
        >
          <Text style={styles.nutrientText}>{product.nutrient}</Text>
        </View>
        {recommended && (
          <View style={styles.recommendedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#fff" />
            <Text style={styles.recommendedText}>
              {isHindi ? 'इस कमी हेतु' : 'For this issue'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.brand}>{product.brand}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {isHindi ? product.name_hi : product.name}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {isHindi ? product.description_hi : product.description}
        </Text>

        <View style={styles.footer}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFC107" />
            <Text style={styles.rating}>{product.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.price}>{product.price}</Text>
        </View>

        <TouchableOpacity style={styles.buyButton} onPress={handleBuyPress}>
          <Ionicons name="cart-outline" size={16} color={colors.textWhite} />
          <Text style={styles.buyButtonText}>{isHindi ? 'खरीदें' : 'Buy'}</Text>
          <Ionicons name="open-outline" size={14} color={colors.textWhite} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutrientBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  nutrientText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: '700',
  },
  recommendedBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recommendedText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  brand: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginVertical: 2,
  },
  description: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rating: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: 4,
  },
  buyButtonText: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ProductCard;
