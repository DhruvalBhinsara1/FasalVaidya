# FasalVaidya Unified Model v2 - Training Plan

## Executive Summary

**Goal**: Expand unified model from 3 crops (11 classes) to 9 crops (43 classes)

**Strategy**: Add 6 new crops with sufficient training data while skipping 3 problematic crops

**Expected Outcome**: 85-92% accuracy across 43 nutrient deficiency classes

---

## Current Model (v1) - Production

| Crop | Classes | Status | Precision |
|------|---------|--------|-----------|
| Rice | 3 | ✅ Deployed | 92-97% |
| Wheat | 2 | ✅ Deployed | 81-90% |
| Maize | 6 | ✅ Deployed | 74-96% |
| **Total** | **11** | **84% accuracy** | **96% top-3** |

---

## New Crops to Add (v2)

### 🥇 Tier 1: Excellent Datasets (100+ images/class)

| Crop | Classes | Images/Class | Total Images | Priority |
|------|---------|--------------|--------------|----------|
| **Banana** | 3 | 863 | 2,590 | ⭐⭐⭐⭐⭐ |
| **Ashgourd** | 7 | 142 | 997 | ⭐⭐⭐⭐ |
| **Coffee** | 4 | 103 | 412 | ⭐⭐⭐⭐ |

**Expected Performance**: 90-97% precision (similar to Rice)

### 🥈 Tier 2: Good Datasets (80-99 images/class)

| Crop | Classes | Images/Class | Total Images | Priority |
|------|---------|--------------|--------------|----------|
| **EggPlant** | 4 | 93 | 371 | ⭐⭐⭐ |
| **Snakegourd** | 5 | 91 | 456 | ⭐⭐⭐ |
| **Bittergourd** | 9 | 87 | 785 | ⭐⭐⭐ |

**Expected Performance**: 82-90% precision (similar to Wheat)

---

## Crops to Skip

| Crop | Classes | Images/Class | Reason |
|------|---------|--------------|--------|
| **Tomato** | 7 | 73 avg | ❌ Class imbalance: 3 classes have only 9-11 samples |
| **Ridgegourd** | 4 | 72 | ❌ Borderline dataset, too close to minimum |
| **Cucumber** | 4 | 62 | ❌ Below recommended 80+ threshold |

**Decision Rationale**: These crops would lower overall model accuracy and require significant additional data collection (120+ images for Tomato alone).

---

## Unified Model v2 Specifications

### Architecture
- **Base Model**: MobileNetV2 (ImageNet pretrained)
- **Input Size**: 224×224 RGB
- **Output**: 43 classes (softmax)
- **Model Size**: ~18-22 MB (.keras), ~6-8 MB (.tflite)

### Class Distribution

```
CROP BREAKDOWN (43 classes total):

Cereals (11 classes):
├─ Rice (3): Nitrogen, Phosphorus, Potassium
├─ Wheat (2): Control, Deficiency
└─ Maize (6): ALL Present, ALLAB, KAB, NAB, PAB, ZNAB

Commercial Crops (7 classes):
├─ Banana (3): Healthy, Magnesium, Potassium
└─ Coffee (4): Healthy, Nitrogen, Phosphorus, Potassium

Vegetables (25 classes):
├─ Ashgourd (7): Healthy, K, K+Mg, N, N+K, N+Mg, PM
├─ EggPlant (4): Healthy, K, N, N+K
├─ Snakegourd (5): Healthy, K, LS, N, N+K
└─ Bittergourd (9): DM, Healthy, JAS, K, K+Mg, LS, N, N+K, N+Mg
```

### Training Dataset

| Category | Images | Percentage |
|----------|--------|------------|
| Maize | ~12,795 | 31.5% |
| Banana | 2,590 | 6.4% |
| Rice | 1,156 | 2.8% |
| Ashgourd | 997 | 2.5% |
| Bittergourd | 785 | 1.9% |
| Snakegourd | 456 | 1.1% |
| Wheat | 420 | 1.0% |
| Coffee | 412 | 1.0% |
| EggPlant | 371 | 0.9% |
| **TOTAL** | **~19,982** | **100%** |

**Note**: Maize dominates with 31.5% of data - consider class balancing during training

---

## Training Strategy

### Phase 1: Data Preparation

