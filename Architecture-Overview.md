# FasalVaidya Architecture Overview

**Version:** 1.1  
**Last Updated:** December 27, 2025  
**Status:** APPROVED FOR IMPLEMENTATION

---

## USER JOURNEY: FARMER'S PERSPECTIVE

```
Farmer Opens App
    ↓
    Selects Crop Type (Home Screen - Guideline 2)
    ↓
    Captures Leaf Photo (Camera Capture - Guideline 2 UX)
    ↓
    Uploads Photo (Upload Flow - Guideline 3 Data Layer)
    ↓
    Backend Receives & Stores (S3 Storage - Guideline 4 Database)
    ↓
    Model Inference Async (ML Inference - Guideline 5 AI/ML)
    ↓
    Results Stored in Database (Diagnoses Table - Guideline 4)
    ↓
    Recommendations Generated (Guideline 4 Database)
    ↓
    Frontend Polls & Displays Results (Results Screen - Guideline 2)
    ↓
    Heatmaps & Fertilizer Advice Shown (Confidence Indicators)
    ↓
    Success! Farmer Takes Action
```

---

## SYSTEM ARCHITECTURE MAP

### FRONTEND LAYER
```
React Native Expo
├── HomeScreen
│   └── Guideline 2: Layout, Colors
├── CameraScreen
│   └── Guideline 2: Touch 48×48dp, Accessibility
├── DiagnosisDisplay
│   └── Guideline 2: Components, States
├── HistoryScreen
│   └── Guideline 3: Offline cache, Sync status
├── LocalStorage/SQLite
│   └── Guideline 3: Offline queue, sync metadata
└── State Management: Redux/Context
    └── Guideline 3: Frontend state rules
```

### BACKEND LAYER
```
Flask API
├── Auth: User Management
│   └── Guideline 4: Users table
├── Photo Upload Endpoint
│   └── Guideline 3: Validation (server-side)
├── Scan History Endpoint
│   └── Guideline 4: LeafScans query pattern
├── Diagnosis Lookup Endpoint
│   └── Guideline 4: JOIN LeafScans ← Diagnoses
└── Recommendation Engine
    └── Guideline 4: Crop-specific logic lookup
```

### CLOUD STORAGE
```
S3 / Local Storage
├── Original Leaf Photos (2MB max)
│   └── Guideline 6: Performance constraint
├── Compressed Thumbnails (50KB)
│   └── Guideline 6: Storage optimization
├── Grad-CAM Heatmaps (50KB each)
│   └── Guideline 5: Explainability
└── Versioned Model Weights
    └── Guideline 5: Model versioning
```

### DATABASE LAYER
```
PostgreSQL / SQLite
├── Users: Farmer profiles
│   └── Guideline 4: Schema
├── Crops: Reference data
│   └── Guideline 4: Schema
├── LeafScans: Photos metadata
│   └── Guideline 4: Schema & Indexing
├── Diagnoses: AI predictions
│   └── Guideline 4: Schema & Query patterns
├── Recommendations: Crop-aware advice
│   └── Guideline 4: Localization
└── SyncMetadata: Offline tracking
    └── Guideline 3: Offline-first logic
```

### ML/AI SYSTEM
```
TensorFlow + PlantVillage Expert Model
├── Input: Leaf image 800×800px
│   └── Guideline 5: Input spec
├── Preprocessing: Resize, Normalize
│   └── Guideline 5: Data pipeline
├── Model: PlantVillage Expert Trained (54K+ labeled plant images)
│   └── Specialized for nutrient deficiency detection
├── Output: NPK scores 0–100%
│   └── Guideline 5: Output format
├── Grad-CAM: Visual explanations
│   └── Guideline 5: Interpretability
├── Confidence: Per-nutrient uncertainty
│   └── Guideline 5: Calibration
└── Error Handling: 6 fallback scenarios
    └── Guideline 5: Guardrails
```

### CACHE LAYER
```
Redis / In-Memory
├── Model Predictions (1hr TTL)
│   └── Guideline 3: Caching strategy
├── Crop-Specific Rules
│   └── Guideline 3: Backend caching
└── User Settings (30min TTL)
    └── Guideline 3: Sync strategy
```

