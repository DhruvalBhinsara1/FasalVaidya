/**
 * Settings Screen
 * =================
 * Language selection and app settings
 */

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from '../components';
import { clearSeenOnboarding, getCurrentLanguage, loadLanguage, SUPPORTED_LANGUAGES, t } from '../i18n';
import { getSyncStatus, performSync, toggleSync } from '../sync';
import { borderRadius, colors, shadows, spacing } from '../theme';
import { getUserProfile, saveUserProfile } from '../utils/userStorage';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  
  // Profile State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Sync State
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncAvailable, setSyncAvailable] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const isHindi = currentLang === 'hi';

  useEffect(() => {
    loadLanguage().then(setCurrentLang);
    loadProfile();
    loadSyncStatus();
  }, []);

  const loadProfile = async () => {
    const profile = await getUserProfile();
    setName(profile.name);
    setPhone(profile.phone);
    setProfileImage(profile.profileImage);
  };

  const loadSyncStatus = async () => {
    try {
      const status = await getSyncStatus();
      setSyncAvailable(status.isAvailable);
      setSyncEnabled(status.isEnabled);
      setIsSyncing(status.isSyncing);
      if (status.lastSync.lastSyncAt) {
        setLastSyncTime(new Date(status.lastSync.lastSyncAt));
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleToggleSync = async () => {
    try {
      const newState = !syncEnabled;
      await toggleSync(newState);
      setSyncEnabled(newState);
      
      if (newState) {
        Alert.alert(
          '🌐 Online Mode Enabled',
          'Your data will now sync with the cloud automatically.'
        );
      } else {
        Alert.alert(
          '📱 Offline Mode Enabled',
          'You can continue using the app without internet. Data will be saved locally.'
        );
      }
    } catch (error) {
      console.error('Toggle sync failed:', error);
      Alert.alert('Error', 'Failed to toggle sync mode');
    }
  };

  const handleManualSync = async () => {
    if (!syncAvailable) {
      Alert.alert('Sync Unavailable', 'Please check your internet connection');
      return;
    }
    
    setIsSyncing(true);
    try {
      const result = await performSync();
      setLastSyncTime(new Date());
      Alert.alert(
        '✅ Sync Complete',
        `Pushed: ${result.pushResult?.totalRecords || 0} records\nPulled: ${result.pullResult?.totalRecords || 0} records`
      );
    } catch (error) {
      console.error('Manual sync failed:', error);
      Alert.alert('Sync Failed', 'Please try again later');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveProfile = async () => {
    await saveUserProfile({ name, phone, profileImage });
    setIsEditing(false);
    // Optional: Show a toast or feedback
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
      setIsEditing(true); // Auto-enable edit mode if image changes
    }
  };

  // Language changes happen via the centralized LanguageSelection screen.
  
  const getCurrentLanguageData = () => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === currentLang) || SUPPORTED_LANGUAGES[0];
  };

  const handleClearCache = () => {
    Alert.alert(
      t('clearCache'),
      t('clearCacheConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert(t('done'), t('cacheCleared'));
              // reload language/profile after clearing
              const lang = await loadLanguage();
              setCurrentLang(lang);
              loadProfile();
            } catch (e) {
              console.error('Clear cache failed', e);
              Alert.alert(t('error'), t('cacheClearFailed'));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* (branding removed to simplify layout) */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Card style={styles.section}>
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={handlePickImage} style={styles.profileImageContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Ionicons name="person" size={40} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
            
            <View style={styles.profileInfo}>
              {isEditing ? (
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('enterName')}
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={t('enterPhone')}
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                    <Text style={styles.saveButtonText}>{t('save')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.profileName}>{name || t('guestUser')}</Text>
                  <Text style={styles.profilePhone}>{phone || t('noPhone')}</Text>
                  <TouchableOpacity 
                    style={styles.editButton} 
                    onPress={() => setIsEditing(true)}
                  >
                    <Text style={styles.editButtonText}>{t('editProfile')}</Text>
                  </TouchableOpacity>

                  {/* compact language chip placed on a new line under profile info */}
                  <TouchableOpacity style={styles.languageChip} onPress={() => navigation.navigate('LanguageSelection')}>
                    <Text style={styles.chipFlag}>{getCurrentLanguageData().flag}</Text>
                    <Text style={styles.chipText}>{t(getCurrentLanguageData().labelKey)} · {getCurrentLanguageData().nativeName}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Language is now accessible from the profile header chip above */}

        {/* Activity Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('activity')}</Text>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => navigation.navigate('ChatHistory')}
          >
            <View style={styles.optionContent}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
              <Text style={styles.optionLabel}>{t('chatHistory')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </Card>

        {/* Sync Settings Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🌐 Sync Settings</Text>
          
          {/* Sync Status Indicator */}
          <View style={styles.syncStatusContainer}>
            <View style={styles.syncStatusRow}>
              <Ionicons 
                name={syncEnabled ? "cloud-done" : "cloud-offline"} 
                size={28} 
                color={syncEnabled ? colors.success : colors.textSecondary} 
              />
              <View style={styles.syncStatusText}>
                <Text style={styles.syncStatusTitle}>
                  {syncEnabled ? '🌐 Online Mode' : '📱 Offline Mode'}
                </Text>
                <Text style={styles.syncStatusSubtitle}>
                  {syncEnabled 
                    ? 'Data syncs automatically' 
                    : 'Data saved locally only'}
                </Text>
                {lastSyncTime && syncEnabled && (
                  <Text style={styles.lastSyncText}>
                    Last sync: {lastSyncTime.toLocaleTimeString()}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Toggle Sync Button */}
          <TouchableOpacity
            style={[styles.syncToggleButton, syncEnabled && styles.syncToggleButtonActive]}
            onPress={handleToggleSync}
          >
            <View style={styles.optionContent}>
              <Ionicons 
                name={syncEnabled ? "toggle" : "toggle-outline"} 
                size={24} 
                color={syncEnabled ? colors.success : colors.textSecondary} 
              />
              <Text style={[styles.syncToggleText, syncEnabled && styles.syncToggleTextActive]}>
                {syncEnabled ? 'Switch to Offline Mode' : 'Switch to Online Mode'}
              </Text>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={syncEnabled ? colors.success : colors.textSecondary} 
            />
          </TouchableOpacity>

          {/* Manual Sync Button (only show when online) */}
          {syncEnabled && (
            <TouchableOpacity
              style={[styles.manualSyncButton, isSyncing && styles.manualSyncButtonDisabled]}
              onPress={handleManualSync}
              disabled={isSyncing || !syncAvailable}
            >
              <View style={styles.optionContent}>
                <Ionicons 
                  name={isSyncing ? "sync" : "cloud-upload"} 
                  size={20} 
                  color={colors.primary} 
                />
                <Text style={styles.manualSyncText}>
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Text>
              </View>
              {!syncAvailable && (
                <View style={styles.offlineBadge}>
                  <Text style={styles.offlineBadgeText}>No Internet</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Sync Info */}
          <View style={styles.syncInfo}>
            <Text style={styles.syncInfoText}>
              {syncEnabled 
                ? '💡 Online mode syncs your data to the cloud for backup and cross-device access.' 
                : '💡 Offline mode keeps your data local. You can switch to online mode anytime.'}
            </Text>
          </View>
        </Card>
        
        {/* Language modal removed in favor of LanguageSelection screen */}

        {/* About Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about')}</Text>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>{t('aboutApp')}</Text>
            <Text style={styles.aboutValue}>{t('appName')}</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>{t('version')}</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>{t('purpose')}</Text>
            <Text style={styles.aboutValue}>AI Crop Health</Text>
          </View>

          <TouchableOpacity
            style={[styles.optionItem, styles.dangerOption]}
            onPress={handleClearCache}
          >
            <View style={styles.optionContent}>
              <Ionicons name="trash" size={20} color={colors.error} />
              <Text style={styles.dangerLabel}>{t('clearCache')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.error} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionItem, { marginTop: spacing.sm }]}
            onPress={async () => {
              await clearSeenOnboarding();
              navigation.navigate('LanguageSelection', { onboarding: true });
            }}
          >
            <View style={styles.optionContent}>
              <Ionicons name="refresh" size={20} color={colors.primary} />
              <Text style={styles.optionLabel}>Show Language Onboarding</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </Card>

        {/* Features + Supported Crops (merged) */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('features')}</Text>

          <View>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="leaf" size={20} color={colors.primary} />
                <Text style={styles.featureText}>{t('npkDetection')}</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="camera" size={20} color={colors.primary} />
                <Text style={styles.featureText}>{t('startScan')}</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="bulb" size={20} color={colors.primary} />
                <Text style={styles.featureText}>{t('recommendations')}</Text>
              </View>
            </View>
          </View>
        </Card>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dropdownFlag: {
    fontSize: 32,
  },
  dropdownTextContainer: {
    flexDirection: 'column',
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dropdownSub: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  modalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modalOptionFlag: {
    fontSize: 32,
  },
  modalOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalOptionSub: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  dangerOption: {
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: `${colors.error}10`,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  selectedOption: {
    backgroundColor: `${colors.primary}10`,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionFlag: {
    fontSize: 32,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionSub: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aboutLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  featureItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featureList: {
    flex: 1,
    paddingRight: spacing.md,
  },
  cropPreviewWrap: {
    minWidth: 100,
    maxWidth: 140,
    alignItems: 'flex-start',
  },
  smallTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cropChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropChipsContent: {
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  cropChip: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    ...shadows.sm,
  },
  cropChipEmoji: {
    fontSize: 16,
  },
  moreChip: {
    paddingHorizontal: spacing.xs,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  moreText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  featureText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  cropsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  cropItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '28%',
    marginBottom: spacing.md,
  },
  cropEmoji: {
    fontSize: 32,
  },
  cropLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  // Profile Styles
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
  },
  profilePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  editButton: {
    paddingVertical: 4,
  },
  editButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  editForm: {
    gap: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  /* Compact language chip inside profile */
  languageChip: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    ...shadows.sm,
  },
  chipFlag: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  chipText: {
    fontSize: 13,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  // Sync Settings Styles
  syncStatusContainer: {
    backgroundColor: `${colors.primary}08`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  syncStatusText: {
    flex: 1,
  },
  syncStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  syncStatusSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  lastSyncText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  syncToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  syncToggleButtonActive: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}10`,
  },
  syncToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  syncToggleTextActive: {
    color: colors.success,
  },
  manualSyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: `${colors.primary}10`,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  manualSyncButtonDisabled: {
    opacity: 0.5,
  },
  manualSyncText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  offlineBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  offlineBadgeText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  syncInfo: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  syncInfoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default SettingsScreen;
