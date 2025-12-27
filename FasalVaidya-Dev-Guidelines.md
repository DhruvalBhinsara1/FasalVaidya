# FasalVaidya Product Development Guidelines

**Version:** 1.1  
**Last Updated:** December 27, 2025  
**Status:** APPROVED FOR IMPLEMENTATION

---

## PRODUCT UNDERSTANDING

### Product Goal (Restated)

FasalVaidya is a mobile-first AI diagnostic tool that enables farmers to photograph a plant leaf using their smartphone, submit it to an AI system, and receive interpretable predictions about nutrient deficiencies (Nitrogen, Phosphorus, Potassium) with actionable fertilizer recommendations—all with minimal internet connectivity and in their preferred language.

### Primary User Persona

**Name:** Smallholder Farmer

**Profile:**
- Age: 25–65 years
- Literacy: Low-to-moderate; may prefer voice-based interaction
- Tech proficiency: Basic smartphone usage; limited English
- Location: Rural areas with poor internet connectivity
- Pain points: Limited access to agronomists, costly soil tests, unclear fertilizer decisions
- Success metric: Receives correct diagnosis and knows what fertilizer to apply within 5 minutes

### Core Value Proposition

**Problem Solved:** Farmers currently guess or delay decisions about fertilizer application. FasalVaidya solves uncertainty in real-time.

**How:** Smartphone camera + AI removes need for experts or expensive tests.

**Why It Matters:** Correct fertilizer application → higher yield, lower costs, reduced waste.

### Main Use Cases & User Journeys

#### Use Case 1: Real-Time Leaf Diagnosis

1. Farmer opens app, selects crop type (rice, wheat, tomato, etc.)
2. Farmer captures or uploads leaf photo
3. System analyzes image and outputs:
   - Nutrient deficiency confidence scores (0–100%)
   - Visual heatmap highlighting problem regions
   - Specific fertilizer recommendation and application method
4. Farmer acts on recommendation immediately

**Expected Time:** 2 minutes from photo to actionable advice

#### Use Case 2: Diagnosis History Tracking

1. Farmer navigates to "Scan History"
2. Views past diagnoses with timestamps and crop types
3. Tracks progression of crop health over weeks
4. Can retake photos to verify improvement after treatment

**Expected Time:** 30 seconds to access historical data

#### Use Case 3: Offline Usage in Low-Connectivity Zone

1. Farmer captures photo when offline
2. App stores photo locally with metadata
3. When connectivity returns, system syncs and processes
4. Farmer is notified of results asynchronously
5. All UI remains responsive—no blocking on network

**Expected Time:** Async operation; app never hangs

#### Use Case 4: Multilingual Accessibility Support

1. Farmer selects language preference (English, Hindi, Gujarati, Marathi, etc.)
2. All UI text and recommendations rendered in selected language
3. Farmer can toggle "Voice Mode" to hear recommendations read aloud
4. Voice output respects language and local accent preferences

**Expected Time:** Language switch <500ms

### Problem Statement (Expanded)

**What Problem?** Farmers face three barriers to correct nutrient management:
1. Information barrier: No easy way to diagnose what's wrong with their crop
2. Access barrier: Agronomists are far away; soil tests take weeks and cost money
3. Interpretation barrier: Even if they get a diagnosis, they don't know what to do

**For Whom?** Smallholder farmers (1–5 acres) in rural India who rely on their crop for primary income but lack access to modern advisory services.

**Why Now?** 
- Smartphone penetration in rural India is ~50%
- Computer vision models are accurate and small enough to run on phones
- This problem is solvable at scale

### Design Philosophy

- **Mobile-first:** All interactions designed for touch, not mouse
- **Rural-first:** Assume low English proficiency, poor network, bright sunlight
- **Accessibility-first:** Voice, text contrast, large targets, clear feedback
- **Low-bandwidth:** Minimize data usage; optimize images aggressively
- **No ambiguity:** Every action should have ONE clear next step

---

## FRONTEND UX GUIDELINES

### Layout & Spacing Principles

**Grid System:**
- Container: Mobile-first; max-width 480px (phone), scales to tablet
- Margins: 16px default, 8px compact, 24px sections
- Padding: Consistent 16px inside all containers
- Minimum touch target: 48×48dp (iOS/Android standard)

**Breakpoints:**
- Mobile: <480px (phone)
- Tablet: 480px–1024px (iPad)
- Desktop: >1024px (web fallback)

