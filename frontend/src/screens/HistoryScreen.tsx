/**
 * History Screen
 * ===============
 * Display scan history with filtering by crop
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { clearScans, getScan, getScans, ScanHistoryItem } from '../api';
import { Button, Card, StatusChip } from '../components';
import { getCropName, getCurrentLanguage, t } from '../i18n';
import { borderRadius, colors, spacing } from '../theme';
import { getCropIcon } from '../utils/cropIcons';

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const isHindi = getCurrentLanguage() === 'hi';

  const loadScans = async () => {
    try {
      const data = await getScans();
      setScans(data);
    } catch (error) {
      console.error('Failed to load scans:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadScans();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadScans();
    setRefreshing(false);
  };

  const handleClearHistory = () => {
    Alert.alert(
      t('clearHistory'),
      t('clearHistoryConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearScans();
              setScans([]);
            } catch (error) {
              console.error('Failed to clear scans:', error);
            }
          },
        },
      ]
    );
  };

  const handleScanPress = async (scanId: number) => {
    try {
      const scanResult = await getScan(scanId);
      navigation.navigate('Results', { scanResult });
    } catch (error) {
      console.error('Failed to get scan details:', error);
    }
  };

  const renderScanItem = ({ item }: { item: ScanHistoryItem }) => (
    <TouchableOpacity onPress={() => handleScanPress(item.scan_id)}>
      <Card style={styles.scanCard}>
        <View style={styles.scanHeader}>
          <View style={styles.cropBadge}>
            {(() => {
              const src = getCropIcon(item.crop_name || item.crop_icon);
              return src ? (
                <Image source={src} style={styles.cropIconImage} resizeMode="cover" />
              ) : (
                <Text style={styles.cropIcon}>{item.crop_icon}</Text>
              );
            })()}
            <Text style={styles.cropName}>
              {getCropName(item.crop_name)}
            </Text>
          </View>
          <StatusChip status={item.overall_status} size="small" />
        </View>
        
        <View style={styles.scoresRow}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>N</Text>
            <Text style={[
              styles.scoreValue,
              { color: item.n_severity === 'critical' ? colors.critical : 
                       item.n_severity === 'attention' ? colors.attention : colors.healthy }
            ]}>
              {item.n_score?.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>P</Text>
            <Text style={[
              styles.scoreValue,
              { color: item.p_severity === 'critical' ? colors.critical : 
                       item.p_severity === 'attention' ? colors.attention : colors.healthy }
            ]}>
              {item.p_score?.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>K</Text>
            <Text style={[
              styles.scoreValue,
              { color: item.k_severity === 'critical' ? colors.critical : 
                       item.k_severity === 'attention' ? colors.attention : colors.healthy }
            ]}>
              {item.k_score?.toFixed(0)}%
            </Text>
          </View>
        </View>
        
        <View style={styles.scanFooter}>
          <Text style={styles.timestamp}>
            {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="leaf-outline" size={80} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>{t('noScansYet')}</Text>
      <Text style={styles.emptyMessage}>{t('noScansMessage')}</Text>
      <Button
        title={t('startScan')}
        onPress={() => navigation.navigate('Home')}
        style={{ marginTop: spacing.lg }}
        icon={<Ionicons name="camera" size={20} color={colors.textWhite} />}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('scanHistory')}</Text>
        {scans.length > 0 && (
          <TouchableOpacity onPress={handleClearHistory} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Scan Count */}
      {scans.length > 0 && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>{scans.length} scans</Text>
        </View>
      )}

      {/* Scan List */}
      <FlatList
        data={scans}
        keyExtractor={(item) => item.scan_id.toString()}
        renderItem={renderScanItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? renderEmptyList : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  clearButton: {
    padding: spacing.sm,
  },
  countContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  countText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    flexGrow: 1,
  },
  scanCard: {
    marginBottom: spacing.md,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cropIcon: {
    fontSize: 24,
  },
  cropIconImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: spacing.sm,
  },
  cropName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  scoreDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  scanFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});

export default HistoryScreen;