#### 1.1 Dataset Structure
```
data/
├── banana/
│   ├── train/
│   │   ├── healthy/
│   │   ├── magnesium/
│   │   └── potassium/
│   └── val/
│       ├── healthy/
│       ├── magnesium/
│       └── potassium/
├── coffee/
│   ├── train/
│   │   ├── healthy/
│   │   ├── nitrogen-N/
│   │   ├── phosphorus-P/
│   │   └── potasium-K/
│   └── val/
│       └── ...
├── ashgourd/
├── eggplant/
├── snakegourd/
├── bittergourd/
├── rice/  (existing)
├── wheat/  (existing)
└── maize/  (existing)
```

#### 1.2 Data Splitting
- **Training**: 80%
- **Validation**: 20%
- **Test**: Use existing test sets where available

#### 1.3 Data Augmentation
Apply to crops with <100 images/class:
- Random rotation: ±15°
- Random zoom: 0.8-1.2×
- Horizontal flip: 50%
- Brightness adjustment: ±20%
- Contrast adjustment: 0.8-1.2×

**Apply augmentation to**: EggPlant, Snakegourd, Bittergourd

### Phase 2: Training Configuration

#### 2.1 Transfer Learning Approach
```python
Option 1: Fine-tune from v1 model (RECOMMENDED)
├─ Load unified_nutrient_best.keras (11 classes)
├─ Remove final classification layer
├─ Add new dense layer (43 classes)
├─ Freeze backbone (MobileNetV2)
├─ Train only new classification head (5 epochs)
└─ Unfreeze top layers and fine-tune (20-30 epochs)

Option 2: Train from scratch with ImageNet weights
├─ Load MobileNetV2 (ImageNet pretrained)
├─ Add custom classification head (43 classes)
├─ Freeze backbone initially
└─ Progressive unfreezing (40-50 epochs total)
```

#### 2.2 Hyperparameters
```python
BASE_LEARNING_RATE = 0.0001
BATCH_SIZE = 32
IMAGE_SIZE = (224, 224)
EPOCHS_FREEZE = 5      # Only train head
EPOCHS_UNFREEZE = 30   # Fine-tune all layers
PATIENCE = 10          # Early stopping

# Class weights (to handle Maize dominance)
class_weights = {
    # Maize classes: 0.5-0.7 (downweight)
    # Other crops: 1.0-1.5 (upweight)
}
```

#### 2.3 Optimization
- **Optimizer**: Adam
- **Loss**: Categorical Crossentropy
- **Metrics**: Accuracy, Top-3 Accuracy, Precision, Recall
- **Callbacks**:
  - ModelCheckpoint (save best)
  - EarlyStopping (patience=10)
  - ReduceLROnPlateau (factor=0.5, patience=5)
  - TensorBoard (logging)

### Phase 3: Training Execution

#### 3.1 Stage 1: Freeze Backbone (5 epochs)
```bash
Train only classification head
Expected: 60-70% accuracy
Purpose: Initialize new class weights
```

#### 3.2 Stage 2: Unfreeze Top Layers (15 epochs)
```bash
Unfreeze last 30 layers of MobileNetV2
Expected: 75-85% accuracy
Purpose: Fine-tune feature extraction
```

#### 3.3 Stage 3: Full Fine-tuning (15 epochs)
```bash
Unfreeze all layers with low learning rate (0.00001)
Expected: 85-92% accuracy
Purpose: Optimize entire model
```

#### 3.4 Total Training Time Estimate
- **GPU**: ~4-6 hours on Tesla T4 (Google Colab)
- **CPU**: Not recommended (20-30+ hours)

---

## Expected Performance

### Overall Metrics
- **Accuracy**: 85-92% (top-1)
- **Top-3 Accuracy**: 95-98%
- **Precision**: 82-97% (per crop)
- **Recall**: 80-95% (per crop)

### Per-Crop Expected Performance

| Crop | Images/Class | Expected Precision | Confidence |
|------|--------------|-------------------|------------|
| Banana | 863 | 95-97% | Very High |
| Maize | 2,132 | 74-96% | Very High (existing) |
| Rice | 385 | 92-97% | Very High (existing) |
| Wheat | 210 | 81-90% | High (existing) |
| Ashgourd | 142 | 88-94% | High |
| Coffee | 103 | 85-92% | High |
| EggPlant | 93 | 82-88% | Medium-High |
| Snakegourd | 91 | 82-88% | Medium-High |
| Bittergourd | 87 | 80-86% | Medium |

### Risk Assessment

**Low Risk Crops** (Will train excellently):
- ✅ Banana, Rice, Wheat, Maize