---

## DATA FLOW: PHOTO TO RECOMMENDATION

### STEP 1: PHOTO CAPTURED (Frontend)

```
FRONTEND VALIDATION (Guideline 3)
├── File size: ≤2MB
├── Format: JPG/PNG
├── Dimensions: ≥400×400px
└── Show error if invalid → Continue
```

### STEP 2: FRONTEND PREPROCESSING (Guideline 5)

```
├── Compress to 500KB
├── Resize to 800×800px
├── Generate thumbnail (50KB)
├── Compute file hash (dedup)
└── Store locally (offline queue)

IF ONLINE
└── Upload immediately

IF OFFLINE
└── Queue for sync
```

### STEP 3: BACKEND RECEIVES (Guideline 3)

```
├── Re-validate file (security)
├── Store in S3 / local filesystem
├── Save metadata to LeafScans table
├── Create processing job
└── Return scan_id to frontend
```

### STEP 4: ASYNC MODEL INFERENCE (Guideline 5)

```
├── Load image from S3 / local
├── Preprocess: resize → 224×224, normalize
├── Model forward pass: PlantVillage expert model
├── Output: [N_score, P_score, K_score] (0–1 range)
├── Per-nutrient confidence (0–1)
├── Generate Grad-CAM heatmaps (3 images for N, P, K)
├── Store predictions → Diagnoses table
├── Store heatmaps → S3 / local storage
└── Update LeafScans.is_processed = true
```

### STEP 5: RECOMMENDATION ENGINE (Guideline 4 & 5)

```
├── Load crop_id from scan
├── Load crop-specific thresholds
├── Apply business logic:
│   IF N_score > 0.7 AND crop = wheat
│   THEN "High N deficiency"
│   THEN "Apply 50kg Urea per acre"
├── Translate to user's language
├── Generate confidence score
└── Store → Recommendations table
```

### STEP 6: FRONTEND POLL/PUSH (Guideline 2)

```
├── Poll for diagnosis_id OR WebSocket push
├── Fetch Diagnosis + Recommendation + Heatmaps
├── Display results:
│   ├── Scores (0–100%)
│   ├── Heatmaps (visual explanation)
│   ├── Advice (actionable text)
│   └── Confidence indicators
├── Cache locally (offline)
└── Show fertilizer recommendation
```

### STEP 7: FARMER SEES RESULTS & TAKES ACTION

```
FARMER VIEWS RESULTS
├── Severity: Healthy (green) / Attention (yellow) / Critical (red)
├── Heatmaps: Which leaf regions affected
├── Recommendation: "Apply 50kg Urea per acre"
├── Confidence: "92% confident"
└── Language: Hindi / English / Gujarati / Marathi

FARMER TAKES ACTION
└── Applies fertilizer per recommendation
```

---

## STAKEHOLDER ROLE MAPPING

| Role | Primary Guideline Sections | Responsibilities |
|------|---------------------------|-----------------|
| **Product Manager** | Guideline 1 (Product Understanding), Guideline 6 (Rules & Constraints), Guideline 7 (Open Questions/Clarifications) | Define product scope, user needs, success metrics |
| **Design Lead** | Guideline 2 (Frontend UX: Layout, Colors, Typography, Components, Accessibility, Responsive Design) | Create design system, wireframes, accessibility audit |
| **Frontend Engineer** | Guideline 2 (UX Guidelines implementation), Guideline 3 (Data Layer Logic, State ownership, Offline-first patterns), API integration | Build React Native app, implement components, state management |
| **Backend Engineer** | Guideline 3 (Data Layer Logic), Guideline 4 (Database Architecture, 7 core entities, Indexing, Query patterns) | Build Flask API, database schema, authentication, endpoints |
| **ML Engineer** | Guideline 5 (AI/ML System Design: Model scope, Training strategy, Inference flow, Error handling) | Train/fine-tune model, inference optimization, Grad-CAM, confidence calibration |
| **QA Test Engineer** | Guideline 6 (Rules & Constraints: test coverage targets), Guideline 5 (Error scenarios), Guideline 3 (Edge cases: offline sync conflicts) | Write tests, identify bugs, verify requirements |
| **DevOps / SRE** | Guideline 6 (Performance Constraints, Privacy & Security), Guideline 4 (Database partitioning, archival) | Deploy infrastructure, monitoring, security, backups |

