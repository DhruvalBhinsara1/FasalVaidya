/**
 * Results Screen
 * ===============
 * Display NPK + Mg diagnosis results with recommendations and product suggestions
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

import { colors, spacing, borderRadius, shadows } from '../theme';
import { Button, Card, StatusChip, ScoreBar, ProductCard, HeatmapOverlay } from '../components';
import { t, getCurrentLanguage, getCropName, getRecommendation } from '../i18n';
import { ScanResult, getImageUrl } from '../api';
import { getProductsForDeficiencies, Product } from '../data/productData';

const ResultsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scanResult: ScanResult = route.params?.scanResult;
  const isHindi = getCurrentLanguage() === 'hi';
  const [fullscreenImage, setFullscreenImage] = useState(false);

  // Calculate recommended products based on deficiencies
  const recommendedProducts = useMemo(() => {
    if (!scanResult) return [];
    
    const deficiencies: { nutrient: 'N' | 'P' | 'K' | 'Mg'; severity: string }[] = [];
    
    if (scanResult.n_severity !== 'healthy') {
      deficiencies.push({ nutrient: 'N', severity: scanResult.n_severity });
    }
    if (scanResult.p_severity !== 'healthy') {
      deficiencies.push({ nutrient: 'P', severity: scanResult.p_severity });
    }
    if (scanResult.k_severity !== 'healthy') {
      deficiencies.push({ nutrient: 'K', severity: scanResult.k_severity });
    }
    if (scanResult.mg_severity && scanResult.mg_severity !== 'healthy') {
      deficiencies.push({ nutrient: 'Mg', severity: scanResult.mg_severity });
    }
    
    return getProductsForDeficiencies(deficiencies);
  }, [scanResult]);

  if (!scanResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No scan result available</Text>
          <Button
            title={t('home')}
            onPress={() => navigation.navigate('Home')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleSpeak = () => {
    const cropName = getCropName(scanResult.crop_name);
    const mgText = scanResult.mg_score !== undefined
      ? isHindi
        ? ` मैग्नीशियम स्तर ${scanResult.mg_score} प्रतिशत।`
        : ` Magnesium level ${scanResult.mg_score} percent.`
      : '';
    
    const text = isHindi
      ? `${cropName} निदान परिणाम। नाइट्रोजन स्तर ${scanResult.n_score} प्रतिशत। फॉस्फोरस स्तर ${scanResult.p_score} प्रतिशत। पोटेशियम स्तर ${scanResult.k_score} प्रतिशत।${mgText}`
      : `${cropName} diagnosis results. Nitrogen level ${scanResult.n_score} percent. Phosphorus level ${scanResult.p_score} percent. Potassium level ${scanResult.k_score} percent.${mgText}`;
    
    Speech.speak(text, {
      language: isHindi ? 'hi' : 'en',
      rate: 0.9,
    });
  };

  const handleNewScan = () => {
    navigation.navigate('Camera', { cropId: scanResult.crop_id });
  };

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  const getRecommendationText = (nutrient: 'n' | 'p' | 'k' | 'mg') => {
    // Try i18n recommendation first
    const i18nRec = getRecommendation(scanResult.crop_name, nutrient);
    if (i18nRec) return i18nRec;
    
    // Fall back to backend recommendation
    const rec = scanResult.recommendations[nutrient];
    if (!rec) return t('noActionNeeded');
    return isHindi ? rec.hi || rec.en : rec.en || t('noActionNeeded');
  };

  // Get the worst severity for heatmap display
  const getWorstSeverity = (): 'healthy' | 'low' | 'medium' | 'high' | 'critical' => {
    const severityMap: Record<string, number> = {
      healthy: 0,
      attention: 2,
      critical: 4,
    };
    
    const severities = [
      scanResult.n_severity,
      scanResult.p_severity,
      scanResult.k_severity,
      scanResult.mg_severity,
    ].filter(Boolean);
    
    const maxSeverity = Math.max(...severities.map(s => severityMap[s as string] || 0));
    
    if (maxSeverity === 0) return 'healthy';
    if (maxSeverity <= 1) return 'low';
    if (maxSeverity <= 2) return 'medium';
    if (maxSeverity <= 3) return 'high';
    return 'critical';
  };

  // Determine which nutrient is most deficient
  const getMostDeficientNutrient = (): string | undefined => {
    const scores = [
      { nutrient: 'N', score: scanResult.n_score, severity: scanResult.n_severity },
      { nutrient: 'P', score: scanResult.p_score, severity: scanResult.p_severity },
      { nutrient: 'K', score: scanResult.k_score, severity: scanResult.k_severity },
    ];
    
    if (scanResult.mg_score !== undefined && scanResult.mg_severity) {
      scores.push({ nutrient: 'Mg', score: scanResult.mg_score, severity: scanResult.mg_severity });
    }
    
    // Find the worst one (critical > attention > healthy)
    const critical = scores.filter(s => s.severity === 'critical');
    if (critical.length > 0) {
      return critical.sort((a, b) => a.score - b.score)[0].nutrient;
    }
    
    const attention = scores.filter(s => s.severity === 'attention');
    if (attention.length > 0) {
      return attention.sort((a, b) => a.score - b.score)[0].nutrient;
    }
    
    return undefined;
  };

  // Check if any confidence is below 50%
  const hasLowConfidence = (): boolean => {
    const confidences = [
      scanResult.n_confidence,
      scanResult.p_confidence,
      scanResult.k_confidence,
    ];
    if (scanResult.mg_confidence !== undefined) {
      confidences.push(scanResult.mg_confidence);
    }
    return confidences.some(c => c < 50);
  };

  const getLowestConfidence = (): number => {
    const confidences = [
      scanResult.n_confidence,
      scanResult.p_confidence,
      scanResult.k_confidence,
    ];
    if (scanResult.mg_confidence !== undefined) {
      confidences.push(scanResult.mg_confidence);
    }
    return Math.min(...confidences);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoHome} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('diagnosisResults')}</Text>
          <TouchableOpacity onPress={handleSpeak} style={styles.speakButton}>
            <Ionicons name="volume-high" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Crop & Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.cropInfo}>
            <Text style={styles.cropIcon}>{scanResult.crop_icon}</Text>
            <View style={styles.cropDetails}>
              <Text style={styles.cropName}>
                {getCropName(scanResult.crop_name)}
              </Text>
              <Text style={styles.timestamp}>
                {new Date(scanResult.created_at).toLocaleString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.overallStatus}>
            <Text style={styles.overallLabel}>{t('overallHealth')}</Text>
            <StatusChip status={scanResult.overall_status} size="large" />
          </View>
        </Card>

        {/* Heatmap Image with Toggle */}
        <Card style={styles.heatmapCard}>
          <Text style={styles.sectionTitle}>{t('analysisHeatmap')}</Text>
          <HeatmapOverlay
            originalImage={getImageUrl(scanResult.original_image_url || scanResult.image_url || '')}
            heatmapImage={scanResult.heatmap ? getImageUrl(scanResult.heatmap) : (scanResult.heatmap_url ? getImageUrl(scanResult.heatmap_url) : undefined)}
            severity={getWorstSeverity()}
            nutrient={getMostDeficientNutrient()}
            isHindi={isHindi}
            onFullScreen={() => setFullscreenImage(true)}
          />
        </Card>

        {/* Fullscreen Image Modal */}
        <Modal
          visible={fullscreenImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullscreenImage(false)}
        >
          <TouchableOpacity
            style={styles.fullscreenModal}
            activeOpacity={1}
            onPress={() => setFullscreenImage(false)}
          >
            <Image
              source={{ uri: scanResult.heatmap || scanResult.image_url }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setFullscreenImage(false)}
            >
              <Ionicons name="close-circle" size={40} color={colors.textWhite} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* NPKMg Scores */}
        <Card style={styles.scoresCard}>
          <Text style={styles.sectionTitle}>
            {scanResult.mg_score !== undefined ? t('npkmgDeficiencyScores') : t('npkDeficiencyScores')}
          </Text>
          
          <ScoreBar
            label={t('nitrogen')}
            score={scanResult.n_score}
            confidence={scanResult.n_confidence}
            severity={scanResult.n_severity}
          />
          
          <ScoreBar
            label={t('phosphorus')}
            score={scanResult.p_score}
            confidence={scanResult.p_confidence}
            severity={scanResult.p_severity}
          />
          
          <ScoreBar
            label={t('potassium')}
            score={scanResult.k_score}
            confidence={scanResult.k_confidence}
            severity={scanResult.k_severity}
          />
          
          {/* Magnesium Score (if available) */}
          {scanResult.mg_score !== undefined && (
            <ScoreBar
              label={t('magnesium')}
              score={scanResult.mg_score}
              confidence={scanResult.mg_confidence || 0}
              severity={scanResult.mg_severity || 'healthy'}
            />
          )}
        </Card>

        {/* Low Confidence Warning */}
        {hasLowConfidence() && (
          <Card style={styles.warningCard}>
            <View style={styles.warningContent}>
              <Ionicons name="alert-circle" size={28} color={colors.warning} />
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>
                  {isHindi ? 'कम विश्वास स्कोर' : 'Low Confidence Score'}
                </Text>
                <Text style={styles.warningText}>
                  {isHindi 
                    ? `विश्लेषण विश्वास ${Math.round(getLowestConfidence())}% है। बेहतर परिणामों के लिए कृपया स्पष्ट रोशनी के साथ पत्ते की एक नई तस्वीर लें, या किसी मृदा विशेषज्ञ से संपर्क करें।`
                    : `Analysis confidence is ${Math.round(getLowestConfidence())}%. For more accurate results, please take a new photo with clear lighting, or consult a soil specialist.`
                  }
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.retakeButton}
              onPress={handleNewScan}
            >
              <Ionicons name="camera" size={18} color={colors.warning} />
              <Text style={styles.retakeButtonText}>
                {isHindi ? 'दोबारा तस्वीर लें' : 'Retake Photo'}
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Recommendations */}
        <Card style={styles.recommendationsCard}>
          <Text style={styles.sectionTitle}>{t('recommendations')}</Text>
          
          {/* Nitrogen Recommendation */}
          {scanResult.n_severity !== 'healthy' && (
            <View style={styles.recItem}>
              <View style={styles.recHeader}>
                <View style={[styles.recDot, { backgroundColor: '#E53935' }]} />
                <Text style={styles.recNutrient}>{t('nitrogen')}</Text>
                <StatusChip status={scanResult.n_severity} size="small" />
              </View>
              <Text style={styles.recText}>{getRecommendationText('n')}</Text>
            </View>
          )}
          
          {/* Phosphorus Recommendation */}
          {scanResult.p_severity !== 'healthy' && (
            <View style={styles.recItem}>
              <View style={styles.recHeader}>
                <View style={[styles.recDot, { backgroundColor: '#FB8C00' }]} />
                <Text style={styles.recNutrient}>{t('phosphorus')}</Text>
                <StatusChip status={scanResult.p_severity} size="small" />
              </View>
              <Text style={styles.recText}>{getRecommendationText('p')}</Text>
            </View>
          )}
          
          {/* Potassium Recommendation */}
          {scanResult.k_severity !== 'healthy' && (
            <View style={styles.recItem}>
              <View style={styles.recHeader}>
                <View style={[styles.recDot, { backgroundColor: '#43A047' }]} />
                <Text style={styles.recNutrient}>{t('potassium')}</Text>
                <StatusChip status={scanResult.k_severity} size="small" />
              </View>
              <Text style={styles.recText}>{getRecommendationText('k')}</Text>
            </View>
          )}
          
          {/* Magnesium Recommendation */}
          {scanResult.mg_severity && scanResult.mg_severity !== 'healthy' && (
            <View style={styles.recItem}>
              <View style={styles.recHeader}>
                <View style={[styles.recDot, { backgroundColor: '#8E24AA' }]} />
                <Text style={styles.recNutrient}>{t('magnesium')}</Text>
                <StatusChip status={scanResult.mg_severity} size="small" />
              </View>
              <Text style={styles.recText}>{getRecommendationText('mg')}</Text>
            </View>
          )}
          
          {/* All Healthy */}
          {scanResult.overall_status === 'healthy' && (
            <View style={styles.healthyMessage}>
              <Ionicons name="checkmark-circle" size={48} color={colors.healthy} />
              <Text style={styles.healthyText}>{t('noActionNeeded')}</Text>
            </View>
          )}
        </Card>

        {/* Product Recommendations */}
        {recommendedProducts.length > 0 && (
          <Card style={styles.productsCard}>
            <View style={styles.productHeader}>
              <Ionicons name="cart" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('recommendedProducts')}</Text>
            </View>
            <Text style={styles.productSubtitle}>{t('basedOnAnalysis')}</Text>
            
            {recommendedProducts.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isHindi={isHindi}
              />
            ))}
          </Card>
        )}

        {/* Healthy - No Products Needed */}
        {recommendedProducts.length === 0 && scanResult.overall_status === 'healthy' && (
          <Card style={styles.noProductsCard}>
            <View style={styles.noProductsContent}>
              <Ionicons name="leaf" size={48} color={colors.healthy} />
              <Text style={styles.noProductsText}>{t('noProductsNeeded')}</Text>
            </View>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title={t('startScan')}
            onPress={handleNewScan}
            icon={<Ionicons name="camera" size={24} color={colors.textWhite} />}
          />
          <Button
            title={t('viewHistory')}
            onPress={() => navigation.navigate('History')}
            variant="outline"
            icon={<Ionicons name="time" size={24} color={colors.primary} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  speakButton: {
    padding: spacing.sm,
  },
  statusCard: {
    marginBottom: spacing.md,
  },
  cropInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cropIcon: {
    fontSize: 48,
  },
  cropDetails: {
    flex: 1,
  },
  cropName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overallStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  overallLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  heatmapCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  heatmapImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  scoresCard: {
    marginBottom: spacing.md,
  },
  warningCard: {
    marginBottom: spacing.md,
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  retakeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
  },
  recommendationsCard: {
    marginBottom: spacing.lg,
  },
  recItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recNutrient: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  recText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginLeft: spacing.md + 8,
  },
  healthyMessage: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  healthyText: {
    fontSize: 16,
    color: colors.healthy,
    fontWeight: '500',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
  },
  productsCard: {
    marginBottom: spacing.lg,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  productSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  noProductsCard: {
    marginBottom: spacing.lg,
  },
  noProductsContent: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  noProductsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});

export default ResultsScreen;