**Medium Risk Crops** (Need careful monitoring):
- ⚠️ Ashgourd, Coffee (moderate samples, more classes)
- ⚠️ EggPlant, Snakegourd (borderline 90+ samples)

**Higher Risk Crop** (May need additional augmentation):
- ⚠️ Bittergourd (87 samples/class × 9 classes = most complex)

---

## Data Preparation Script

### Script: `prepare_unified_v2_dataset.py`

```python
"""
Prepare dataset for Unified Model v2
Combines all viable crops into single training structure
"""

import os
import shutil
from pathlib import Path
from sklearn.model_selection import train_test_split

# Dataset configuration
CROPS_CONFIG = {
    'banana': {
        'source': 'Leaf Nutrient Data Sets/Banana leaves Nutrient',
        'classes': ['healthy', 'magnesium', 'potassium'],
        'has_splits': False
    },
    'ashgourd': {
        'source': 'Leaf Nutrient Data Sets/Ashgourd Nutrients',
        'classes': ['ash_gourd__healthy', 'ash_gourd__K', 'ash_gourd__K_Mg', 
                   'ash_gourd__N', 'ash_gourd__N_K', 'ash_gourd__N_Mg', 'ash_gourd__PM'],
        'has_splits': False
    },
    'coffee': {
        'source': 'Leaf Nutrient Data Sets/Coffee Nutrients',
        'classes': ['healthy', 'nitrogen-N', 'phosphorus-P', 'potasium-K'],
        'has_splits': False
    },
    'eggplant': {
        'source': 'Leaf Nutrient Data Sets/EggPlant Nutrients',
        'classes': ['eggplant__healthy', 'eggplant__K', 'eggplant__N', 'eggplant__N_K'],
        'has_splits': False
    },
    'snakegourd': {
        'source': 'Leaf Nutrient Data Sets/Snakegourd Nutrients',
        'classes': ['snake_gourd__healthy', 'snake_gourd__K', 'snake_gourd__LS', 
                   'snake_gourd__N', 'snake_gourd__N_K'],
        'has_splits': False
    },
    'bittergourd': {
        'source': 'Leaf Nutrient Data Sets/Bittergourd Nutrients',
        'classes': ['bitter_gourd__DM', 'bitter_gourd__healthy', 'bitter_gourd__JAS',
                   'bitter_gourd__K', 'bitter_gourd__K_Mg', 'bitter_gourd__LS',
                   'bitter_gourd__N', 'bitter_gourd__N_K', 'bitter_gourd__N_Mg'],
        'has_splits': False
    },
    # Existing crops (already have train/val splits)
    'rice': {
        'source': 'Leaf Nutrient Data Sets/Rice Nutrients',
        'classes': ['Nitrogen(N)', 'Phosphorus(P)', 'Potassium(K)'],
        'has_splits': False
    },
    'wheat': {
        'source': 'Leaf Nutrient Data Sets/Wheat Nitrogen',
        'classes': ['control', 'deficiency'],
        'has_splits': True
    },
    'maize': {
        'source': 'Leaf Nutrient Data Sets/Maize Nutrients',
        'classes': ['ALL Present', 'ALLAB', 'KAB', 'NAB', 'PAB', 'ZNAB'],
        'has_splits': True
    }
}

def prepare_dataset(base_path, output_path, val_split=0.2, test_split=0.1):
    """
    Prepare unified dataset with train/val/test splits
    """
    base_path = Path(base_path)
    output_path = Path(output_path)
    
    for crop_name, config in CROPS_CONFIG.items():
        print(f"\nProcessing {crop_name}...")
        source_path = base_path / config['source']
        
        if config['has_splits']:
            # Copy existing train/val/test structure
            copy_existing_splits(source_path, output_path / crop_name)
        else:
            # Create train/val splits from direct class folders
            create_splits(source_path, output_path / crop_name, 
                         config['classes'], val_split)

def create_splits(source_path, output_path, classes, val_split):
    """
    Create train/val splits for crops without existing splits
    """
    for class_name in classes:
        class_path = source_path / class_name
        if not class_path.exists():
            print(f"  Warning: {class_name} not found, skipping")
            continue
        
        # Get all images
        images = list(class_path.glob('*.jpg')) + \
                list(class_path.glob('*.jpeg')) + \
                list(class_path.glob('*.png'))
        
        # Split into train/val
        train_imgs, val_imgs = train_test_split(
            images, test_size=val_split, random_state=42
        )
        
        # Copy to output structure
        train_out = output_path / 'train' / class_name
        val_out = output_path / 'val' / class_name
        train_out.mkdir(parents=True, exist_ok=True)
        val_out.mkdir(parents=True, exist_ok=True)
        
        for img in train_imgs:
            shutil.copy2(img, train_out / img.name)
        for img in val_imgs:
            shutil.copy2(img, val_out / img.name)
        
        print(f"  {class_name}: {len(train_imgs)} train, {len(val_imgs)} val")

def copy_existing_splits(source_path, output_path):
    """
    Copy crops that already have train/val splits
    """
    for split in ['train', 'val', 'test']:
        split_path = source_path / split
        if split_path.exists():
            dest = output_path / split
            shutil.copytree(split_path, dest, dirs_exist_ok=True)
            print(f"  Copied {split} split")

if __name__ == '__main__':
    prepare_dataset(
        base_path='B:/FasalVaidya',
        output_path='B:/FasalVaidya/unified_v2_dataset',
        val_split=0.2
    )
```

