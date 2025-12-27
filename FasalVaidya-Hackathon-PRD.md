# FasalVaidya Hackathon PRD

**Document Version:** 1.1  
**Last Updated:** December 27, 2025  
**Status:** HACKATHON SUBMISSION  
**Target Demo:** December 29, 2025 (48-hour deadline)

---

## EXECUTIVE SUMMARY

**Product Name:** FasalVaidya (Crop Health Advisor)

**Tagline:** Instant NPK diagnosis from leaf photos → Actionable fertilizer recommendations in 2 minutes

**Problem:** Smallholder farmers lack real-time crop health diagnostics. They can't quickly identify nutrient deficiencies, leading to delayed decisions, wrong fertilizer choices, and crop losses.

**Solution:** Mobile app + AI vision model analyzes leaf photo → outputs NPK deficiency scores (0–100%) + specific fertilizer recommendation (e.g., "Apply 50kg Urea/acre").

**Target Users:** Wheat, rice, tomato, cotton farmers in rural India, basic smartphone skills, Hindi-speaking

**Success Metric:** Accurate NPK diagnosis (≥85% per nutrient) delivered in <2 minutes with actionable recommendation for any supported crop

---

## HACKATHON SCOPE (MINIMAL MVP)

### What We're Building (MUST HAVE)

| Feature | Why | Demo? |
|---------|-----|-------|
| **Crop Selection** | Different crops need different thresholds | ✅ YES |
| **Leaf Photo Capture** | Core interaction; farmer takes photo | ✅ YES |
| **AI Model Inference** | PlantVillage expert model → NPK scores | ✅ YES |
| **Results Display** | Show scores + severity (red/yellow/green) | ✅ YES |
| **Fertilizer Recommendation** | Crop-specific advice (e.g., "Apply 50kg Urea/acre for wheat") | ✅ YES |
| **Confidence Score** | "92% confident in Nitrogen diagnosis" | ✅ YES |
| **History View** | List of past scans (all crops) | ✅ YES |
| **Hindi Support** | UI + recommendations in Hindi | ✅ YES |

### What We're NOT Building (OUT OF SCOPE)

| Feature | Why Not | When? |
|---------|---------|-------|
| Disease detection | Requires separate model; scope creep | Phase 2 |
| Pest identification | Separate model needed | Phase 2 |
| Marketplace | Vendor integration too heavy | Phase 2 |
| Auth / Multi-user | Single-user demo sufficient | Phase 2 |
| Weather integration | Nice-to-have; not core to diagnosis | Phase 2 |
| Offline processing | Backend inference sufficient for MVP | Phase 2 |
| Heatmaps | Grad-CAM nice-to-have but not critical | Phase 2 |

---

## SUPPORTED CROPS (HACKATHON)

**4 Core Crops (covers 80% of Indian agriculture):**

1. **Wheat** (Rabi season, Oct–Mar)
   - N deficiency: Apply 50–70 kg Urea/acre
   - P deficiency: Apply 25–35 kg DAP/acre
   - K deficiency: Apply 20–30 kg MOP/acre

2. **Rice** (Kharif season, Jun–Sep)
   - N deficiency: Apply 60–80 kg Urea/acre
   - P deficiency: Apply 30–40 kg DAP/acre
   - K deficiency: Apply 25–35 kg MOP/acre

3. **Tomato** (Year-round, sensitive crop)
   - N deficiency: Apply 15–20 kg Urea per 1000m²
   - P deficiency: Apply 10–15 kg DAP per 1000m²
   - K deficiency: Apply 12–18 kg MOP per 1000m²

4. **Cotton** (Kharif, Apr–Nov)
   - N deficiency: Apply 40–60 kg Urea/acre
   - P deficiency: Apply 20–30 kg DAP/acre
   - K deficiency: Apply 18–25 kg MOP/acre

**Future (Phase 2):** Sugarcane, potato, corn, soybean, mustard

---

## USER FLOW (SIMPLEST PATH)

```
1. Farmer opens app → Home screen
2. Selects crop from dropdown (Wheat, Rice, Tomato, Cotton)
3. Taps "📷 Scan Leaf" button
4. Camera opens → farmer captures leaf photo
5. Photo uploads to backend
6. Backend runs model inference (2-3 seconds)
7. Results appear (crop-aware):
   - N: 75% | 🔴 Critical | 92% confident
   - P: 45% | 🟡 Attention | 88% confident
   - K: 30% | 🟢 Healthy | 85% confident
8. Crop-specific recommendation appears:
   - "Wheat: Apply 50kg Urea per acre within 5 days"
9. Farmer sees History screen (all past scans, all crops)
```

