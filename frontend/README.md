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

Configure the backend server URL in [src/api/client.ts](src/api/client.ts):

```typescript
// For local development (same WiFi)
export const API_BASE_URL = 'http://192.168.1.100:5000';

// For production deployment
export const API_BASE_URL = 'https://your-server.com';
```

**Important**: Update the IP address to match your computer's local IP. Find it using:
- Windows: `ipconfig` in Command Prompt
- Mac/Linux: `ifconfig` in Terminal

### Timeout Configuration

The app uses a 60-second timeout for API requests to accommodate ML processing:

```typescript
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds
});
```

Adjust if your backend needs more time for complex models.

---

## 🌾 Supported Crops & Models

### Current Crops (9 Total)

The app currently supports 9 crops with 43 total deficiency classes:

#### 🌾 Cereals (11 classes)
1. **Rice** (3 classes) - Nitrogen, Phosphorus, Potassium deficiencies
2. **Wheat** (2 classes) - Control (healthy), General deficiency
3. **Maize/Corn** (6 classes) - All nutrients present, Nitrogen, Phosphorus, Potassium, Zinc deficiencies

#### 🍌 Commercial Crops (7 classes)
4. **Banana** (3 classes) - Healthy, Magnesium, Potassium deficiencies
5. **Coffee** (4 classes) - Healthy, Nitrogen, Phosphorus, Potassium deficiencies

#### 🥒 Vegetables (25 classes)
6. **Ashgourd** (7 classes) - Multiple deficiency types
7. **Eggplant/Brinjal** (4 classes) - Various nutrient deficiencies
8. **Snakegourd** (5 classes) - NPK deficiency variations
9. **Bittergourd** (9 classes) - Comprehensive deficiency coverage

### Available ML Models

Select models in the app home screen dropdown:

#### 1. **Unified v2** (Default) ✅
- **Architecture**: MobileNetV2 with transfer learning
- **Classes**: 43 (all crops)
- **Size**: 3.0 MB (TFLite)
- **Accuracy**: 72.5% overall, 89.7% top-3
- **Inference Time**: <500ms
- **Best For**: Production use, all crops

#### 2. **V2 Enhanced**
- **Architecture**: Enhanced model with leaf validation
- **Features**: Pre-screening to reject non-leaf images
- **Size**: ~4 MB
- **Best For**: Higher accuracy requirements

#### 3. **EfficientNet-B0**
- **Architecture**: EfficientNet-B0 base model
- **Size**: ~5 MB
- **Best For**: Balanced speed and accuracy

#### 4. **YOLOv8 Classification** ⚠️
- **Architecture**: Ultralytics YOLOv8
- **Status**: Experimental
- **Best For**: Real-time detection (future feature)

#### 5. **Legacy NPK Model**
- **Architecture**: Original NPK detector
- **Status**: Deprecated (backward compatibility)

---

## 🔬 Understanding Results

### NPK+Mg Scores

The app displays 4 nutrient health scores (0-100%):

- **N (Nitrogen)**: Leaf growth and greenness
  - 🟢 **Healthy**: 85-100% (green)
  - 🟡 **Attention**: 50-84% (yellow/orange)
  - 🔴 **Critical**: 0-49% (red)

- **P (Phosphorus)**: Root development and flowering
- **K (Potassium)**: Disease resistance and overall vigor
- **Mg (Magnesium)**: Chlorophyll production

**Note**: Lower percentage = Lower health (more deficiency detected)

### Confidence Scores

Each nutrient has a confidence percentage (0-100%):
- **High (>80%)**: Model is very confident in the prediction
- **Medium (50-80%)**: Moderate confidence, consider retaking photo
- **Low (<50%)**: Low confidence, results may be unreliable

### Severity Levels

Three severity classifications:
1. **🟢 Healthy** - No action needed
2. **🟡 Attention** - Monitor and apply light fertilizer
3. **🔴 Critical** - Immediate action required

### Overall Status

