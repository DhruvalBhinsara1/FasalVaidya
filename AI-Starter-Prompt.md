# FasalVaidya Development AI Starter Prompt

**Status:** Ready for 36-hour sprint  
**Timeline:** December 27–29, 2025  
**Version:** 2.0  
**Last Updated:** December 27, 2025

---

## PROJECT OVERVIEW

**What is FasalVaidya?**

FasalVaidya is an AI-powered crop health diagnosis app that:
- Allows farmers to photograph plant leaves
- Uses **PlantVillage expert trained model** to detect NPK (Nitrogen/Phosphorus/Potassium) deficiencies
- Provides actionable fertilizer recommendations in multiple languages (English, Hindi)
- Includes text-to-speech accessibility feature
- Shows confidence scores and severity levels (Healthy/Attention/Critical)

**MVP Scope:** Single-user demo, locally hosted, all features functional by Sunday evening.

---

## YOUR DOCUMENTATION (SOURCE OF TRUTH)

Three files are your **source of truth**. Refer to them constantly:

### 1. FasalVaidya-MVP-Tech-Stack.md

**What:** ~4,000 lines of technology decisions with complete rationale

**Key Sections:**
- Section 1: Frontend stack (React Native Expo)
- Section 2: Backend stack (Flask)
- Section 3: Database (SQLite)
- **Section 4: AI/ML stack (TensorFlow + PlantVillage Expert Trained Model)** ⭐
- Section 5: Development tooling (Node 18, Python 3.10)
- Section 6: Deployment setup (local laptop for MVP)
- Section 7: Dependencies (npm, pip)
- Section 8: Intentional exclusions
- Section 9: Tech stack summary table
- Section 10: Critical dependencies (installation order)
- Section 11: Performance targets
- Appendix: Quick reference (start backend, start frontend, load model)

**When You Have Questions About:**
- "Should I use Django or Flask?" → Read Section 2 "Why Flask"
- "What's the model size?" → Read Section 4 (~40MB)
- "How do I load the PlantVillage model?" → Read Appendix code sample

### 2. FasalVaidya-Dev-Guidelines.md

**What:** ~5,000 lines of product requirements, UX specs, database schema

**Key Sections:**
- Section 1: Product understanding (user personas, use cases, value proposition)
- Section 2: Frontend UX guidelines (layout, colors, typography, components)
- **Section 4: Database architecture (7 core entities, relationships, query patterns)** ⭐
- **Section 5: AI/ML system design (PlantVillage model spec, input/output, error handling)** ⭐
- Section 6: Rules, constraints, guardrails (performance, security)
- Section 7: Assumptions and open questions

