/**
 * Settings Screen
 * =================
 * Language selection and app settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows } from '../theme';
import { Card } from '../components';
import { t, getCurrentLanguage, setLanguage, loadLanguage, SUPPORTED_LANGUAGES } from '../i18n';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  useEffect(() => {
    loadLanguage().then(setCurrentLang);
  }, []);

  const handleLanguageChange = async (lang: string) => {
    await setLanguage(lang);
    setCurrentLang(lang);
    // Force re-render by navigating
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
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
        {/* Language Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('language')}</Text>

          {SUPPORTED_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.optionItem,
                currentLang === lang.code && styles.selectedOption,
              ]}
              onPress={() => handleLanguageChange(lang.code)}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionFlag}>{lang.flag}</Text>
                <View>
                  <Text style={styles.optionLabel}>{t(lang.labelKey)}</Text>
                  <Text style={styles.optionSub}>{lang.nativeName}</Text>
                </View>
              </View>
              {currentLang === lang.code && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </Card>

        {/* About Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about')}</Text>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>App Name</Text>
            <Text style={styles.aboutValue}>FasalVaidya</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>{t('version')}</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Purpose</Text>
            <Text style={styles.aboutValue}>AI-powered crop health diagnosis</Text>
          </View>
        </Card>

        {/* Features Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          
          <View style={styles.featureItem}>
            <Ionicons name="leaf" size={24} color={colors.primary} />
            <Text style={styles.featureText}>NPK Deficiency Detection</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="camera" size={24} color={colors.primary} />
            <Text style={styles.featureText}>Instant Leaf Scanning</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="bulb" size={24} color={colors.primary} />
            <Text style={styles.featureText}>Fertilizer Recommendations</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="language" size={24} color={colors.primary} />
            <Text style={styles.featureText}>Multi-language Support</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="volume-high" size={24} color={colors.primary} />
            <Text style={styles.featureText}>Text-to-Speech</Text>
          </View>
        </Card>

        {/* Supported Crops */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Supported Crops</Text>
          <View style={styles.cropsGrid}>
            <View style={styles.cropItem}>
              <Text style={styles.cropEmoji}>🌾</Text>
              <Text style={styles.cropLabel}>Wheat</Text>
            </View>
            <View style={styles.cropItem}>
              <Text style={styles.cropEmoji}>🌾</Text>
              <Text style={styles.cropLabel}>Rice</Text>
            </View>
            <View style={styles.cropItem}>
              <Text style={styles.cropEmoji}>🍅</Text>
              <Text style={styles.cropLabel}>Tomato</Text>
            </View>
            <View style={styles.cropItem}>
              <Text style={styles.cropEmoji}>🌿</Text>
              <Text style={styles.cropLabel}>Cotton</Text>
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
    gap: spacing.md,
  },
  cropItem: {
    alignItems: 'center',
    width: '22%',
  },
  cropEmoji: {
    fontSize: 32,
  },
  cropLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

export default SettingsScreen;
