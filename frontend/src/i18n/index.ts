/**
 * FasalVaidya Internationalization (i18n)
 * ========================================
 * Multi-language support for major Indian languages
 */

import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// English translations
const en = {
  // App
  appName: 'FasalVaidya',
  tagline: 'AI Crop Health Advisor',
  
  // Navigation
  home: 'Home',
  scan: 'Scan',
  history: 'History',
  settings: 'Settings',
  
  // Home Screen
  welcome: 'Welcome to FasalVaidya',
  welcomeMessage: 'Get instant NPK diagnosis for your crops',
  selectCrop: 'Select Your Crop',
  startScan: 'Start Leaf Scan',
  viewHistory: 'View Scan History',
  
  // Crop Names (keys match backend crop IDs/names)
  crop_wheat: 'Wheat',
  crop_rice: 'Rice',
  crop_tomato: 'Tomato',
  crop_cotton: 'Cotton',
  crop_maize: 'Maize',
  crop_banana: 'Banana',
  crop_coffee: 'Coffee',
  crop_cucumber: 'Cucumber',
  crop_eggplant: 'Eggplant',
  crop_ashgourd: 'Ash Gourd',
  crop_bittergourd: 'Bitter Gourd',
  crop_ridgegourd: 'Ridge Gourd',
  crop_snakegourd: 'Snake Gourd',
  
  // Legacy crop name keys for backward compatibility
  wheat: 'Wheat',
  rice: 'Rice',
  tomato: 'Tomato',
  cotton: 'Cotton',
  
  // Camera Screen
  capturePhoto: 'Capture Photo',
  chooseFromGallery: 'Choose from Gallery',
  retake: 'Retake',
  usePhoto: 'Use Photo',
  cameraGuide: 'Position the leaf in the center',
  
  // Results Screen
  diagnosisResults: 'Diagnosis Results',
  overallHealth: 'Overall Health',
  nitrogen: 'Nitrogen (N)',
  phosphorus: 'Phosphorus (P)',
  potassium: 'Potassium (K)',
  deficiencyScore: 'Deficiency Score',
  confidence: 'Confidence',
  recommendation: 'Recommendation',
  recommendations: 'Recommendations',
  noActionNeeded: 'No action needed - healthy levels',
  analysisHeatmap: 'Analysis Heatmap',
  npkDeficiencyScores: 'NPK Deficiency Scores',
  
  // Fertilizer Recommendations
  rec_wheat_n: 'Apply 50-70 kg Urea per acre. Split into 2-3 doses during growth stages.',
  rec_wheat_p: 'Apply 25-35 kg DAP per acre at sowing time.',
  rec_wheat_k: 'Apply 20-30 kg MOP (Muriate of Potash) per acre.',
  rec_rice_n: 'Apply 60-80 kg Urea per acre. Apply in 3 splits: basal, tillering, panicle initiation.',
  rec_rice_p: 'Apply 30-40 kg DAP per acre as basal dose before transplanting.',
  rec_rice_k: 'Apply 25-35 kg MOP per acre in two splits.',
  rec_tomato_n: 'Apply 15-20 kg Urea per 1000 sq.m. Apply in multiple doses throughout growth.',
  rec_tomato_p: 'Apply 10-15 kg DAP per 1000 sq.m at transplanting.',
  rec_tomato_k: 'Apply 12-18 kg MOP per 1000 sq.m. Important for fruit quality.',
  rec_cotton_n: 'Apply 40-60 kg Urea per acre. Split into 3 doses during growth.',
  rec_cotton_p: 'Apply 20-30 kg DAP per acre at sowing.',
  rec_cotton_k: 'Apply 18-25 kg MOP per acre. Essential for boll development.',
  rec_maize_n: 'Apply 60-80 kg Urea per acre. Split into 3 doses: at sowing, knee-high, and tasseling.',
  rec_maize_p: 'Apply 25-35 kg DAP per acre as basal dose at sowing.',
  rec_maize_k: 'Apply 20-30 kg MOP per acre. Important for grain filling.',
  rec_banana_n: 'Apply 200-250g Urea per plant per year in 4-5 splits.',
  rec_banana_p: 'Apply 100-150g SSP per plant at planting and flowering.',
  rec_banana_k: 'Apply 250-300g MOP per plant per year in 3-4 splits. Critical for fruit quality.',
  rec_coffee_n: 'Apply 40-60g Urea per plant in 2-3 splits during rainy season.',
  rec_coffee_p: 'Apply 20-30g SSP per plant at start of monsoon.',
  rec_coffee_k: 'Apply 30-40g MOP per plant in 2 splits. Important for bean quality.',
  rec_cucumber_n: 'Apply 10-15 kg Urea per 1000 sq.m in 3-4 splits during growth.',
  rec_cucumber_p: 'Apply 8-12 kg DAP per 1000 sq.m at transplanting.',
  rec_cucumber_k: 'Apply 10-15 kg MOP per 1000 sq.m. Essential for fruit development.',
  rec_eggplant_n: 'Apply 12-18 kg Urea per 1000 sq.m in 4-5 splits.',
  rec_eggplant_p: 'Apply 10-15 kg DAP per 1000 sq.m at transplanting.',
  rec_eggplant_k: 'Apply 12-15 kg MOP per 1000 sq.m. Important for fruit quality and yield.',
  rec_gourd_n: 'Apply 8-12 kg Urea per 1000 sq.m in 3-4 splits during vine growth.',
  rec_gourd_p: 'Apply 6-10 kg DAP per 1000 sq.m at sowing/transplanting.',
  rec_gourd_k: 'Apply 10-14 kg MOP per 1000 sq.m. Important for fruit development.',
  
  // Severity Levels
  healthy: 'Healthy',
  attention: 'Attention Needed',
  critical: 'Critical',
  
  // History Screen
  scanHistory: 'Scan History',
  noScansYet: 'No scans yet',
  noScansMessage: 'Scan a leaf to get your first diagnosis',
  clearHistory: 'Clear History',
  clearHistoryConfirm: 'Are you sure you want to delete all scan history?',
  
  // Settings Screen
  language: 'Language',
  english: 'English',
  hindi: 'Hindi',
  tamil: 'Tamil',
  telugu: 'Telugu',
  bengali: 'Bengali',
  marathi: 'Marathi',
  gujarati: 'Gujarati',
  kannada: 'Kannada',
  malayalam: 'Malayalam',
  punjabi: 'Punjabi',
  about: 'About',
  version: 'Version',
  
  // Common
  cancel: 'Cancel',
  confirm: 'Confirm',
  delete: 'Delete',
  loading: 'Loading...',
  analyzing: 'Analyzing leaf...',
  error: 'Error',
  retry: 'Retry',
  success: 'Success',
  aiAnalysis: 'AI Analysis',
  lessThan3Sec: '< 3 sec',
  npkDetection: 'NPK Detection',
  
  // Errors
  networkError: 'Network error. Please check your connection.',
  uploadError: 'Failed to upload image. Please try again.',
  cameraPermissionError: 'Camera permission is required to scan leaves.',
};

