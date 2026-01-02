# 🌱 FasalVaidya - AI-Powered Crop Health Diagnosis

> **फसल वैद्य** - Your Digital Crop Doctor | आपका डिजिटल फसल डॉक्टर

FasalVaidya is an AI-powered mobile application that helps Indian farmers diagnose crop health issues by analyzing leaf photographs and providing actionable fertilizer recommendations in both English and Hindi.

![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-blue)
![ML](https://img.shields.io/badge/ML-TensorFlow%20%7C%20MobileNetV3-orange)
![Backend](https://img.shields.io/badge/Backend-Flask%20%7C%20Python-green)
![Frontend](https://img.shields.io/badge/Frontend-React%20Native%20%7C%20Expo-purple)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [ML Model Training](#-ml-model-training)
- [Backend Setup](#-backend-setup)
- [Frontend Setup](#-frontend-setup)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Project Structure](#-project-structure)

---

## ✨ Features

### 🔬 NPK Deficiency Detection
- **Nitrogen (N)** - Yellow leaves, stunted growth
- **Phosphorus (P)** - Purple/brown discoloration
- **Potassium (K)** - Brown leaf edges, weak stems

### 🎯 Multi-Crop Support
- 🌾 Wheat (गेहूँ)
- 🌾 Rice (चावल)
- 🍅 Tomato (टमाटर)
- 🌿 Cotton (कपास)
- 🌽 Maize (मक्का)
- 🍌 Banana (केला)
- ☕ Coffee (कॉफी)
- 🥒 Cucumber (खीरा)
- 🍆 Eggplant (बैंगन)
- 🥬 Ash Gourd (पेठा)
- 🥒 Bitter Gourd (करेला)
- 🥒 Ridge Gourd (तुरई)
- 🥒 Snake Gourd (चिचिंडा)

### 💡 Key Features
- 📸 Instant leaf photo analysis
- 🎨 Visual NPK score dashboard
- 🗣️ Text-to-speech recommendations
- 🌐 Multi-language interface (10+ Indian languages)
- 📊 Scan history tracking
- 🔒 Offline-capable with on-device inference
- 🧠 Crop-specific ML models for higher accuracy

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FASALVAIDYA ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Mobile    │────▶│   Backend   │────▶│  ML Model   │   │
│  │   App       │◀────│   API       │◀────│  (TFLite)   │   │
│  │ (Expo/RN)   │     │  (Flask)    │     │ MobileNetV3 │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│        │                   │                               │
│        │                   │                               │
│        ▼                   ▼                               │
│  ┌─────────────┐     ┌─────────────┐                       │
│  │ expo-camera │     │   SQLite    │                       │
│  │ expo-speech │     │  Database   │                       │
│  └─────────────┘     └─────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **ML Model** | TensorFlow 2.15, EfficientNetB0/B2, Focal Loss, TTA |
| **Backend** | Python 3.11, Flask 3.0, SQLite |
| **Frontend** | React Native (Expo SDK 54), TypeScript |
| **Image Processing** | PIL, expo-image-manipulator |
| **Localization** | i18n-js (10+ Indian languages) |
| **Design** | Teal (#208F78) primary, 8px grid system |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone

### 1. Clone & Setup

```bash
# Navigate to project
cd FasalVaidya

# Create Python virtual environment
cd backend
python -m venv .venv311
.\.venv311\Scripts\activate  # Windows
# source .venv311/bin/activate  # macOS/Linux

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Start Backend

```bash
cd backend
python app.py

# Server runs at http://localhost:5000
# API endpoint: http://localhost:5000/api
```

### 3. Start Frontend

```bash
cd frontend
npm install
npx expo start

# Scan QR code with Expo Go app
```

### 4. Test the App

1. Open Expo Go on your phone
2. Scan the QR code from terminal
3. Select a crop (Wheat/Rice/Tomato/Cotton)
4. Take a photo of a leaf
5. View NPK diagnosis and recommendations!

---

## 🧠 ML Model Training

### Dataset Structure

The model is trained on the **CoLeaf DATASET** with the following classes:

```
CoLeaf DATASET/
├── healthy/          # Healthy leaves (control)
├── nitrogen-N/       # Nitrogen deficiency
├── phosphorus-P/     # Phosphorus deficiency  
├── potasium-K/       # Potassium deficiency
├── boron-B/          # Boron deficiency
├── calcium-Ca/       # Calcium deficiency
├── iron-Fe/          # Iron deficiency
├── magnesium-Mg/     # Magnesium deficiency
├── manganese-Mn/     # Manganese deficiency
└── more-deficiencies/  # Combined deficiencies (N_P, K_P, etc.)
```

### Train the Model

```bash
cd backend

# Activate virtual environment
.\.venv311\Scripts\activate

# Install TensorFlow (if not already)
pip install tensorflow==2.15.0

# Train the model
python ml/train_npk_model.py

# Train crop-specific models (one per crop) for multi-crop inference
python ml/train_crop_model.py --list                           # List available crops
python ml/train_crop_model.py --crop rice                      # Train single crop
python ml/train_crop_model.py --crop all --quality balanced    # Train ALL crops (default)
python ml/train_crop_model.py --crop all --quality high        # Train ALL crops (max accuracy, 3-4 hrs)

# Quality presets:
#   fast     - 30 epochs, quick testing (~30 min)
#   balanced - 60 epochs, good accuracy (~1-2 hrs)
#   high     - 120 epochs, max accuracy (~3-4 hrs)

# Output:
#   - ml/models/npk_model.h5 (Keras model)
#   - ml/models/npk_model.tflite (TFLite for mobile)
#   - ml/models/<crop>/best.keras (per-crop models)
```

### Model Architecture

The optimized model uses a transfer learning approach with several enhancements:

```python
Input: 256x256x3 RGB image (or 224x224 for fast mode)
  ↓
EfficientNetB0 (ImageNet pretrained, gradual unfreezing)
  ↓
GlobalAveragePooling2D
  ↓
Dense(512, relu) + BatchNorm + Dropout(0.5)
  ↓
Dense(256, relu) + Residual Connection + BatchNorm + Dropout(0.4)
  ↓
Dense(128, relu) + Residual Connection + BatchNorm + Dropout(0.3)
  ↓
Dense(64, relu) + BatchNorm + Dropout(0.2)
  ↓
Dense(3, sigmoid)  # Multi-label: [N, P, K]
  ↓
Output: [n_prob, p_prob, k_prob] (0-1 each)
```

**Training Optimizations:**
- Focal Loss (γ=2.0) for hard example mining
- Label smoothing (0.1) for better generalization
- Warmup + Cosine annealing LR schedule
- 3-phase training: frozen → partial unfreeze → full fine-tune
- MixUp augmentation during training
- Test-Time Augmentation (TTA) for evaluation
- Per-class accuracy tracking

---

## 💻 Backend Setup

### Environment Variables

Create `backend/.env`:

```env
FLASK_ENV=development
FLASK_DEBUG=1
DATABASE_PATH=fasalvaidya.db
MODEL_PATH=ml/models/npk_model.h5
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216
SECRET_KEY=your-secret-key-here
```

### Run Backend

```bash
cd backend
python app.py

# Output:
# * Running on http://0.0.0.0:5000
# * Debug mode: on
```

### Database Schema

```sql
-- crops table
CREATE TABLE crops (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    icon TEXT
);

-- leaf_scans table  
CREATE TABLE leaf_scans (
    id INTEGER PRIMARY KEY,
    crop_id INTEGER,
    image_path TEXT,
    created_at TIMESTAMP,
    FOREIGN KEY (crop_id) REFERENCES crops (id)
);

-- diagnoses table
CREATE TABLE diagnoses (
    id INTEGER PRIMARY KEY,
    scan_id INTEGER,
    n_score REAL, p_score REAL, k_score REAL,
    n_confidence REAL, p_confidence REAL, k_confidence REAL,
    n_severity TEXT, p_severity TEXT, k_severity TEXT,
    overall_status TEXT,
    FOREIGN KEY (scan_id) REFERENCES leaf_scans (id)
);
```

---

## 📱 Frontend Setup

### Install Dependencies

```bash
cd frontend
npm install
```

### Key Dependencies

```json
{
  "expo": "~50.0.0",
  "react-native": "0.73.2",
  "expo-camera": "~14.0.0",
  "expo-image-picker": "~14.7.0",
  "expo-speech": "~11.6.0",
  "@react-navigation/native": "^6.1.9",
  "axios": "^1.6.2",
  "i18n-js": "^4.3.2"
}
```

### Run Frontend

```bash
# Development
npx expo start

# Run on specific platform
npx expo start --android
npx expo start --ios

# Build for production
eas build --platform android
```

### App Screens

| Screen | Description |
|--------|-------------|
| **Home** | Crop selection, start scan, history button |
| **Camera** | Take/pick leaf photo, compress, upload |
| **Results** | NPK scores, severity chips, recommendations |
| **History** | List of past scans with date and status |
| **Settings** | Language toggle (EN/HI), app info |

---

## 📡 API Reference

### Health Check
```http
GET /api/health

Response: { "status": "ok", "message": "FasalVaidya API is running" }
```

### List Crops
```http
GET /api/crops

Response: {
  "crops": [
    { "id": 1, "name": "Wheat", "name_hi": "गेहूं", "icon": "🌾" },
    ...
  ]
}
```

### Upload Scan
```http
POST /api/scans
Content-Type: multipart/form-data

Fields:
  - image: file (JPEG/PNG)
  - crop_id: integer (1-4)

Response: {
  "scan_id": 1,
  "crop_id": 1,
  "crop_name": "Wheat",
  "n_score": 75.5,
  "p_score": 25.0,
  "k_score": 45.0,
  "n_severity": "critical",
  "p_severity": "healthy",
  "k_severity": "attention",
  "overall_status": "critical",
  "recommendations": {
    "n": { "en": "Apply urea...", "hi": "यूरिया का उपयोग..." },
    ...
  }
}
```

### Get Scan History
```http
GET /api/scans

Response: {
  "scans": [
    {
      "scan_id": 1,
      "crop_name": "Wheat",
      "overall_status": "attention",
      "created_at": "2024-12-28T10:30:00"
    }
  ]
}
```

### Get Single Scan
```http
GET /api/scans/{scan_id}

Response: { full scan object with recommendations }
```

### Clear History
```http
DELETE /api/scans

Response: { "message": "All scans cleared" }
```

---

## 🧪 Testing

### Run Unit Tests

```bash
cd backend

# Install pytest
pip install pytest pillow

# Run all tests
pytest tests/test_api.py -v

# Run specific test class
pytest tests/test_api.py::TestScansEndpoint -v
```

### Run Batch Tests with Dataset

```bash
cd backend

# Start the server first (in another terminal)
python app.py

# Run batch tests
python tests/batch_test_scans.py

# Test specific category
python tests/batch_test_scans.py --category nitrogen-N

# More samples
python tests/batch_test_scans.py --samples 10
```

### Manual Testing

1. **API Health**: `curl http://localhost:5000/api/health`
2. **Upload Image**:
```bash
curl -X POST http://localhost:5000/api/scans \
  -F "image=@test_leaf.jpg" \
  -F "crop_id=1"
```

---

## 📁 Project Structure

```
FasalVaidya/
├── 📄 README.md                    # This file
├── 📄 FasalVaidya-Hackathon-PRD.md # Product requirements
├── 📄 FasalVaidya-Dev-Guidelines.md # Development guidelines
├── 📄 FasalVaidya-MVP-Tech-Stack.md # Technology choices
├── 📄 Architecture-Overview.md     # System architecture
│
├── 📂 Leaf Nutrient Data Sets/     # Multi-crop training images
│   ├── Rice Nutrients/
│   ├── Tomato Nutrients/
│   ├── Wheat Nitrogen/
│   ├── Maize Nutrients/
│   ├── Banana leaves Nutrient/
│   ├── Coffee Nutrients/
│   └── ... (12 crops total)
│
├── 📂 CoLeaf DATASET/              # Generic training images
│   ├── healthy/
│   ├── nitrogen-N/
│   ├── phosphorus-P/
│   └── potasium-K/
│
├── 📂 backend/                     # Flask API Server
│   ├── 📄 app.py                   # Main API application
│   ├── 📄 requirements.txt         # Python dependencies
│   ├── 📄 .env                     # Environment config
│   ├── 📂 ml/
│   │   ├── 📄 __init__.py
│   │   ├── 📄 train_npk_model.py   # Generic NPK model training
│   │   ├── 📄 train_crop_model.py  # Crop-specific training (optimized)
│   │   ├── 📄 inference.py         # Prediction service
│   │   └── 📂 models/              # Trained models
│   │       ├── crop_registry.json  # Crop model registry
│   │       ├── rice/               # Per-crop models
│   │       ├── tomato/
│   │       └── ...
│   ├── 📂 uploads/                 # Uploaded images
│   └── 📂 tests/
│       ├── 📄 test_api.py          # Unit tests
│       └── 📄 batch_test_scans.py  # Dataset tests
│
├── 📂 frontend/                    # React Native Expo App
│   ├── 📄 App.tsx                  # Entry point
│   ├── 📄 package.json             # NPM dependencies
│   ├── 📄 tsconfig.json            # TypeScript config
│   ├── 📄 app.json                 # Expo config
│   └── 📂 src/
│       ├── 📂 api/                 # API client
│       │   ├── 📄 client.ts
│       │   └── 📄 scans.ts
│       ├── 📂 components/          # Reusable UI
│       │   ├── 📄 Button.tsx
│       │   ├── 📄 Card.tsx
│       │   ├── 📄 ScoreBar.tsx
│       │   └── ...
│       ├── 📂 screens/             # App screens
│       │   ├── 📄 HomeScreen.tsx
│       │   ├── 📄 CameraScreen.tsx
│       │   ├── 📄 ResultsScreen.tsx
│       │   ├── 📄 HistoryScreen.tsx
│       │   └── 📄 SettingsScreen.tsx
│       ├── 📂 i18n/                # Multi-language support
│       │   └── 📄 index.ts         # 10+ Indian languages
│       └── 📂 theme/               # Design system
│           └── 📄 index.ts
│
└── 📂 FrontEnd UI MockUPs/         # Design reference
```

---

## � Supported Languages

FasalVaidya supports 10+ Indian languages to reach farmers across India:

| Language | Native Name | Status |
|----------|-------------|--------|
| English | English | ✅ Full |
| Hindi | हिंदी | ✅ Full |
| Tamil | தமிழ் | 🔄 Fallback to English |
| Telugu | తెలుగు | 🔄 Fallback to English |
| Bengali | বাংলা | 🔄 Fallback to English |
| Marathi | मराठी | 🔄 Fallback to English |
| Gujarati | ગુજરાતી | 🔄 Fallback to English |
| Kannada | ಕನ್ನಡ | 🔄 Fallback to English |
| Malayalam | മലയാളം | 🔄 Fallback to English |
| Punjabi | ਪੰਜਾਬੀ | 🔄 Fallback to English |

Users can switch languages in **Settings** screen. The app saves language preference locally.

---

## �🎨 Design System

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| Primary | `#208F78` | Buttons, headers, highlights |
| Secondary | `#F5F5F5` | Backgrounds |
| Success | `#4CAF50` | Healthy status |
| Warning | `#FF9800` | Attention status |
| Error | `#F44336` | Critical status |

### Severity Thresholds

| Score Range | Severity | Color |
|-------------|----------|-------|
| ≥70% | Critical | Red |
| 40-70% | Attention | Orange |
| <40% | Healthy | Green |

---

## 📞 Support

- **Documentation**: See `/docs` folder
- **Issues**: Report bugs in the project repository
- **Contact**: hackathon@fasalvaidya.com

---

## 📜 License

MIT License - Built for farmers with ❤️

---

<div align="center">
  <h3>🌾 FasalVaidya - Helping Indian Farmers Grow Better 🌾</h3>
  <p>फसल वैद्य - भारतीय किसानों की बेहतर उपज में मदद</p>
</div>
