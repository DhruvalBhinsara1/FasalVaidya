# FasalVaidya AI Starter Prompt (Multi-Crop Edition)

**Status:** Ready for 36-hour sprint  
**Timeline:** December 27–29, 2025  
**Version:** 2.1  
**Last Updated:** December 27, 2025
**Crops Supported:** Wheat, Rice, Tomato, Cotton

---

## PROJECT OVERVIEW

**What is FasalVaidya?**

FasalVaidya is an AI-powered crop health diagnosis app that:
- Allows farmers to photograph plant leaves (any supported crop)
- Uses **PlantVillage expert trained model** to detect NPK (Nitrogen/Phosphorus/Potassium) deficiencies
- Provides **crop-specific** actionable fertilizer recommendations in multiple languages (English, Hindi)
- Shows severity levels (Healthy/Attention/Critical) with confidence scores
- Supports **4 major crops:** Wheat, Rice, Tomato, Cotton

**MVP Scope:** Multi-crop demo, locally hosted, all features functional by Sunday evening.

**Supported Crops:**
1. **Wheat** (Rabi season) — N: 50–70kg Urea, P: 25–35kg DAP, K: 20–30kg MOP/acre
2. **Rice** (Kharif season) — N: 60–80kg Urea, P: 30–40kg DAP, K: 25–35kg MOP/acre
3. **Tomato** (Year-round, sensitive) — N: 15–20kg Urea, P: 10–15kg DAP, K: 12–18kg MOP/1000m²
4. **Cotton** (Kharif) — N: 40–60kg Urea, P: 20–30kg DAP, K: 18–25kg MOP/acre

---

## YOUR DOCUMENTATION (SOURCE OF TRUTH)

Three files are your **source of truth**. Refer to them constantly:

### 1. FasalVaidya-MVP-Tech-Stack.md

**What:** ~4,000 lines of technology decisions with complete rationale

**Key Sections:**
- Section 1: Frontend stack (React Native Expo)
- Section 2: Backend stack (Flask)
- Section 3: Database (SQLite with multi-crop schema)
- **Section 4: AI/ML stack (TensorFlow + PlantVillage Expert Trained Model)** ⭐
- Section 5: Development tooling (Node 18, Python 3.10)
- Section 6: Deployment setup (local laptop for MVP)
- Section 7: Dependencies (npm, pip)
- Section 8: Intentional exclusions (disease detection, pest ID, marketplace)
- Section 9: Tech stack summary table
- Section 10: Critical dependencies (installation order)
- Section 11: Performance targets
- Appendix: Quick reference (start backend, start frontend, load model)

**When You Have Questions About:**
- "Should I use Django or Flask?" → Read Section 2 "Why Flask"
- "What's the model size?" → Read Section 4 (~40MB, crop-independent)
- "How do I load the PlantVillage model?" → Read Appendix code sample

### 2. FasalVaidya-Dev-Guidelines.md

**What:** ~5,000 lines of product requirements, UX specs, database schema (MULTI-CROP)

**Key Sections:**
- Section 1: Product understanding (user personas, use cases, value proposition)
- Section 2: Frontend UX guidelines (layout, colors, typography, components, **crop selection**)
- **Section 4: Database architecture (7 core entities including CROPS table, relationships, query patterns)** ⭐
- **Section 5: AI/ML system design (PlantVillage model spec, input/output, error handling, crop-independent)** ⭐
- Section 6: Rules, constraints, guardrails (performance, security)
- Section 7: Assumptions and open questions

