
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import React, { useContext, useState } from 'react';
import { Animated, Easing, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LanguageContext, loadLanguage, setLanguage, SUPPORTED_LANGUAGES, t, setSeenOnboarding } from '../i18n';
import { colors } from '../theme';

// Assign accent colors for each language (repeat or expand as needed)
const ACCENT_COLORS = [
  '#E57373', // Red
  '#64B5F6', // Blue
  '#81C784', // Green
  '#FFD54F', // Yellow
  '#BA68C8', // Purple
  '#4DB6AC', // Teal
  '#FF8A65', // Orange
  '#A1887F', // Brown
  '#90A4AE', // Gray
  '#F06292', // Pink
  '#7986CB', // Indigo
  '#AED581', // Light Green
  '#FFD600', // Amber
];

const getAccentColor = (idx: number) => ACCENT_COLORS[idx % ACCENT_COLORS.length];

const LanguageSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language, setLanguageContext } = useContext(LanguageContext);
  const [selected, setSelected] = useState<string>(language);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const scaleAnim = new Animated.Value(1);

  // Map SUPPORTED_LANGUAGES to include accentColor and scriptChar
  const languages = SUPPORTED_LANGUAGES.map((lang, idx) => ({
    ...lang,
    accentColor: getAccentColor(idx),
    scriptChar: lang.nativeName.charAt(0),
  }));

  const handleSelect = async (code: string) => {
    setSelected(code);
    await setLanguage(code);
    await loadLanguage();
    setLanguageContext(code); // update global context, triggers app-wide re-render
    handleSpeak(code);
    // If opened as part of onboarding (first-run), mark onboarding and navigate to Home
    const onboarding = route?.params?.onboarding;
    if (onboarding) {
      await setSeenOnboarding();
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  };

  const handleSpeak = (code: string) => {
    const lang = languages.find(l => l.code === code);
    if (!lang) return;
    setSpeaking(code);
    Speech.speak(lang.nativeName, {
      language: code,
      rate: 0.8,
      onDone: () => setSpeaking(null),
      onStopped: () => setSpeaking(null),
    });
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 120, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true, easing: Easing.in(Easing.ease) })
    ]).start();
  };

  const renderItem = ({ item, index }: { item: typeof languages[0]; index: number }) => {
    const isSelected = language === item.code;
    const isSpeaking = speaking === item.code;
    return (
      <View style={styles.languageItem}>
        <TouchableOpacity
          style={[
            styles.circle,
            { borderColor: item.accentColor },
            isSelected && { borderWidth: 3, borderColor: item.accentColor, backgroundColor: item.accentColor + '22' },
          ]}
          activeOpacity={0.85}
          accessibilityLabel={`${item.nativeName}, tap to select, tap speaker to hear pronunciation`}
          accessibilityRole="button"
          onPress={() => handleSelect(item.code)}
        >
          <Text style={[styles.scriptChar, { color: item.accentColor }]}>{item.nativeName.charAt(0)}</Text>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={22} color={item.accentColor} style={styles.checkmark} />
          )}
          <TouchableOpacity
            style={styles.speakerIconWrap}
            onPress={() => handleSpeak(item.code)}
            accessibilityLabel={`Hear ${item.nativeName} pronunciation`}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Animated.View style={{ transform: [{ scale: isSpeaking ? scaleAnim : 1 }] }}>
              <Ionicons name="volume-high" size={20} color={isSpeaking ? item.accentColor : colors.textSecondary} />
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
        {/* Language name below circle */}
        <Text style={styles.languageName}>{item.nativeName}</Text>
        <Text style={styles.languageLabel}>{t(item.labelKey)}</Text>
      </View>
    );
  };

  // Use language context value to force re-render on language change
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const forceRerenderOnLanguage = language;
  const onboarding = route?.params?.onboarding;
  return (
    <SafeAreaView style={styles.container}>
      {/* Branding: app name + tagline, centered to match Home screen branding */}
      <View style={styles.branding}>
        <Text style={styles.brandTitle}>{t('appName')}</Text>
        <Text style={styles.brandSubtitle}>{t('tagline')}</Text>
      </View>
      {/* Header - if onboarding, show centered Home button (no back) */}
      <View style={styles.header}>
        {!onboarding ? (
          <>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Back" accessibilityRole="button">
              <Ionicons name="arrow-back" size={28} color={colors.textPrimary || '#222'} />
            </TouchableOpacity>
            <Text style={styles.title}>{t('selectLanguage')}</Text>
            <View style={{ width: 40 }} />
          </>
        ) : (
          <>
            <View style={{ width: 40 }} />
            <View style={styles.onboardingCenter}>
              <TouchableOpacity
                onPress={() => {
                  // go to Home without leaving onboarding state (mark seen just in case)
                  setSeenOnboarding();
                  navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                }}
                style={styles.homeButton}
                accessibilityLabel="Home"
                accessibilityRole="button"
              >
                <Ionicons name="home" size={28} color={colors.textPrimary || '#222'} />
              </TouchableOpacity>
              <Text style={styles.title}>{t('selectLanguage')}</Text>
            </View>
            <View style={{ width: 40 }} />
          </>
        )}
      </View>
      <FlatList
        data={languages}
        renderItem={renderItem}
        keyExtractor={item => item.code}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
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
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  onboardingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  homeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  branding: {
    alignItems: 'center',
    paddingTop: 36, // lowered to avoid notches/dynamic island
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  brandSubtitle: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 14,
  },
  grid: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  languageItem: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '31%', // slightly adjusted for spacing
    minWidth: 88,
    marginVertical: 10,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    marginBottom: 6,
    position: 'relative',
  },
  scriptChar: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  speakerIconWrap: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    elevation: 2,
  },
  languageName: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    color: '#222',
    textAlign: 'center',
  },
  languageLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 6,
  },
});

export default LanguageSelectionScreen;