**Total Time:** <2 minutes from crop selection to actionable advice ✅

---

## FEATURES (DETAILED)

### Feature 1: Crop Selection

**What:**
- Home screen shows dropdown: "Select Crop"
- Options: Wheat, Rice, Tomato, Cotton
- Default: Last selected crop (persisted)
- Can change crop before scanning

**Why:** Different crops have different nutrient thresholds and recommendations

**Acceptance Criteria:**
- ✅ Dropdown displays all 4 crops
- ✅ Selection persists across app restart
- ✅ Easy to change (tap dropdown, select new crop)
- ✅ Selected crop displayed prominently

**Database Addition:**
```sql
ALTER TABLE scans ADD COLUMN crop_id INTEGER;
-- crop_id: 1=Wheat, 2=Rice, 3=Tomato, 4=Cotton
```

---

### Feature 2: Leaf Photo Capture

**What:**
- In-app camera interface
- Guide frame on screen (helps farmer center leaf)
- Capture button + cancel button
- Retake option if not satisfied

**Why:** Core interaction; direct from farmer phone to AI model

**Acceptance Criteria:**
- ✅ Camera opens without crash
- ✅ Photo can be taken in landscape or portrait
- ✅ Retake works (don't lose original photo)
- ✅ Photo saved locally (for offline fallback)

---

### Feature 3: AI Model Inference

**What:**
- Backend receives photo + crop_id
- TensorFlow loads PlantVillage expert trained model
- Preprocesses image (resize 224×224, normalize)
- Runs inference (outputs 3 NPK scores 0–1)
- Generates confidence per nutrient
- Returns crop_id with results (for recommendations)

**Why:** The magic; turns leaf photo into diagnostic numbers

**Acceptance Criteria:**
- ✅ Model loads successfully
- ✅ Inference completes in <3 seconds
- ✅ Output: {crop_id, n_score, p_score, k_score, confidences}
- ✅ Works on CPU (no GPU needed)

---

### Feature 4: Results Display Screen

**What:**
```
┌───────────────────────────┐
│  Wheat Diagnosis          │ ← Crop name shown
├───────────────────────────┤
│ Nitrogen (N)              │
│ 75% | 🔴 Critical         │
│ Confidence: 92%           │
├───────────────────────────┤
│ Phosphorus (P)            │
│ 45% | 🟡 Attention        │
│ Confidence: 88%           │
├───────────────────────────┤
│ Potassium (K)             │
│ 30% | 🟢 Healthy          │
│ Confidence: 85%           │
├───────────────────────────┤
│ 💡 Recommendation:        │
│ "Apply 50kg Urea per acre │
│  within 5 days"           │
│ [🔊 Listen] [← Back]      │
└───────────────────────────┘
```

**Why:** Farmers need visual, color-coded severity + clear action

**Acceptance Criteria:**
- ✅ Crop name displayed at top
- ✅ Scores displayed as 0–100% (not 0–1)
- ✅ Color-coded: 🔴 Critical (>60%) | 🟡 Attention (30–60%) | 🟢 Healthy (<30%)
- ✅ Confidence shown per nutrient
- ✅ Recommendation text in bold, large font
- ✅ Voice button reads recommendation aloud

---

### Feature 5: Crop-Specific Fertilizer Recommendation

**What:**
- Rule-based logic by crop:
  - **Wheat:** Urea 50–70 kg/acre, DAP 25–35 kg/acre, MOP 20–30 kg/acre
  - **Rice:** Urea 60–80 kg/acre, DAP 30–40 kg/acre, MOP 25–35 kg/acre
  - **Tomato:** Urea 15–20 kg/1000m², DAP 10–15 kg/1000m², MOP 12–18 kg/1000m²
  - **Cotton:** Urea 40–60 kg/acre, DAP 20–30 kg/acre, MOP 18–25 kg/acre

- Text in Hindi + English
- Include: fertilizer name + quantity + timing

**Why:** Farmers need crop-specific advice (wheat ≠ rice application)

**Acceptance Criteria:**
- ✅ Recommendation changes based on crop selected
- ✅ Text is farmer-friendly (no jargon)
- ✅ Includes: fertilizer name + quantity + timing
- ✅ Both English and Hindi versions available
- ✅ Different crops show different quantities

**Backend Implementation:**
```python
RECOMMENDATIONS = {
    'wheat': {
        'n': 'Apply 50–70 kg Urea per acre',
        'p': 'Apply 25–35 kg DAP per acre',
        'k': 'Apply 20–30 kg MOP per acre'
    },
    'rice': {
        'n': 'Apply 60–80 kg Urea per acre',
        'p': 'Apply 30–40 kg DAP per acre',
        'k': 'Apply 25–35 kg MOP per acre'
    },
    'tomato': {
        'n': 'Apply 15–20 kg Urea per 1000m²',
        'p': 'Apply 10–15 kg DAP per 1000m²',
        'k': 'Apply 12–18 kg MOP per 1000m²'
    },
    'cotton': {
        'n': 'Apply 40–60 kg Urea per acre',
        'p': 'Apply 20–30 kg DAP per acre',
        'k': 'Apply 18–25 kg MOP per acre'
    }
}
```

---

### Feature 6: Confidence Indicator

**What:**
- Per-nutrient confidence: 0–100%
- Overall confidence: average of 3 nutrients
- Show "92% confident in Nitrogen diagnosis"
- Use confidence to flag uncertain results

**Why:** Judges want to see model calibration; farmers need to know trustworthiness

**Acceptance Criteria:**
- ✅ Confidence 0–100% (not 0–1 decimal)
- ✅ Shows per nutrient
- ✅ Displayed clearly on results screen
- ✅ <70% confidence triggers disclaimer: "Re-capture for better accuracy"

---

### Feature 7: Scan History (Multi-Crop)

**What:**
- List of all past scans (newest first)
- Each row: Date | **Crop** | Primary nutrient deficiency (color dot)
- Tap to re-view full results (with crop context)
- Can retake photo of same crop to compare

**Why:** Farmers track different crops over time; judges see multi-crop data

**Acceptance Criteria:**
- ✅ History shows all crops (not just wheat)
- ✅ Crop name displayed for each scan
- ✅ Tap to view original photo + full diagnosis + recommendations
- ✅ Can retake photo of different crop
- ✅ Database persists across app restart

---

### Feature 8: Hindi Support

**What:**
- All UI text in Hindi + English
- Settings button to toggle language
- Crop names in selected language (गेहूँ = Wheat)
- Recommendations translated to Hindi
- Voice-to-speech in Hindi (natural accent)

**Why:** Judges want accessibility; farmers speak Hindi, not English

**Acceptance Criteria:**
- ✅ All buttons/labels in both languages
- ✅ Language toggle persists across app restarts
- ✅ Crop names translated (Wheat → गेहूँ, Rice → चावल, Tomato → टमाटर, Cotton → कपास)
- ✅ Recommendation text in selected language
- ✅ Voice reads in Hindi (not English accent)

---

## SCREENS (VISUAL LAYOUT)

### Screen 1: Home Screen (Updated)

```
┌─────────────────────────┐
│    🌾 FasalVaidya       │
│  Crop Health Advisor    │
├─────────────────────────┤
│ Select Crop:            │
│ [Wheat ▼]              │ ← Dropdown (Wheat/Rice/Tomato/Cotton)
│                         │
│      [📷 SCAN LEAF]     │ ← Large teal button
│                         │
│      [📜 History]       │ ← Secondary button
│                         │
├─────────────────────────┤
│ Last scan: 2 days ago   │
│ Wheat • Nitrogen High   │
└─────────────────────────┘
```

### Screen 2: Camera Screen

```
┌─────────────────────────┐
│   📷 Camera Preview     │
│   (Wheat selected)      │
│   ╔═════════════════╗   │
│   ║   [leaf here]   ║   │ ← Green guide frame
│   ╚═════════════════╝   │
│                         │
│ "Center leaf in frame"  │
│                         │
│  [CAPTURE] [CANCEL]     │
└─────────────────────────┘
```

### Screen 3: Results Screen (Updated)

Shows crop name at top (see Feature 4)

### Screen 4: History Screen (Updated)

```
┌─────────────────────────┐
│   📜 Scan History       │
├─────────────────────────┤
│ Dec 27 | Wheat | 🔴 N   │ ← Crop shown
│ Dec 25 | Rice  | 🟡 P   │
│ Dec 23 | Tomato| 🟢 OK  │
│ Dec 20 | Cotton| 🔴 K   │
│                         │
│ (empty state)           │
│ "No scans yet..."       │
└─────────────────────────┘
```

---

## TECH STACK (HACKATHON ONLY)

### Frontend
- **React Native + Expo** (fastest to mobile)
- Camera: `expo-camera`
- State: Context API (minimal)
- Language: `react-native-i18n` or hardcoded translations
- Styling: React Native StyleSheet (no fancy UI library)
- **New:** Crop selection dropdown (React Native Picker)

### Backend
- **Flask** (simplest Python framework)
- **TensorFlow 2.13+** (model inference)
- **SQLite** (local file DB; zero setup)
- **Pillow** (image resize/normalize)
- **Python 3.10**

### AI/ML
- **PlantVillage Expert Trained Model** (54K+ labeled plant images)
- Input: 224×224 RGB JPEG (crop-independent)
- Output: 3 sigmoid neurons → NPK scores 0–1 (same for all crops)
- Model size: ~40MB
- Inference: <3 seconds on CPU
- **Note:** Single universal model; crop affects recommendations only

### Infrastructure
- **Local laptop** (no cloud for hackathon)
- Backend: `python app.py` on port 5000
- Frontend: `npx expo start` (Expo Go on phones)
- Database: `app.db` SQLite file (local)

---

## API ENDPOINTS (MINIMAL)

### 1. Health Check
```
GET /api/health
Response: { "status": "ok" }
```

### 2. Upload Leaf Photo (Updated)
```
POST /api/scans
Payload: multipart/form-data { image, crop_id }
  crop_id: 1=Wheat, 2=Rice, 3=Tomato, 4=Cotton
Response: { "scan_id": 123, "status": "processing", "crop_id": 1 }
```

### 3. Get Diagnosis (Poll)
```
GET /api/scans/123/diagnosis
Response: { 
  "n_score": 0.75, 
  "p_score": 0.45, 
  "k_score": 0.30,
  "crop_id": 1,
  "crop_name": "Wheat",
  "recommendation": "Apply 50kg Urea per acre",
  ...
}
OR: { "status": "processing", "estimated_time_seconds": 3 }
```

### 4. Get History (Updated)
```
GET /api/scans?user_id=1
Response: { 
  "scans": [
    { "id": 123, "crop_id": 1, "crop_name": "Wheat", "created_at": "...", "diagnosis": {...} },
    { "id": 122, "crop_id": 2, "crop_name": "Rice", "created_at": "...", "diagnosis": {...} }
  ] 
}
```

---

## DATABASE SCHEMA (MINIMAL, UPDATED)

```sql
-- Crops (reference data)
CREATE TABLE crops (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,        -- Wheat, Rice, Tomato, Cotton
  name_hi TEXT NOT NULL,     -- गेहूँ, चावल, टमाटर, कपास
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scans (photos)
CREATE TABLE scans (
  id INTEGER PRIMARY KEY,
  crop_id INTEGER NOT NULL,  -- Links to crops table
  image_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (crop_id) REFERENCES crops(id)
);

-- Diagnoses (AI results)
CREATE TABLE diagnoses (
  id INTEGER PRIMARY KEY,
  scan_id INTEGER,
  n_score REAL,
  p_score REAL,
  k_score REAL,
  n_confidence REAL,
  p_confidence REAL,
  k_confidence REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recommendations (crop-specific)
CREATE TABLE recommendations (
  id INTEGER PRIMARY KEY,
  diagnosis_id INTEGER,
  crop_id INTEGER,
  text TEXT,                 -- English
  text_hi TEXT,              -- Hindi
  FOREIGN KEY (crop_id) REFERENCES crops(id)
);
```

**Seed Data (on app startup):**
```sql
INSERT INTO crops (name, name_hi) VALUES 
  ('Wheat', 'गेहूँ'),
  ('Rice', 'चावल'),
  ('Tomato', 'टमाटर'),
  ('Cotton', 'कपास');
```

---

## DESIGN SYSTEM (SIMPLE)

### Colors
- **Primary (Button):** Teal `#208F78`
- **Success (Healthy):** Green `#208F78`
- **Warning (Attention):** Orange `#F5A623`
- **Critical (Red):** Red `#D63D3D`
- **Background:** Off-white `#F9FAFB`
- **Text:** Dark gray `#1F2937`

### Typography
- **Headers:** 28px, bold
- **Body:** 16px, regular
- **Labels:** 14px, medium

### Spacing
- Padding: 16px (all cards)
- Gap: 16px (between elements)
- Button min size: 48×48dp (WCAG)

---

## SUCCESS CRITERIA (HACKATHON)

### Demo Requirements ✅

- [ ] App boots without crash
- [ ] Crop dropdown shows all 4 crops
- [ ] Can select different crops
- [ ] "Scan Leaf" button works → camera opens
- [ ] Can capture leaf photo (any crop)
- [ ] Photo uploads to backend
- [ ] Model inference completes (<3 seconds)
- [ ] Results display: N, P, K scores + colors
- [ ] Crop name shown in results
- [ ] Crop-specific recommendation appears
- [ ] Confidence shown (e.g., "92% confident")
- [ ] History screen shows multiple crops
- [ ] Language toggle works (English ↔ Hindi)
- [ ] Crop names change language
- [ ] Full flow tested on actual phone (not just simulator)

### Judging Criteria 📊

- **Crop Support:** Works for wheat, rice, tomato, cotton (not just wheat!)
- **Accuracy:** Model predicts NPK correctly (≥85% on test images)
- **Speed:** <2 minutes photo → advice
- **UX:** Farmer understands output without training
- **Innovation:** AI diagnosis solves real farmer problem
- **Polish:** No crashes, loads quickly, responsive UI
- **Presentation:** Clear 2-minute demo + slide deck

---

## HACKATHON DELIVERABLES

### Code Repos
- [ ] Frontend code (React Native + Expo) with crop selection
- [ ] Backend code (Flask + TensorFlow) with crop routing
- [ ] Database schema (SQL) with crops table
- [ ] Model weights (plantvillage-expert-npk.h5)
- [ ] Test images (3 wheat + 3 rice + 2 tomato + 2 cotton leaves)

### Documentation
- [ ] README.md (how to run, supported crops listed)
- [ ] API docs (4 endpoints with crop_id parameter)
- [ ] Design system (colors, spacing)
- [ ] Test plan (what to demo with each crop)

### Demo Assets
- [ ] 10 test leaf images (diverse crops, various deficiencies)
- [ ] Screenshots (all 4 screens showing different crops)
- [ ] 2-minute demo video (backup, showing 2+ crops)
- [ ] Slide deck (problem → solution → multi-crop demo)

---

## TIMELINE (48 HOURS)

### Day 1 (Dec 27, Friday, 3 PM—11 PM)
- **3 PM–5 PM:** Setup repos, create stubs (include crops table)
- **5 PM–8 PM:** Backend + DB (health check, crop selection, upload endpoint)
- **8 PM–11 PM:** Frontend HomeScreen (with crop dropdown) + CameraScreen

**STOP POINT:** Crop selection works; integration test passes (select crop → upload photo → backend saves with crop_id)

### Day 2 (Dec 28, Saturday, 9 AM—9 PM)
- **9 AM–12 PM:** ML model setup + inference
- **12 PM–3 PM:** Results screen (with crop context) + crop-specific recommendation logic
- **3 PM–6 PM:** History screen (showing all crops) + language support
- **6 PM–9 PM:** Testing with multiple crops, bug fixes, Polish

**STOP POINT:** Full E2E works 5 times with different crops without crash

### Day 3 (Dec 29, Sunday, 9 AM—5 PM)
- **9 AM–12 PM:** Final polish, accessibility check
- **12 PM–2 PM:** Test on actual phones (iOS + Android) with multiple crops
- **2 PM–4 PM:** Create slide deck (featuring multi-crop support), demo script
- **4 PM–5 PM:** Final dry run (demo all 4 crops), submit

**STOP POINT:** Demo ready for judges with multi-crop validation

---

## KNOWN LIMITATIONS

| Limitation | Reason | Next Phase |
|-----------|--------|-----------|
| 4 crops only | Time constraint; covers 80% of Indian agriculture | Phase 2 |
| No heatmaps | Complex; 2 hours to implement | Phase 2 |
| No offline model | TensorFlow.js too slow; backend inference OK | Phase 2 |
| Single user (no auth) | Not needed for demo | Phase 2 |
| Hardcoded recommendations | Stored in code; no database lookup | Phase 2 |
| No weather integration | Out of scope | Phase 2 |
| No disease detection | Separate model needed | Phase 2 |

---

## WHAT JUDGES WILL TEST

**In 5 minutes, they will:**

1. Open app → see HomeScreen ✅
2. See crop dropdown (Wheat, Rice, Tomato, Cotton) ✅
3. Select different crops → see dropdown change ✅
4. Tap "Scan Leaf" → camera opens ✅
5. Capture wheat leaf photo ✅
6. See results with "Wheat" labeled ✅
7. Check recommendation ("Apply 50kg Urea...") ✅
8. Go back, select "Rice" ✅
9. Capture rice leaf photo ✅
10. See different recommendation ("Apply 60kg Urea...") ✅
11. Tap History → see both wheat + rice scans ✅
12. Toggle language (English ↔ Hindi) ✅

**Judges will NOT test:**
- ❌ Heatmaps (nice-to-have)
- ❌ Disease detection (out of scope)
- ❌ Marketplace (Phase 3)
- ❌ Offline-first (Phase 2)

---

## GIT REPOSITORY STRUCTURE

```
fasalvaidya-hackathon/
├── backend/
│   ├── app.py                        # Flask server
│   ├── requirements.txt               # Python deps
│   ├── services/
│   │   └── ml_inference.py           # TensorFlow inference
│   ├── ml/models/
│   │   └── plantvillage-expert.h5    # Model weights
│   ├── uploads/                       # Uploaded photos
│   └── app.db                         # SQLite database
├── frontend/
│   ├── App.tsx                       # Main component
│   ├── screens/
│   │   ├── HomeScreen.tsx            # Updated: crop selection
│   │   ├── CameraScreen.tsx
│   │   ├── ResultsScreen.tsx         # Updated: crop context
│   │   └── HistoryScreen.tsx         # Updated: multi-crop
│   ├── package.json
│   └── app.json                      # Expo config
├── test_images/
│   ├── wheat_1.jpg
│   ├── wheat_2.jpg
│   ├── rice_1.jpg
│   ├── rice_2.jpg
│   ├── tomato_1.jpg
│   ├── tomato_2.jpg
│   ├── cotton_1.jpg
│   └── cotton_2.jpg
├── README.md                         # How to run
├── DEMO_SCRIPT.md                   # 2-minute walkthrough (all 4 crops)
└── API_DOCS.md                      # Endpoint specs
```

---

## QUICK START (FOR JUDGES)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python app.py
# Listens on http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm install
npx expo start
# Scan QR code with Expo Go app
```

**Test Endpoint:**
```bash
curl http://localhost:5000/api/health
# Returns: {"status":"ok"}
```

**Test Crop Selection:**
```bash
# Upload wheat photo
curl -X POST http://localhost:5000/api/scans \
  -F "image=@test_images/wheat_1.jpg" \
  -F "crop_id=1"
# Response: {"scan_id":1,"status":"processing","crop_id":1}

# Upload rice photo
curl -X POST http://localhost:5000/api/scans \
  -F "image=@test_images/rice_1.jpg" \
  -F "crop_id=2"
# Response: {"scan_id":2,"status":"processing","crop_id":2}
```

---

## PRESENTATION (JUDGING)

**Slide 1:** Problem
- Farmers can't diagnose nutrient deficiencies
- Costs money, takes time, wrong decisions
- **Affects all crop types (wheat, rice, tomato, cotton)**

**Slide 2:** Solution
- FasalVaidya: photo → AI model → crop-specific diagnosis
- Works for multiple crops (not just wheat!)
- Real-time, free, actionable

**Slide 3:** How It Works
- Farmer selects crop type
- Takes leaf photo
- PlantVillage expert model analyzes
- NPK scores + crop-specific recommendation

**Slide 4:** Demo (Live or Video)
- Show wheat photo → recommendation (50kg Urea)
- Show rice photo → recommendation (60kg Urea)
- Show history with mixed crops

**Slide 5:** Multi-Crop Support
- Wheat: ≥85% accuracy
- Rice: ≥85% accuracy
- Tomato: ≥85% accuracy
- Cotton: ≥85% accuracy
- Single universal model; crop-specific recommendations

**Slide 6:** Impact & Roadmap
- Helps 1000s of farmers avoid crop loss
- Phase 2: 10+ crops, marketplace, disease detection

---

## CONTACT & SUPPORT

**Questions during hackathon?**

- Tech questions → Check Tech Stack docs
- Feature questions → This PRD is source of truth
- Stuck on model? → See AI-Starter-Prompt.md

**Remember:** Scope includes 4 crops. Focus on core flow working perfectly for each crop type.

---

**Status:** APPROVED FOR HACKATHON  
**Target:** December 29, 2025 Demo Day (Multi-crop support)

Good luck! 🚀

---

**Version:** 1.1  
**Last Updated:** December 27, 2025  
**Changes from 1.0:** Added multi-crop support (wheat, rice, tomato, cotton), crop-specific recommendations, crop selection UI, updated database schema, added test images for all crops