**When You Have Questions About:**
- "What's the database schema?" → Read Section 4 (Users, LeafScans, Diagnoses, Recommendations)
- "How does the model work?" → Read Section 5 (input 224×224, output NPK scores, Grad-CAM heatmaps)
- "What colors should I use?" → Read Section 2 (Teal #208F78 primary)
- "What's acceptable model accuracy?" → Read Section 5 (≥85% per nutrient)

### 3. Architecture-Overview.md

**What:** ~2,000 lines connecting all documentation together

**Key Sections:**
- User journey (photo → diagnosis → action)
- System architecture map (frontend/backend/database/ML)
- Data flow (7 steps from photo capture to farmer result)
- Stakeholder role mapping (who owns what)
- Implementation timeline (5 phases)
- Success metrics (latency, accuracy, retention)

**When You Have Questions About:**
- "How does data flow through the system?" → Read "Data Flow: Photo to Recommendation" (7 steps)
- "Who builds what?" → Read "Stakeholder Role Mapping"
- "What are success criteria?" → Read "Success Metrics After Launch"

---

## DAY 1 (FRIDAY DEC 27): PARALLEL BUILD SETUP

### GOAL: 3 working API endpoints so frontend & ML teams have a contract

### TRACK 1: Backend Foundation (3 hours)

**File: backend/app.py** (with mock inference for now)

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

# Initialize SQLite
def init_db():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leaf_scans (
            id INTEGER PRIMARY KEY,
            image_path TEXT,
            crop_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS diagnoses (
            id INTEGER PRIMARY KEY,
            scan_id INTEGER,
            n_score REAL,
            p_score REAL,
            k_score REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/api/health', methods=['GET'])
def health():
    return {'status': 'ok', 'message': 'FasalVaidya backend running'}, 200

@app.route('/api/scans', methods=['POST'])
def create_scan():
    """Upload leaf photo, return diagnosis (mock for now)."""
    try:
        image = request.files['image']
        crop_id = request.form.get('crop_id', 1)
        
        # Save image
        filename = f"{os.urandom(8).hex()}.jpg"
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image.save(image_path)
        
        # Insert into DB
        conn = sqlite3.connect('app.db')
        cursor = conn.cursor()
        cursor.execute('INSERT INTO leaf_scans (image_path, crop_type) VALUES (?, ?)',
                      (image_path, 'wheat'))
        scan_id = cursor.lastrowid
        
        # Mock inference (REPLACE with real model on Day 2)
        n_score, p_score, k_score = 0.75, 0.45, 0.30
        
        cursor.execute('''INSERT INTO diagnoses (scan_id, n_score, p_score, k_score)
                         VALUES (?, ?, ?, ?)''',
                      (scan_id, n_score, p_score, k_score))
        conn.commit()
        conn.close()
        
        return {
            'scan_id': scan_id,
            'n_score': n_score,
            'p_score': p_score,
            'k_score': k_score,
            'status': 'Complete'
        }, 201
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/api/scans', methods=['GET'])
def get_scans():
    """Fetch scan history."""
    try:
        conn = sqlite3.connect('app.db')
        cursor = conn.cursor()
        cursor.execute('''
            SELECT s.id, s.image_path, d.n_score, d.p_score, d.k_score
            FROM leaf_scans s
            LEFT JOIN diagnoses d ON s.id = d.scan_id
        ''')
        scans = [
            {
                'id': row[0],
                'image_path': row[1],
                'n_score': row[2],
                'p_score': row[3],
                'k_score': row[4]
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
# Should return: {"status":"ok","message":"FasalVaidya backend running"}
```

### TRACK 2: Frontend Skeleton (2 hours)

**File: frontend/App.tsx**

```typescript
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FasalVaidya</Text>
      <Button title="Scan Leaf" onPress={() => alert('Camera screen')} />
      <Button title="History" onPress={() => alert('History screen')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
```

**Test:**
```bash
npx expo start
# Scan QR code with Expo Go app
# Should see title "FasalVaidya" and two buttons
```

### TRACK 3: Database Schema (1 hour)

**Verify Database Created:**
```bash
sqlite3 app.db
> .tables
# Should show: diagnoses leaf_scans
> SELECT * FROM leaf_scans;
# Should be empty (or show test scans)
```

### INTEGRATION TEST (CRITICAL!)

**This is the most important test. If this passes, all three layers work together.**

1. **Start backend:**
```bash
cd backend
python app.py
# Listens on http://localhost:5000
```

2. **Create test image:**
```bash
python3 << 'EOF'
from PIL import Image
import os
os.makedirs('test_images', exist_ok=True)
img = Image.new('RGB', (224, 224), color='green')
img.save('test_images/test_leaf.jpg')
EOF
```

3. **Upload via curl:**
```bash
curl -X POST http://localhost:5000/api/scans \
  -F "image=@test_images/test_leaf.jpg" \
  -F "crop_id=1"
# Should return: {"scan_id":1,"n_score":0.75,"p_score":0.45,"k_score":0.30,"status":"Complete"}
```

4. **Verify database:**
```bash
sqlite3 app.db
> SELECT * FROM leaf_scans;
# Should show 1 row with image path
> SELECT * FROM diagnoses;
# Should show 1 row with scores
```

**✅ IF ALL TESTS PASS: Architecture is sound. Celebrate!**

---

## DAY 2 (SATURDAY DEC 28): INTEGRATION

### GOAL: Real features + ML model integration

### TRACK 1: ML Model Setup (2 hours)

**Download PlantVillage Expert Model:**

```bash
mkdir -p backend/ml/models

# Option A: Download from resource (if available)
# wget https://[resource]/plantvillage-expert-npk.h5 -O backend/ml/models/plantvillage-expert-npk.h5

# Option B: Create placeholder (replace with real model before demo)
# For MVP: use pre-trained model available online
```

### TRACK 2: Integrate Model into Backend (1 hour)

**File: backend/services/ml_inference.py**

```python
import tensorflow as tf
import numpy as np
from PIL import Image
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), '../ml/models/plantvillage-expert-npk.h5')

try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print(f"✓ PlantVillage expert model loaded from {MODEL_PATH}")
except Exception as e:
    print(f"⚠️ Model not found: {e}. Using mock inference.")
    model = None

def run_model(image_path):
    """Infer N, P, K deficiency scores."""
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
        
        # Predict
        predictions = model.predict(img_array, verbose=0)
        
        n_score = float(predictions[0][0])
        p_score = float(predictions[0][1])
        k_score = float(predictions[0][2])
        
        return n_score, p_score, k_score
    
    except Exception as e:
        print(f"⚠️ Inference error: {e}")
        return 0.5, 0.5, 0.5
```

**Update backend/app.py:**
```python
# At top of file, add:
from services.ml_inference import run_model

# In create_scan(), replace mock inference with:
n_score, p_score, k_score = run_model(image_path)
```

### TRACK 3: Frontend Real Screens (3 hours)

**File: frontend/app/screens/ResultsScreen.tsx**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ResultsScreen({ route }: any) {
  const { n_score, p_score, k_score } = route.params || {
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
      <Text style={styles.title}>Diagnosis Results</Text>
      
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

### TRACK 4: Polish & Polish Testing (4 hours)

- Create 5 test leaf images
- Test full flow: photo → backend → model → results
- Fix bugs that emerge
- Test on actual phone (not just simulator)

---

## DAY 3 (SUNDAY DEC 29): FINAL POLISH & DEMO

### GOAL: Everything works; demo ready for judges

### TRACK 1: Feature Polish (4 hours)

- Add loading indicators during inference
- Display severity labels (Healthy/Attention/Critical)
- Show confidence percentages
- Add fertilizer recommendations (hardcoded, translated)
- Implement i18n (English ↔ Hindi)
- Test text-to-speech

### TRACK 2: Testing & Debugging (3 hours)

- Full end-to-end flow 10 times
- Test on actual phone, not simulator
- Fix any remaining bugs
- Test offline caching
- Verify database persistence

### TRACK 3: Demo Preparation (2 hours)

- Prepare 5–10 test leaf images
- Write 2-minute demo script
- Practice pitch with judges
- Take screenshots for presentation
- Verify everything works ONE FINAL TIME

---

## END-OF-DAY SUCCESS CRITERIA

### End of Day 1
- ✅ Backend responds to API calls (/api/health works)
- ✅ Frontend app boots (HomeScreen displays)
- ✅ Database created (SQLite file exists)
- ✅ **CRITICAL: Integration test passes** (upload image → backend saves → returns results)

### End of Day 2
- ✅ Real backend features (image validation, storage, history)
- ✅ Real frontend screens (Home, Camera, Results, History)
- ✅ ML model downloads (local inference works)
- ✅ Full end-to-end integration (photo → model → results)

### End of Day 3
- ✅ ML integrated into backend
- ✅ Full end-to-end flow works (photo → model → results)
- ✅ Polished UI (loading states, severity labels, i18n)
- ✅ Tested on actual phone
- ✅ **Demo ready for judges**

---

## CRITICAL REMINDERS

### API Compatibility

✅ **Input:** 224×224 RGB (same as all docs)  
✅ **Output:** 3 independent NPK scores (same as all docs)  
✅ **Preprocessing:** ImageNet normalization (same as all docs)  
✅ **Inference Time:** <3 seconds on CPU (same target)  
✅ **No Frontend Changes Needed:** Backend returns same {n_score, p_score, k_score}

### Offline-First Strategy

- Model runs synchronously in Flask request
- Phase 2 deployment to device (TensorFlow.js) not needed for MVP
- Offline caching handled in frontend (AsyncStorage)

### Single-User, Hardcoded Crop

- MVP has no auth; only supports wheat
- Don't add multi-user features yet
- No crop selection needed

### No External Services

- No AWS/GCP
- No Auth0
- No Sentry
- Everything runs locally

---

## GIT COMMIT DISCIPLINE

As you progress:

```bash
git add backend/app.py
git commit -m "MILESTONE: Backend health endpoint working"

git add frontend/App.tsx
git commit -m "MILESTONE: Frontend HomeScreen layout complete"

git add backend/services/ml_inference.py
git commit -m "FEATURE: PlantVillage expert model loading + inference"

git add .
git commit -m "INTEGRATION: End-to-end flow working (photo → model → results)"

git add frontend/
git commit -m "POLISH: UI polish, loading states, severity labels"

git add .
git commit -m "MILESTONE: Demo-ready MVP complete"
```

---

## ALWAYS REFER TO:

- **Tech Choices?** → FasalVaidya-MVP-Tech-Stack.md
- **Feature Specs?** → FasalVaidya-Dev-Guidelines.md
- **How It All Fits?** → Architecture-Overview.md
- **Model Details?** → Dev Guidelines Section 5 + Tech Stack Section 4

---

**Version:** 2.0  
**Last Updated:** December 27, 2025  
**Status:** READY FOR 36-HOUR SPRINT

Good luck! 🚀
