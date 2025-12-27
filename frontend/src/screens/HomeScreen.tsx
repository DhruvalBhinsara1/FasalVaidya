import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getHealth, getCrops, Crop } from '../api/client';
import { theme } from '../theme/theme';
import { t, initI18n } from '../i18n/i18n';

const CROPS_FALLBACK: Crop[] = [
  { id: 1, name: 'Wheat', name_hi: 'Gehun' },
  { id: 2, name: 'Rice', name_hi: 'Chawal' },
  { id: 3, name: 'Tomato', name_hi: 'Tamatar' },
  { id: 4, name: 'Cotton', name_hi: 'Kapas' },
];

initI18n();

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [selectedCrop, setSelectedCrop] = useState<number>(1);
  const [crops, setCrops] = useState<Crop[]>(CROPS_FALLBACK);
  const [apiStatus, setApiStatus] = useState<string>('');

  useEffect(() => {
    getHealth()
      .then((msg) => setApiStatus(msg))
      .catch(() => setApiStatus('offline'));

    getCrops()
      .then((remote) => {
        if (remote.length) setCrops(remote);
      })
      .catch(() => setCrops(CROPS_FALLBACK));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>FasalVaidya</Text>
        <Text style={styles.subtitle}>{t('tagline')}</Text>
        <Text style={styles.status}>{apiStatus ? `${t('backend')}: ${apiStatus}` : t('checking')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('selectCrop')}</Text>
        <FlatList
          data={crops}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          contentContainerStyle={styles.cropList}
          renderItem={({ item }) => {
            const active = item.id === selectedCrop;
            return (
              <Pressable onPress={() => setSelectedCrop(item.id)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      <View style={styles.section}>
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Scan', { cropId: selectedCrop })}>
          <Text style={styles.primaryButtonText}>{t('scanLeaf')}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('History')}>
          <Text style={styles.secondaryButtonText}>{t('viewHistory')}</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('multiCropNote')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
  },
  header: {
    paddingVertical: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    color: theme.colors.textPrimary,
  },
  status: {
    marginTop: 6,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  section: {
    marginTop: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: theme.colors.textPrimary,
  },
  cropList: {
    gap: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
