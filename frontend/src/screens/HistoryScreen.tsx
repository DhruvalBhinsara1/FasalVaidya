import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getScans, clearHistory, Scan } from '../api/client';
import { theme } from '../theme/theme';

const STATUS_COLORS: Record<string, string> = {
  Complete: '#208F78',
  Processing: '#F5A623',
};

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export default function HistoryScreen(_: Props) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScans = async () => {
    setRefreshing(true);
    try {
      const data = await getScans();
      setScans(data);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all scan history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await clearHistory();
              Alert.alert('Success', `Cleared ${result.deleted_scans} scans`);
              setScans([]);
            } catch (err) {
              Alert.alert('Error', 'Failed to clear history');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Scan }) => {
    const statusColor = STATUS_COLORS[item.status] || theme.colors.textSecondary;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>#{item.scan_id}</Text>
          <Text style={[styles.status, { color: statusColor }]}>{item.status}</Text>
        </View>
        <Text style={styles.meta}>{item.crop_name || `Crop ${item.crop_id}`}</Text>
        <Text style={styles.meta}>{new Date(item.created_at).toLocaleString()}</Text>
        {item.n_score !== null && item.n_score !== undefined && (
          <View style={styles.scores}>
            <Text style={styles.scoreText}>N: {Math.round((item.n_score || 0) * 100)}%</Text>
            <Text style={styles.scoreText}>P: {Math.round((item.p_score || 0) * 100)}%</Text>
            <Text style={styles.scoreText}>K: {Math.round((item.k_score || 0) * 100)}%</Text>
          </View>
        )}
        {item.recommendation && <Text style={styles.rec}>{item.recommendation}</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {scans.length > 0 && (
        <Pressable style={styles.clearButton} onPress={handleClearHistory}>
          <Text style={styles.clearButtonText}>🗑️ Clear History</Text>
        </Pressable>
      )}
      <FlatList
        data={scans}
        keyExtractor={(item) => item.scan_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={scans.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<Text style={styles.emptyText}>No scans yet. Capture a leaf to get started.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchScans} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  clearButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  status: {
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  scores: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  rec: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