---

## Training Script Template

### Script: `train_unified_v2.py`

```python
"""
Train Unified Model v2 with 9 crops (43 classes)
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import numpy as np
from pathlib import Path

# Configuration
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS_FREEZE = 5
EPOCHS_UNFREEZE = 30
NUM_CLASSES = 43
BASE_LR = 0.0001
FINE_TUNE_LR = 0.00001

# Data augmentation for training
data_augmentation = keras.Sequential([
    layers.RandomRotation(0.15),
    layers.RandomZoom(0.2),
    layers.RandomFlip("horizontal"),
    layers.RandomBrightness(0.2),
    layers.RandomContrast(0.2),
])

def create_model(num_classes, base_model_weights='imagenet'):
    """
    Create MobileNetV2-based model
    """
    base_model = keras.applications.MobileNetV2(
        input_shape=IMAGE_SIZE + (3,),
        include_top=False,
        weights=base_model_weights
    )
    
    base_model.trainable = False  # Freeze initially
    
    inputs = keras.Input(shape=IMAGE_SIZE + (3,))
    x = data_augmentation(inputs)
    x = keras.applications.mobilenet_v2.preprocess_input(x)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(512, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = keras.Model(inputs, outputs)
    return model, base_model

def load_data(data_dir):
    """
    Load training and validation datasets
    """
    train_ds = keras.utils.image_dataset_from_directory(
        f"{data_dir}/train",
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        label_mode='categorical'
    )
    
    val_ds = keras.utils.image_dataset_from_directory(
        f"{data_dir}/val",
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        label_mode='categorical'
    )
    
    # Prefetch for performance
    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.prefetch(buffer_size=AUTOTUNE)
    
    return train_ds, val_ds

def train():
    """
    Main training function
    """
    print("=== FasalVaidya Unified Model v2 Training ===\n")
    
    # Load data
    print("Loading datasets...")
    train_ds, val_ds = load_data('unified_v2_dataset')
    
    # Create model
    print("Creating model...")
    model, base_model = create_model(NUM_CLASSES)
    
    # Compile
    model.compile(
        optimizer=keras.optimizers.Adam(BASE_LR),
        loss='categorical_crossentropy',
        metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=3, name='top3_acc')]
    )
    
    # Stage 1: Train head only
    print("\n=== Stage 1: Training classification head (frozen backbone) ===")
    history1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_FREEZE,
        callbacks=[
            keras.callbacks.ModelCheckpoint('unified_v2_stage1.keras', save_best_only=True),
            keras.callbacks.TensorBoard(log_dir='logs/stage1')
        ]
    )
    
    # Stage 2: Unfreeze and fine-tune
    print("\n=== Stage 2: Fine-tuning (unfreezing backbone) ===")
    base_model.trainable = True
    
    # Recompile with lower learning rate
    model.compile(
        optimizer=keras.optimizers.Adam(FINE_TUNE_LR),
        loss='categorical_crossentropy',
        metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=3, name='top3_acc')]
    )
    
    history2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_UNFREEZE,
        callbacks=[
            keras.callbacks.ModelCheckpoint('unified_v2_best.keras', save_best_only=True),
            keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True),
            keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=5),
            keras.callbacks.TensorBoard(log_dir='logs/stage2')
        ]
    )
    
    print("\n=== Training Complete ===")
    print(f"Best validation accuracy: {max(history2.history['val_accuracy']):.2%}")

if __name__ == '__main__':
    train()
```

---

## Deployment Updates Required

### 1. Backend API (`backend/app.py`)