// Hindi translations
const hi = {
  // App
  appName: 'फसलवैद्य',
  tagline: 'AI फसल स्वास्थ्य सलाहकार',
  
  // Navigation
  home: 'होम',
  scan: 'स्कैन',
  history: 'इतिहास',
  settings: 'सेटिंग्स',
  
  // Home Screen
  welcome: 'फसलवैद्य में आपका स्वागत है',
  welcomeMessage: 'अपनी फसलों के लिए तुरंत NPK निदान पाएं',
  selectCrop: 'अपनी फसल चुनें',
  startScan: 'पत्ती स्कैन शुरू करें',
  viewHistory: 'स्कैन इतिहास देखें',
  
  // Crop Names (keys match backend crop IDs/names)
  crop_wheat: 'गेहूँ',
  crop_rice: 'चावल',
  crop_tomato: 'टमाटर',
  crop_cotton: 'कपास',
  crop_maize: 'मक्का',
  crop_banana: 'केला',
  crop_coffee: 'कॉफी',
  crop_cucumber: 'खीरा',
  crop_eggplant: 'बैंगन',
  crop_ashgourd: 'पेठा',
  crop_bittergourd: 'करेला',
  crop_ridgegourd: 'तुरई',
  crop_snakegourd: 'चिचिंडा',
  
  // Legacy crop name keys for backward compatibility
  wheat: 'गेहूँ',
  rice: 'चावल',
  tomato: 'टमाटर',
  cotton: 'कपास',
  
  // Camera Screen
  capturePhoto: 'फोटो लें',
  chooseFromGallery: 'गैलरी से चुनें',
  retake: 'दोबारा लें',
  usePhoto: 'फोटो उपयोग करें',
  cameraGuide: 'पत्ती को बीच में रखें',
  
  // Results Screen
  diagnosisResults: 'निदान परिणाम',
  overallHealth: 'समग्र स्वास्थ्य',
  nitrogen: 'नाइट्रोजन (N)',
  phosphorus: 'फॉस्फोरस (P)',
  potassium: 'पोटेशियम (K)',
  deficiencyScore: 'कमी स्कोर',
  confidence: 'विश्वास',
  recommendation: 'सिफारिश',
  recommendations: 'सिफारिशें',
  noActionNeeded: 'कोई कार्रवाई आवश्यक नहीं - स्वस्थ स्तर',
  analysisHeatmap: 'विश्लेषण हीटमैप',
  npkDeficiencyScores: 'NPK कमी स्कोर',
  
  // Fertilizer Recommendations
  rec_wheat_n: 'प्रति एकड़ 50-70 किलो यूरिया डालें। विकास चरणों में 2-3 खुराक में बांटें।',
  rec_wheat_p: 'बुवाई के समय प्रति एकड़ 25-35 किलो डीएपी डालें।',
  rec_wheat_k: 'प्रति एकड़ 20-30 किलो एमओपी (म्यूरेट ऑफ पोटाश) डालें।',
  rec_rice_n: 'प्रति एकड़ 60-80 किलो यूरिया डालें। 3 बार में: बेसल, टिलरिंग, पैनिकल शुरुआत।',
  rec_rice_p: 'रोपाई से पहले बेसल खुराक के रूप में प्रति एकड़ 30-40 किलो डीएपी डालें।',
  rec_rice_k: 'प्रति एकड़ 25-35 किलो एमओपी दो बार में डालें।',
  rec_tomato_n: 'प्रति 1000 वर्ग मीटर 15-20 किलो यूरिया डालें। पूरी वृद्धि के दौरान कई खुराक में।',
  rec_tomato_p: 'रोपाई के समय प्रति 1000 वर्ग मीटर 10-15 किलो डीएपी डालें।',
  rec_tomato_k: 'प्रति 1000 वर्ग मीटर 12-18 किलो एमओपी डालें। फल की गुणवत्ता के लिए महत्वपूर्ण।',
  rec_cotton_n: 'प्रति एकड़ 40-60 किलो यूरिया डालें। विकास के दौरान 3 खुराक में बांटें।',
  rec_cotton_p: 'बुवाई के समय प्रति एकड़ 20-30 किलो डीएपी डालें।',
  rec_cotton_k: 'प्रति एकड़ 18-25 किलो एमओपी डालें। गूलर विकास के लिए आवश्यक।',
  rec_maize_n: 'प्रति एकड़ 60-80 किलो यूरिया डालें। 3 बार में: बुवाई, घुटने तक ऊंचाई, और तसल निकलने पर।',
  rec_maize_p: 'बुवाई के समय बेसल खुराक के रूप में प्रति एकड़ 25-35 किलो डीएपी डालें।',
  rec_maize_k: 'प्रति एकड़ 20-30 किलो एमओपी डालें। दाना भरने के लिए महत्वपूर्ण।',
  rec_banana_n: 'प्रति पौधा प्रति वर्ष 200-250 ग्राम यूरिया 4-5 बार में डालें।',
  rec_banana_p: 'रोपाई और फूल आने पर प्रति पौधा 100-150 ग्राम एसएसपी डालें।',
  rec_banana_k: 'प्रति पौधा प्रति वर्ष 250-300 ग्राम एमओपी 3-4 बार में डालें। फल गुणवत्ता के लिए महत्वपूर्ण।',
  rec_coffee_n: 'बारिश के मौसम में प्रति पौधा 40-60 ग्राम यूरिया 2-3 बार में डालें।',
  rec_coffee_p: 'मानसून की शुरुआत में प्रति पौधा 20-30 ग्राम एसएसपी डालें।',
  rec_coffee_k: 'प्रति पौधा 30-40 ग्राम एमओपी 2 बार में डालें। बीन गुणवत्ता के लिए महत्वपूर्ण।',
  rec_cucumber_n: 'वृद्धि के दौरान प्रति 1000 वर्ग मीटर 10-15 किलो यूरिया 3-4 बार में डालें।',
  rec_cucumber_p: 'रोपाई के समय प्रति 1000 वर्ग मीटर 8-12 किलो डीएपी डालें।',
  rec_cucumber_k: 'प्रति 1000 वर्ग मीटर 10-15 किलो एमओपी डालें। फल विकास के लिए आवश्यक।',
  rec_eggplant_n: 'प्रति 1000 वर्ग मीटर 12-18 किलो यूरिया 4-5 बार में डालें।',
  rec_eggplant_p: 'रोपाई के समय प्रति 1000 वर्ग मीटर 10-15 किलो डीएपी डालें।',
  rec_eggplant_k: 'प्रति 1000 वर्ग मीटर 12-15 किलो एमओपी डालें। फल गुणवत्ता और उपज के लिए महत्वपूर्ण।',
  rec_gourd_n: 'बेल वृद्धि के दौरान प्रति 1000 वर्ग मीटर 8-12 किलो यूरिया 3-4 बार में डालें।',
  rec_gourd_p: 'बुवाई/रोपाई के समय प्रति 1000 वर्ग मीटर 6-10 किलो डीएपी डालें।',
  rec_gourd_k: 'प्रति 1000 वर्ग मीटर 10-14 किलो एमओपी डालें। फल विकास के लिए महत्वपूर्ण।',
  
  // Severity Levels
  healthy: 'स्वस्थ',
  attention: 'ध्यान दें',
  critical: 'गंभीर',
  
  // History Screen
  scanHistory: 'स्कैन इतिहास',
  noScansYet: 'अभी तक कोई स्कैन नहीं',
  noScansMessage: 'अपना पहला निदान पाने के लिए पत्ती स्कैन करें',
  clearHistory: 'इतिहास साफ़ करें',
  clearHistoryConfirm: 'क्या आप सभी स्कैन इतिहास हटाना चाहते हैं?',
  
  // Settings Screen
  language: 'भाषा',
  english: 'अंग्रेज़ी',
  hindi: 'हिंदी',
  tamil: 'तमिल',
  telugu: 'तेलुगु',
  bengali: 'बंगाली',
  marathi: 'मराठी',
  gujarati: 'गुजराती',
  kannada: 'कन्नड़',
  malayalam: 'मलयालम',
  punjabi: 'पंजाबी',
  about: 'के बारे में',
  version: 'संस्करण',
  
  // Common
  cancel: 'रद्द करें',
  confirm: 'पुष्टि करें',
  delete: 'हटाएं',
  loading: 'लोड हो रहा है...',
  analyzing: 'पत्ती का विश्लेषण...',
  error: 'त्रुटि',
  retry: 'पुनः प्रयास',
  success: 'सफल',
  aiAnalysis: 'AI विश्लेषण',
  lessThan3Sec: '< 3 सेकंड',
  npkDetection: 'NPK पहचान',
  
  // Errors
  networkError: 'नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।',
  uploadError: 'इमेज अपलोड विफल। कृपया पुनः प्रयास करें।',
  cameraPermissionError: 'पत्तियों को स्कैन करने के लिए कैमरा अनुमति आवश्यक है।',
};

