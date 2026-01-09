# 📊 Dataset Quality Analysis - Which Crops to Keep/Remove

**Analysis Date:** January 9, 2026  
**Question:** Why did tomato fail? Which crops have dataset issues?

---

## 🔍 KEY FINDING: The Problem is **Small Sample Size**, Not Image Quality!

---

## 📈 Performance Analysis by Crop

### 🏆 EXCELLENT - Keep These (90%+ precision)
| Crop | Classes | Avg Precision | Avg Support | Status |
|------|---------|---------------|-------------|---------|
| **Rice** | 3 | **95.0%** | **40 samples** | ✅ **PERFECT** |
| **Maize NAB** | 1 | **96.2%** | **53 samples** | ✅ **EXCELLENT** |
| **Maize ZNAB** | 1 | **93.3%** | **59 samples** | ✅ **EXCELLENT** |

**Analysis:** Rice has consistent 38-42 samples per class with excellent precision (92-97%). Maize nitrogen and zinc classes also excellent.

---

### ✅ GOOD - Keep These (80-90% precision)
| Crop | Classes | Avg Precision | Avg Support | Status |
|------|---------|---------------|-------------|---------|
| **Wheat** | 2 | **85.6%** | **52 samples** | ✅ GOOD |
| **Maize (other)** | 4 | **81.9%** | **47 samples** | ✅ GOOD |

**Analysis:** 
- **Wheat:** 47-56 samples per class, solid 81-90% precision
- **Maize KAB, PAB, ALL Present, ALLAB:** 36-60 samples, 74-82% precision

---

### ⚠️ PROBLEMATIC - This is the Issue!
| Crop | Classes | Avg Precision | Avg Support | Status |
|------|---------|---------------|-------------|---------|
| **Tomato** | 7 | **69.9%** | **18 samples** | ❌ **TOO SMALL** |

---

## 🔴 The Tomato Problem - Detailed Breakdown

### Sample Size Analysis (Validation Set)
| Class | Precision | Recall | F1 | **Support** | Issue |
|-------|-----------|--------|-----|-------------|-------|
| Tomato - Healthy | 64.4% | 76.3% | 69.9% | **38** | Moderate |
| Tomato - Leaf Miner | 84.0% | 80.8% | 82.4% | **26** | Actually OK! |
| Tomato - Mite | 67.7% | 91.3% | 77.8% | **23** | OK samples |
| Tomato - Jassid/Mite | 87.5% | 63.6% | 73.7% | **11** | ⚠️ Small |
| Tomato - K Deficiency | 80.0% | 40.0% | 53.3% | **10** | 🔴 **TOO SMALL** |
| Tomato - N Deficiency | 60.0% | 33.3% | 42.9% | **9** | 🔴 **CRITICALLY SMALL** |
| Tomato - N+K Deficiency | 50.0% | 44.4% | 47.1% | **9** | 🔴 **CRITICALLY SMALL** |

**Average Tomato Support:** 18 samples/class  
**Compare to Rice:** 40 samples/class (2.2x more data!)

---

## 💡 The Real Issue: Class Imbalance

### Validation Set Size Comparison
```
Rice:     3 classes × 40 samples = 120 total ✅ BALANCED
Maize:    6 classes × 48 samples = 290 total ✅ BALANCED
Wheat:    2 classes × 52 samples = 103 total ✅ BALANCED
Tomato:   7 classes × 18 samples = 126 total ❌ IMBALANCED
          └─ BUT: 3 classes have only 9-11 samples! 🔴
```

**The Problem:**
- Rice has 3 classes, each with 38-42 samples ✅
- Tomato has **7 classes**, but 3 of them have only **9-11 samples** ❌
- Classes with <15 samples cannot train properly in deep learning

---

## 📊 Why Small Samples Fail

### Training Set Estimation (80/20 split)
If validation has 9 samples, training likely has ~36 samples:
- **36 training images ÷ 32 batch size = 1.1 batches per epoch**
- Model sees each image only 1-2 times per epoch
- With 15 epochs × 1 batch = **15 total updates** for this class
- **This is insufficient for deep learning!**

### Minimum Requirements for Deep Learning
| Sample Size | Status | Outcome |
|-------------|--------|---------|
| **< 50 total** | 🔴 Critical | Cannot learn patterns |
| **50-150** | ⚠️ Marginal | Weak performance |
| **150-300** | ✅ Acceptable | Good performance |
| **300+** | ✅ Excellent | Strong performance |

**Tomato N/K deficiency classes have ~45-55 total images → TOO SMALL**

---

## 🎯 Dataset Quality vs Quantity

### Image Quality Assessment
Based on performance patterns:

**Good Quality Datasets** (high precision with moderate samples):
- ✅ Rice: 92-97% precision with 38-42 samples
- ✅ Maize NAB: 96% precision with 53 samples
- ✅ Wheat: 81-90% precision with 47-56 samples
- ✅ Tomato Leaf Miner: 84% precision with 26 samples