**When You Have Questions About:**
- "What's the database schema?" → Read Section 4 (Crops, Users, LeafScans, Diagnoses, Recommendations)
- "How does the model work?" → Read Section 5 (input 224×224, output NPK scores, crop-independent)
- "What colors should I use?" → Read Section 2 (Teal #208F78 primary)
- "How do I support multiple crops?" → Read Section 4 (crops table + crop_id foreign key)

### 3. Architecture-Overview.md

**What:** ~2,000 lines connecting all documentation together (MULTI-CROP)

**Key Sections:**
- User journey (crop selection → photo → diagnosis → action)
- System architecture map (frontend/backend/database/ML, all multi-crop aware)
- Data flow (7 steps from crop selection to farmer result)
- Stakeholder role mapping (who owns what)
- Implementation timeline (5 phases, multi-crop in Phase 1 MVP)
- Success metrics (latency, accuracy, retention, crop coverage)

**When You Have Questions About:**
- "How does data flow through the system?" → Read "Data Flow: Photo to Recommendation" (7 steps, crop-aware)
- "Who builds what?" → Read "Stakeholder Role Mapping"
- "What are success criteria?" → Read "Success Metrics After Launch" (includes crop coverage)

---

## DAY 1 (FRIDAY DEC 27): PARALLEL BUILD SETUP

### GOAL: 3 working API endpoints + crop selection so frontend & ML teams have a contract

### TRACK 1: Backend Foundation with Multi-Crop Support (3 hours)

**File: backend/app.py** (with crop selection and mock inference for now)

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import sqlite3

load_dotenv()
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Crop definitions
CROPS = {
    1: {'name': 'Wheat', 'name_hi': 'गेहूँ'},
    2: {'name': 'Rice', 'name_hi': 'चावल'},
    3: {'name': 'Tomato', 'name_hi': 'टमाटर'},
    4: {'name': 'Cotton', 'name_hi': 'कपास'}
}

# Crop-specific fertilizer recommendations
FERTILIZER_RECS = {
    1: {'n': 'Apply 50–70 kg Urea per acre', 'p': 'Apply 25–35 kg DAP per acre', 'k': 'Apply 20–30 kg MOP per acre'},
    2: {'n': 'Apply 60–80 kg Urea per acre', 'p': 'Apply 30–40 kg DAP per acre', 'k': 'Apply 25–35 kg MOP per acre'},
    3: {'n': 'Apply 15–20 kg Urea per 1000m²', 'p': 'Apply 10–15 kg DAP per 1000m²', 'k': 'Apply 12–18 kg MOP per 1000m²'},
    4: {'n': 'Apply 40–60 kg Urea per acre', 'p': 'Apply 20–30 kg DAP per acre', 'k': 'Apply 18–25 kg MOP per acre'}
}

# Initialize SQLite with multi-crop schema
def init_db():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    # Crops reference table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS crops (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            name_hi TEXT NOT NULL
        )
    ''')
    
    # Insert crops
    cursor.execute('DELETE FROM crops')  # Clear existing
    for crop_id, crop_data in CROPS.items():
        cursor.execute('INSERT INTO crops (id, name, name_hi) VALUES (?, ?, ?)',
                      (crop_id, crop_data['name'], crop_data['name_hi']))
    
    # Leaf scans with crop reference
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leaf_scans (
            id INTEGER PRIMARY KEY,
            crop_id INTEGER NOT NULL,
            image_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (crop_id) REFERENCES crops(id)
        )
    ''')
    
    # Diagnoses (AI results)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS diagnoses (
            id INTEGER PRIMARY KEY,
            scan_id INTEGER,
            n_score REAL,
            p_score REAL,
            k_score REAL,
            n_confidence REAL,
            p_confidence REAL,
            k_confidence REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Recommendations (crop-specific)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY,
            diagnosis_id INTEGER,
            crop_id INTEGER,
            text TEXT,
            text_hi TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

init_db()

@app.route('/api/health', methods=['GET'])
def health():
    return {'status': 'ok', 'message': 'FasalVaidya backend running (multi-crop)'}, 200

@app.route('/api/crops', methods=['GET'])
def get_crops():
    """Return list of supported crops"""
    return {'crops': [{'id': cid, **cdata} for cid, cdata in CROPS.items()]}, 200

