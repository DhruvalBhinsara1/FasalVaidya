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

import { clearScans, deleteScan, getScan, getScans, ScanHistoryItem } from '../api';
import { Button, Card, FilterChips, FilterOption, StatusChip } from '../components';
import { getCropName, getCurrentLanguage, t } from '../i18n';
import { borderRadius, colors, spacing } from '../theme';
import { getCropIcon } from '../utils/cropIcons';

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const isHindi = getCurrentLanguage() === 'hi';

  // Calculate stats from scans
  const totalScans = scans.length;
  const healthyCount = scans.filter(s => s.overall_status === 'healthy').length;
  const unhealthyCount = scans.filter(s => s.overall_status !== 'healthy').length;
  const criticalCount = scans.filter(s => s.overall_status === 'critical').length;

  // Filter options for chips
  const filterOptions: FilterOption[] = [
    { id: 'all', label: t('all'), count: totalScans },
    { id: 'healthy', label: t('healthy'), count: healthyCount },
    { id: 'unhealthy', label: t('unhealthy'), count: unhealthyCount },
    { id: 'critical', label: t('critical'), count: criticalCount },
  ];

  // Filtered scans based on selected filter
  const filteredScans = scans.filter(scan => {
    switch (selectedFilter) {
      case 'healthy':
        return scan.overall_status === 'healthy';
      case 'unhealthy':
        return scan.overall_status !== 'healthy';
      case 'critical':
        return scan.overall_status === 'critical';
      case 'all':
      default:
        return true;
    }
  });

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

  const handleViewReport = (scanId: number, cropName: string) => {
    navigation.navigate('Report', { 
      scanId: scanId.toString(),
      cropName 
    });
  };

  const handleDeleteScan = (scanId: number) => {
    Alert.alert(
      t('delete'),
      t('deleteConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScan(scanId.toString());
              setScans(scans.filter(s => s.scan_id !== scanId));
            } catch (error) {
              console.error('Failed to delete scan:', error);
            }
          },
        },
      ]
    );
  };

  // Selection mode handlers
  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedIds(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  const toggleSelectItem = (scanId: number) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(scanId)) {
      newSelectedIds.delete(scanId);
    } else {
      newSelectedIds.add(scanId);
    }
    setSelectedIds(newSelectedIds);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredScans.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredScans.map(s => s.scan_id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    
    Alert.alert(
      t('delete'),
      isHindi 
        ? `क्या आप ${selectedIds.size} स्कैन हटाना चाहते हैं?`
        : `Delete ${selectedIds.size} selected scans?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(
                Array.from(selectedIds).map(id => deleteScan(id.toString()))
              );
              setScans(scans.filter(s => !selectedIds.has(s.scan_id)));
              setSelectedIds(new Set());
              setSelectionMode(false);
            } catch (error) {
              console.error('Failed to delete scans:', error);
            }
          },
        },
      ]
    );
  };

  const renderScanItem = ({ item }: { item: ScanHistoryItem }) => {
    const isSelected = selectedIds.has(item.scan_id);
    
    const handlePress = () => {
      if (selectionMode) {
        toggleSelectItem(item.scan_id);
      } else {
        handleScanPress(item.scan_id);
      }
    };

    const handleLongPress = () => {
      if (!selectionMode) {
        setSelectionMode(true);
        setSelectedIds(new Set([item.scan_id]));
      }
    };

    return (
      <TouchableOpacity 
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        <Card style={[styles.scanCard, isSelected && styles.scanCardSelected]}>
          <View style={styles.scanHeader}>
            {selectionMode && (
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => toggleSelectItem(item.scan_id)}
              >
                <Ionicons 
                  name={isSelected ? 'checkbox' : 'square-outline'} 
                  size={24} 
                  color={isSelected ? colors.primary : colors.textSecondary} 
                />
              </TouchableOpacity>
            )}
            <View style={styles.cropBadge}>
              {(() => {
                const src = getCropIcon(item.crop_name || item.crop_icon);
                return src ? (
                  <Image source={src} style={styles.cropIconImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.cropIcon}>{item.crop_icon || '🌱'}</Text>
                );
              })()}
              <Text style={styles.cropName}>
                {getCropName(item.crop_name) || item.crop_name || 'Unknown'}
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
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation?.();
                handleViewReport(item.scan_id, item.crop_name);
              }}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation?.();
                handleDeleteScan(item.scan_id);
              }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.critical} />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
    );
  };

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
        {selectionMode ? (
          <>
            <TouchableOpacity onPress={toggleSelectionMode} style={styles.backButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedIds.size} {isHindi ? 'चयनित' : 'selected'}
            </Text>
            <View style={styles.selectionActions}>
              <TouchableOpacity onPress={selectAll} style={styles.headerButton}>
                <Ionicons 
                  name={selectedIds.size === filteredScans.length ? 'checkbox' : 'checkbox-outline'} 
                  size={24} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleDeleteSelected} 
                style={styles.headerButton}
                disabled={selectedIds.size === 0}
              >
                <Ionicons 
                  name="trash-outline" 
                  size={24} 
                  color={selectedIds.size > 0 ? colors.error : colors.disabled} 
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('scanHistory')}</Text>
            <View style={styles.selectionActions}>
              {scans.length > 0 && (
                <>
                  <TouchableOpacity onPress={toggleSelectionMode} style={styles.headerButton}>
                    <Ionicons name="checkbox-outline" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleClearHistory} style={styles.headerButton}>
                    <Ionicons name="trash-outline" size={24} color={colors.error} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </View>

      {/* Selection Mode Hint */}
      {!selectionMode && scans.length > 0 && (
        <Text style={styles.selectionHint}>
          {isHindi ? 'चयन मोड के लिए दबाकर रखें' : 'Long press to select'}
        </Text>
      )}

      {/* Summary Cards */}
      {scans.length > 0 && !selectionMode && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('totalCrops')}</Text>
            <Text style={styles.summaryValue}>{totalScans}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('unhealthy')}</Text>
            <Text style={[styles.summaryValue, styles.summaryValueRed]}>{unhealthyCount}</Text>
          </View>
        </View>
      )}

      {/* Filter Chips */}
      {scans.length > 0 && (
        <FilterChips
          options={filterOptions}
          selectedId={selectedFilter}
          onSelect={setSelectedFilter}
          style={styles.filterChips}
        />
      )}

      {/* Scan List */}
      <FlatList
        data={filteredScans}
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
      {/* Floating AI chat button */}
      <TouchableOpacity
        style={styles.chatFab}
        onPress={() => navigation.navigate('Chat' as any)}
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
    flex: 1,
    textAlign: 'center',
  },
  clearButton: {
    padding: spacing.sm,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  selectionHint: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  summaryValueRed: {
    color: colors.critical,
  },
  filterChips: {
    marginBottom: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    flexGrow: 1,
  },
  scanCard: {
    marginBottom: spacing.md,
  },
  scanCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + '08',
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkbox: {
    marginRight: spacing.sm,
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
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
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
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

export default HistoryScreen;