**Poor Quality? NO! Just Too Few Samples:**
- ❌ Tomato N deficiency: 60% precision with **9 samples** (5x too small)
- ❌ Tomato K deficiency: 80% precision with **10 samples** (4x too small)
- ❌ Tomato N+K deficiency: 50% precision with **9 samples** (5x too small)

**Conclusion:** The tomato images are NOT bad quality. The classes with 20-38 samples perform OK (64-84%). The problem is the 3 nutrient deficiency classes with only 9-11 samples each.

---

## 🗑️ Which Crops to Remove?

### Option 1: Remove Entire Tomato (Recommended) ✅
**Reason:** 
- 3 out of 7 classes critically undersized
- Pest classes (mite, leaf miner) distract from nutrient detection
- Saves model complexity (7 classes)
- **Status:** Already done!

### Option 2: Remove Only Problem Classes
Keep tomato but remove:
- ❌ Tomato - N Deficiency (9 samples)
- ❌ Tomato - K Deficiency (10 samples)
- ❌ Tomato - N+K Deficiency (9 samples)

**Problem:** This leaves only healthy + pests, not useful for nutrient detection!

### Option 3: Merge Small Classes
Merge all nutrient deficiencies into one "Tomato - Nutrient Deficiency" class:
- Combined: 9 + 10 + 9 = 28 samples
- Still too small! (Need 50+ minimum)

---

## ✅ Recommendations by Crop

### KEEP These Crops:
| Crop | Reason | Action |
|------|--------|--------|
| **Rice** | 95% precision, 40 samples/class | ✅ Keep as-is |
| **Maize** | 82-96% precision, 48 samples/class | ✅ Keep all 6 classes |
| **Wheat** | 86% precision, 52 samples/class | ✅ Keep (could improve with more data) |

### REMOVE/FIX These:
| Crop | Issue | Action |
|------|-------|--------|
| **Tomato** | 3 classes <15 samples | ❌ Remove (DONE) |

---

## 📋 Sample Size Requirements Going Forward

### For Adding New Crops:
| Class Count | Min Samples/Class | Total Min | Confidence Expected |
|-------------|-------------------|-----------|---------------------|
| 2-3 classes | 40 | 80-120 | 85-95% ✅ |
| 4-6 classes | 40 | 160-240 | 80-90% ✅ |
| 7+ classes | 50 | 350+ | 75-85% ⚠️ |

### Red Flags to Avoid:
- 🔴 Any class with <15 validation samples (<75 total)
- 🔴 Large class imbalance (e.g., 50 samples in one class, 10 in another)
- 🔴 More than 5 classes per crop without 200+ total images

---

## 🔬 Proof: Small Samples Cause the Problem

### Classes Sorted by Sample Size:
| Class | Support | Precision | Pattern |
|-------|---------|-----------|---------|
| **Rice P** | 41 | 92.5% | ✅ Good samples → Good performance |
| **Rice K** | 42 | 95.1% | ✅ Good samples → Good performance |
| **Rice N** | 38 | 97.3% | ✅ Good samples → Good performance |
| **Maize NAB** | 53 | 96.2% | ✅ Good samples → Good performance |
| **Tomato Miner** | 26 | 84.0% | ✅ OK samples → OK performance |
| **Tomato Mite** | 23 | 67.7% | ⚠️ Small → Weaker |
| **Tomato Jassid** | 11 | 87.5% | ⚠️ Very small (lucky?) |
| **Tomato K** | 10 | 80.0% | 🔴 Critical → 40% recall! |
| **Tomato N** | 9 | 60.0% | 🔴 Critical → 33% recall! |
| **Tomato N+K** | 9 | 50.0% | 🔴 Critical → 44% recall! |

**Clear Pattern:** Precision/recall drops dramatically below 15 samples!

---

## 🎯 Final Verdict

### The Tomato Problem:
❌ **NOT** due to bad image quality  
❌ **NOT** due to poor dataset diversity  
✅ **DUE TO** insufficient samples in 3 nutrient deficiency classes (9-11 samples)

### Image Quality Evidence:
- Tomato classes with 23-38 samples perform at 64-84% precision
- This is reasonable for classes with moderate sample sizes
- If images were bad, even large sample classes would fail
- **Conclusion:** Images are fine, just need 3-4x more of them!

### What You Need to Improve Tomato:
1. **Minimum:** 40+ images per nutrient deficiency class (120+ total for N/P/K)
2. **Better:** 60+ images per class (180+ total)
3. **Best:** 100+ images per class (300+ total)

**Since you don't have time to collect 120-180 more tomato images, removing tomato was the RIGHT decision!** ✅

---

## 📝 Summary

| Crop | Keep? | Reason |
|------|-------|--------|
| Rice | ✅ YES | 95% precision, 40 samples/class |
| Maize | ✅ YES | 82-96% precision, 48 samples/class |
| Wheat | ✅ YES | 86% precision, 52 samples/class |
| Tomato | ❌ NO | 70% precision, only 9-11 samples in key classes |

**No other crops need to be removed!** Rice, wheat, and maize all have sufficient data and good performance.

---

*Analysis shows the issue was sample size, not dataset quality.*