// NOTE:
// We intentionally keep only English + Hindi as fully translated locales for now.
// The other major Indian languages are enabled as selectable locales, but will
// fall back to English for any missing strings (i18n.enableFallback = true).
// This avoids hardcoding thousands of strings before we have verified translations.
const ta = {};
const te = {};
const bn = {};
const mr = {};
const gu = {};
const kn = {};
const ml = {};
const pa = {};

// Create i18n instance
const i18n = new I18n({
  en,
  hi,
  ta, // Tamil
  te, // Telugu
  bn, // Bengali
  mr, // Marathi
  gu, // Gujarati
  kn, // Kannada
  ml, // Malayalam
  pa, // Punjabi
});

// Default settings
i18n.defaultLocale = 'en';
i18n.locale = 'en';
i18n.enableFallback = true;

export const SUPPORTED_LANGUAGES: Array<{
  code: string;
  labelKey:
    | 'english'
    | 'hindi'
    | 'tamil'
    | 'telugu'
    | 'bengali'
    | 'marathi'
    | 'gujarati'
    | 'kannada'
    | 'malayalam'
    | 'punjabi';
  nativeName: string;
  flag: string;
}> = [
  { code: 'en', labelKey: 'english', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', labelKey: 'hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  { code: 'ta', labelKey: 'tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', labelKey: 'telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn', labelKey: 'bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'mr', labelKey: 'marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', labelKey: 'gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn', labelKey: 'kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', labelKey: 'malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa', labelKey: 'punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
];

const SUPPORTED_LANGUAGE_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

// Storage key for language preference
const LANGUAGE_KEY = '@fasalvaidya_language';

/**
 * Load saved language preference
 */
export const loadLanguage = async (): Promise<string> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && SUPPORTED_LANGUAGE_CODES.has(savedLanguage)) {
      i18n.locale = savedLanguage;
      return savedLanguage;
    }
  } catch (error) {
    console.error('Error loading language:', error);
  }
  return i18n.locale;
};

