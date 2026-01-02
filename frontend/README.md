# FasalVaidya Frontend

React Native Expo application for AI-powered crop health diagnosis.

## Setup

```bash
cd frontend
npm install
```

## Run

```bash
# Start Expo development server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS
npx expo start --ios

# Run on Web
npx expo start --web
```

## Project Structure

```
frontend/
├── App.tsx                 # Main entry point with navigation
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── src/
│   ├── api/               # API client & endpoints
│   │   ├── client.ts      # Axios instance
│   │   └── scans.ts       # Scan API calls
│   ├── components/        # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── CropSelector.tsx
│   │   └── ScoreBar.tsx
│   ├── i18n/              # Internationalization (10+ languages)
│   │   └── index.ts       # Language definitions
│   ├── screens/           # App screens
│   │   ├── HomeScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── ResultsScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   └── SettingsScreen.tsx
│   └── theme/             # Design system
│       └── index.ts
└── assets/                # Images & fonts
```

## Features

- 📷 Camera-based leaf scanning
- 🌾 Multi-crop support (13 crops: Wheat, Rice, Tomato, Cotton, Maize, Banana, etc.)
- 📊 NPK deficiency detection with confidence scores
- 💡 Crop-specific fertilizer recommendations
- 🔊 Text-to-speech accessibility
- 🌐 Multi-language support (English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi)
- 📱 Settings screen for language preferences
- 🌐 English & Hindi language support
- 📜 Scan history tracking
