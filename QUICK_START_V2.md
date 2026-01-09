# Quick Start: Unified Model v2 Training

## ✅ Decision Summary

**ADD TO MODEL (6 new crops):**
- ✅ Banana (3 classes, 863 imgs/class) - Excellent
- ✅ Ashgourd (7 classes, 142 imgs/class) - Excellent  
- ✅ Coffee (4 classes, 103 imgs/class) - Excellent
- ✅ EggPlant (4 classes, 93 imgs/class) - Good
- ✅ Snakegourd (5 classes, 91 imgs/class) - Good
- ✅ Bittergourd (9 classes, 87 imgs/class) - Good

**SKIP (3 crops):**
- ❌ Tomato - Class imbalance (3 classes with only 9-11 samples)
- ❌ Ridgegourd - Borderline dataset (72 imgs/class)
- ❌ Cucumber - Insufficient data (62 imgs/class)

**RESULT:**
- Current: 3 crops (Rice, Wheat, Maize) = 11 classes
- New: 9 crops total = 43 classes
- Training data: ~40,000+ images
- Expected accuracy: 85-92%

---

## 🚀 Steps to Train

### 1. Prepare Dataset (30 minutes)

```bash
cd backend/ml
python prepare_unified_v2_dataset.py
```

**Output**: `backend/ml/unified_v2_dataset/` with train/val splits

### 2. Train Model (4-6 hours on GPU)

**Option A: Google Colab (Recommended)**
1. Upload `unified_v2_dataset/` to Google Drive
2. Create new Colab notebook with T4 GPU
3. Use training code from `UNIFIED_V2_TRAINING_PLAN.md`
4. Download trained model files

**Option B: Local (if you have GPU)**
```bash
cd backend/ml
python train_unified_v2.py
```

### 3. Deploy (1-2 hours)

**Backend:**
- Update `backend/app.py` CROPS dictionary (add 6 crops)
- Update `backend/ml/unified_inference.py` CLASS_TO_NPK mapping (43 classes)
- Replace model files with new trained models

**Frontend:**
- Update `frontend/src/screens/HomeScreen.tsx` crop selector
- Update `frontend/src/screens/SettingsScreen.tsx` crop display
- Add new crop emojis/names

---

## 📊 Expected Performance by Crop

| Crop | Precision | Data Quality |
|------|-----------|--------------|
| Banana | 95-97% | ⭐⭐⭐⭐⭐ |
| Rice | 92-97% | ⭐⭐⭐⭐⭐ |
| Ashgourd | 88-94% | ⭐⭐⭐⭐ |
| Coffee | 85-92% | ⭐⭐⭐⭐ |
| Wheat | 81-90% | ⭐⭐⭐⭐ |
| EggPlant | 82-88% | ⭐⭐⭐ |
| Snakegourd | 82-88% | ⭐⭐⭐ |
| Bittergourd | 80-86% | ⭐⭐⭐ |
| Maize | 74-96% | ⭐⭐⭐⭐⭐ |

---

## 📁 Files Created

1. **UNIFIED_V2_TRAINING_PLAN.md** - Complete training guide (300+ lines)
2. **prepare_unified_v2_dataset.py** - Dataset preparation script
3. **CROP_DATASET_VIABILITY_ANALYSIS.md** - Dataset analysis details
4. **QUICK_START_V2.md** - This file

---

## ⚠️ Important Notes

1. **Class Naming Convention**: All classes prefixed with crop name
   - Example: `banana_healthy`, `coffee_nitrogen_n`, `ashgourd_k_mg`

2. **Data Balance**: Maize has 31.5% of all data (12,795 images)
   - Use class weights during training to balance

3. **Augmentation**: Apply to crops with <100 imgs/class
   - EggPlant, Snakegourd, Bittergourd need augmentation

4. **Model Size**: Expected 18-22 MB (.keras), 6-8 MB (.tflite)
   - Should work on mobile devices

5. **Training Time**: ~4-6 hours on T4 GPU
   - Stage 1 (5 epochs): ~30 min
   - Stage 2 (30 epochs): ~3-5 hours

---

## ✅ Success Criteria

- [ ] Overall accuracy ≥85%
- [ ] Top-3 accuracy ≥95%
- [ ] All crops have ≥80% precision
- [ ] No class has <70% precision
- [ ] Model runs on mobile (<500ms inference)
- [ ] TFLite model ≤10 MB

---

## 🆘 Troubleshooting

**Problem**: Dataset preparation fails
- **Fix**: Check folder paths in `CROPS_CONFIG`

**Problem**: Low accuracy on specific crop
- **Fix**: Increase augmentation, collect 20-30 more samples

**Problem**: Model size too large
- **Fix**: Use quantization, reduce dense layer size

**Problem**: Training too slow
- **Fix**: Use Google Colab with T4 GPU (free)

---

**Ready to start?** Run: `python backend/ml/prepare_unified_v2_dataset.py`
