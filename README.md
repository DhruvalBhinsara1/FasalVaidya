# 🌾 FasalVaidya

**AI-Powered Crop Health Diagnosis Platform**

FasalVaidya is an intelligent mobile application that uses deep learning to diagnose crop nutrient deficiencies (NPK+Mg - Nitrogen, Phosphorus, Potassium, and Magnesium) by analyzing leaf images. Built with React Native (Expo) and Flask, it provides farmers with instant, accurate crop health assessments, visual heatmaps, and personalized fertilizer recommendations in multiple languages.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/) [![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB.svg)](https://reactnative.dev/) [![Expo](https://img.shields.io/badge/Expo-~54.0.0-000020.svg)](https://expo.dev/) [![Flask](https://img.shields.io/badge/Flask-3.0.0-green.svg)](https://flask.palletsprojects.com/) [![TensorFlow](https://img.shields.io/badge/TensorFlow-2.15+-FF6F00.svg)](https://www.tensorflow.org/)

---

## ✨ Features

### 🌱 Core Capabilities

-   **📷 Camera-Based Scanning**: Capture and analyze crop leaf images in real-time with integrated camera
-   **🤖 AI-Powered Diagnosis**: Deep learning models detect NPK+Mg deficiencies with confidence scores
-   **🌾 Multi-Crop Support**: Supports **9 crops, 43 deficiency classes**:
    - Cereals: Rice (3), Wheat (2), Maize (6)
    - Commercial: Banana (3), Coffee (4)
    - Vegetables: Ashgourd (7), Eggplant (4), Snakegourd (5), Bittergourd (9)
-   **📊 Visual Heatmaps**: Grad-CAM style overlays showing precise deficiency areas on leaves
-   **💡 Smart Recommendations**: Crop-specific fertilizer suggestions with dosage information in English & Hindi
-   **📜 Comprehensive History**: Track all diagnoses with filtering by crop and date
-   **🎯 Health Classification**: Automatic severity classification (Healthy, Attention, Critical)

### 🌐 Accessibility & Localization

-   **🔊 Text-to-Speech**: Audio narration of diagnosis results for accessibility
-   **🌍 Multi-Language Support**: **10+ languages**
    - English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi
-   **📱 Mobile-First Design**: Optimized for smartphones with responsive layout
-   **♿ Accessibility**: WCAG compliant with screen reader support

### 🎨 User Experience

-   **Modern UI/UX**: Clean, intuitive interface with Material Design principles
-   **⚡ Real-Time Processing**: Fast inference (<500ms) using optimized TensorFlow Lite models
-   **📈 Confidence Indicators**: Visual feedback on prediction reliability with percentage scores
-   **🔄 Scan Comparison**: Compare current scan with previous scans for trend analysis
-   **💾 Offline Support**: Core functionality works without internet (API requires connection)
-   **📤 Export Reports**: Export scan data as PDF, Excel, or CSV

### 🤖 Advanced Features

-   **🧠 AI Chat**: Ask questions about crop health using Ollama AI integration
-   **📊 Report Generation**: Automated health reports with trend analysis
-   **🔍 Leaf Validation**: Pre-screening to ensure valid leaf images
-   **🌡️ Health Trends**: Track nutrient levels over time with visual charts
-   **🎨 Multiple Model Support**: Switch between different ML models (Unified v2, EfficientNet-B0, YOLOv8)
-   **🔐 Data Privacy**: Local storage with SQLite, no cloud dependencies

---

## 🏗️ Architecture

```
FasalVaidya/
├── backend/                          # Flask API Server
│   ├── app.py                        # Main Flask application (2049 lines)
│   ├── requirements.txt              # Python dependencies
│   ├── fasalvaidya.db               # SQLite database
│   ├── config/                       # Configuration files
│   │   ├── models.json              # Model configurations
│   │   └── health_thresholds.json   # Health classification thresholds
│   ├── ml/                          # Machine Learning modules
│   │   ├── __init__.py
│   │   ├── unified_inference.py     # ⭐ Main inference engine (v2, 43 classes)
│   │   ├── inference.py             # Legacy inference (backward compatibility)
│   │   ├── inference_v2.py          # Enhanced v2 model support
│   │   ├── health_engine.py         # Health classification & reports
│   │   ├── ollama_client.py         # AI chat integration
│   │   ├── report_export.py         # PDF/Excel/CSV export
│   │   ├── train_npk_model.py       # NPK model training
│   │   ├── train_crop_model.py      # Crop-specific training
│   │   ├── train_leaf_validator.py  # Leaf validation training
│   │   ├── prepare_*.py             # Dataset preparation scripts
│   │   └── models/                  # Model files
│   │       ├── fasalvaidya_unified_v2.tflite        # Production model (3 MB)
│   │       ├── unified_v2_nutrient_best.keras       # Training model (15.7 MB)
│   │       ├── unified_v2_labels.txt                # 43 class labels
│   │       ├── unified_v2_model_metadata.json       # Model metadata
│   │       ├── crop_registry.json                   # Crop model registry
│   │       └── <crop_models>/                       # Individual crop models
│   ├── uploads/                     # User-uploaded images
│   ├── logs/                        # Application logs
│   ├── scripts/                     # Utility scripts
│   └── tests/                       # API & integration tests
│       ├── test_api.py
│       └── batch_test_scans.py
│
├── frontend/                        # React Native Expo App
│   ├── App.tsx                      # Main entry point with navigation
│   ├── app.json                     # Expo configuration
│   ├── package.json                 # Node dependencies
│   ├── src/
│   │   ├── screens/                 # App screens
│   │   │   ├── HomeScreen.tsx       # Crop selection & scan
│   │   │   ├── CameraScreen.tsx     # Camera capture
│   │   │   ├── ResultsScreen.tsx    # Diagnosis results
│   │   │   ├── HistoryScreen.tsx    # Scan history
│   │   │   └── SettingsScreen.tsx   # App settings
│   │   ├── components/              # Reusable components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── CropSelector.tsx
│   │   │   └── ScoreBar.tsx
│   │   ├── api/                     # API client layer
│   │   │   ├── client.ts            # Axios instance
│   │   │   └── scans.ts             # API functions
│   │   ├── i18n/                    # Internationalization
│   │   │   └── index.ts             # 10+ language support
│   │   ├── theme/                   # Design system
│   │   │   └── index.ts
│   │   └── utils/                   # Utility functions
│   └── assets/                      # Images & icons
│
├── EnhancedModel3/                  # Enhanced Model v3 files
│   ├── disease_final.keras
│   ├── fasalvaidya_enhanced.tflite
│   ├── leaf_validator.keras
│   └── metadata.json
│
├── fasalvaidya_unified_v2_model/   # Unified v2 model files
│   ├── unified_nutrient_best.keras
│   ├── stage2_plantvillage_best.keras
│   └── unified_classification_report.json
│
├── guidelines/                      # Documentation & guides
│   ├── QUICK_START_V2.md
│   ├── UNIFIED_V2_TRAINING_PLAN.md
│   ├── V2_DEPLOYMENT_SUMMARY.md
│   ├── CLEANUP_SUMMARY.md
│   ├── FRONTEND_V2_UPDATE_SUMMARY.md
│   └── DATASET_ANALYSIS.md
│
├── .vscode/                         # VS Code configuration
│   ├── tasks.json                   # Build & run tasks
│   ├── launch.json                  # Debug configs
│   ├── keybindings.json             # Custom shortcuts
│   └── settings.json                # Workspace settings
│
├── FasalVaidya_*.ipynb             # Jupyter training notebooks
└── README.md                        # This file
```

---

## 🛠️ Tech Stack

### Frontend (Mobile App)

-   **React Native** (0.81.5) - Cross-platform mobile framework
-   **Expo** (~54.0.0) - Development platform and tooling
-   **TypeScript** (5.1.3) - Type-safe JavaScript
-   **React Navigation** (6.x) - Navigation library with bottom tabs & stack navigation
-   **Expo Camera** (17.0.10) - Native camera integration
-   **Expo Image Picker** (17.0.10) - Image selection from gallery
-   **Expo Speech** (14.0.8) - Text-to-speech functionality
-   **Axios** (1.6.2) - HTTP client for API calls
-   **i18n-js** (4.3.2) - Internationalization (10+ languages)
-   **React Native SVG** (15.12.1) - SVG support

### Backend (API Server)

-   **Flask** (3.0.0) - Python web framework
-   **Python** (3.11+) - Programming language
-   **SQLite** (Built-in) - Embedded database
-   **Flask-CORS** (4.0.0) - Cross-origin resource sharing
-   **Werkzeug** (3.0.1) - WSGI utilities
-   **python-dotenv** (1.0.0) - Environment variable management

### Machine Learning

-   **TensorFlow** (2.15+) - Deep learning framework
-   **TensorFlow Lite** - Mobile-optimized inference
-   **MobileNetV2** - Base model architecture (transfer learning)
-   **NumPy** (1.24+) - Numerical computing
-   **Pillow** (10.0+) - Image processing
-   **scikit-learn** (1.3+) - Machine learning utilities
-   **matplotlib** (3.8+) - Visualization
-   **opencv-python** (4.8+) - Computer vision (Grad-CAM heatmaps)

### Report Generation & Export

-   **reportlab** (4.0+) - PDF generation
-   **openpyxl** (3.1+) - Excel file export
-   **python-dateutil** (2.8+) - Date utilities

### Development Tools

-   **VS Code** - IDE with custom tasks and keybindings
-   **pytest** (7.4+) - Testing framework
-   **Git** - Version control
-   **Jupyter Notebook** - Model training notebooks

---

## � Database Schema

FasalVaidya uses SQLite with the following schema:

### Tables

#### `crops`
Stores crop information.

```sql
CREATE TABLE crops (
    id INTEGER PRIMARY KEY,           -- Crop ID (1=Wheat, 2=Rice, etc.)
    name TEXT NOT NULL,               -- Crop name (English)
    name_hi TEXT,                     -- Crop name (Hindi)
    season TEXT,                      -- Growing season
    icon TEXT                         -- Emoji icon
);
```

**Sample Data**: 9 crops (Wheat, Rice, Maize, Banana, Coffee, Ashgourd, Eggplant, Snakegourd, Bittergourd)

#### `leaf_scans`
Stores scan metadata.

```sql
CREATE TABLE leaf_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_uuid TEXT UNIQUE NOT NULL,   -- Unique scan identifier
    crop_id INTEGER DEFAULT 1,        -- Foreign key to crops
    image_path TEXT NOT NULL,         -- Path to uploaded image
    image_filename TEXT,              -- Original filename
    status TEXT DEFAULT 'pending',    -- Scan status
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (crop_id) REFERENCES crops(id)
);
```

#### `diagnoses`
Stores ML prediction results.

```sql
CREATE TABLE diagnoses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER UNIQUE NOT NULL,  -- Foreign key to leaf_scans
    n_score REAL,                     -- Nitrogen health score (0-1)
    p_score REAL,                     -- Phosphorus health score (0-1)
    k_score REAL,                     -- Potassium health score (0-1)
    n_confidence REAL,                -- Prediction confidence for N
    p_confidence REAL,                -- Prediction confidence for P
    k_confidence REAL,                -- Prediction confidence for K
    n_severity TEXT,                  -- Severity level (healthy/attention/critical)
    p_severity TEXT,
    k_severity TEXT,
    overall_status TEXT,              -- Overall health status
    detected_class TEXT,              -- Detected deficiency class
    heatmap_path TEXT,                -- Path to heatmap image
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES leaf_scans(id)
);
```

**Note**: Scores are stored as floats 0-1 (where 1 = healthy). Frontend converts to percentages.

#### `recommendations`
Stores fertilizer recommendations.

```sql
CREATE TABLE recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    n_recommendation TEXT,            -- Nitrogen recommendation (English)
    p_recommendation TEXT,
    k_recommendation TEXT,
    n_recommendation_hi TEXT,         -- Hindi translations
    p_recommendation_hi TEXT,
    k_recommendation_hi TEXT,
    priority TEXT,                    -- Priority level
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES leaf_scans(id)
);
```

### Relationships

- One crop can have many scans (1:N)
- One scan has one diagnosis (1:1)
- One scan has one set of recommendations (1:1)

### Known Issue: Binary Data Storage

Some SQLite configurations may store float values as BLOB (binary). The backend includes `safe_float_convert()` utility to handle both regular floats and binary-encoded values.

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/crops` | List supported crops |
| GET | `/models` | List available ML models |
| POST | `/scans` | Upload leaf image & diagnose |
| GET | `/scans` | Get scan history |
| GET | `/scans/<id>` | Get single scan details |
| DELETE | `/scans` | Clear all scans |
| DELETE | `/scans/<id>` | Delete specific scan |
| PATCH | `/scans/<id>` | Update scan metadata |
| GET | `/model/info` | Get model information |
| POST | `/chat` | AI chat (Ollama integration) |
| GET | `/chat/status` | Check AI service status |
| GET | `/results/latest` | Get latest scan for crop |
| GET | `/results/history` | Get scan history for comparison |
| GET | `/reports/preview` | Preview report for scan |
| POST | `/reports/export` | Export reports (PDF/Excel/CSV) |
| GET | `/scans/history` | Detailed history with trends |
| GET | `/recommendations` | Get recommendations for scan |
| GET | `/images/<filename>` | Serve uploaded images |

### Key Endpoints

#### `POST /api/scans`

Upload a leaf image for diagnosis.

**Request:**

```bash
curl -X POST http://localhost:5000/api/scans \
  -F "image=@leaf.jpg" \
  -F "crop_id=1" \
  -F "model_id=unified_v2"
```

**Parameters:**
- `image` (file, required): Leaf image (JPG/PNG/WEBP, max 16MB)
- `crop_id` (int, required): Crop ID (1-13)
- `model_id` (string, optional): Model to use (default: `unified_v2`)
  - Options: `unified_v2`, `v2_enhanced`, `efficientnet_b0`, `yolov8_cls`

**Response (201):**

```json
{
  "scan_id": 123,
  "scan_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "crop_id": 1,
  "crop_name": "Wheat",
  "crop_name_hi": "गेहूँ",
  "n_score": 75.0,
  "p_score": 82.5,
  "k_score": 68.0,
  "mg_score": 70.0,
  "n_confidence": 0.89,
  "p_confidence": 0.91,
  "k_confidence": 0.85,
  "n_severity": "attention",
  "p_severity": "healthy",
  "k_severity": "attention",
  "overall_status": "attention",
  "detected_class": "wheat_nitrogen_deficiency",
  "recommendations": {
    "n": {
      "en": "Apply 50-70 kg Urea per acre...",
      "hi": "प्रति एकड़ 50-70 किलो यूरिया..."
    },
    "p": { "en": "...", "hi": "..." },
    "k": { "en": "...", "hi": "..." }
  },
  "priority": "attention",
  "image_url": "/api/images/scan_123.jpg",
  "heatmap": "data:image/png;base64,...",
  "created_at": "2026-01-23T10:30:00Z"
}
```

**Error Responses:**
- `400`: Missing required fields or invalid file type
- `413`: File too large (>16MB)
- `500`: Server error during processing

#### `GET /api/scans`

Retrieve scan history with optional filtering.

**Query Parameters:**
- `crop_id` (int, optional): Filter by crop
- `limit` (int, optional): Max results (default: 50)

**Response (200):**

```json
{
  "scans": [
    {
      "scan_id": 123,
      "scan_uuid": "...",
      "crop_id": 1,
      "crop_name": "Wheat",
      "crop_name_hi": "गेहूँ",
      "crop_icon": "🌾",
      "image_url": "/api/images/...",
      "status": "completed",
      "n_score": 75.0,
      "p_score": 82.5,
      "k_score": 68.0,
      "n_severity": "attention",
      "p_severity": "healthy",
      "k_severity": "attention",
      "overall_status": "attention",
      "detected_class": "wheat_nitrogen_deficiency",
      "created_at": "2026-01-23T10:30:00Z"
    }
  ],
  "count": 1
}
```

#### `GET /api/scans/<int:scan_id>`

Get detailed information for a specific scan, including full recommendations.

**Response (200):**

```json
{
  "scan_id": 123,
  "scan_uuid": "...",
  "crop_id": 1,
  "crop_name": "Wheat",
  "crop_name_hi": "गेहूँ",
  "crop_icon": "🌾",
  "image_url": "/api/images/...",
  "status": "completed",
  "n_score": 75.0,
  "p_score": 82.5,
  "k_score": 68.0,
  "n_confidence": 89.0,
  "p_confidence": 91.0,
  "k_confidence": 85.0,
  "n_severity": "attention",
  "p_severity": "healthy",
  "k_severity": "attention",
  "overall_status": "attention",
  "detected_class": "wheat_nitrogen_deficiency",
  "heatmap_url": "/api/images/heatmap_...",
  "recommendations": {
    "n": {
      "en": "Apply 50-70 kg Urea per acre. Split into 2-3 doses...",
      "hi": "प्रति एकड़ 50-70 किलो यूरिया..."
    },
    "p": { "en": "...", "hi": "..." },
    "k": { "en": "...", "hi": "..." }
  },
  "priority": "attention",
  "created_at": "2026-01-23T10:30:00Z"
}
```

#### `POST /api/reports/export`

Export scan reports in various formats.

**Request Body:**

```json
{
  "format": "pdf",
  "scan_ids": [123, 124, 125]
}
```

**Parameters:**
- `format` (string, required): Export format (`pdf`, `excel`, `csv`)
- `scan_ids` (array, optional): Specific scans to export (omit for all)

**Response:**
Returns file download with appropriate content-type

#### `POST /api/chat`

Interact with AI chat for crop health questions (requires Ollama).

**Request Body:**

```json
{
  "message": "What causes nitrogen deficiency?",
  "image": "base64_encoded_image",
  "history": []
}
```

**Response (200):**

```json
{
  "success": true,
  "response": "Nitrogen deficiency is caused by...",
  "model": "llama3.2-vision:latest"
}
```

---

## �🚀 Quick Start

### Prerequisites

-   **Python 3.11+** (for backend)
-   **Node.js 18+** and **npm** (for frontend)
-   **Expo CLI** (`npm install -g expo-cli`)
-   **SQLite** (included with Python)

### Backend Setup

1.  **Navigate to backend directory**
    
    ```bash
    cd backend
    ```
    
2.  **Create virtual environment** (recommended)
    
    ```bash
    python -m venv .venv311# Windows.venv311Scriptsactivate# Linux/Macsource .venv311/bin/activate
    ```
    
3.  **Install dependencies**
    
    ```bash
    pip install -r requirements.txt
    ```
    
4.  **Initialize database** (auto-created on first run)
    
    ```bash
    python app.py
    ```
    
5.  **Start Flask server**
    
    ```bash
    python app.py
    ```
    
    Server runs on `http://localhost:5000` by default
    

### Frontend Setup

1.  **Navigate to frontend directory**
    
    ```bash
    cd frontend
    ```
    
2.  **Install dependencies**
    
    ```bash
    npm install
    ```
    
3.  **Start Expo development server**
    
    ```bash
    npm start# ornpx expo start --tunnel
    ```
    
4.  **Run on device**
    
    -   Scan QR code with Expo Go app (iOS/Android)
    -   Or press `a` for Android, `i` for iOS simulator

### Environment Variables

Create a `.env` file in the `backend/` directory (optional):

```env
FLASK_ENV=developmentFASALVAIDYA_LOG_LEVEL=INFOFASALVAIDYA_LOG_CONSOLE=1
```

---

## 📱 Supported Crops

| Crop | Classes | ML Crop ID | Status | Accuracy |
|------|---------|------------|--------|----------|
| 🌾 Rice | 3 | `rice` | ✅ Active | 92-97% |
| 🌾 Wheat | 2 | `wheat` | ✅ Active | 81-90% |
| 🌽 Maize | 6 | `maize` | ✅ Active | 74-96% |
| 🍌 Banana | 3 | `banana` | ✅ Active | 95-97% |
| ☕ Coffee | 4 | `coffee` | ✅ Active | 85-92% |
| 🎃 Ashgourd | 7 | `ashgourd` | ✅ Active | 88-94% |
| 🍆 EggPlant | 4 | `eggplant` | ✅ Active | 82-88% |
| 🐍 Snakegourd | 5 | `snakegourd` | ✅ Active | 82-88% |
| 🥒 Bittergourd | 9 | `bittergourd` | ✅ Active | 80-86% |

**Total: 9 crops, 43 nutrient deficiency classes**

### Deficiency Classes by Crop

- **Rice**: Nitrogen (N), Phosphorus (P), Potassium (K)
- **Wheat**: Control (Healthy), Deficiency
- **Maize**: All Present, ALLAB, KAB, NAB, PAB, ZNAB
- **Banana**: Healthy, Magnesium, Potassium
- **Coffee**: Healthy, Nitrogen-N, Phosphorus-P, Potassium-K
- **Ashgourd**: Healthy, K, K_Mg, N, N_K, N_Mg, PM
- **Eggplant**: Healthy, K, N, N_K
- **Snakegourd**: Healthy, K, LS, N, N_K
- **Bittergourd**: DM, Healthy, JAS, K, K_Mg, LS, N, N_K, N_Mg

---

## 🤖 Machine Learning Models

### Custom Dataset

Our machine learning models were trained on a **custom dataset** that we created by gathering and curating images from multiple sources. This comprehensive dataset includes:

-   **PlantVillage Dataset**: Crop disease and health images
-   **Kaggle Leaf Nutrient Dataset**: Nutrient deficiency samples
-   **Additional Sources**: Curated images from various agricultural research databases
-   **Total Training Images**: ~40,000+ images across 9 crops and 43 nutrient deficiency classes

The dataset was carefully organized, labeled, and preprocessed to ensure high-quality training data for accurate NPK deficiency detection. Each image was manually verified and categorized by crop type and nutrient deficiency status (healthy, nitrogen-deficient, phosphorus-deficient, potassium-deficient, etc.).

### Model Architecture

-   **Base Model**: Transfer learning from MobileNetV2
-   **Input Size**: 224x224x3 RGB images
-   **Output**: 43-class classification (crop + nutrient deficiency)
-   **Optimization**: Quantized TensorFlow Lite for mobile deployment

### Model Files

-   **Backend**: `unified_v2_nutrient_best.keras` (15.7 MB)
-   **Mobile**: `fasalvaidya_unified_v2.tflite` (3.0 MB)
-   **Labels**: `unified_v2_labels.txt` (43 classes)
-   **Metadata**: `unified_v2_model_metadata.json`

### Performance Metrics

-   **Overall Accuracy**: 72.5%
-   **Top-3 Accuracy**: 89.7%
-   **Inference Time**: <500ms (mobile)
-   **Model Size**: 3.0 MB (TFLite)

---

## 📚 API Documentation

### Endpoints

#### `POST /api/scans`

Upload a leaf image for diagnosis.

**Request:**

```json
{  "crop_id": 1,  "image": "<base64_encoded_image>"}
```

**Response:**

```json
{  "scan_id": "uuid",  "crop_name": "Wheat",  "n_score": 75,  "p_score": 82,  "k_score": 68,  "mg_score": 70,  "n_severity": "attention",  "p_severity": "healthy",  "k_severity": "attention",  "overall_status": "attention",  "recommendations": {...},  "image_url": "/uploads/...",  "heatmap_url": "/uploads/heatmap_..."}
```

#### `GET /api/scans`

Retrieve scan history.

#### `GET /api/scans/{scan_id}`

Get specific scan details.

#### `GET /api/crops`

List all supported crops.

---

## 🧪 Testing

### Backend Tests

```bash
cd backendpytest tests/
```

### API Tests

```bash
cd backendpython tests/test_api.py
```

---

## 🎓 Training New Models

See detailed guides in the `guidelines/` directory:

-   **Quick Start**: [`QUICK_START_V2.md`](guidelines/QUICK_START_V2.md)
-   **Training Plan**: [`UNIFIED_V2_TRAINING_PLAN.md`](guidelines/UNIFIED_V2_TRAINING_PLAN.md)
-   **Deployment**: [`V2_DEPLOYMENT_SUMMARY.md`](guidelines/V2_DEPLOYMENT_SUMMARY.md)

### Quick Training Steps

1.  **Prepare dataset**
    
    ```bash
    cd backend/mlpython prepare_unified_v2_dataset.py
    ```
    
2.  **Train model** (requires GPU)
    
    ```bash
    python train_unified_v2.py
    ```
    
3.  **Convert to TFLite**
    
    ```bash
    python convert_to_tflite.py
    ```
    

---

## 🛠️ Development

### VS Code Setup

The project includes VS Code configuration:

-   **Tasks**: Pre-configured tasks for running backend/frontend
-   **Keybindings**: Custom shortcuts (Ctrl+Shift+B to start all)
-   **Settings**: Python path, formatters, and workspace settings

### Running Both Services

**Option 1: VS Code Tasks**

-   Press `Ctrl+Shift+B` to start both backend and frontend

**Option 2: Manual**

```bash
# Terminal 1 - Backendcd backendpython app.py# Terminal 2 - Frontendcd frontendnpm start
```

---

## 🤝 Contributing

1.  Fork the repository
2.  Create a feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

-   **Custom Dataset**: We created a comprehensive custom dataset by gathering and curating images from multiple sources including PlantVillage, Kaggle Leaf Nutrient Dataset, and other agricultural research databases
-   **PlantVillage Dataset** - Source for crop disease images
-   **Kaggle Leaf Nutrient Dataset** - Source for nutrient deficiency samples
-   **TensorFlow** - Machine learning framework
-   **Expo** - React Native development platform
-   **Flask** - Python web framework

---

## 📞 Support

For issues, questions:

-   Open an issue on GitHub
-   Check the `guidelines/` directory for detailed documentation
-   Review API logs in `backend/logs/backend.log`
-   Contact : [dhruvalbhinsara460@gmail.com](mailto:dhruvalbhinsara460@gmail.com)

---

## 🔮 Roadmap

-    Implement real-time camera preview with ML overlay
-    Offline mode with local model inference
-    Add fertilizer product marketplace integration
-    Implement user accounts and cloud sync
-    Add expert consultation chat feature
-    Support for more nutrient deficiencies

---

**Made with ❤️ for farmers worldwide**