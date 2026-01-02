/**
 * Home Screen
 * ============
 * Main landing screen with crop selection and scan button
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { Button, Card, CropSelector } from '../components';
import { t, getCurrentLanguage, getCropName } from '../i18n';
import { getCrops, Crop, healthCheck } from '../api';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<number>(1);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const isHindi = getCurrentLanguage() === 'hi';

  useEffect(() => {
    loadCrops();
    checkConnection();
  }, []);

  const loadCrops = async () => {
    try {
      const cropsData = await getCrops();
      setCrops(cropsData);
    } catch (error) {
      console.log('Failed to load crops, using defaults');
      // Fallback crops
      setCrops([
        { id: 1, name: 'Wheat', name_hi: 'गेहूँ', season: 'Rabi', icon: '🌾' },
        { id: 2, name: 'Rice', name_hi: 'चावल', season: 'Kharif', icon: '🌾' },
        { id: 3, name: 'Tomato', name_hi: 'टमाटर', season: 'Year-round', icon: '🍅' },
        { id: 4, name: 'Cotton', name_hi: 'कपास', season: 'Kharif', icon: '🌿' },
      ]);
    }
  };

  const checkConnection = async () => {
    const connected = await healthCheck();
    setIsConnected(connected);
  };

  const handleStartScan = () => {
    if (!isConnected) {
      Alert.alert(
        t('error'),
        t('networkError'),
        [
          { text: t('retry'), onPress: checkConnection },
          { text: t('cancel'), style: 'cancel' },
        ]
      );
      return;
    }
    navigation.navigate('Camera', { cropId: selectedCropId });
  };

  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  const handleOpenSettings = () => {
    navigation.navigate('Settings');
  };

  const selectedCrop = crops.find((c) => c.id === selectedCropId);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🌱</Text>
            <Text style={styles.appName}>{t('appName')}</Text>
          </View>
          <TouchableOpacity onPress={handleOpenSettings} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={26} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.tagline}>{t('tagline')}</Text>

        {/* Connection Status */}
        {!isConnected && (
          <Card style={styles.warningCard}>
            <View style={styles.warningContent}>
              <Ionicons name="cloud-offline" size={24} color={colors.warning} />
              <Text style={styles.warningText}>{t('networkError')}</Text>
            </View>
          </Card>
        )}

        {/* Welcome Card */}
        <Card style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>{t('welcome')}</Text>
          <Text style={styles.welcomeMessage}>{t('welcomeMessage')}</Text>
        </Card>

        {/* Crop Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('selectCrop')}</Text>
          <CropSelector
            crops={crops}
            selectedCropId={selectedCropId}
            onSelectCrop={setSelectedCropId}
          />
          {selectedCrop && (
            <Text style={styles.selectedCropInfo}>
              {getCropName(selectedCrop.name)} • {selectedCrop.season}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title={t('startScan')}
            onPress={handleStartScan}
            icon={<Ionicons name="camera" size={24} color={colors.textWhite} />}
          />
          
          <Button
            title={t('viewHistory')}
            onPress={handleViewHistory}
            variant="outline"
            icon={<Ionicons name="time" size={24} color={colors.primary} />}
          />
        </View>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>🔬</Text>
                <Text style={styles.infoLabel}>{t('aiAnalysis')}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>⚡</Text>
                <Text style={styles.infoLabel}>{t('lessThan3Sec')}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>🎯</Text>
                <Text style={styles.infoLabel}>{t('npkDetection')}</Text>
              </View>
            </View>
          </Card>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoIcon: {
    fontSize: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  warningCard: {
    backgroundColor: `${colors.warning}15`,
    borderColor: colors.warning,
    marginBottom: spacing.md,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  warningText: {
    color: colors.warning,
    fontWeight: '500',
    flex: 1,
  },
  welcomeCard: {
    backgroundColor: `${colors.primary}10`,
    borderColor: `${colors.primary}30`,
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  welcomeMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  selectedCropInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  infoSection: {
    marginTop: spacing.md,
  },
  infoCard: {
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoIcon: {
    fontSize: 28,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default HomeScreen;
