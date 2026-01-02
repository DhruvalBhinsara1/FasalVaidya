# FasalVaidya App – Context Summary

## Main Idea
FasalVaidya is an AI-powered mobile and web app for Indian farmers to diagnose crop nutrient deficiencies (NPK: Nitrogen, Phosphorus, Potassium) by uploading or capturing leaf photos. It leverages deep learning to provide instant, crop-specific fertilizer recommendations in English and Hindi, with confidence scores, severity levels, and a user-friendly interface. The MVP supports four major crops: Wheat, Rice, Tomato, and Cotton, covering 80% of Indian agriculture.

## Key Features
 **Multi-crop support:** Farmers select crop type (Wheat, Rice, Tomato, Cotton) before scanning; all logic and recommendations are crop-aware.
 **Leaf photo diagnosis:** Uses a PlantVillage-trained deep learning model (EfficientNet/MobileNetV3) to analyze leaf images for NPK deficiencies. Input: 224x224 RGB, Output: 3 scores (N, P, K).
 **Actionable advice:** Returns fertilizer recommendations (e.g., "Apply 50kg Urea/acre for wheat") tailored to the crop and detected deficiency, in both English and Hindi.
 **Severity & confidence:** Shows severity (Healthy/Attention/Critical) and confidence for each nutrient, with color-coded UI and percentage scores.
 **History tracking:** Users can view past scans and diagnoses for all crops, with timestamps, crop names, and recommendations.
 **Multilingual:** UI and recommendations in English and Hindi; text-to-speech and additional languages planned.
 **Offline-first:** App works with low connectivity; photos and results are cached locally and sync when online.
 **Accessibility:** Large touch targets, high-contrast colors, and voice output for low-literacy users.
 **Camera & Gallery:** Supports both live camera capture and gallery upload, with image validation and preprocessing.
 **Admin/Testing:** Batch scan upload and test scripts for rapid validation.

## Architecture Overview
 **Frontend:** React Native (Expo), TypeScript, mobile-first, clean UI, crop selection, camera/gallery integration, history, and results screens. Uses Context API for state, i18n-js for translations, and AsyncStorage for offline caching.
 **Backend:** Python Flask API, handles image upload, runs ML inference, stores results in SQLite DB. Exposes REST endpoints for health, crops, scans, and history. Handles image validation, error handling, and multi-crop logic.
 **ML Model:** TensorFlow (EfficientNet/EfficientNetV2/MobileNetV3), PlantVillage expert-trained model (single universal model for all crops), input 224x224 RGB, output 3 NPK scores (0–1). Custom training scripts for balanced, multi-class detection (NPK + micronutrients).
 **Database:** SQLite, with tables for crops, scans, diagnoses, and recommendations (multi-crop aware). Schema supports future extension to more crops, users, and nutrients.
 **DevOps:** Local deployment for MVP; all components run on a laptop for demo. No cloud dependencies.

## User Flow
1. User opens app (mobile or web)
2. Selects crop (Wheat, Rice, Tomato, Cotton) from dropdown or chips
3. Captures or uploads a leaf photo (camera/gallery)
4. App uploads image to backend (with crop_id)
5. Backend validates image, runs ML model, returns NPK scores, severity, and crop-specific recommendations
6. Results are shown with color-coded severity, confidence, and fertilizer advice (in English/Hindi)
7. User can view scan history for all crops, with timestamps and recommendations
8. (Optional) User can clear history or retake scans

## Technology Stack
 **Frontend:** React Native (Expo), TypeScript, AsyncStorage (offline cache), Axios (API), i18n-js (translations), React Navigation, Expo Camera, Expo Image Manipulator, custom theme.
 **Backend:** Flask, TensorFlow, Pillow (image processing), SQLite, python-dotenv, Flask-CORS, OpenCV (image validation), RESTful API design.
 **ML:** PlantVillage expert model, EfficientNet/EfficientNetV2/MobileNetV3 architectures, custom training scripts for multi-class NPK + micronutrient detection, aggressive class balancing, data augmentation, and heatmap generation.
 **Testing:** Pytest (backend), Jest + React Native Testing Library (frontend), batch scan scripts for automated validation.

## Database Schema (Core)
- **crops:** id, name, name_hi
- **leaf_scans:** id, crop_id, image_path, created_at, status
- **diagnoses:** id, scan_id, n_score, p_score, k_score, n_confidence, p_confidence, k_confidence, recommendation, created_at
- **recommendations:** id, scan_id, n_text, p_text, k_text, created_at

