# Master UI/UX Design Guidelines  
## AI-Powered Crop Health & Advisory Application (Mobile)

---

## 1. Product Philosophy (Non-Negotiable)

- This app is **not a dashboard**  
- It is a **calm agricultural companion**
- The user should **never feel blamed**
- The app should **never feel noisy**
- AI insights must feel **supportive, not authoritative**
- Every screen must answer **one main question**
- Every problem must be paired with **one clear action**
- If a screen introduces anxiety **without guidance**, it is **incorrect by design**

---

## 2. Design System Foundations

### 2.1 Layout Grid & Spacing

#### Global Rules

- Horizontal padding: **16px (fixed)**
- Vertical spacing system: **8 / 16 / 24 / 32**
- Card border radius: **12–16px**

#### Buttons

- Pill-shaped
- Minimum height: **44px**

#### Cards

- Always float on white
- Very soft shadow only
- White space is **intentional** — never “fill gaps”

#### ❌ Do Not

- Stack dense information vertically
- Use dividers aggressively
- Reduce padding to “fit more content”

---

### 2.2 Typography

#### Font

- **Inter** or **SF Pro** (no substitutions)

#### Hierarchy (Strict Order)

1. **Screen Title** — Bold, largest
2. **Section Header** — Medium, dark green
3. **Card Title** — Bold, dark text
4. **Body Text** — Regular
5. **Metadata** — Smaller, muted

#### Text Rules

- Maximum **2 lines per paragraph**
- Prefer **phrases over sentences**
- Avoid technical terms unless unavoidable
- Speak like a **helpful agronomist**, not a system

---

## 3. Color System (Strict Semantic Mapping)

**Colors communicate meaning, not decoration.**

### Approved Colors Only

| Purpose            | Color     |
|--------------------|-----------|
| Primary Green      | `#4C763B` |
| Secondary Green    | `#043915` |
| Light Positive     | `#DBFFCB` |
| Positive Green     | `#BEE4D0` |
| Accent Soft        | `#B0CE88` |
| Highlight Yellow   | `#FFFD8F` |
| Caution            | `#FA8112` |
| Soft Red           | `#FF8282` |
| Dark Red           | `#FF6363` |
| Text Black         | `#222222` |

#### Rules

- **Green** = safe / healthy / confirm
- **Red** = urgent only (never casual)
- **Orange** = caution or advisory
- **No new colors. Ever.**

---

## 4. Home Screen (Dashboard)

### Purpose

**Instant awareness + clear next action**

### Structure (Top → Bottom)

#### 1. App Bar

- Left: menu / back
- Center: **Crop Health**
- Right: notifications (optional)

#### 2. Summary Cards (2-Column)

**Card A**
- Label: Total Crops
- Value: Large number

**Card B**
- Label: Unhealthy
- Value: **Red number only**
- Red must **never** touch the background

#### 3. Filter Chips (Horizontal Scroll)

- All
- Healthy
- Unhealthy
- Critical

**Behavior**
- Active chip: filled primary green
- Inactive chip: outlined green
- Always single-select

#### 4. Crop Cards (Vertical List)

Each card must include:

**Top Row**
- Status badge  
  - Healthy → Green  
  - Critical → Soft red
- Crop image thumbnail (rounded)

**Main Content**
- Crop name (bold)
- Field location (muted)
- Health score bar:
  - Green ≥ 80
  - Orange 50–79
  - Red < 50

**Bottom**
- “View Details” button  
- Button color matches crop state

**Background**
- Healthy: light green tint
- Critical: soft red tint (low opacity)

### Emotional Result

User instantly knows:
- What’s fine
- What needs attention
- Where to tap next

---

## 5. Scan History Screen

### Purpose

**Build long-term trust**

### Layout

- App bar title: **Scan History**
- Chronological list (latest first)

Each scan card:
- Crop name
- Date + time
- Status badge

#### Rules

- Entire card is tappable
- No buttons inside cards
- No charts on this screen

### Emotional Result

> “This app remembers my farm.”

---

## 6. Diagnosis Result Screen (Post-Scan)

**Section order must never change.**

---

### 6.1 Crop Summary Card

**Contents**
- Crop name (left)
- Timestamp (below)
- Status badge (right)

**Critical Rule**
- Status text must match the image
- Never show “Healthy” with a red heatmap

---

### 6.2 Nutrient Deficiency Heatmap

**Image Rules**
- AI-processed image is default
- Deficiency badge overlay (e.g. “Nitrogen Deficiency”)
- Badge is red **only if severe**

**Legend**
- Left: Healthy
- Right: Deficient
- Gradient must match image colors

**Button**
- “Show Original” (secondary button)

---

### 6.3 NPK Deficiency Scores

Three horizontal bars:
- Nitrogen (N)
- Phosphorus (P)
- Potassium (K)

**Rules**
- Percentages right-aligned
- Red bar **only if deficient**
- Green bars remain green even if low-priority

---

### 6.4 Treatment Recommended

**Card Style**
- Highlighted
- Calm green background

**Text Format**
- Action first  
  `Apply Nitrogen: 100 kg per 10 hectares`

- Supporting instruction below

**Expandable Section**
- “Why This Helps”
- Hidden by default
- Plain language explanation

---

### 6.5 Suggested Products

**Grid**
- 2 columns
- Vertical scroll

Each product card:
- Image
- Nutrient badge
- Name
- Rating
- Price
- Green **Buy** button

---

### 6.6 Persistent CTA

- “Chat with Expert”
- Floating or fixed
- Always accessible

### Emotional Result

> “I understand the problem and know exactly what to do.”

---

## 7. AI Chat Screen

### Purpose

**Conversation, not commands**

### Layout

**Top Bar**
- Title: *Ask anything about your farm*

**Chat Area**
- AI messages: left, light green
- User messages: right, white
- AI avatar always visible

**Important Info**
- Status alerts appear as cards
- Cards are tappable

**Bottom Interaction Area**
- Fixed green button: **Take Photo for Analysis**
- Text input:
  - Rounded
  - Placeholder: *Type your question here…*
- Send icon:
  - Green
  - Right-aligned

### Emotional Result

> “I’m talking to someone who understands farming.”

---

## 8. Settings / Profile Screen

### Purpose

**Control without anxiety**

### Sections (Each in a Card)

- Profile
- Preferences
- Language
- Voice assistance
- Notifications
- Support & Info

**Danger Zone**
- Sign out
- Delete account

#### Rules

- Danger zone visually separated
- No red unless destructive

### Emotional Result

> “I’m safe using this app.”

---

## 9. Text ↔ Image Consistency Rules (Critical)

Frontend must enforce:

- If image shows nitrogen stress → text must mention nitrogen
- If crop card says “Healthy” → no red elements allowed
- Health score, color, and wording must always agree
- Never show confidence in text if AI confidence is low

---

## 10. Final Quality Check (Before Shipping)

Ask:

- Does this reduce farmer anxiety?
- Is the next step obvious?
- Would this make sense in bright sunlight?
- Could a first-time smartphone user understand this?

---