@app.route('/api/scans', methods=['POST'])
def create_scan():
    """Upload leaf photo for any supported crop"""
    try:
        image = request.files['image']
        crop_id = int(request.form.get('crop_id', 1))
        
        # Validate crop
        if crop_id not in CROPS:
            return {'error': f'Invalid crop_id. Supported: {list(CROPS.keys())}'}, 400
        
        # Save image
        filename = f"{os.urandom(8).hex()}.jpg"
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image.save(image_path)
        
        # Insert into DB with crop_id
        conn = sqlite3.connect('app.db')
        cursor = conn.cursor()
        cursor.execute('INSERT INTO leaf_scans (crop_id, image_path) VALUES (?, ?)',
                      (crop_id, image_path))
        scan_id = cursor.lastrowid
        
        # Mock inference (REPLACE with real model on Day 2)
        n_score, p_score, k_score = 0.75, 0.45, 0.30
        
        cursor.execute('''INSERT INTO diagnoses (scan_id, n_score, p_score, k_score, n_confidence, p_confidence, k_confidence)
                         VALUES (?, ?, ?, ?, ?, ?, ?)''',
                      (scan_id, n_score, p_score, k_score, 0.92, 0.88, 0.85))
        
        conn.commit()
        conn.close()
        
        return {
            'scan_id': scan_id,
            'crop_id': crop_id,
            'crop_name': CROPS[crop_id]['name'],
            'n_score': n_score,
            'p_score': p_score,
            'k_score': k_score,
            'status': 'Complete'
        }, 201
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/api/scans', methods=['GET'])
def get_scans():
    """Fetch scan history (all crops)"""
    try:
        conn = sqlite3.connect('app.db')
        cursor = conn.cursor()
        cursor.execute('''
            SELECT s.id, s.crop_id, c.name, d.n_score, d.p_score, d.k_score, s.created_at
            FROM leaf_scans s
            LEFT JOIN crops c ON s.crop_id = c.id
            LEFT JOIN diagnoses d ON s.id = d.scan_id
            ORDER BY s.created_at DESC
        ''')
        scans = [
            {
                'id': row[0],
                'crop_id': row[1],
                'crop_name': row[2],
                'n_score': row[3],
                'p_score': row[4],
                'k_score': row[5],
                'created_at': row[6]
            }
            for row in cursor.fetchall()
        ]
        conn.close()
        return {'scans': scans}, 200
    except Exception as e:
        return {'error': str(e)}, 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

**Test:**
```bash
python app.py
# In another terminal:
curl http://localhost:5000/api/health
# Should return: {"status":"ok","message":"FasalVaidya backend running (multi-crop)"}

curl http://localhost:5000/api/crops
# Should return: {"crops": [{"id": 1, "name": "Wheat", "name_hi": "गेहूँ"}, ...]}
```

### TRACK 2: Frontend Skeleton with Crop Selection (2 hours)

**File: frontend/App.tsx**

```typescript
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Picker } from 'react-native';

const CROPS = [
  { id: 1, name: 'Wheat', name_hi: 'गेहूँ' },
  { id: 2, name: 'Rice', name_hi: 'चावल' },
  { id: 3, name: 'Tomato', name_hi: 'टमाटर' },
  { id: 4, name: 'Cotton', name_hi: 'कपास' }
];

export default function App() {
  const [selectedCrop, setSelectedCrop] = useState(1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FasalVaidya</Text>
      <Text style={styles.subtitle}>Crop Health Advisor</Text>
      
      <Text style={styles.label}>Select Crop:</Text>
      <Picker
        selectedValue={selectedCrop}
        style={styles.picker}
        onValueChange={(itemValue) => setSelectedCrop(itemValue)}
      >
        {CROPS.map(crop => (
          <Picker.Item key={crop.id} label={crop.name} value={crop.id} />
        ))}
      </Picker>
      
      <Text style={styles.cropSelected}>
        Selected: {CROPS.find(c => c.id === selectedCrop)?.name}
      </Text>
      
      <Button title="📷 Scan Leaf" onPress={() => alert('Camera screen')} />
      <Button title="📜 History" onPress={() => alert('History screen')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#208F78',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  picker: {
    height: 50,
    width: 200,
    marginBottom: 16,
  },
  cropSelected: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 20,
  },
});
```

**Test:**
```bash
npx expo start
# Scan QR code with Expo Go app
# Should see title "FasalVaidya", crop dropdown, two buttons
# Should be able to select different crops
```

### TRACK 3: Database Schema with Multi-Crop Support (1 hour)

**Verify Database Created:**
```bash
sqlite3 app.db
> .tables
# Should show: crops diagnoses leaf_scans recommendations
> SELECT * FROM crops;
# Should show 4 rows: Wheat, Rice, Tomato, Cotton
> SELECT * FROM leaf_scans;
# Should be empty (or show test scans)
```

### INTEGRATION TEST (CRITICAL!)

**This is the most important test. If this passes, all three layers work together with multi-crop support.**

