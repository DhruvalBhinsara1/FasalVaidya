# 📱 FasalVaidya Frontend

**React Native Mobile App for AI-Powered Crop Health Diagnosis**

React Native Expo application built with TypeScript that provides an intuitive interface for farmers to diagnose crop nutrient deficiencies using their smartphone camera.

---

## ✨ Features

- 📷 **Camera Integration**: Capture leaf images directly from app
- 🖼️ **Gallery Support**: Select existing photos from device
- 🌾 **Multi-Crop Support**: 9 crops with 43 deficiency classes
- 📊 **Real-Time Analysis**: Instant NPK+Mg deficiency detection
- 🗓️ **Scan History**: Track and compare previous diagnoses
- 🌍 **Multi-Language**: 10+ languages (English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi)
- 🔊 **Text-to-Speech**: Audio narration for accessibility
- 🎨 **Modern UI**: Clean Material Design interface
- 📈 **Confidence Scores**: Visual feedback on prediction reliability
- 💡 **Smart Recommendations**: Crop-specific fertilizer suggestions

---

## 🛠️ Tech Stack

- **React Native** 0.81.5 - Cross-platform mobile framework
- **Expo** ~54.0.0 - Development tools and native APIs
- **TypeScript** 5.1.3 - Type-safe JavaScript
- **React Navigation** 6.x - Bottom tabs + stack navigation
- **Axios** 1.6.2 - HTTP client for API communication
- **i18n-js** 4.3.2 - Internationalization
- **Expo Camera** 17.0.10 - Camera integration
- **Expo Image Picker** 17.0.10 - Gallery access
- **Expo Speech** 14.0.8 - Text-to-speech
- **React Native SVG** 15.12.1 - Icon support
- **AsyncStorage** 2.2.0 - Local storage

---

## 📱 Setup & Installation

### Prerequisites

- **Node.js** 18+ and **npm**
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go** app on your phone (iOS/Android)
- Backend server running on `http://192.168.x.x:5000` (configure in `src/api/client.ts`)

### Installation

```bash
cd frontend
npm install
```

### Running the App

```bash
# Start Expo development server (tunnel mode for LAN access)
npm start

# Alternative: Start with specific platform
npm run android   # Android device/emulator
npm run ios       # iOS device/simulator
npm run web       # Web browser
```

### Connecting to Backend

1. Find your computer's local IP address:
   - Windows: `ipconfig` → look for IPv4
   - Mac/Linux: `ifconfig` → look for inet

2. Update backend URL in [src/api/client.ts](src/api/client.ts):
   ```typescript
   export const API_BASE_URL = 'http://192.168.1.100:5000'; // Your IP
   ```

3. Ensure phone and computer are on same WiFi network

---

## 📚 Project Structure

```
frontend/
├── App.tsx                      # Main entry point with navigation setup
├── app.json                    # Expo configuration
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── babel.config.js             # Babel configuration
├──
├── src/
│   ├── api/                    # API Client Layer
│   │   ├── client.ts           # Axios instance & configuration
│   │   └── scans.ts            # Scan API functions
│   │
│   ├── screens/                # Application Screens
│   │   ├── HomeScreen.tsx      # Crop selection & scan start
│   │   ├── CameraScreen.tsx    # Camera capture interface
│   │   ├── ResultsScreen.tsx   # Diagnosis results display
│   │   ├── HistoryScreen.tsx   # Scan history list
│   │   └── SettingsScreen.tsx  # Language & app settings
│   │
│   ├── components/             # Reusable UI Components
│   │   ├── Button.tsx          # Custom button component
│   │   ├── Card.tsx            # Card container
│   │   ├── CropSelector.tsx    # Crop selection grid
│   │   ├── ScoreBar.tsx        # Nutrient score visualizer
│   │   └── LoadingIndicator.tsx
│   │
│   ├── i18n/                   # Internationalization
│   │   └── index.ts            # Language translations (10+ languages)
│   │
│   ├── theme/                  # Design System
│   │   └── index.ts            # Colors, typography, spacing
│   │
│   └── utils/                  # Utility Functions
│       ├── storage.ts          # AsyncStorage helpers
│       └── validators.ts       # Input validation
│
└── assets/                     # Static Assets
    ├── <crop>.avif             # Crop images (9 crops)
    └── icon.png                # App icon
```

---

## 🔑 Key Components

### Screens

#### `HomeScreen.tsx`
- Crop selection grid with icons and names
- Model selector dropdown
- Camera/Gallery image selection
- Navigation to camera or results

#### `CameraScreen.tsx`
- Full-screen camera view with Expo Camera
- Capture button with visual feedback
- Gallery picker option
- Auto-navigation to results after capture