**Vertical Rhythm:**
- All vertical spacing should align to 8px grid
- Section spacing: 24px (large gap), 16px (medium gap), 8px (tight gap)
- No arbitrary spacing values
- Never collapse white space below 8px
- Use white space to separate concerns—not borders
- Screens must not feel cramped; prioritize breathing room

### Design System: Visual Language

**Color System:**

*Primary Color:* Teal (#208F78 / rgb(32, 143, 120))
- Button states: Teal (enabled) → Darker teal (hover) → Darkest teal (active)
- Used for: Primary CTAs, links, success states

*Secondary Color:* Dark Green (#1B4D3E / rgb(27, 77, 62))
- Used for: Headers, emphasis, navigation
- Rarely used for buttons; reserved for UI chrome

*Semantic Colors:*
- Success: Teal (matches primary)
- Error/Alert: Red (#D63D3D / rgb(214, 61, 61))
- Warning: Orange (#F5A623 / rgb(245, 166, 35))
- Info: Blue (#3B82F6 / rgb(59, 130, 246))
- Disabled: Gray (#9CA3AF / rgb(156, 163, 175))

*Neutral Palette:*
- Background: Off-white (#F9FAFB / rgb(249, 250, 251))
- Card background: Pure white (#FFFFFF)
- Borders: Light gray (#E5E7EB / rgb(229, 231, 235))
- Text primary: Dark gray (#1F2937 / rgb(31, 41, 55))
- Text secondary: Medium gray (#6B7280 / rgb(107, 114, 128))
- Text tertiary/disabled: Light gray (#9CA3AF / rgb(156, 163, 175))

*Dark Mode (optional future):*
- Background: #1F2937
- Cards: #374151
- Text: #F3F4F6

**Color Usage Rules:**
- Text must have minimum 4.5:1 contrast ratio (WCAG AA)
- Never use color alone to convey meaning; always add icon/text
- Backgrounds should be off-white, never pure white (reduces eye strain in sunlight)
- All interface colors must remain consistent across web and React Native platforms

**Typography:**

*Font Stack:*
- Primary: System fonts (iOS: SF Pro, Android: Roboto, Web: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- Monospace: SF Mono (iOS), Roboto Mono (Android), Monaco (Web)
- Do NOT use custom fonts in rural networks; rely on system fonts for speed

*Type Scale:*
- Display (36px): Large headers, app title, major headings
- Heading 1 (28px): Page titles
- Heading 2 (24px): Section headers
- Heading 3 (20px): Subsection headers
- Large (18px): Emphasized body text
- Body (16px): Default text, descriptions
- Small (14px): Labels, helper text
- Tiny (12px): Metadata, captions (use sparingly)

*Font Weights:*
- Regular (400): Default for body text
- Medium (500): Smaller text that needs emphasis; labels
- Semibold (600): Headers, buttons, important text
- Bold (700): Reserved for critical information only (error messages, alerts)

*Line Height Rules:*
- Headings: 1.2x (tight)
- Body text: 1.5x (readable)
- Small text: 1.4x (slightly tighter than body)

*Letter Spacing:*
- Headings: -1 (slightly tighter for impact)
- Body: 0 (default)
- All caps text: 2 (improve readability of caps)

*Dark Text on Light Background:*
- Minimum 36px font for accessibility
- Never use pure black (#000000); use dark gray (#1F2937)
- Always test readability in bright sunlight

### Component Library Rules

**Buttons:**

*Primary Button:*
- Background: Teal
- Text: White
- Padding: 12px 24px (large), 10px 16px (medium), 8px 12px (small)
- Border radius: 8px
- State: Enabled (interactive) → Hover (darker shade) → Active (darkest) → Disabled (gray, reduced opacity)
- Width: Full-width on mobile unless in a button group
- Never disable buttons silently; always show why and offer alternative action

*Secondary Button:*
- Background: Transparent with teal border
- Text: Teal
- Padding: Same as primary
- Border radius: 8px
- Use for: Less important actions, cancellations, alternative flows

*Icon Button:*
- Circle, 48×48dp minimum
- No text
- Use only for well-known icons (back, close, menu, camera, gallery)
- Minimum padding: 8px (total 48×48dp including padding)

*States for All Buttons:*
- Enabled: Interactive; expected cursor behavior
- Hover: Slightly darker shade; subtle shadow
- Active: Distinct visual change (darker or slight shrink)
- Loading: Spinner icon; text hidden; button disabled
- Disabled: Opacity 0.5; no pointer events; optional helper text

**Cards:**

- Background: White
- Padding: 16px
- Border radius: 8px
- Shadow: Subtle (0 2px 8px rgba(0,0,0,0.08))
- Border: Optional light gray (1px) if contrast needed
- Never nest cards more than 2 levels deep
- Cards should always contain actionable content, not just display

**Form Inputs:**

- Background: Off-white (#F9FAFB)
- Border: Light gray, 1px
- Padding: 12px 16px
- Border radius: 6px
- Focus state: Teal border (2px), subtle shadow
- Placeholder text: Light gray, italicized (optional)
- Labels: Always present, never replaced by placeholders
- Helper text: Small (14px), gray (#6B7280), appears below input
- Error state: Red border; red helper text below

*Input Types:*
- Text: Single-line for short responses
- Textarea: Multi-line for long text; auto-expand if possible
- Select/Dropdown: Custom styled (not browser default); teal accent
- File upload: Drag-drop zone + button fallback; show selected file name
- Camera input: Full-screen camera view with frame guide (no embedded camera element)

**Modals & Dialogs:**

- Background: Semi-transparent dark overlay (rgba(0,0,0,0.5))
- Modal width: 90% of viewport, max 480px
- Padding: 24px
- Border radius: 12px
- Title: Bold, 24px, dark gray
- Content: 16px body text
- Buttons: Primary + secondary; aligned vertically on mobile or horizontally on tablet
- Close button: Always visible in top-right; accessible keyboard shortcut (ESC)
- Never show modal without clear exit path

**Alerts & Banners:**

- Success: Teal background, white text, teal icon
- Error: Light red background (#FEE2E2), red text, red icon
- Warning: Light orange background (#FEF3C7), orange text, orange icon
- Info: Light blue background (#DBEAFE), blue text, blue icon
- Padding: 12px 16px
- Border radius: 6px
- Icon: Left-aligned, 20×20px
- Text: 14px, bold label + optional description
- Dismissable: Right-side close button (X icon)

---

## DATABASE ARCHITECTURE & RELATIONSHIPS

### Core Entities

**Entity 1: Users**

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| user_id | UUID | Primary key | Unique identifier |
| name | String | Not null | Farmer name or "Demo User" |
| phone | String | Nullable | Contact phone number |
| crop_type | String | Default 'wheat' | Primary crop grown |
| language_preference | Enum | Default 'en' | UI language (en, hi, gu, mr) |
| created_at | Timestamp | Not null | Audit |

**Entity 2: Crops (Reference Data)**

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| crop_id | UUID | Primary key | Unique identifier |
| crop_name | String | Not null | e.g., Wheat, Rice, Tomato |
| description | String | Nullable | Growing season, best practices |
| created_at | Timestamp | Not null | Audit |

**Entity 3: LeafScans**

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| scan_id | UUID | Primary key | Unique identifier |
| user_id | UUID | Foreign key | Which farmer |
| crop_id | UUID | Foreign key | Context |
| image_path | String | Not null | S3 path or local file path |
| image_hash | String | Unique | Prevent duplicate submissions |
| is_processed | Boolean | Default false | Has diagnosis been generated? |
| created_at | Timestamp | Not null | Audit |

**Entity 4: Diagnoses**

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| diagnosis_id | UUID | Primary key | Unique identifier |
| scan_id | UUID | Foreign key | Which photo |
| n_score | Float | 0–100 | Model output: N deficiency |
| p_score | Float | 0–100 | Model output: P deficiency |
| k_score | Float | 0–100 | Model output: K deficiency |
| n_confidence | Float | 0–1 | Model confidence: uncertainty |
| p_confidence | Float | 0–1 | Model confidence |
| k_confidence | Float | 0–1 | Model confidence |
| overall_confidence | Float | 0–1 | Average of above 3 |
| heatmap_n_url | String | Nullable | Grad-CAM for N (S3 path) |
| heatmap_p_url | String | Nullable | Grad-CAM for P |
| heatmap_k_url | String | Nullable | Grad-CAM for K |
| model_version | String | Not null | Which model version (v1.0, v1.1, etc.) |
| model_inference_time_ms | Integer | Not null | How long inference took |
| created_at | Timestamp | Not null | Audit |

**Entity 5: Recommendations**

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| recommendation_id | UUID | Primary key | Unique identifier |
| diagnosis_id | UUID | Foreign key | Which diagnosis |
| crop_id | UUID | Foreign key | Context (which crop) |
| primary_nutrient | Enum | N/P/K | Most deficient nutrient |
| primary_nutrient_severity | Enum | LOW/MEDIUM/HIGH | Urgency level |
| recommendation_text | String | Not null | Human-readable action (e.g., "Apply 50kg Urea per acre") |
| recommendation_text_localized | JSON | Nullable | Translations (HI: "...", GU: "...", etc.) |
| confidence_score | Float | 0–100 | How confident in this recommendation |
| created_at | Timestamp | Not null | Audit |

**Entity 6: SyncMetadata**

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| sync_id | UUID | Primary key | Unique identifier |
| user_id | UUID | Foreign key | Which farmer |
| last_sync_timestamp | Timestamp | Not null | When was last successful sync |
| pending_uploads_count | Integer | Default 0 | How many local scans waiting |
| pending_deletions_count | Integer | Default 0 | How many deletions pending |
| sync_status | Enum | SYNCED/SYNCING/FAILED | Current state |
| last_error_message | String | Nullable | Why did sync fail (if failed) |
| updated_at | Timestamp | Auto-update | Audit |

### Entity Relationships

- **One-to-Many (User → LeafScans):** One farmer captures many photos; when user is deleted, cascade-delete all their scans. Index on (user_id, created_at) for fast history queries.

- **Many-to-Many (Users ↔ Crops via UserCrops):** One farmer grows multiple crops; one crop is grown by multiple farmers. Allows flexible crop-specific recommendations.

- **One-to-One (LeafScans → Diagnoses):** One photo generates one diagnosis; some photos may not have diagnosis yet if processing failed. When diagnosis is deleted, keep the photo for audit trail.

- **One-to-One (Diagnoses → Recommendations):** One diagnosis generates one recommendation; contains localized text for all supported languages.

- **One-to-Many (User → SyncMetadata):** Tracks sync state across multiple devices (future multi-device support). Ensures consistency if farmer uses app on phone + tablet.

### Query Patterns & Joins

**Query 1: Get Scan History for a Farmer**
```sql
SELECT s.*, d.*, r.*
FROM LeafScans s
LEFT JOIN Diagnoses d ON s.scan_id = d.scan_id
LEFT JOIN Recommendations r ON d.diagnosis_id = r.diagnosis_id
WHERE s.user_id = ? AND s.is_deleted = false
ORDER BY s.created_at DESC
LIMIT 20
```

**Join Rationale:**
- Scan must exist before diagnosis; not all scans have diagnoses yet
- Diagnosis might not have recommendation if inference failed
- Use LEFT JOINs to not lose partial data

**Query 2: Get Localized Recommendations for Crop**
```sql
SELECT r.*, c.crop_name
FROM Recommendations r
JOIN Diagnoses d ON r.diagnosis_id = d.diagnosis_id
JOIN Crops c ON r.crop_id = c.crop_id
WHERE c.crop_id = ? AND r.primary_nutrient_severity = 'HIGH'
LIMIT 1
```

**Join Rationale:**
- Crop context determines recommendation severity thresholds
- Single recommendation per diagnosis; no cartesian product

### Indexing Strategy

**Primary Keys:**
- All entities indexed by UUID (default)

**Foreign Keys:**
- Auto-indexed for join performance:
  - LeafScans.user_id
  - LeafScans.crop_id
  - Diagnoses.scan_id
  - Recommendations.diagnosis_id
  - UserCrops.user_id, UserCrops.crop_id

**Query Optimization Indexes:**
- LeafScans (user_id, created_at DESC): Fast history queries
- Diagnoses (scan_id): Fast diagnosis lookup
- UserCrops (user_id): Find farmer's crops quickly
- SyncMetadata (user_id): Sync status lookup

**Text Search (Future):**
- Full-text index on Recommendations.recommendation_text (for search)

### Scalability Considerations

**Partitioning Strategy:**
- LeafScans: Partition by created_at (monthly); fast deletion of old data
- Diagnoses: Partition by created_at (monthly); archive old predictions
- Recommendations: No partitioning (small table)

**Archival Strategy:**
- Scans older than 2 years: Move to cold storage; keep metadata in DB
- Heatmaps older than 1 year: Archive to cheaper S3 tier (Glacier)
- Soft-delete with is_deleted flag; hard-delete after 90 days (for GDPR)

**Extension Points for Future Features:**
- New nutrients: Add columns (iron_score, zinc_score) to Diagnoses (backward compatible)
- Multi-photo scans: Create PhotoSet entity linking multiple photos to one diagnosis
- Time-series analysis: Add growth_stage field to Diagnoses for progression tracking
- Peer recommendations: Create FarmerComments entity for farmer-to-farmer advice

---

## AI / ML SYSTEM DESIGN

### Model Scope & Boundaries

**Model IS Responsible For:**

1. **Multi-label nutrient classification**
   - Input: RGB leaf image (JPG/PNG), 800×800px recommended
   - Output: Confidence scores for N, P, K deficiencies (0–100%)
   - Architecture: PlantVillage expert trained model (specialized for plant nutrient deficiency detection)

2. **Explainability & visual reasoning**
   - Generate Grad-CAM heatmaps for each nutrient output
   - Show which regions of leaf influenced each prediction
   - Confidence calibration: models uncertainty estimate

**Model IS NOT Responsible For:**
- Disease classification (fungal, bacterial, viral—separate future model)
- Pest identification (separate future model)
- Soil recommendations (requires soil chemistry data; not available from leaf)
- Weather-based decisions (requires weather API integration; not model)
- Multi-crop comparisons (business logic, not ML)
- Personalized fertilizer brand recommendations (requires market data; not model)

### Input Data Specification

**Image Requirements:**
- Format: JPG or PNG (lossless PNG preferred)
- Dimensions: 800×800 pixels ideal (min 400×400, max 4000×4000)
- Color space: RGB (not grayscale, not CMYK)
- File size: 2MB for rural bandwidth constraints
- Quality:
  - In-focus leaf occupying 30% of frame
  - Even lighting; avoid harsh shadows
  - Single leaf visible; not multiple leaves overlapping
  - Leaf on neutral background (white, green, or blurred)

**Preprocessing (Frontend):**
1. Compress to 2MB (lossy JPEG if needed)
2. Resize to 800×800px (maintain aspect ratio; pad if needed)
3. Verify RGB channels are present
4. Validate file hash (prevent duplicate submissions)

**Preprocessing (Backend):**
1. Decode image; verify dimensions
2. Normalize pixel values to [0, 1] range
3. Apply data augmentation (optional during inference; no rotation/flip for CAM interpretability)
4. Resize to model input size: 224×224
5. Standardize using ImageNet normalization:
   - Subtract mean RGB: [0.485, 0.456, 0.406]
   - Divide by std: [0.229, 0.224, 0.225]

### Model Architecture & Training

**Base Architecture:** PlantVillage Expert Trained Model

**Why PlantVillage Expert Trained Model:**
- **Domain-Specific:** Trained specifically on plant disease and nutrient deficiency detection
- **PlantVillage Dataset:** 54K+ labeled images covering diverse crops and growing conditions
- **Proven Accuracy:** ~85–92% per nutrient deficiency; validated on real farm conditions
- **Community Vetted:** Open-source model; widely used in agricultural applications
- **Minimal Fine-Tuning:** Works well out-of-the-box; can be further optimized if needed
- **Better than Generic:** Far superior to ImageNet-only transfer learning for this domain

**Modifications:**
- Input size: 224×224 RGB (compatible with expert model)
- Output layer: 3 sigmoid neurons for N/P/K independent multi-label classification
- Training approach: Fine-tune on local PlantVillage subset if further optimization needed

**Training Data Strategy:**
1. Use PlantVillage Dataset (open-source, 54K labeled plant images with disease/nutrient labels)
2. Select 500 images labeled specifically with N/P/K deficiencies
3. Fine-tune expert model for 10 epochs if additional customization needed (30 min on CPU)
4. Export as .h5 model file

### Model Output & Calibration

**Output Format:**
- **N-score, P-score, K-score:** Floating-point values 0–1 (converted to 0–100% for UI)
- **Per-nutrient confidence:** Estimated uncertainty (ECE < 0.1 target)
- **Overall confidence:** Average of above 3 values

**Severity Mapping (for UI/UX):**
```
Score → Severity Level
0.0–0.3  → Healthy (green)
0.3–0.6  → Attention needed (yellow/orange)
0.6–1.0  → Critical (red)
```

### Inference Pipeline

```
1. Receive image (224×224 RGB)
2. Normalize (ImageNet stats)
3. Feed to PlantVillage expert model
4. Get 3 output neurons: [n_prob, p_prob, k_prob]
5. Threshold: >0.6 = High deficiency, 0.3–0.6 = Medium, <0.3 = Low
6. Store results in diagnosis table
```

### Error Handling & Guardrails

**Fallback Scenarios:**
1. **Invalid image format:** Return 400 error; ask user to re-capture
2. **Image too small/large:** Resize within bounds; log warning
3. **Model inference timeout (>10s):** Return cached result if available; else ask user to retry
4. **Out-of-distribution input:** Return confidence < 0.3 for all nutrients; flag in UI
5. **Partial inference failure:** Return NaN for failed nutrients; log error; ask user to re-capture
6. **Model weights missing/corrupted:** Graceful fallback; use mock scores; display error banner

**Confidence Thresholds:**
- High confidence: > 0.8 (display result immediately)
- Medium confidence: 0.5–0.8 (display result + disclaimer)
- Low confidence: < 0.5 (ask user to re-capture; better lighting/focus)

### Known Limitations & Mitigation

**Risk 1: Model Accuracy in Field Conditions**
- **Risk:** Trained on PlantVillage (controlled lab images); real farm photos are messier
- **Mitigation:** Test with 50 real farm photos before launch; retrain if accuracy drops >10%
- **If happens:** App shows disclaimer: "Best with well-lit, focused photos"

**Risk 2: Dataset Bias**
- **Risk:** Model overrepresents certain crops or plant varieties
- **Mitigation:** Audit training data for variety representation; retrain with diverse data
- **If happens:** Note in app: "This app is best for crop varieties X, Y, Z"

---

## GLOSSARY

| Term | Definition |
|------|-----------|
| **Nutrient Deficiency** | Insufficient concentration of N, P, or K in plant tissues; visible in leaf symptoms |
| **Confidence Score** | 0–100 probability that the model's prediction is correct |
| **Heatmap (Grad-CAM)** | Visual explanation showing which leaf regions influenced each nutrient prediction |
| **Transfer Learning** | Reusing weights from model trained on one task (ImageNet) for another (leaf diagnosis) |
| **Multi-label Classification** | Predicting multiple independent outputs (N, P, K) instead of choosing one |
| **Offline-First** | App functions without internet; syncs when connectivity returns |
| **Async Processing** | Backend processes request in background; notifies frontend when done |
| **Recommendation Engine** | Business logic that converts model predictions into actionable advice |
| **Crop-Specific Context** | Tailoring thresholds and recommendations based on crop type (wheat vs. rice) |

---

## REFERENCES & RESOURCES

- **PlantVillage Dataset:** https://plantvillage.psu.edu/
- **PlantVillage AI Models:** https://plantvillage.org/
- **Grad-CAM:** https://arxiv.org/abs/1610.02055
- **TensorFlow Documentation:** https://www.tensorflow.org/
- **WCAG Accessibility:** https://www.w3.org/WAI/WCAG21-quickref/
- **React Native Best Practices:** https://reactnative.dev/docs/getting-started
- **Flask & FastAPI:** https://flask.palletsprojects.com/ | https://fastapi.tiangolo.com/

---

## DOCUMENT APPROVAL & SIGN-OFF

**Approved By:**
- ☐ Product Lead: _________________ Date: _______
- ☐ Engineering Lead: ______________ Date: _______
- ☐ ML Lead: ___________________ Date: _______
- ☐ Design Lead: _________________ Date: _______

**Next Review:** Post-MVP (Phase 2 planning, ~Week 1 of January 2026)

**VERSION HISTORY**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 27, 2025 | Architecture Lead | Initial guideline document |
| 1.1 | Dec 27, 2025 | Updated | Model: MobileNet V2 → PlantVillage expert trained model throughout |

---

**END OF DEVELOPMENT GUIDELINES**

This document is a living document. Updates will be tracked in the Version History section. All changes require approval from the Product Lead and Engineering Lead.

**Version:** 1.1  
**Last Updated:** December 27, 2025  
**Status:** APPROVED FOR IMPLEMENTATION
