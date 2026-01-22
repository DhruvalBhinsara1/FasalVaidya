/**
 * Report Screen
 * ==============
 * Displays detailed health report with trends, recommendations, and export options
 */

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import {
    getReportPreview,
    NutrientRecommendation,
    ReportData
} from '../api';
import { Button, Card, ComparisonChart } from '../components';
import { getCropName, getCurrentLanguage, t } from '../i18n';
import { borderRadius, colors, spacing } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RouteParams {
  scanId: string;
  cropName?: string;
}

const ReportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { scanId, cropName } = route.params as RouteParams;
  const isHindi = getCurrentLanguage() === 'hi';

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReportData();
  }, [scanId]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[ReportScreen] Loading report for scanId:', scanId);
      const data = await getReportPreview(scanId, true);
      console.log('[ReportScreen] Report data received:', JSON.stringify(data, null, 2));
      console.log('[ReportScreen] Extracted fields:', {
        scan_date: data.scan_date,
        crop_name: data.crop_name,
        n_score: data.n_score,
        p_score: data.p_score,
        k_score: data.k_score,
        overall_score: data.overall_score,
        health_status: data.health_classification?.status,
        rescan_date: data.health_classification?.rescan_date
      });
      setReportData(data);
    } catch (err: any) {
      console.error('[ReportScreen] Failed to load report:', err);
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!reportData) return;

    try {
      setExporting(true);
      
      // For now, share as text summary since expo-file-system/sharing 
      // requires additional setup. In production, implement proper file download.
      const summary = `
${getCropName(reportData.crop_name)} - ${t('healthReport')}
${isHindi ? 'तारीख' : 'Date'}: ${new Date(reportData.scan_date).toLocaleDateString()}
${isHindi ? 'स्कोर' : 'Score'}: ${reportData.overall_score}%
${isHindi ? 'स्थिति' : 'Status'}: ${reportData.health_classification.label}

NPK Levels:
N: ${reportData.n_score}%
P: ${reportData.p_score}%
K: ${reportData.k_score}%

${isHindi ? 'अगला स्कैन' : 'Next Scan'}: ${new Date(reportData.health_classification.rescan_date).toLocaleDateString()}
      `.trim();

      await Share.share({
        message: summary,
        title: `${getCropName(reportData.crop_name)} ${t('healthReport')}`
      });
      
      setExporting(false);
    } catch (err: any) {
      console.error('Export failed:', err);
      Alert.alert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi ? 'रिपोर्ट निर्यात में विफल' : 'Failed to export report'
      );
      setExporting(false);
    }
  };

  const getHealthStatusStyle = () => {
    if (!reportData) return {};
    const { status } = reportData.health_classification;
    switch (status) {
      case 'healthy':
        return { backgroundColor: colors.healthyBg, borderColor: colors.positiveGreen };
      case 'attention':
        return { backgroundColor: colors.attentionBg, borderColor: colors.attention };
      case 'critical':
        return { backgroundColor: colors.criticalBg, borderColor: colors.critical };
      default:
        return {};
    }
  };

  const getHealthStatusIcon = () => {
    if (!reportData) return 'help-circle';
    const { status } = reportData.health_classification;
    switch (status) {
      case 'healthy': return 'checkmark-circle';
      case 'attention': return 'alert-circle';
      case 'critical': return 'warning';
      default: return 'help-circle';
    }
  };

  const getHealthStatusColor = () => {
    if (!reportData) return colors.textSecondary;
    const { status } = reportData.health_classification;
    switch (status) {
      case 'healthy': return colors.positiveGreen;
      case 'attention': return colors.attention;
      case 'critical': return colors.critical;
      default: return colors.textSecondary;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return 'trending-up';
      case 'declining': return 'trending-down';
      default: return 'remove';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return colors.positiveGreen;
      case 'declining': return colors.critical;
      default: return colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.critical;
      case 'medium': return colors.attention;
      case 'low': return colors.positiveGreen;
      default: return colors.textSecondary;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'increase': return 'arrow-up-circle';
      case 'decrease': return 'arrow-down-circle';
      default: return 'checkmark-circle';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {isHindi ? 'रिपोर्ट लोड हो रही है...' : 'Loading report...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !reportData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={64} color={colors.critical} />
          <Text style={styles.errorText}>
            {error || (isHindi ? 'रिपोर्ट लोड करने में विफल' : 'Failed to load report')}
          </Text>
          <Button
            title={isHindi ? 'पुनः प्रयास करें' : 'Retry'}
            onPress={loadReportData}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isHindi ? 'स्वास्थ्य रिपोर्ट' : 'Health Report'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Crop Info Card */}
        <Card style={styles.cropCard}>
          <View style={styles.cropHeader}>
            <Text style={styles.cropIconEmoji}>🌱</Text>
            <View style={styles.cropInfo}>
              <Text style={styles.cropName}>{getCropName(reportData.crop_name)}</Text>
              <Text style={styles.scanDate}>
                {new Date(reportData.scan_date).toLocaleDateString(isHindi ? 'hi-IN' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.overallScore}>
              <Text style={styles.overallScoreValue}>{reportData.overall_score}%</Text>
              <Text style={styles.overallScoreLabel}>
                {isHindi ? 'स्कोर' : 'Score'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Health Classification Card */}
        <Card style={{
          ...styles.healthCard,
          ...styles.healthCardBorder,
          ...(getHealthStatusStyle() || {}),
        }}>
          <View style={styles.healthHeader}>
            <Ionicons 
              name={getHealthStatusIcon()} 
              size={32} 
              color={getHealthStatusColor()} 
            />
            <View style={styles.healthInfo}>
              <Text style={[styles.healthLabel, { color: getHealthStatusColor() }]}>
                {reportData.health_classification.label}
              </Text>
              <Text style={styles.rescanText}>
                {isHindi ? 'अगला स्कैन:' : 'Next scan:'}{' '}
                {new Date(reportData.health_classification.rescan_date).toLocaleDateString(
                  isHindi ? 'hi-IN' : 'en-US'
                )}
              </Text>
            </View>
          </View>
        </Card>

        {/* NPK Scores */}
        <Card style={styles.scoresCard}>
          <Text style={styles.sectionTitle}>
            {isHindi ? 'पोषक तत्व स्तर' : 'Nutrient Levels'}
          </Text>
          <View style={styles.scoresContainer}>
            <View style={styles.scoreRow}>
              <View style={styles.scoreLabel}>
                <View style={[styles.scoreDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.scoreLabelText}>Nitrogen (N)</Text>
              </View>
              <View style={styles.scoreBarContainer}>
                <View style={[styles.scoreBarFill, { width: `${reportData.n_score}%`, backgroundColor: '#4CAF50' }]} />
              </View>
              <Text style={styles.scoreValueText}>{reportData.n_score}%</Text>
            </View>
            <View style={styles.scoreRow}>
              <View style={styles.scoreLabel}>
                <View style={[styles.scoreDot, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.scoreLabelText}>Phosphorus (P)</Text>
              </View>
              <View style={styles.scoreBarContainer}>
                <View style={[styles.scoreBarFill, { width: `${reportData.p_score}%`, backgroundColor: '#FF9800' }]} />
              </View>
              <Text style={styles.scoreValueText}>{reportData.p_score}%</Text>
            </View>
            <View style={styles.scoreRow}>
              <View style={styles.scoreLabel}>
                <View style={[styles.scoreDot, { backgroundColor: '#9C27B0' }]} />
                <Text style={styles.scoreLabelText}>Potassium (K)</Text>
              </View>
              <View style={styles.scoreBarContainer}>
                <View style={[styles.scoreBarFill, { width: `${reportData.k_score}%`, backgroundColor: '#9C27B0' }]} />
              </View>
              <Text style={styles.scoreValueText}>{reportData.k_score}%</Text>
            </View>
          </View>
        </Card>

        {/* Trend Analysis */}
        {reportData.comparison && (
          <Card style={styles.trendCard}>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'रुझान विश्लेषण' : 'Trend Analysis'}
            </Text>
            <View style={styles.trendHeader}>
              <Ionicons 
                name={getTrendIcon(reportData.comparison.trend)} 
                size={28} 
                color={getTrendColor(reportData.comparison.trend)} 
              />
              <Text style={[styles.trendLabel, { color: getTrendColor(reportData.comparison.trend) }]}>
                {reportData.comparison.trend_label}
              </Text>
            </View>
            <View style={styles.changesContainer}>
              <View style={styles.changeItem}>
                <Text style={styles.changeLabel}>N</Text>
                <Text style={[
                  styles.changeValue,
                  { color: reportData.comparison.changes.n_change >= 0 ? colors.positiveGreen : colors.critical }
                ]}>
                  {reportData.comparison.changes.n_change >= 0 ? '+' : ''}{reportData.comparison.changes.n_change}%
                </Text>
              </View>
              <View style={styles.changeItem}>
                <Text style={styles.changeLabel}>P</Text>
                <Text style={[
                  styles.changeValue,
                  { color: reportData.comparison.changes.p_change >= 0 ? colors.positiveGreen : colors.critical }
                ]}>
                  {reportData.comparison.changes.p_change >= 0 ? '+' : ''}{reportData.comparison.changes.p_change}%
                </Text>
              </View>
              <View style={styles.changeItem}>
                <Text style={styles.changeLabel}>K</Text>
                <Text style={[
                  styles.changeValue,
                  { color: reportData.comparison.changes.k_change >= 0 ? colors.positiveGreen : colors.critical }
                ]}>
                  {reportData.comparison.changes.k_change >= 0 ? '+' : ''}{reportData.comparison.changes.k_change}%
                </Text>
              </View>
            </View>
            <Text style={styles.baselineText}>
              {isHindi ? 'आधार रेखा:' : 'Baseline:'}{' '}
              {new Date(reportData.comparison.baseline_date).toLocaleDateString(
                isHindi ? 'hi-IN' : 'en-US'
              )}
            </Text>
          </Card>
        )}

        {/* Comparison Chart - Latest vs Previous */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>
            {isHindi ? 'तुलना चार्ट' : 'Comparison Chart'}
          </Text>
          <Text style={styles.chartSubtitle}>
            {isHindi ? 'वर्तमान बनाम पिछला स्कैन' : 'Current vs Previous Scan'}
          </Text>
          <ComparisonChart 
            barChartData={reportData.graph_data?.bar_chart}
          />
        </Card>

        {/* Recommendations */}
        {reportData.recommendations.length > 0 && (
          <Card style={styles.recommendationsCard}>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'अनुशंसाएं' : 'Recommendations'}
            </Text>
            {reportData.recommendations.map((rec: NutrientRecommendation, index: number) => (
              <View key={index} style={styles.recommendationItem}>
                <View style={styles.recHeader}>
                  <View style={styles.recNutrient}>
                    <Ionicons 
                      name={getActionIcon(rec.action)} 
                      size={20} 
                      color={getPriorityColor(rec.priority)} 
                    />
                    <Text style={styles.recNutrientLabel}>{rec.nutrient}</Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(rec.priority) + '20' }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(rec.priority) }]}>
                      {rec.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recStatus}>{rec.status}</Text>
                <Text style={styles.recText}>{rec.recommendation}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Export Options */}
        <Card style={styles.exportCard}>
          <Text style={styles.sectionTitle}>
            {isHindi ? 'रिपोर्ट निर्यात करें' : 'Export Report'}
          </Text>
          <View style={styles.exportButtons}>
            <TouchableOpacity 
              style={styles.exportButton}
              onPress={() => handleExport('pdf')}
              disabled={exporting}
            >
              <Ionicons name="document-text" size={24} color={colors.primary} />
              <Text style={styles.exportButtonText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.exportButton}
              onPress={() => handleExport('excel')}
              disabled={exporting}
            >
              <Ionicons name="grid" size={24} color={colors.positiveGreen} />
              <Text style={styles.exportButtonText}>Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.exportButton}
              onPress={() => handleExport('csv')}
              disabled={exporting}
            >
              <Ionicons name="list" size={24} color={colors.attention} />
              <Text style={styles.exportButtonText}>CSV</Text>
            </TouchableOpacity>
          </View>
          {exporting && (
            <View style={styles.exportingOverlay}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.exportingText}>
                {isHindi ? 'निर्यात हो रहा है...' : 'Exporting...'}
              </Text>
            </View>
          )}
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title={isHindi ? 'नया स्कैन' : 'New Scan'}
            onPress={() => navigation.navigate('Camera', { cropId: reportData.crop_name })}
            style={styles.actionButton}
          />
          <Button
            title={isHindi ? 'होम' : 'Home'}
            onPress={() => navigation.navigate('Home')}
            variant="secondary"
            style={styles.actionButton}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.critical,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  cropCard: {
    marginBottom: spacing.md,
  },
  cropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropIcon: {
    fontSize: 40,
    marginRight: spacing.md,
  },
  cropIconEmoji: {
    fontSize: 40,
    marginRight: spacing.md,
  },
  cropInfo: {
    flex: 1,
  },
  cropName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scanDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overallScore: {
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  overallScoreValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  overallScoreLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  healthCard: {
    marginBottom: spacing.md,
  },
  healthCardBorder: {
    borderWidth: 2,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  healthLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  rescanText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  scoresCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  scoresContainer: {
    gap: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scoreLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
  },
  scoreDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  scoreLabelText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  scoreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    width: 45,
    textAlign: 'right',
  },
  trendCard: {
    marginBottom: spacing.md,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  trendLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  changesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.sm,
  },
  changeItem: {
    alignItems: 'center',
    flex: 1,
  },
  changeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  changeValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  baselineText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  chartCard: {
    marginBottom: spacing.md,
  },
  chartSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  recommendationsCard: {
    marginBottom: spacing.md,
  },
  recommendationItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  recNutrient: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recNutrientLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  recStatus: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  recText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  exportCard: {
    marginBottom: spacing.md,
  },
  exportButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  exportButton: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exportButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  exportingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
  },
  exportingText: {
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});

export default ReportScreen;
