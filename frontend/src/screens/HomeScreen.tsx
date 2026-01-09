/**
 * Home Screen
 * ============
 * Main landing screen with crop selection and scan button
 */

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { Crop, getCrops, healthCheck } from '../api';
import { Card, CropSelector } from '../components';
import { getCropName, getCurrentLanguage, t } from '../i18n';
import { borderRadius, colors, shadows, spacing } from '../theme';

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
        { id: 3, name: 'Maize', name_hi: 'मक्का', season: 'Kharif/Rabi', icon: '🌽' },
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
        {/* Greeting + avatar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('welcome')}</Text>
            <Text style={styles.greetingSub}>{t('tagline')}</Text>
          </View>
          <TouchableOpacity onPress={handleOpenSettings} style={styles.avatarWrapper}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/80?img=68' }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        {/* Hero actions */}
        <View style={styles.heroRow}>
          <TouchableOpacity style={[styles.heroCard, styles.heroPrimary]} onPress={handleStartScan}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="camera" size={28} color={colors.textWhite} />
            </View>
            <Text style={styles.heroTitle}>{t('startScan')}</Text>
            <Text style={styles.heroSub}>{t('aiAnalysis')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heroCard, styles.heroDark]} onPress={handleViewHistory}>
            <View style={[styles.heroIconWrap, styles.heroIconDark]}>
              <Ionicons name="time" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.heroTitle, styles.heroTitleLight]}>{t('viewHistory')}</Text>
            <Text style={[styles.heroSub, styles.heroSubLight]}>{t('lessThan3Sec')}</Text>
          </TouchableOpacity>
        </View>

        {/* Crop Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('selectCrop')}</Text>
            <Text style={styles.sectionMeta}>{t('aiAnalysis')}</Text>
          </View>
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

        {/* Reminder / info card */}
        <Card style={styles.reminderCard}>
          <View style={styles.reminderIconWrap}>
            <Ionicons name="water" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>{t('aiAnalysis')}</Text>
            <Text style={styles.reminderText}>{t('welcomeMessage')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
        </Card>

        {/* Connection Status */}
        {!isConnected && (
          <Card style={styles.warningCard}>
            <View style={styles.warningContent}>
              <Ionicons name="cloud-offline" size={24} color={colors.warning} />
              <Text style={styles.warningText}>{t('networkError')}</Text>
            </View>
          </Card>
        )}
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  greetingSub: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 15,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  heroRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  heroCard: {
    flex: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    justifyContent: 'space-between',
    minHeight: 160,
    ...shadows.lg,
  },
  heroPrimary: {
    backgroundColor: colors.primary,
  },
  heroDark: {
    backgroundColor: colors.surfaceDark,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroIconDark: {
    backgroundColor: 'rgba(15,193,95,0.15)',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textWhite,
  },
  heroTitleLight: {
    color: colors.textWhite,
  },
  heroSub: {
    marginTop: spacing.sm,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  heroSubLight: {
    color: '#E5E7EB',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionMeta: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  selectedCropInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
    backgroundColor: '#F7FBF7',
  },
  reminderIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reminderText: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 13,
  },
  warningCard: {
    backgroundColor: `${colors.warning}15`,
    borderColor: colors.warning,
    marginTop: spacing.lg,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  warningText: {
    color: colors.warning,
    fontWeight: '600',
    flex: 1,
  },
});

export default HomeScreen;
