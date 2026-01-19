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

import { Card } from '../components';
import { clearSeenOnboarding, getCurrentLanguage, loadLanguage, SUPPORTED_LANGUAGES, t } from '../i18n';
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
  
  const isHindi = currentLang === 'hi';

  useEffect(() => {
    loadLanguage().then(setCurrentLang);
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const profile = await getUserProfile();
    setName(profile.name);
    setPhone(profile.phone);
    setProfileImage(profile.profileImage);
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
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Language Section: opens the new LanguageSelection screen */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('language')}</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => navigation.navigate('LanguageSelection')}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownContent}>
              <Text style={styles.dropdownFlag}>{getCurrentLanguageData().flag}</Text>
              <View style={styles.dropdownTextContainer}>
                <Text style={styles.dropdownLabel}>{t(getCurrentLanguageData().labelKey)}</Text>
                <Text style={styles.dropdownSub}>{getCurrentLanguageData().nativeName}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </Card>

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

        {/* Features Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('features')}</Text>
          
          <View style={styles.featureItem}>
            <Ionicons name="leaf" size={24} color={colors.primary} />
            <Text style={styles.featureText}>{t('npkDetection')}</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="camera" size={24} color={colors.primary} />
            <Text style={styles.featureText}>{t('startScan')}</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="bulb" size={24} color={colors.primary} />
            <Text style={styles.featureText}>{t('recommendations')}</Text>
          </View>
        </Card>

        {/* Supported Crops */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('supportedCrops')}</Text>
          <View style={styles.cropsGrid}>
            <View style={styles.cropItem}>
              <Text style={styles.cropEmoji}>🌾</Text>
              <Text style={styles.cropLabel}>{t('crop_wheat')}</Text>
            </View>
            <View style={styles.cropItem}>
              <Text style={styles.cropEmoji}>🌾</Text>
              <Text style={styles.cropLabel}>{t('crop_rice')}</Text>
            </View>
            <View style={styles.cropItem}>
              <Text style={styles.cropEmoji}>🌽</Text>
              <Text style={styles.cropLabel}>{t('crop_maize')}</Text>
            </View>
            <View style={styles.cropItem}>
              <Text style={styles.cropEmoji}>🍌</Text>
              <Text style={styles.cropLabel}>{t('crop_banana')}</Text>
            </View>
            <View style={styles.cropItem}>
              <Text style={styles.cropEmoji}>☕</Text>
              <Text style={styles.cropLabel}>{t('crop_coffee')}</Text>
            </View>
            <View style={styles.cropItem}>
              <Text style={styles.cropEmoji}>🍆</Text>
              <Text style={styles.cropLabel}>{t('crop_eggplant')}</Text>
            </View>
            <View style={styles.cropItem}>
              <Text style={styles.cropEmoji}>🎃</Text>
              <Text style={styles.cropLabel}>{t('crop_ashgourd')}</Text>
            </View>
            <View style={styles.cropItem}>
              <Text style={styles.cropEmoji}>🥬</Text>
              <Text style={styles.cropLabel}>{t('crop_bittergourd')}</Text>
            </View>
            <View style={styles.cropItem}>
              <Text style={styles.cropEmoji}>🥬</Text>
              <Text style={styles.cropLabel}>{t('crop_snakegourd')}</Text>
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
});

export default SettingsScreen;