### Entity Relationships
- One-to-many: crops → leaf_scans → diagnoses → recommendations
- All tables support multi-crop and future extensibility (e.g., more nutrients, users)

### Example Query
Get all scans for a crop:
```sql
SELECT s.id, c.name, d.n_score, d.p_score, d.k_score, d.recommendation
FROM leaf_scans s
JOIN crops c ON s.crop_id = c.id
LEFT JOIN diagnoses d ON d.scan_id = s.id
WHERE s.crop_id = 1
ORDER BY s.created_at DESC;
```

## API Endpoints
- `GET /api/health` – Health check
- `GET /api/crops` – List supported crops
- `POST /api/scans` – Upload leaf photo, returns diagnosis
- `GET /api/scans` – List scan history
- `DELETE /api/scans` – Clear all scan history

### Example Scan Upload
```bash
curl -X POST http://localhost:5000/api/scans \
	-F "image=@test_images/wheat.jpg" \
	-F "crop_id=1"
# Response: {"scan_id":1,"crop_id":1,"crop_name":"Wheat",...}
```

### Example Scan History
```bash
curl http://localhost:5000/api/scans
# Response: {"scans": [{"scan_id":1, "crop_id":1, "crop_name":"Wheat", ...}]}
```

## ML Model Training
 **Data:** Uses PlantVillage dataset (54K+ labeled images), custom datasets, and aggressive class balancing for NPK and micronutrients.
 **Architecture:** EfficientNetV2/MobileNetV3, input 224x224 RGB, output 9 classes (NPK + micronutrients + healthy).
 **Training:** Multi-phase: head training, fine-tuning, deep fine-tuning. Data augmentation (flip, rotate, zoom, color jitter, noise). Oversampling for minority classes.
 **Evaluation:** Per-class accuracy, confusion matrix, validation/test splits, model selection by best val/test accuracy.
 **Output:** Model file (.h5), class names, confusion matrix, and heatmap generation for explainability.
 **Inference:** Model loaded in backend, runs synchronously on CPU (<3s per image). Returns NPK scores, confidences, detected class, and heatmap (base64 image).

### Example Model Output
```json
{
	"n_score": 0.72,
	"p_score": 0.41,
	"k_score": 0.28,
	"n_confidence": 0.91,
	"p_confidence": 0.88,
	"k_confidence": 0.85,
	"detected_class": "nitrogen-N",
	"detection_confidence": 91.0,
	"heatmap": "data:image/jpeg;base64,..."
}
```

### Model Selection
- Single universal model for all crops (crop_id only affects recommendations, not inference)
- Model size: ~40MB, runs on CPU
- Accuracy: 85–92% per nutrient (target)

### Training Scripts
- See backend/ml/train_mobilenetv3large.py, train_balanced_npk.py, train_advanced_npk.py for full pipelines

### Explainability
- Grad-CAM/heatmap overlays highlight affected leaf regions for each scan

### Batch Testing
- test_batch_scans.py: Automates upload and validation of multiple test images for all crops

## What’s Out of Scope (MVP)
- Disease/pest detection
- Multi-user authentication
- Marketplace, weather integration
- Cloud deployment (runs locally for demo)

## Design Decisions & Rationale
- **Flask over Django/FastAPI:** Minimal boilerplate, fast prototyping, easy to debug for hackathon.
- **SQLite over PostgreSQL:** Zero setup, portable, easy to inspect for judges.
- **React Native Expo:** Cross-platform, fast iteration, no native build headaches.
- **Single universal model:** Simpler deployment, easier to maintain, crop-specific logic handled in backend.
- **Aggressive class balancing:** Ensures minority deficiencies (e.g., K, micronutrients) are detected reliably.
- **No cloud dependencies:** All local for demo, no internet required except for initial setup.
- **Accessibility:** Large buttons, high-contrast, Hindi support, voice planned for low-literacy users.

## Future Extensions
- Add more crops (sugarcane, potato, corn, soybean, mustard)
- Add disease/pest detection (separate models)
- Multi-user support, authentication, and user profiles
- Cloud deployment (Azure/AWS), scalable DB
- Push notifications, weather integration, marketplace
- On-device inference (TensorFlow Lite/JS)

## References
- See `FasalVaidya-MVP-Tech-Stack.md`, `FasalVaidya-Dev-Guidelines.md`, `Architecture-Overview.md`, and backend/ml/ for full details and code.

## References
**This file summarizes the main idea, features, architecture, ML pipeline, and design decisions of the FasalVaidya app for onboarding, demo, and technical reference.**

---
**This file summarizes the main idea, features, and architecture of the FasalVaidya app for quick onboarding and context.**