/**
 * Set and save language preference
 */
export const setLanguage = async (locale: string): Promise<void> => {
  const nextLocale = SUPPORTED_LANGUAGE_CODES.has(locale) ? locale : 'en';
  i18n.locale = nextLocale;
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, nextLocale);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

/**
 * Get current language
 */
export const getCurrentLanguage = (): string => {
  return i18n.locale;
};

/**
 * Translate function shorthand
 */
export const t = (key: string, options?: object): string => {
  return i18n.t(key, options);
};

/**
 * Get translated crop name from crop name string
 * Maps backend crop names to i18n keys
 */
export const getCropName = (cropName: string): string => {
  // Convert crop name to i18n key format (lowercase, remove spaces)
  const key = `crop_${cropName.toLowerCase().replace(/\s+/g, '')}`;
  const translated = i18n.t(key);
  // If translation key not found, return original name
  return translated.startsWith('[missing') ? cropName : translated;
};

/**
 * Get translated recommendation text
 * @param cropName - The crop name (e.g., 'Wheat', 'Rice')  
 * @param nutrient - The nutrient type ('n', 'p', or 'k')
 */
export const getRecommendation = (cropName: string, nutrient: 'n' | 'p' | 'k'): string => {
  const cropKey = cropName.toLowerCase().replace(/\s+/g, '');
  // Try specific crop recommendation first
  let key = `rec_${cropKey}_${nutrient}`;
  let translated = i18n.t(key);
  
  // Fall back to gourd recommendations for gourd variants
  if (translated.startsWith('[missing') && cropKey.includes('gourd')) {
    key = `rec_gourd_${nutrient}`;
    translated = i18n.t(key);
  }
  
  // Return translated or empty if not found
  return translated.startsWith('[missing') ? '' : translated;
};

export default i18n;