Aggregated health status based on all nutrients:
- **Healthy**: All nutrients above 85%
- **Attention**: One or more nutrients 50-84%
- **Critical**: One or more nutrients below 50%

---

## 🎨 UI/UX Features

### Color-Coded Severity

Results screen uses intuitive color coding:
- **Green** (#4CAF50) - Healthy
- **Orange** (#FF9800) - Attention needed
- **Red** (#F44336) - Critical

### Progress Bars

Visual representation of nutrient levels with animated progress bars.

### Heatmap Overlay

Grad-CAM style heatmap shows WHERE on the leaf the deficiency is detected:
- **Red/Orange areas**: Deficiency detected here
- **Blue/Cool areas**: Healthy tissue
- **Overlay**: Toggle on/off to compare with original image

### Text-to-Speech

Tap the speaker icon to hear recommendations read aloud:
- Supports all 10 languages
- Uses Expo Speech API
- Adjustable rate and pitch

---

## 🛠️ Development Tools

### VS Code Tasks

The project includes VS Code tasks (see [../.vscode/README.md](../.vscode/README.md)):

```bash
# Start frontend (from VS Code)
Ctrl+Shift+P → "Tasks: Run Task" → "📱 Frontend: Start Expo (Tunnel)"

# Or use keyboard shortcut (with backend)
Ctrl+Shift+B  # Starts both backend and frontend
```

### Debugging

#### React Native Debugging

1. **Chrome DevTools**: Shake device → "Debug" → Opens Chrome
2. **VS Code Debugger**: Install "React Native Tools" extension
3. **Expo DevTools**: Press `m` in terminal after `npm start`

#### Common Debugging Commands

```bash
# Clear cache and restart
npx expo start -c

# View logs
npx react-native log-android  # Android
npx react-native log-ios      # iOS

# Check network requests
# In Expo DevTools → Network tab
```

### Performance Monitoring

```typescript
// Add performance markers
import { PerformanceObserver } from 'react-native';

console.time('upload-scan');
await uploadScan(imageUri, cropId, modelId);
console.timeEnd('upload-scan');
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Home screen loads with 9 crops
- [ ] Model selector shows available models
- [ ] Camera captures images successfully
- [ ] Image picker works from gallery
- [ ] Results display correctly with scores
- [ ] Heatmap overlay toggles on/off
- [ ] Recommendations show in English & Hindi
- [ ] Text-to-speech works for recommendations
- [ ] History shows past scans
- [ ] Language selector changes UI text
- [ ] Scan details load from history

### API Testing

Use the test script included:

```bash
# Test Supabase sync (if configured)
node test-supabase-sync.js
```

### Example API Test (Manual)

```bash
# Test crops endpoint
curl http://192.168.1.100:5000/api/crops

# Test models endpoint
curl http://192.168.1.100:5000/api/models

# Test scan upload
curl -X POST http://192.168.1.100:5000/api/scans \
  -F "image=@leaf.jpg" \
  -F "crop_id=1" \
  -F "model_id=unified_v2"
```

---

## 📱 Building for Production

### Android APK

```bash
# Configure app.json first
# Set version, name, icon, etc.

# Build APK
eas build --platform android --profile preview

# Or use Expo classic build
expo build:android
```

### iOS IPA

```bash
# Requires Apple Developer account

# Build IPA
eas build --platform ios --profile preview

# Or use Expo classic build
expo build:ios
```

### App Store Submission

1. **Update `app.json`**:
   ```json
   {
     "expo": {
       "name": "FasalVaidya",
       "slug": "fasalvaidya",
       "version": "1.0.0",
       "orientation": "portrait",
       "icon": "./assets/icon.png",
       "splash": {
         "image": "./assets/splash.png",
         "resizeMode": "contain",
         "backgroundColor": "#4CAF50"
       },
       "ios": {
         "bundleIdentifier": "com.yourcompany.fasalvaidya",
         "buildNumber": "1"
       },
       "android": {
         "package": "com.yourcompany.fasalvaidya",
         "versionCode": 1
       }
     }
   }
   ```

2. **Build and submit**:
   ```bash
   eas build --platform all
   eas submit --platform android
   eas submit --platform ios
   ```

---

## 🐛 Troubleshooting

### Common Issues

#### Camera Permission Denied
**Issue**: "Camera permission is required"
**Fix**: 
```typescript
import * as Permissions from 'expo-permissions';
const { status } = await Permissions.askAsync(Permissions.CAMERA);
```

#### Network Request Failed
**Issue**: "Network Error" or "Request timeout"
**Fixes**:
1. Check backend is running: `http://YOUR_IP:5000/api/health`
2. Verify firewall allows port 5000
3. Ensure same WiFi network
4. Update `API_BASE_URL` in `client.ts`

#### Image Upload Fails
**Issue**: "400 Bad Request" or "413 Payload Too Large"
**Fixes**:
1. Check image size (<16MB)
2. Verify image format (JPG/PNG/WEBP)
3. Test with smaller image first

#### Heatmap Not Showing
**Issue**: Heatmap appears blank
**Fixes**:
1. Check backend logs for heatmap generation errors
2. Verify OpenCV is installed in backend
3. Test with different crop/image

#### App Crashes on Scan
**Issue**: App closes when uploading scan
**Fixes**:
1. Check Expo logs: `npx expo start`
2. Reduce image quality before upload
3. Increase timeout in `client.ts`

#### Text-to-Speech Not Working
**Issue**: Speaker icon does nothing
**Fixes**:
1. Check device volume
2. Verify Expo Speech is installed: `npm list expo-speech`
3. Test with English first, then other languages

---

## 🔄 Offline-First Sync (Optional)

FasalVaidya supports optional offline-first synchronization with Supabase.

### Setup

1. **Install dependencies**:
   ```bash
   npm install @supabase/supabase-js expo-sqlite
   ```

2. **Configure `.env`**:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Initialize sync**:
   ```typescript
   import { initializeSync } from './src/sync';
   await initializeSync({ autoSyncEnabled: true });
   ```

### Usage

```typescript
// Manual sync
import { performSync } from './src/sync';
const result = await performSync();

// Get sync status
import { getSyncStatus } from './src/sync';
const status = await getSyncStatus();
console.log(`Last synced: ${status.lastSyncTime}`);
```

See [../QUICK_START_OFFLINE_SYNC.md](../QUICK_START_OFFLINE_SYNC.md) for full guide.

---

## 📚 Additional Resources

### Documentation
- [Main README](../README.md) - Project overview
- [VS Code Tasks](../.vscode/README.md) - Development tasks
- [Quick Start Guide](../guidelines/QUICK_START_V2.md) - Model training
- [Training Guide](../guidelines/UNIFIED_V2_TRAINING_PLAN.md) - Advanced training

### Backend API
- [Backend README](../backend/README.md) - API documentation
- [API Endpoints](../README.md#api-documentation) - Complete API reference

### External Resources
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 🤝 Contributing

### Development Workflow

1. **Fork repository**
2. **Create feature branch**: `git checkout -b feature/new-feature`
3. **Make changes**
4. **Test thoroughly**
5. **Commit**: `git commit -m "feat: add new feature"`
6. **Push**: `git push origin feature/new-feature`
7. **Create Pull Request**

### Code Style

- **TypeScript**: Follow existing patterns
- **Formatting**: Use Prettier (auto-format on save)
- **Linting**: Run ESLint before committing
- **Comments**: Document complex logic

### Testing Before PR

```bash
# 1. Clear cache
npx expo start -c

# 2. Test on Android
npm run android

# 3. Test on iOS (if available)
npm run ios

# 4. Test all features
# - Camera capture
# - Gallery picker
# - Scan upload
# - Results display
# - History
# - Settings/Language
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Expo Team** - Amazing mobile development platform
- **React Native Community** - Excellent libraries and support
- **TensorFlow Lite** - Efficient mobile ML inference
- **PlantVillage Dataset** - Training data source
- **Contributors** - All contributors to this project

---

**Made with ❤️ for farmers and agricultural development**

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
