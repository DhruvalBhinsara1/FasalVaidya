# 🌾 FasalVaidya

**AI-Powered Crop Health Diagnosis Platform**

FasalVaidya is an intelligent mobile application that uses machine learning to diagnose crop nutrient deficiencies (NPK - Nitrogen, Phosphorus and Potassium) by analyzing leaf images. Built with React Native (Expo) and Flask, it provides farmers with instant, accurate crop health assessments and personalized fertilizer recommendations.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~54.0.0-000020.svg)](https://expo.dev/)
[![Flask](https://img.shields.io/badge/Flask-3.0.0-green.svg)](https://flask.palletsprojects.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.15+-FF6F00.svg)](https://www.tensorflow.org/)

---

## ✨ Features

### 🌱 Core Capabilities
- **📷 Camera-Based Scanning**: Capture and analyze crop leaf images in real-time
- **🤖 AI-Powered Diagnosis**: Deep learning models detect NPK+Mg deficiencies with confidence scores
- **🌾 Multi-Crop Support**: Supports 9 crops (Rice, Wheat, Maize, Banana, Coffee, Ashgourd, EggPlant, Snakegourd, Bittergourd)
- **📊 Visual Analysis**: Heatmap overlays showing nutrient deficiency areas
- **💡 Smart Recommendations**: Crop-specific fertilizer suggestions with dosage information
- **📜 Scan History**: Track all your diagnoses with detailed results

### 🌐 Accessibility & Localization
- **🔊 Text-to-Speech**: Audio narration of diagnosis results
- **🌍 Multi-Language Support**: 10+ languages including English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, and Punjabi
- **📱 Mobile-First Design**: Optimized for smartphones with offline capabilities

### 🎨 User Experience
- **Modern UI/UX**: Clean, intuitive interface following Material Design principles
- **Real-Time Processing**: Fast inference (<500ms) using optimized TensorFlow Lite models
- **Confidence Indicators**: Visual feedback on prediction reliability
- **Product Suggestions**: Integrated fertilizer product recommendations

---

## 🏗️ Architecture

```
FasalVaidya/
├── backend/                 # Flask API server
│   ├── app.py              # Main Flask application
│   ├── ml/                 # Machine Learning models & inference
│   │   ├── unified_inference.py
│   │   ├── models/         # Trained model files (.keras, .tflite)
│   │   └── train_*.py      # Training scripts
│   ├── uploads/           # User-uploaded images
│   ├── logs/               # Application logs
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React Native Expo app
│   ├── src/
│   │   ├── screens/        # App screens (Home, Camera, Results, History)
│   │   ├── components/     # Reusable UI components
│   │   ├── api/            # API client & endpoints
│   │   ├── i18n/           # Internationalization
│   │   └── theme/          # Design system
│   ├── App.tsx             # Main entry point
│   └── package.json        # Node dependencies
│
└── guidelines/             # Documentation & training guides
    ├── QUICK_START_V2.md
    ├── UNIFIED_V2_TRAINING_PLAN.md
    └── V2_DEPLOYMENT_SUMMARY.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** (for backend)
- **Node.js 18+** and **npm** (for frontend)
- **Expo CLI** (`npm install -g expo-cli`)
- **SQLite** (included with Python)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment** (recommended)
   ```bash
   python -m venv .venv311
   # Windows
   .venv311\Scripts\activate
   # Linux/Mac
   source .venv311/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize database** (auto-created on first run)
   ```bash
   python app.py
   ```

5. **Start Flask server**
   ```bash
   python app.py
   ```
   Server runs on `http://localhost:5000` by default

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Expo development server**
   ```bash
   npm start
   # or
   npx expo start --tunnel
   ```

4. **Run on device**
   - Scan QR code with Expo Go app (iOS/Android)
   - Or press `a` for Android, `i` for iOS simulator

### Environment Variables

Create a `.env` file in the `backend/` directory (optional):

```env
FLASK_ENV=development
FASALVAIDYA_LOG_LEVEL=INFO
FASALVAIDYA_LOG_CONSOLE=1
```

---

## 📱 Supported Crops

| Crop | Classes | Status | Accuracy |
|------|---------|--------|----------|
| 🌾 Rice | 4 | ✅ Active | 92-97% |
| 🌾 Wheat | 3 | ✅ Active | 81-90% |
| 🌽 Maize | 4 | ✅ Active | 74-96% |
| 🍌 Banana | 3 | ✅ Active | 95-97% |
| ☕ Coffee | 4 | ✅ Active | 85-92% |
| 🥒 Ashgourd | 7 | ✅ Active | 88-94% |
| 🍆 EggPlant | 4 | ✅ Active | 82-88% |
| 🐍 Snakegourd | 5 | ✅ Active | 82-88% |
| 🥒 Bittergourd | 9 | ✅ Active | 80-86% |

**Total: 9 crops, 43 nutrient deficiency classes**

---

## 🤖 Machine Learning Models

### Custom Dataset
Our machine learning models were trained on a **custom dataset** that we created by gathering and curating images from multiple sources. This comprehensive dataset includes:
- **PlantVillage Dataset**: Crop disease and health images
- **Kaggle Leaf Nutrient Dataset**: Nutrient deficiency samples
- **Additional Sources**: Curated images from various agricultural research databases
- **Total Training Images**: ~40,000+ images across 9 crops and 43 nutrient deficiency classes

The dataset was carefully organized, labeled, and preprocessed to ensure high-quality training data for accurate NPK deficiency detection. Each image was manually verified and categorized by crop type and nutrient deficiency status (healthy, nitrogen-deficient, phosphorus-deficient, potassium-deficient, etc.).

### Model Architecture
- **Base Model**: Transfer learning from MobileNetV2
- **Input Size**: 224x224x3 RGB images
- **Output**: 43-class classification (crop + nutrient deficiency)
- **Optimization**: Quantized TensorFlow Lite for mobile deployment

### Model Files
- **Backend**: `unified_v2_nutrient_best.keras` (15.7 MB)
- **Mobile**: `fasalvaidya_unified_v2.tflite` (3.0 MB)
- **Labels**: `unified_v2_labels.txt` (43 classes)
- **Metadata**: `unified_v2_model_metadata.json`

### Performance Metrics
- **Overall Accuracy**: 72.5%
- **Top-3 Accuracy**: 89.7%
- **Inference Time**: <500ms (mobile)
- **Model Size**: 3.0 MB (TFLite)

---

## 📚 API Documentation

### Endpoints

#### `POST /api/scans`
Upload a leaf image for diagnosis.

**Request:**
```json
{
  "crop_id": 1,
  "image": "<base64_encoded_image>"
}
```

**Response:**
```json
{
  "scan_id": "uuid",
  "crop_name": "Wheat",
  "n_score": 75,
  "p_score": 82,
  "k_score": 68,
  "mg_score": 70,
  "n_severity": "attention",
  "p_severity": "healthy",
  "k_severity": "attention",
  "overall_status": "attention",
  "recommendations": {...},
  "image_url": "/uploads/...",
  "heatmap_url": "/uploads/heatmap_..."
}
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
cd backend
pytest tests/
```

### API Tests
```bash
cd backend
python tests/test_api.py
```

---

## 🎓 Training New Models

See detailed guides in the `guidelines/` directory:

- **Quick Start**: [`QUICK_START_V2.md`](guidelines/QUICK_START_V2.md)
- **Training Plan**: [`UNIFIED_V2_TRAINING_PLAN.md`](guidelines/UNIFIED_V2_TRAINING_PLAN.md)
- **Deployment**: [`V2_DEPLOYMENT_SUMMARY.md`](guidelines/V2_DEPLOYMENT_SUMMARY.md)

### Quick Training Steps

1. **Prepare dataset**
   ```bash
   cd backend/ml
   python prepare_unified_v2_dataset.py
   ```

2. **Train model** (requires GPU)
   ```bash
   python train_unified_v2.py
   ```

3. **Convert to TFLite**
   ```bash
   python convert_to_tflite.py
   ```

---

## 🛠️ Development

### VS Code Setup

The project includes VS Code configuration:

- **Tasks**: Pre-configured tasks for running backend/frontend
- **Keybindings**: Custom shortcuts (Ctrl+Shift+B to start all)
- **Settings**: Python path, formatters, and workspace settings

### Running Both Services

**Option 1: VS Code Tasks**
- Press `Ctrl+Shift+B` to start both backend and frontend

**Option 2: Manual**
```bash
# Terminal 1 - Backend
cd backend
python app.py

# Terminal 2 - Frontend
cd frontend
npm start
```

---


## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Custom Dataset**: We created a comprehensive custom dataset by gathering and curating images from multiple sources including PlantVillage, Kaggle Leaf Nutrient Dataset, and other agricultural research databases
- **PlantVillage Dataset** - Source for crop disease images
- **Kaggle Leaf Nutrient Dataset** - Source for nutrient deficiency samples
- **TensorFlow** - Machine learning framework
- **Expo** - React Native development platform
- **Flask** - Python web framework

---

## 📞 Support

For issues, questions:
- Open an issue on GitHub
- Check the `guidelines/` directory for detailed documentation
- Review API logs in `backend/logs/backend.log`
- Contact : dhruvalbhinsara460@gmail.com

---

## 🔮 Roadmap

- [x] Implement real-time camera preview with ML overlay
- [x] Offline mode with local model inference
- [ ] Add fertilizer product marketplace integration
- [ ] Implement user accounts and cloud sync
- [ ] Add expert consultation chat feature
- [ ] Support for more nutrient deficiencies

---

**Made with ❤️ for farmers worldwide**