---

## IMPLEMENTATION TIMELINE & PHASES

### PHASE 1: CLARIFICATION & APPROVAL (Week 1)

```
Day 1: Stakeholder Review
├── Product Lead: Review Guideline 1 (Product Understanding)
├── Design Lead: Review Guideline 2 (UX Guidelines)
├── Engineering Lead: Review Guideline 3–4 (Data & Database)
└── ML Lead: Review Guideline 5 (AI/ML System)

Day 2–3: Answer Open Questions
├── Stakeholder meeting to finalize 10 open questions (Guideline 7)
├── Document decisions
└── Approve final guideline document

Day 4–5: Environment Setup
├── Setup PostgreSQL with 7 tables (Guideline 4 schema)
├── Setup S3 bucket for photos & heatmaps
├── Setup Redis cache layer
├── Setup React Native Expo project
├── Setup Flask/FastAPI backend
├── Setup CI/CD pipeline (GitHub Actions)
└── Setup monitoring & logging infrastructure
```

### PHASE 2: COMPONENT LIBRARY & SCHEMAS (Week 2)

```
Design Lead
└── Create Figma design system matching Guideline 2 colors, typography, components

Backend Lead
└── Create database migration scripts using Guideline 4 entity definitions

Frontend Lead
└── Create React component stubs (Button, Card, Modal, Form per Guideline 2 specs)

ML Lead
└── Setup model training pipeline
└── Download PlantVillage expert trained model
```

### PHASE 3: FEATURE DEVELOPMENT (Week 3–4)

```
Frontend
└── HomeScreen, CameraScreen, ResultsScreen, HistoryScreen (Guideline 2 & 3)

Backend
├── User auth, photo upload endpoint (Guideline 3 & 4)
└── Scan history endpoint, diagnosis lookup (Guideline 4)

ML
├── Train model on PlantVillage dataset (Guideline 5)
└── Setup inference server

Integration
├── Connect frontend ↔ backend ↔ ML
└── Offline-first logic (Guideline 3)
```

### PHASE 4: TESTING & POLISH (Week 4–5)

```
Unit Tests
├── 70% frontend coverage (Guideline 5)
└── 80% backend coverage

Integration Tests
└── Guideline 3 edge cases (offline sync conflicts, etc.)

E2E Tests
└── Guideline 1 use cases

Accessibility Audit
└── Guideline 2 guarantees (WCAG AA compliance)

Performance Profiling
└── Guideline 6 targets met

Security Review
└── Guideline 6 privacy rules enforced
```

### PHASE 5: DEPLOYMENT & LAUNCH (Week 5)

```
├── Model versioning setup (Guideline 5)
├── Database backup strategy
├── Monitoring alerts (latency, errors, model performance)
├── Farmer user testing (5–10 users)
└── Go/No-go decision
```

---

## KEY DECISION POINTS REQUIRING STAKEHOLDER INPUT

1. **Single vs Multi-Nutrient:** Focus on N only, or all three (N, P, K)?  
   *Reference:* Guideline 7, Open Question 1

2. **Crop-Specific Models:** One universal model or separate models per crop?  
   *Reference:* Guideline 7, Open Question 2

3. **Monetization:** Free app or freemium (features behind paywall)?  
   *Reference:* Guideline 7, Open Question 7

4. **Data Sharing:** Can we share anonymized scan data with government for policy research?  
   *Reference:* Guideline 7, Open Question 5

5. **Offline Deployment:** Phase 1 cloud-only or Phase 2 on-device model (TensorFlow.js)?  
   *Reference:* Guideline 7, Assumption 6

---

## SUCCESS METRICS AFTER LAUNCH

### FRONTEND
- App launch time: <2s (Guideline 6)
- Image upload: <5s on WiFi (Guideline 6)
- Diagnosis display: <3s (Guideline 6)
- Accessibility audit: 100% WCAG AA compliance (Guideline 2)

### DATABASE
- Query latency: <500ms for history lookup (Guideline 4)
- Uptime: 99.5% SLA
- Data consistency: Zero sync conflicts in first 100 users (Guideline 3)