Update CROPS dictionary:
```python
CROPS = {
    2: {"id": 2, "name": "Rice", "hindi": "चावल"},
    3: {"id": 3, "name": "Maize", "hindi": "मक्का"},
    4: {"id": 4, "name": "Wheat", "hindi": "गेहूं"},
    5: {"id": 5, "name": "Banana", "hindi": "केला"},
    6: {"id": 6, "name": "Coffee", "hindi": "कॉफी"},
    7: {"id": 7, "name": "Ashgourd", "hindi": "पेठा"},
    8: {"id": 8, "name": "Eggplant", "hindi": "बैंगन"},
    9: {"id": 9, "name": "Snakegourd", "hindi": "चिचिंडा"},
    10: {"id": 10, "name": "Bittergourd", "hindi": "करेला"},
}
```

### 2. Inference Engine (`backend/ml/unified_inference.py`)

Update CLASS_TO_NPK mapping for all 43 classes:
```python
CLASS_TO_NPK = {
    # Rice (existing)
    'rice_nitrogen': {'N': 'Low', 'P': 'Normal', 'K': 'Normal'},
    'rice_phosphorus': {'N': 'Normal', 'P': 'Low', 'K': 'Normal'},
    'rice_potassium': {'N': 'Normal', 'P': 'Normal', 'K': 'Low'},
    
    # Wheat (existing)
    'wheat_control': {'N': 'Normal', 'P': 'Normal', 'K': 'Normal'},
    'wheat_deficiency': {'N': 'Low', 'P': 'Low', 'K': 'Low'},
    
    # Maize (existing)
    'maize_all_present': {'N': 'Normal', 'P': 'Normal', 'K': 'Normal'},
    'maize_allab': {'N': 'Low', 'P': 'Low', 'K': 'Low'},
    'maize_kab': {'N': 'Normal', 'P': 'Normal', 'K': 'Low'},
    'maize_nab': {'N': 'Low', 'P': 'Normal', 'K': 'Normal'},
    'maize_pab': {'N': 'Normal', 'P': 'Low', 'K': 'Normal'},
    'maize_znab': {'N': 'Low', 'P': 'Normal', 'K': 'Normal', 'Zn': 'Low'},
    
    # Banana (NEW)
    'banana_healthy': {'N': 'Normal', 'P': 'Normal', 'K': 'Normal', 'Mg': 'Normal'},
    'banana_magnesium': {'N': 'Normal', 'P': 'Normal', 'K': 'Normal', 'Mg': 'Low'},
    'banana_potassium': {'N': 'Normal', 'P': 'Normal', 'K': 'Low', 'Mg': 'Normal'},
    
    # Coffee (NEW)
    'coffee_healthy': {'N': 'Normal', 'P': 'Normal', 'K': 'Normal'},
    'coffee_nitrogen-n': {'N': 'Low', 'P': 'Normal', 'K': 'Normal'},
    'coffee_phosphorus-p': {'N': 'Normal', 'P': 'Low', 'K': 'Normal'},
    'coffee_potasium-k': {'N': 'Normal', 'P': 'Normal', 'K': 'Low'},
    
    # Ashgourd (NEW)
    'ashgourd_healthy': {'N': 'Normal', 'K': 'Normal', 'Mg': 'Normal'},
    'ashgourd_k': {'N': 'Normal', 'K': 'Low', 'Mg': 'Normal'},
    'ashgourd_k_mg': {'N': 'Normal', 'K': 'Low', 'Mg': 'Low'},
    'ashgourd_n': {'N': 'Low', 'K': 'Normal', 'Mg': 'Normal'},
    'ashgourd_n_k': {'N': 'Low', 'K': 'Low', 'Mg': 'Normal'},
    'ashgourd_n_mg': {'N': 'Low', 'K': 'Normal', 'Mg': 'Low'},
    'ashgourd_pm': {'N': 'Normal', 'P': 'Low', 'K': 'Normal', 'Mg': 'Low'},
    
    # EggPlant (NEW)
    'eggplant_healthy': {'N': 'Normal', 'K': 'Normal'},
    'eggplant_k': {'N': 'Normal', 'K': 'Low'},
    'eggplant_n': {'N': 'Low', 'K': 'Normal'},
    'eggplant_n_k': {'N': 'Low', 'K': 'Low'},
    
    # Snakegourd (NEW)
    'snakegourd_healthy': {'N': 'Normal', 'K': 'Normal'},
    'snakegourd_k': {'N': 'Normal', 'K': 'Low'},
    'snakegourd_ls': {'N': 'Normal', 'K': 'Normal', 'Disease': 'Leaf Spot'},
    'snakegourd_n': {'N': 'Low', 'K': 'Normal'},
    'snakegourd_n_k': {'N': 'Low', 'K': 'Low'},
    
    # Bittergourd (NEW)
    'bittergourd_dm': {'N': 'Normal', 'K': 'Normal', 'Disease': 'Downy Mildew'},
    'bittergourd_healthy': {'N': 'Normal', 'K': 'Normal', 'Mg': 'Normal'},
    'bittergourd_jas': {'N': 'Normal', 'K': 'Normal', 'Disease': 'Jassids'},
    'bittergourd_k': {'N': 'Normal', 'K': 'Low', 'Mg': 'Normal'},
    'bittergourd_k_mg': {'N': 'Normal', 'K': 'Low', 'Mg': 'Low'},
    'bittergourd_ls': {'N': 'Normal', 'K': 'Normal', 'Disease': 'Leaf Spot'},
    'bittergourd_n': {'N': 'Low', 'K': 'Normal', 'Mg': 'Normal'},
    'bittergourd_n_k': {'N': 'Low', 'K': 'Low', 'Mg': 'Normal'},
    'bittergourd_n_mg': {'N': 'Low', 'K': 'Normal', 'Mg': 'Low'},
}
```