#### `ResultsScreen.tsx`
- NPK+Mg health scores with color-coded severity
- Confidence percentages
- Visual heatmap overlay
- Crop-specific recommendations (English & Hindi)
- Text-to-speech for recommendations
- Navigation to history

#### `HistoryScreen.tsx`
- Chronological list of past scans
- Filter by crop
- Tap to view detailed results
- Empty state with helpful message

#### `SettingsScreen.tsx`
- Language selection (10+ languages)
- About app information
- Version number

### API Integration

#### [src/api/client.ts](src/api/client.ts)
```typescript
export const API_BASE_URL = 'http://192.168.1.100:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s for ML processing
  headers: {
    'Content-Type': 'application/json',
  },
});
```

#### [src/api/scans.ts](src/api/scans.ts)
- `getCrops()` - Fetch supported crops
- `getModels()` - Fetch available ML models
- `uploadScan()` - Upload image and get diagnosis
- `getScanHistory()` - Fetch scan history
- `getScanDetails()` - Get single scan details

---

## 🌍 Internationalization

Supported languages in [src/i18n/index.ts](src/i18n/index.ts):

1. **English** (`en`)
2. **Hindi** (`hi`) - हिंदी
3. **Tamil** (`ta`) - தமிழ்
4. **Telugu** (`te`) - తెలుగు
5. **Bengali** (`bn`) - বাংলা
6. **Marathi** (`mr`) - मराठी
7. **Gujarati** (`gu`) - ગુજરાતી
8. **Kannada** (`kn`) - ಕನ್ನಡ
9. **Malayalam** (`ml`) - മലയാളം
10. **Punjabi** (`pa`) - ਪੰਜਾਬੀ

### Usage

```typescript
import { I18n } from 'i18n-js';
import translations from './i18n';

const i18n = new I18n(translations);
i18n.locale = 'hi'; // Set language

const text = i18n.t('home.selectCrop'); // Get translated text
```

---

## 🚦 Navigation Structure

```
Tab Navigator (Bottom)
├── Home Tab
│   ├── HomeScreen
│   ├── CameraScreen
│   └── ResultsScreen
│
├── History Tab
│   ├── HistoryScreen
│   └── ResultsScreen (detail view)
│
└── Settings Tab
    └── SettingsScreen
```

---

## 📊 Data Flow

1. **User selects crop** → `HomeScreen`
2. **Takes photo** → `CameraScreen` or Image Picker
3. **Upload to API** → `uploadScan()` in `scans.ts`
4. **Backend processes** → ML inference + heatmap generation
5. **Display results** → `ResultsScreen` with scores & recommendations
6. **Save to history** → Stored in backend SQLite database
7. **View history** → `HistoryScreen` fetches from `/api/scans`

---

## 📝 Configuration

### API Endpoint

Edit [src/api/client.ts](src/api/client.ts) to change backend URL:

```typescript
// Development (LAN)
export const API_BASE_URL = 'http://192.168.1.100:5000';

// Production
export const API_BASE_URL = 'https://api.fasalvaidya.com';
```

### App Configuration

Edit `app.json` for app metadata:

```json
{
  "expo": {
    "name": "FasalVaidya",
    "slug": "fasalvaidya",
    "version": "1.0.0",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png"
    }
  }
}
```

---

## 🐛 Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted
- Check `app.json` has camera permissions
- Restart Expo Go app

### Cannot Connect to Backend
- Verify IP address in `client.ts`
- Check phone and computer on same WiFi
- Ensure backend is running: `python app.py`
- Try tunnel mode: `npx expo start --tunnel`

### Image Upload Fails
- Check file size (max 16MB)
- Ensure valid image format (JPG/PNG/WEBP)
- Check backend logs: `backend/logs/backend.log`

### Slow Performance
- Reduce image quality in camera settings
- Close other apps
- Check network speed

---

## 🚀 Building for Production

### Android APK

```bash
eas build --platform android --profile preview
```

### iOS IPA

```bash
eas build --platform ios --profile preview
```

### Web Build

```bash
npx expo export:web
```

---

## 🧪 Testing

```bash
npm test
```

---

## 📝 Environment Variables

Create `.env` file in `frontend/` (optional):

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000
EXPO_PUBLIC_ENV=development
```

---

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Axios Documentation](https://axios-http.com/)

---

## 🔗 Related

- [Backend README](../backend/README.md) - Flask API documentation
- [Main README](../README.md) - Full project overview
- [VS Code Tasks](../.vscode/README.md) - Development shortcuts

---

**Built with ❤️ for farmers worldwide**