### ML SYSTEM
- Model accuracy: ≥85% per nutrient (Guideline 5)
- Confidence calibration: ECE < 0.1 (Guideline 5)
- Inference latency: <15s on backend (Guideline 5)
- Model drift: Retraining triggered if accuracy drops >5%

### PRODUCT
- User retention: >40% after 1 week
- Average session time: 5 minutes
- NPS score: ≥40 (net promoter score)
- Farmer satisfaction: >80% fertilizer recommendation accuracy

---

## ANTI-PATTERNS TO ACTIVELY PREVENT

✅ **DO:**
- Follow Guideline 2 UX specs exactly (spacing, colors, components)
- Validate all inputs server-side (Guideline 3)
- Test offline sync thoroughly (Guideline 3 edge cases)
- Monitor model accuracy continuously (Guideline 5)
- Document all decisions in version history (this document)

❌ **DO NOT:**
- Build disease detection (Guideline 6, anti-feature 1)
- Make brand-specific fertilizer recommendations (Guideline 6, anti-feature 3)
- Exceed 48MB model size (Guideline 6, performance constraint)
- Log user data to cleartext files (Guideline 6, security rule)
- Create duplicate UI components (Guideline 6, rule 1)
- Store auth tokens in frontend Redux (Guideline 6, security)
- Skip server-side validation (Guideline 3, rule)
- Retry failed uploads silently 3x (Guideline 3, edge case)

---

## DOCUMENT EVOLUTION & MAINTENANCE

### Version Control Process

**Minor Updates:** Engineering Lead approval (e.g., clarify a field definition)  
**Major Changes:** Product Lead + All Leads approval (e.g., add new nutrient, change architecture)  
**New Features:** Reference Guideline 6 (How future features integrate) + Guideline 7 (Lessons learned for next version)

### Change Log Example

```
Version 1.0 → 1.1
- Updated AI/ML model from MobileNet V2 → PlantVillage expert trained
- Refined model output expectations (accuracy 85–92%)
- Kept all API contracts identical (224×224 input, 3 NPK outputs)
- Added domain-specific training references
```

### Sunset Policy for Old UI

When replacing old UI with new:
1. Set end-of-life date (e.g., 3 months)
2. Remove old code; don't let deprecated UI coexist
3. Document migration path for users
4. Update this document with retirement notes

---

## REFERENCES & RESOURCES

**PlantVillage Model & Dataset:**
- PlantVillage: https://plantvillage.psu.edu/
- PlantVillage AI: https://plantvillage.org/

**Computer Vision & Model Interpretability:**
- Grad-CAM: https://arxiv.org/abs/1610.02055
- Transfer Learning: https://arxiv.org/abs/1611.05431

**Web & Mobile Standards:**
- WCAG Accessibility: https://www.w3.org/WAI/WCAG21-quickref/
- React Native Best Practices: https://reactnative.dev/docs/getting-started
- Material Design: https://material.io/

**Backend Frameworks:**
- Flask: https://flask.palletsprojects.com/
- FastAPI: https://fastapi.tiangolo.com/

**Database & Scalability:**
- PostgreSQL: https://www.postgresql.org/docs/
- Database Indexing: https://use-the-index-luke.com/

---

## DOCUMENT SIGN-OFF

**Approved By:**
- ☐ Product Lead: _________________ Date: _______
- ☐ Engineering Lead: ______________ Date: _______
- ☐ ML Lead: ___________________ Date: _______
- ☐ Design Lead: _________________ Date: _______

**Next Review Date:** January 2026 (Post-MVP Phase 2 planning)

---

## VERSION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 27, 2025 | Architecture Lead | Initial architecture overview |
| 1.1 | Dec 27, 2025 | Updated | Updated ML model: MobileNet V2 → PlantVillage expert trained model; maintained all API contracts |

---

**END OF ARCHITECTURE OVERVIEW**

This document shows how every section of the development guidelines ties together. Use this to onboard new team members and maintain alignment across all teams.

**Version:** 1.1  
**Last Updated:** December 27, 2025  
**Status:** APPROVED FOR IMPLEMENTATION