1. **Start backend:**
```bash
cd backend
python app.py
# Listens on http://localhost:5000
```

2. **Get supported crops:**
```bash
curl http://localhost:5000/api/crops
# Should return all 4 crops with Hindi names
```

3. **Create test images for each crop:**
```bash
python3 << 'EOF'
from PIL import Image
import os
os.makedirs('test_images', exist_ok=True)

# Create test images for each crop
crops = {
    'wheat': (100, 150, 100),    # greenish wheat
    'rice': (120, 160, 100),     # yellowish rice
    'tomato': (180, 80, 80),     # reddish tomato
    'cotton': (200, 200, 200)    # whitish cotton
}

for crop, color in crops.items():
    img = Image.new('RGB', (224, 224), color=color)
    img.save(f'test_images/{crop}.jpg')
    print(f'✓ Created {crop}.jpg')
EOF
```

4. **Upload photos for different crops:**
```bash
# Wheat
curl -X POST http://localhost:5000/api/scans \
  -F "image=@test_images/wheat.jpg" \
  -F "crop_id=1"
# Should return: {"scan_id":1,"crop_id":1,"crop_name":"Wheat",...}

# Rice
curl -X POST http://localhost:5000/api/scans \
  -F "image=@test_images/rice.jpg" \
  -F "crop_id=2"
# Should return: {"scan_id":2,"crop_id":2,"crop_name":"Rice",...}

# Tomato
curl -X POST http://localhost:5000/api/scans \
  -F "image=@test_images/tomato.jpg" \
  -F "crop_id=3"
# Should return: {"scan_id":3,"crop_id":3,"crop_name":"Tomato",...}
```

5. **Verify multi-crop database:**
```bash
sqlite3 app.db
> SELECT id, crop_id, (SELECT name FROM crops WHERE id=leaf_scans.crop_id) as crop_name FROM leaf_scans;
# Should show 3 rows: Wheat (crop_id=1), Rice (crop_id=2), Tomato (crop_id=3)
```

**✅ IF ALL TESTS PASS: Multi-crop architecture is sound. Celebrate!**

---

## DAY 2 (SATURDAY DEC 28): INTEGRATION

### GOAL: Real features + ML model integration (works for all crops)

### TRACK 1: ML Model Setup (2 hours)

**Download PlantVillage Expert Model:**

```bash
mkdir -p backend/ml/models

# Option A: Download from resource (if available)
# wget https://[resource]/plantvillage-expert-npk.h5 -O backend/ml/models/plantvillage-expert-npk.h5

# Option B: Create placeholder (replace with real model before demo)
# For MVP: use pre-trained model available online
```

**Note:** Single universal model works for all crops. Crop only affects recommendations!

### TRACK 2: Integrate Model + Multi-Crop Recommendations (2 hours)

**File: backend/services/ml_inference.py**

```python
import tensorflow as tf
import numpy as np
from PIL import Image
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), '../ml/models/plantvillage-expert-npk.h5')

# Crop-specific fertilizer recommendations
RECOMMENDATIONS = {
    1: {'n': 'Apply 50–70 kg Urea per acre', 'p': 'Apply 25–35 kg DAP per acre', 'k': 'Apply 20–30 kg MOP per acre'},
    2: {'n': 'Apply 60–80 kg Urea per acre', 'p': 'Apply 30–40 kg DAP per acre', 'k': 'Apply 25–35 kg MOP per acre'},
    3: {'n': 'Apply 15–20 kg Urea per 1000m²', 'p': 'Apply 10–15 kg DAP per 1000m²', 'k': 'Apply 12–18 kg MOP per 1000m²'},
    4: {'n': 'Apply 40–60 kg Urea per acre', 'p': 'Apply 20–30 kg DAP per acre', 'k': 'Apply 18–25 kg MOP per acre'}
}

try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print(f"✓ PlantVillage expert model loaded from {MODEL_PATH}")
except Exception as e:
    print(f"⚠️ Model not found: {e}. Using mock inference.")
    model = None

def run_model(image_path):
    """Infer N, P, K deficiency scores (crop-independent)"""
    try:
        # Load image
        img = Image.open(image_path).convert('RGB')
        img = img.resize((224, 224))
        
        # Normalize
        img_array = np.array(img, dtype=np.float32) / 255.0
        img_array = (img_array - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
        img_array = np.expand_dims(img_array, axis=0)
        
        if model is None:
            # Fallback: mock inference
            import random
            return random.random(), random.random(), random.random()
        
        # Predict (same for all crops)
        predictions = model.predict(img_array, verbose=0)
        
        n_score = float(predictions[0][0])
        p_score = float(predictions[0][1])
        k_score = float(predictions[0][2])
        
        return n_score, p_score, k_score
    
    except Exception as e:
        print(f"⚠️ Inference error: {e}")
        return 0.5, 0.5, 0.5

def get_recommendation(crop_id, nutrient, score):
    """Get crop-specific recommendation"""
    if score > 0.6:
        return RECOMMENDATIONS[crop_id].get(nutrient.lower()[0], "Check soil")
    return f"Monitor {nutrient} levels"
```