### 3. Frontend (`frontend/src/screens/HomeScreen.tsx`)

Update crop selector with all 9 crops:
```typescript
const SUPPORTED_CROPS = [
  { id: 2, name: 'Rice', hindi: 'चावल', emoji: '🌾' },
  { id: 3, name: 'Maize', hindi: 'मक्का', emoji: '🌽' },
  { id: 4, name: 'Wheat', hindi: 'गेहूं', emoji: '🌾' },
  { id: 5, name: 'Banana', hindi: 'केला', emoji: '🍌' },
  { id: 6, name: 'Coffee', hindi: 'कॉफी', emoji: '☕' },
  { id: 7, name: 'Ashgourd', hindi: 'पेठा', emoji: '🥒' },
  { id: 8, name: 'Eggplant', hindi: 'बैंगन', emoji: '🍆' },
  { id: 9, name: 'Snakegourd', hindi: 'चिचिंडा', emoji: '🥒' },
  { id: 10, name: 'Bittergourd', hindi: 'करेला', emoji: '🥒' },
];
```

---

## Success Criteria

### Minimum Acceptable Performance
- ✅ Overall accuracy: ≥85%
- ✅ Top-3 accuracy: ≥95%
- ✅ Per-crop precision: ≥80%
- ✅ Model size: ≤25 MB (.keras), ≤10 MB (.tflite)

### Validation Checklist
- [ ] All 43 classes have ≥80% precision
- [ ] No class has <70% precision
- [ ] Confusion matrix shows low cross-crop confusion
- [ ] TFLite model runs on mobile (<500ms inference)
- [ ] API returns correct NPK values for all crops
- [ ] Frontend displays all 9 crops correctly

---

## Timeline

### Week 1: Data Preparation
- Day 1-2: Run data preparation script
- Day 3: Verify dataset structure and class balance
- Day 4: Generate dataset statistics and visualizations

### Week 2: Training
- Day 1: Train Stage 1 (frozen backbone)
- Day 2-3: Train Stage 2 (fine-tuning)
- Day 4: Evaluate results and analyze errors
- Day 5: Retrain if needed with adjustments

### Week 3: Deployment
- Day 1-2: Update backend API and inference
- Day 3-4: Update frontend UI
- Day 5: Testing and validation
- Weekend: Production deployment

---

## Backup Plan

### If Performance Issues Occur:

**Problem**: Overall accuracy <85%
- **Solution**: Increase augmentation, add more epochs, adjust class weights

**Problem**: Specific crop has low precision (<80%)
- **Solution**: Collect 20-30 more samples for that crop, retrain

**Problem**: Model size too large (>25 MB)
- **Solution**: Use quantization, reduce dense layer size

**Problem**: Cross-crop confusion (e.g., Snakegourd vs Bittergourd)
- **Solution**: Add more distinctive augmentation, collect edge cases

---

## Contact & Support

For training issues or questions:
- Check TensorBoard logs: `tensorboard --logdir=logs`
- Review classification report for per-class metrics
- Analyze confusion matrix for error patterns

**Generated**: January 9, 2026  
**Status**: Ready for Implementation  
**Next Step**: Run data preparation script
