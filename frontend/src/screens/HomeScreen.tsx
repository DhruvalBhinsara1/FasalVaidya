/**
 * Home Screen
 * ============
 * Main landing screen with crop selection and scan button
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
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

import { Crop, getCrops, getModels, healthCheck, Model } from '../api';
import { Card, CropSelector } from '../components';
import { getCropName, getSeasonName, t } from '../i18n';
import { borderRadius, colors, shadows, spacing } from '../theme';
import { getUserProfile } from '../utils/userStorage';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<number>(1);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('unified_v2');

  useEffect(() => {
    loadCrops();
    loadModels();
    checkConnection();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    const profile = await getUserProfile();
    setProfileImage(profile.profileImage);
  };

  const loadModels = async () => {
    try {
      const modelsData = await getModels();
      setModels(modelsData);
      const defaultModel = modelsData.find(m => m.default);
      if (defaultModel) {
        setSelectedModelId(defaultModel.id);
      }
    } catch (error) {
      console.log('Failed to load models, using default');
      setModels([{ id: 'v2_enhanced', name: 'V2 Enhanced', description: 'Default model', default: true }]);
    }
  };

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
        { id: 5, name: 'Maize', name_hi: 'मक्का', season: 'Kharif/Rabi', icon: '🌽' },
        // Removed unsupported crops
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
    navigation.navigate('Camera', { cropId: selectedCropId, modelId: selectedModelId });
  };

  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  const handleOpenSettings = () => {
    navigation.navigate('Settings');
  };

  const handleOpenChat = () => {
    navigation.navigate('Chat' as any, { cropId: selectedCropId });
  };

  const selectedCrop = crops.find((c) => c.id === selectedCropId);
  const selectedModel = models.find((m) => m.id === selectedModelId);

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
            {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
                <Image
                    source={{ uri: 'https://i.pravatar.cc/80?img=68' }}
                    style={styles.avatar}
                />
            )}
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
              {getCropName(selectedCrop.name)} • {selectedCrop.season ? getSeasonName(selectedCrop.season) : ''}
            </Text>
          )}
        </View>

        {/* Model Selection */}
        {models.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('selectModel') || 'Select Model'}</Text>
              <Text style={styles.sectionMeta}>{t('aiPowered') || 'AI Powered'}</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modelList}
            >
              {models.map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelCard,
                    selectedModelId === model.id && styles.modelCardSelected,
                  ]}
                  onPress={() => setSelectedModelId(model.id)}
                >
                  <View style={styles.modelIconWrap}>
                    <Ionicons 
                      name={model.id.includes('yolo') ? 'flash' : model.id.includes('efficient') ? 'speedometer' : 'cube'} 
                      size={24} 
                      color={selectedModelId === model.id ? colors.textWhite : colors.primary} 
                    />
                  </View>
                  <Text style={[
                    styles.modelName,
                    selectedModelId === model.id && styles.modelNameSelected,
                  ]}>
                    {model.name}
                  </Text>
                  {model.default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>★</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selectedModel && (
              <Text style={styles.modelDescription}>
                {selectedModel.description}
              </Text>
            )}
          </View>
        )}

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

      {/* Always-visible AI chat access (icon-first, low-text) */}
      <TouchableOpacity
        style={styles.chatFab}
        onPress={handleOpenChat}
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
  // Model Selection Styles
  modelList: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  modelCard: {
    width: 110,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  modelCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modelIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  modelName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modelNameSelected: {
    color: colors.textWhite,
  },
  defaultBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultBadgeText: {
    fontSize: 10,
    color: colors.textWhite,
    fontWeight: '700',
  },
  modelDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontStyle: 'italic',
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

export default HomeScreen;