**Update backend/app.py to use real model + crop recommendations:**
```python
# At top of file, add:
from services.ml_inference import run_model, get_recommendation

# In create_scan(), replace mock inference with:
n_score, p_score, k_score = run_model(image_path)

# Get crop-specific recommendations
rec_n = get_recommendation(crop_id, 'N', n_score)
rec_p = get_recommendation(crop_id, 'P', p_score)
rec_k = get_recommendation(crop_id, 'K', k_score)
```

### TRACK 3: Frontend Real Screens (3 hours)

**File: frontend/app/screens/ResultsScreen.tsx** (multi-crop aware)

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CROPS = {
  1: 'Wheat',
  2: 'Rice',
  3: 'Tomato',
  4: 'Cotton'
};

export default function ResultsScreen({ route }: any) {
  const { crop_id, n_score, p_score, k_score } = route.params || {
    crop_id: 1,
    n_score: 0,
    p_score: 0,
    k_score: 0,
  };

  const getSeverity = (score: number) => {
    if (score > 0.6) return { label: 'Critical', color: '#D63D3D' };
    if (score > 0.3) return { label: 'Attention', color: '#F5A623' };
    return { label: 'Healthy', color: '#208F78' };
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{CROPS[crop_id]} Diagnosis</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Nitrogen (N)</Text>
        <Text style={[styles.score, { color: getSeverity(n_score).color }]}>
          {(n_score * 100).toFixed(0)}%
        </Text>
        <Text style={styles.severity}>{getSeverity(n_score).label}</Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.label}>Phosphorus (P)</Text>
        <Text style={[styles.score, { color: getSeverity(p_score).color }]}>
          {(p_score * 100).toFixed(0)}%
        </Text>
        <Text style={styles.severity}>{getSeverity(p_score).label}</Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.label}>Potassium (K)</Text>
        <Text style={[styles.score, { color: getSeverity(k_score).color }]}>
          {(k_score * 100).toFixed(0)}%
        </Text>
        <Text style={styles.severity}>{getSeverity(k_score).label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1F2937',
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  score: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  severity: {
    fontSize: 14,
    color: '#6B7280',
  },
});
```

### TRACK 4: Multi-Crop Testing (3 hours)

- Create 10 test leaf images (wheat, rice, tomato, cotton varieties)
- Test full flow: select crop → capture → upload → diagnose → results
- Verify each crop produces different recommendations
- Fix bugs that emerge
- Test on actual phone (not just simulator)

---

## DAY 3 (SUNDAY DEC 29): FINAL POLISH & DEMO

### GOAL: Everything works for all crops; demo ready for judges

### TRACK 1: Multi-Crop Feature Polish (4 hours)

- Add loading indicators during inference
- Display crop name in results + history
- Display crop-specific severity labels
- Show confidence percentages
- Add crop-specific fertilizer recommendations (per crop)
- Implement i18n (English ↔ Hindi, crop names translated)
- Test text-to-speech for each crop/language combo

### TRACK 2: Multi-Crop Testing & Debugging (3 hours)

- Full end-to-end flow 10 times across all 4 crops
- Test on actual phone (iOS + Android) with multiple crops
- Fix any remaining bugs
- Test offline caching (works with any crop)
- Verify database persistence across crops

### TRACK 3: Multi-Crop Demo Preparation (2 hours)

- Prepare 10 test leaf images (3 wheat, 2 rice, 2 tomato, 2 cotton, 1 mixed)
- Write 2-minute demo script (show at least 2 crops)
- Practice pitch with judges (emphasize multi-crop)
- Take screenshots for presentation (each crop screen)
- Verify everything works ONE FINAL TIME with all crops

---

## END-OF-DAY SUCCESS CRITERIA

### End of Day 1
- ✅ Backend responds to /api/crops (shows 4 crops)
- ✅ Backend saves scans with crop_id
- ✅ Frontend app boots (HomeScreen displays)
- ✅ Crop dropdown shows all 4 crops
- ✅ Database created with crops table (4 rows)
- ✅ **CRITICAL: Multi-crop integration test passes** (upload wheat → upload rice → verify both in history)

### End of Day 2
- ✅ Real backend features (image validation, multi-crop storage, history)
- ✅ Real frontend screens (Home with crop selector, Camera, Results with crop context, History with crops)
- ✅ ML model downloads + multi-crop recommendations loaded
- ✅ Full end-to-end integration (wheat photo → model → wheat recommendations)
- ✅ Each crop produces different recommendations (wheat 50kg vs rice 60kg Urea)

### End of Day 3
- ✅ ML integrated into backend (all crops)
- ✅ Full end-to-end flow works for all 4 crops
- ✅ Polished UI (loading states, severity labels, i18n, crop names)
- ✅ Tested on actual phone (iOS + Android)
- ✅ History shows mixed crops (wheat + rice + tomato + cotton)
- ✅ **Demo ready for judges (multi-crop walkthrough)**

---

## CRITICAL REMINDERS

### API Compatibility (Crop-Aware)

✅ **Input:** 224×224 RGB (crop-independent)  
✅ **Output:** 3 independent NPK scores (crop-independent)  
✅ **Preprocessing:** ImageNet normalization (same for all crops)  
✅ **Inference Time:** <3 seconds on CPU (same for all crops)  
✅ **Crop Differentiation:** Backend returns crop_id + crop-specific recommendations in response  
✅ **No Frontend Changes Needed:** Recommendations just change per crop, same NPK scores

### Multi-Crop Strategy

- **Single universal model:** PlantVillage expert trained model works for all crops
- **Crop-specific recommendations:** Different fertilizer quantities per crop
- **Database tracking:** crop_id links scans → diagnoses → recommendations
- **Frontend handling:** Crop selection → same inference → crop-specific advice

### Single-User, Multi-Crop

- MVP has no auth; supports all 4 crops
- Can switch crops freely
- History shows all crops
- Same model; different recommendations per crop

### No External Services

- No AWS/GCP
- No Auth0
- No Sentry
- Everything runs locally
- Works for all 4 crops on laptop

---

## GIT COMMIT DISCIPLINE (MULTI-CROP)

As you progress:

```bash
git add backend/app.py
git commit -m "MILESTONE: Backend health + crops endpoints working"

