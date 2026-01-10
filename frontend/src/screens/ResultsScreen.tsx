/**
 * Results Screen
 * ===============
 * Display NPK + Mg diagnosis results with recommendations and product suggestions
 */

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getImageUrl, ScanResult } from '../api';
import { Button, Card, HeatmapOverlay, ProductCard, ScoreBar, StatusChip } from '../components';
import { getProductsForDeficiencies } from '../data/productData';
import { getCropName, getCurrentLanguage, getRecommendation, t } from '../i18n';
import { borderRadius, colors, shadows, spacing } from '../theme';

const ResultsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scanResult: ScanResult = route.params?.scanResult;
  const isHindi = getCurrentLanguage() === 'hi';
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showScores, setShowScores] = useState(true);
  const [showAction, setShowAction] = useState(true);
  const [showWhy, setShowWhy] = useState(false);

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

  const handleShare = async () => {
    const cropName = getCropName(scanResult.crop_name);
    const status = scanResult.overall_status;
    const topNutrient = getMostDeficientNutrient();
    const shareLines = [
      isHindi ? '🌿 फसल निदान' : '🌿 Crop check',
      `${isHindi ? 'फसल' : 'Crop'}: ${cropName}`,
      `${isHindi ? 'स्थिति' : 'Status'}: ${status}`,
      topNutrient
        ? `${isHindi ? 'ध्यान दें' : 'Needs'}: ${topNutrient}`
        : isHindi ? 'सब ठीक है' : 'All good',
    ];
    const message = shareLines.join('\n');
    try {
      await Share.share({ message });
    } catch (e) {
      console.log('Share error', e);
    }
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

  const getBenefitLine = (nutrient: 'n' | 'p' | 'k' | 'mg') => {
    if (isHindi) {
      switch (nutrient) {
        case 'n': return 'हरी पत्तियाँ • तेज बढ़त';
        case 'p': return 'मजबूत जड़ें • ज्यादा फूल';
        case 'k': return 'स्वस्थ फल • मजबूत तना';
        case 'mg': return 'और हरा पत्ता';
        default: return '';
      }
    }
    switch (nutrient) {
      case 'n': return 'Greener leaves • Faster growth';
      case 'p': return 'Stronger roots • More blooms';
      case 'k': return 'Healthy fruits • Strong stems';
      case 'mg': return 'Greener leaf';
      default: return '';
    }
  };

  const getDose = (text: string): string | null => {
    // Extract first quantity-like token (e.g., 12-15 kg, 15 kg, 200 g)
    const match = text.match(/(\d+[\d\-–]*\s*(kg|g|ltr|l|ml|bags)?)/i);
    if (match) return match[1].replace('ltr', 'L').replace('ml', 'mL').trim();
    return null;
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

  const getNutrientName = (nutrient?: string) => {
    if (!nutrient) return isHindi ? 'पोषक' : 'nutrient';
    switch (nutrient) {
      case 'N': return isHindi ? 'नाइट्रोजन' : 'Nitrogen';
      case 'P': return isHindi ? 'फॉस्फोरस' : 'Phosphorus';
      case 'K': return isHindi ? 'पोटाश' : 'Potash';
      case 'Mg': return isHindi ? 'मैग्नीशियम' : 'Magnesium';
      default: return nutrient;
    }
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

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return colors.critical;
      case 'attention':
        return colors.warning;
      case 'healthy':
      default:
        return colors.healthy;
    }
  };

  const getBagCountFor = (nutrient: 'n' | 'p' | 'k' | 'mg') => {
    const dose = getDose(getRecommendationText(nutrient));
    const numeric = dose ? parseFloat(dose) : 0;
    if (!numeric || Number.isNaN(numeric)) return 1;
    return Math.max(1, Math.round(numeric / 25));
  };

  const getProductHighlight = (nutrient: 'N' | 'P' | 'K' | 'Mg') => {
    const severity =
      nutrient === 'N' ? scanResult.n_severity :
      nutrient === 'P' ? scanResult.p_severity :
      nutrient === 'K' ? scanResult.k_severity :
      scanResult.mg_severity;
    return severity && severity !== 'healthy' ? getSeverityColor(severity) : undefined;
  };

  const topNutrient = getMostDeficientNutrient();
  const actionItems = [
    { key: 'n', nutrient: 'N', severity: scanResult.n_severity, dose: getDose(getRecommendationText('n')), benefit: getBenefitLine('n') },
    { key: 'p', nutrient: 'P', severity: scanResult.p_severity, dose: getDose(getRecommendationText('p')), benefit: getBenefitLine('p') },
    { key: 'k', nutrient: 'K', severity: scanResult.k_severity, dose: getDose(getRecommendationText('k')), benefit: getBenefitLine('k') },
    scanResult.mg_severity !== undefined ? { key: 'mg', nutrient: 'Mg', severity: scanResult.mg_severity, dose: getDose(getRecommendationText('mg')), benefit: getBenefitLine('mg') } : null,
  ].filter((item) => item && item.severity !== 'healthy') as {
    key: string;
    nutrient: 'N' | 'P' | 'K' | 'Mg';
    severity: string;
    dose: string | null;
    benefit: string;
  }[];
  const primaryAction = actionItems[0];

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
          <View style={{ width: 32 }} />
        </View>

        {/* Crop & Status Card (classic) */}
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
            <TouchableOpacity onPress={handleSpeak} style={styles.speakButton}>
              <Ionicons name="volume-high" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.overallStatus}>
            <Text style={styles.overallLabel}>{t('overallHealth')}</Text>
            <StatusChip status={scanResult.overall_status} size="large" />
          </View>
        </Card>

        {/* Heatmap (collapsible) */}
        <Card style={styles.heatmapCard}>
          <TouchableOpacity
            style={styles.sectionHeaderRow}
            onPress={() => setShowHeatmap((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="flame" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('analysisHeatmap')}</Text>
            </View>
            <Ionicons
              name={showHeatmap ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {showHeatmap && (
            <HeatmapOverlay
              originalImage={getImageUrl(scanResult.original_image_url || scanResult.image_url || '')}
              heatmapImage={scanResult.heatmap ? getImageUrl(scanResult.heatmap) : (scanResult.heatmap_url ? getImageUrl(scanResult.heatmap_url) : undefined)}
              severity={getWorstSeverity()}
              nutrient={getMostDeficientNutrient()}
              isHindi={isHindi}
              onFullScreen={() => setFullscreenImage(true)}
            />
          )}
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
              source={{ uri: scanResult.heatmap 
                ? getImageUrl(scanResult.heatmap) 
                : getImageUrl(scanResult.original_image_url || scanResult.image_url || '') }}
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

        {/* NPKMg Scores (classic) */}
        <Card style={styles.scoresCard}>
          <TouchableOpacity
            style={styles.sectionHeaderRow}
            onPress={() => setShowScores((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="stats-chart" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>
                {scanResult.mg_score !== undefined ? t('npkmgDeficiencyScores') : t('npkDeficiencyScores')}
              </Text>
            </View>
            <Ionicons
              name={showScores ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {showScores && (
            <>
              {hasLowConfidence() && (
                <View style={styles.warningCard}>
                  <View style={styles.warningContent}>
                    <View style={styles.warningIconContainer}>
                      <Ionicons name="alert-circle" size={24} color={colors.warning} />
                    </View>
                    <View style={styles.warningTextContainer}>
                      <Text style={styles.warningTitle}>
                        {isHindi ? 'कम विश्वास स्कोर' : 'Low Confidence Score'}
                      </Text>
                      <Text style={styles.warningText}>
                        {isHindi 
                          ? `विश्वास ${Math.round(getLowestConfidence())}% है। साफ रोशनी में नई फोटो लें या विशेषज्ञ से पूछें।`
                          : `Confidence is ${Math.round(getLowestConfidence())}%. Try a new photo in good light or ask an expert.`
                        }
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.retakeButton}
                    onPress={handleNewScan}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={18} color={colors.warning} />
                    <Text style={styles.retakeButtonText}>
                      {isHindi ? 'दोबारा तस्वीर लें' : 'Retake Photo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

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
              
              {scanResult.mg_score !== undefined && scanResult.mg_severity !== undefined && (
                <ScoreBar
                  label={t('magnesium')}
                  score={scanResult.mg_score as number}
                  confidence={scanResult.mg_confidence as number}
                  severity={scanResult.mg_severity as 'healthy' | 'attention' | 'critical'}
                />
              )}
            </>
          )}
        </Card>

        {/* Combined action + products */}
        {(actionItems.length > 0 || recommendedProducts.length > 0) && (
          <Card style={{ ...styles.shoppingCard, ...styles.softCard }}>
            <TouchableOpacity
              style={styles.sectionHeaderRow}
              onPress={() => setShowAction((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="hand-left" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>{isHindi ? 'क्या करें' : 'What to do'}</Text>
              </View>
              <Ionicons
                name={showAction ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showAction && primaryAction && (
              <>
                <View style={styles.tipCard}>
                  <View style={styles.tipHeader}>
                    <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tipTitle}>
                        {isHindi
                          ? `${getNutrientName(primaryAction.nutrient)} • ${primaryAction.dose || 'खुराक देखें'}`
                          : `Recommended: ${getNutrientName(primaryAction.nutrient)} • ${primaryAction.dose || 'Check dose'}`}
                      </Text>
                      <Text style={styles.tipLine}>{primaryAction.benefit}</Text>
                      <Text style={styles.tipLine}>
                        {isHindi ? 'इस चरण में खेत में समान रूप से डालें।' : 'Apply gently across the field this stage.'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.whyRow}
                    onPress={() => setShowWhy((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.whyText}>
                      {isHindi ? 'क्यों मदद करता है' : 'Why this helps'}
                    </Text>
                    <Ionicons
                      name={showWhy ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  {showWhy && (
                    <Text style={styles.tipBody}>
                      {isHindi
                        ? 'यह पोषक फल की गुणवत्ता और तने की मजबूती को सहारा देता है। समान मात्रा में छिड़कें या मिलाएं।'
                        : 'This nutrient supports fruit quality and stem strength. Spread or mix evenly at the shown dose.'}
                    </Text>
                  )}
                </View>

                {actionItems.slice(1, 3).map((item) => (
                  <View key={item.key} style={styles.actionItem}>
                    <View style={styles.actionRow}>
                      <View style={[styles.actionDot, { backgroundColor: `${colors.primary}40` }]} />
                      <Text style={styles.actionNutrient}>{getNutrientName(item.nutrient)}</Text>
                    </View>
                    <Text style={styles.actionDose}>
                      {item.dose || (isHindi ? 'खुराक देखें' : 'Check dose')}
                    </Text>
                    <Text style={styles.actionHint}>{item.benefit}</Text>
                  </View>
                ))}

                {recommendedProducts.length > 0 && (
                  <View style={styles.actionProducts}>
                    <View style={styles.actionTitleRow}>
                      <Ionicons name="cart" size={20} color={colors.primary} />
                      <Text style={styles.productSubtitle}>{isHindi ? 'सुझावित खाद' : 'Suggested products'}</Text>
                    </View>
                    <View style={styles.productsGrid}>
                      {recommendedProducts.slice(0, 4).map((product) => (
                        <View key={product.id} style={styles.productGridItem}>
                          <ProductCard
                            product={product}
                            isHindi={isHindi}
                            recommended={product.nutrient === topNutrient}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
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
        <View style={styles.actionsContainer}>
          <View style={styles.topActionsRow}>
            <View style={styles.topActionButtonWrap}>
              <Button
                title={t('viewHistory')}
                onPress={() => navigation.navigate('History')}
                variant="outline"
                icon={<Ionicons name="time" size={18} color={colors.primary} />}
                size="small"
                style={styles.fixedHeightButton}
                textStyle={styles.buttonText}
              />
            </View>
            <View style={styles.topActionButtonWrap}>
              <Button
                title={isHindi ? 'साझा करें' : 'Share'}
                onPress={handleShare}
                variant="outline"
                icon={<Ionicons name="share-social" size={18} color={colors.primary} />}
                size="small"
                style={styles.fixedHeightButton}
                textStyle={styles.buttonText}
              />
            </View>
          </View>
          <View style={styles.startScanButtonWrap}>
            <Button
              title={t('startScan')}
              onPress={handleNewScan}
              icon={<Ionicons name="camera" size={20} color={colors.textWhite} />}
              size="medium"
            />
          </View>
        </View>
      </ScrollView>
      {/* Floating AI chat - icon-first, unobtrusive */}
      <TouchableOpacity
        style={styles.chatFab}
        onPress={() => navigation.navigate('Chat' as any, { scanId: scanResult.scan_id })}
        activeOpacity={0.85}
      >
        <View style={styles.chatFabGlow} />
        <Ionicons name="chatbubbles-outline" size={26} color={colors.textWhite} />
      </TouchableOpacity>
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
  speakButton: {
    padding: spacing.sm,
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
  shoppingCard: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  softCard: {
    backgroundColor: colors.card,
    borderColor: `${colors.primary}25`,
  },
  shoppingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  shoppingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  bagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  bagText: {
    color: colors.textWhite,
    fontWeight: '700',
  },
  shoppingDetail: {
    flex: 1,
  },
  shoppingProduct: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  shoppingHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  buyCta: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  buyCtaText: {
    color: colors.textWhite,
    fontWeight: '700',
  },
  heatmapCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
    backgroundColor: '#FFFBF0',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.warning}30`,
    padding: spacing.md,
    ...shadows.sm,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  warningIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.warning}15`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  warningText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.warning}10`,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
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
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  recipeStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F5F7F8',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  recipeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  benefitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: `${colors.secondary}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  benefitText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
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
  actionsContainer: {
    gap: spacing.md,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  topActionButtonWrap: {
    flex: 1,
  },
  startScanButtonWrap: {
    width: '100%',
  },
  fixedHeightButton: {
    height: 48,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  buttonText: {
    fontSize: 13,
    flexShrink: 1,
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 24,
  },
  actionItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  actionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionNutrient: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionDose: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  actionHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tipCard: {
    backgroundColor: `${colors.primary}08`,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  tipLine: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 1,
  },
  tipBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  whyText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  actionProducts: {
    marginTop: spacing.md,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  productGridItem: {
    width: '48%',
    marginBottom: spacing.sm,
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
  chatFab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  chatFabGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: `${colors.secondary}25`,
    zIndex: -1,
  },
});

export default ResultsScreen;
