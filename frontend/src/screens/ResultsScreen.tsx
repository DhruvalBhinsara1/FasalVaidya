/**
 * Results Screen
 * ===============
 * Display NPK diagnosis results with recommendations
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

import { colors, spacing, borderRadius, shadows } from '../theme';
import { Button, Card, StatusChip, ScoreBar } from '../components';
import { t, getCurrentLanguage, getCropName, getRecommendation } from '../i18n';
import { ScanResult, getImageUrl } from '../api';

const ResultsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scanResult: ScanResult = route.params?.scanResult;
  const isHindi = getCurrentLanguage() === 'hi';

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
    const text = isHindi
      ? `${cropName} निदान परिणाम। नाइट्रोजन स्तर ${scanResult.n_score} प्रतिशत। फॉस्फोरस स्तर ${scanResult.p_score} प्रतिशत। पोटेशियम स्तर ${scanResult.k_score} प्रतिशत।`
      : `${cropName} diagnosis results. Nitrogen level ${scanResult.n_score} percent. Phosphorus level ${scanResult.p_score} percent. Potassium level ${scanResult.k_score} percent.`;
    
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

  const getRecommendationText = (nutrient: 'n' | 'p' | 'k') => {
    // Try i18n recommendation first
    const i18nRec = getRecommendation(scanResult.crop_name, nutrient);
    if (i18nRec) return i18nRec;
    
    // Fall back to backend recommendation
    const rec = scanResult.recommendations[nutrient];
    if (!rec) return t('noActionNeeded');
    return isHindi ? rec.hi || rec.en : rec.en || t('noActionNeeded');
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

        {/* Heatmap Image */}
        {scanResult.heatmap && (
          <Card style={styles.heatmapCard}>
            <Text style={styles.sectionTitle}>{t('analysisHeatmap')}</Text>
            <Image
              source={{ uri: scanResult.heatmap }}
              style={styles.heatmapImage}
              resizeMode="contain"
            />
          </Card>
        )}

        {/* NPK Scores */}
        <Card style={styles.scoresCard}>
          <Text style={styles.sectionTitle}>{t('npkDeficiencyScores')}</Text>
          
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
        </Card>

        {/* Recommendations */}
        <Card style={styles.recommendationsCard}>
          <Text style={styles.sectionTitle}>{t('recommendations')}</Text>
          
          {/* Nitrogen Recommendation */}
          {scanResult.n_severity !== 'healthy' && (
            <View style={styles.recItem}>
              <View style={styles.recHeader}>
                <View style={[styles.recDot, { backgroundColor: colors.critical }]} />
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
                <View style={[styles.recDot, { backgroundColor: colors.attention }]} />
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
                <View style={[styles.recDot, { backgroundColor: colors.healthy }]} />
                <Text style={styles.recNutrient}>{t('potassium')}</Text>
                <StatusChip status={scanResult.k_severity} size="small" />
              </View>
              <Text style={styles.recText}>{getRecommendationText('k')}</Text>
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
  scoresCard: {
    marginBottom: spacing.md,
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
});

export default ResultsScreen;