git add frontend/App.tsx
git commit -m "MILESTONE: Frontend HomeScreen with crop dropdown"

git add backend/
git commit -m "FEATURE: Multi-crop database schema (crops table, foreign keys)"

git add backend/services/ml_inference.py
git commit -m "FEATURE: PlantVillage expert model loading + crop-aware recommendations"

git add .
git commit -m "INTEGRATION: End-to-end flow working for all crops (wheat/rice/tomato/cotton)"

git add frontend/
git commit -m "POLISH: Multi-crop UI, crop context, language support"

git add .
git commit -m "MILESTONE: Demo-ready MVP complete (multi-crop)"
```

---

## ALWAYS REFER TO:

- **Tech Choices?** → FasalVaidya-MVP-Tech-Stack.md (updated for multi-crop)
- **Feature Specs?** → FasalVaidya-Dev-Guidelines.md (updated for multi-crop)
- **How It All Fits?** → Architecture-Overview.md (updated for multi-crop)
- **Hackathon PRD?** → FasalVaidya-Hackathon-PRD.md (4 crops, multi-crop demo)
- **Model Details?** → Dev Guidelines Section 5 + Tech Stack Section 4

---

**Version:** 2.1  
**Last Updated:** December 27, 2025  
**Status:** READY FOR 36-HOUR SPRINT (MULTI-CROP)

Good luck! 🚀 Remember: Same model, different crops = impressive demo!
