import { I18n } from 'i18n-js';

const translations = {
  en: {
    tagline: 'Instant NPK diagnosis for your crops',
    backend: 'Backend',
    checking: 'Checking backend...',
    selectCrop: 'Select crop',
    scanLeaf: 'Scan leaf',
    viewHistory: 'View history',
    multiCropNote: 'Supports Wheat, Rice, Tomato, Cotton.',
  },
  hi: {
    tagline: 'Aapke faslon ke liye turant NPK janch',
    backend: 'Backend',
    checking: 'Backend ki jaanch...',
    selectCrop: 'Fasal chune',
    scanLeaf: 'Patta scan karein',
    viewHistory: 'Itihas dekhein',
    multiCropNote: 'Gehu, Chawal, Tamatar, Kapas ke liye samarthit.',
  },
};

const i18n = new I18n(translations);
i18n.defaultLocale = 'en';
i18n.locale = 'en';

export function initI18n(locale: 'en' | 'hi' = 'en') {
  i18n.locale = locale;
}

export function t(key: keyof typeof translations['en']): string {
  return i18n.t(key);
}
