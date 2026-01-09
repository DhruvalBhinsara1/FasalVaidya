"""
Test script for Unified Model v2 (9 crops, 43 classes)
Verifies model loading, inference, and crop support
"""

import sys
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from ml.unified_inference import (
    load_unified_model, 
    get_unified_metadata, 
    get_unified_labels,
    CLASS_TO_NPK
)

def test_model_loading():
    """Test if v2 model loads successfully"""
    print("="*70)
    print("🧪 TEST 1: Model Loading")
    print("="*70)
    
    try:
        model, model_type = load_unified_model()
        print(f"✅ Model loaded successfully!")
        print(f"   Type: {model_type}")
        
        if model_type == 'keras':
            print(f"   Layers: {len(model.layers)}")
            print(f"   Output shape: {model.output_shape}")
            print(f"   Classes: {model.output_shape[-1]}")
        
        return True
    except Exception as e:
        print(f"❌ Model loading failed: {e}")
        return False

def test_metadata():
    """Test if v2 metadata is correct"""
    print("\n" + "="*70)
    print("🧪 TEST 2: Metadata Validation")
    print("="*70)
    
    try:
        metadata = get_unified_metadata()
        print(f"✅ Metadata loaded!")
        print(f"   Model version: {metadata.get('model_version', 'unknown')}")
        print(f"   Crops: {metadata.get('num_crops', 0)}")
        print(f"   Classes: {metadata.get('num_classes', 0)}")
        print(f"   Accuracy: {metadata.get('metrics', {}).get('accuracy', 0):.2%}")
        print(f"   Top-3 Accuracy: {metadata.get('metrics', {}).get('top3_accuracy', 0):.2%}")
        
        crops = metadata.get('supported_crops', [])
        print(f"\n   Supported crops:")
        for crop in crops:
            classes = metadata.get('crop_class_mapping', {}).get(crop, [])
            print(f"     • {crop.capitalize()}: {len(classes)} classes")
        
        skipped = metadata.get('skipped_crops', [])
        if skipped:
            print(f"\n   ⚠️  Skipped crops: {', '.join(skipped)}")
        
        return True
    except Exception as e:
        print(f"❌ Metadata loading failed: {e}")
        return False

def test_labels():
    """Test if labels match expected count"""
    print("\n" + "="*70)
    print("🧪 TEST 3: Label Validation")
    print("="*70)
    
    try:
        labels = get_unified_labels()
        print(f"✅ Labels loaded!")
        print(f"   Count: {len(labels)}")
        print(f"\n   First 10 labels:")
        for i, label in enumerate(labels[:10], 1):
            print(f"     {i}. {label}")
        print(f"   ...")
        print(f"   {len(labels)}. {labels[-1]}")
        
        return len(labels) == 43
    except Exception as e:
        print(f"❌ Label loading failed: {e}")
        return False

def test_npk_mapping():
    """Test if CLASS_TO_NPK has all 43 classes"""
    print("\n" + "="*70)
    print("🧪 TEST 4: NPK Mapping Validation")
    print("="*70)
    
    labels = get_unified_labels()
    missing = []
    
    for label in labels:
        if label not in CLASS_TO_NPK:
            missing.append(label)
    
    if missing:
        print(f"❌ Missing NPK mappings for {len(missing)} classes:")
        for label in missing:
            print(f"   • {label}")
        return False
    else:
        print(f"✅ All {len(labels)} classes have NPK mappings!")
        
        # Show sample mappings
        print(f"\n   Sample mappings:")
        crops_shown = set()
        for label in labels:
            crop = label.split('_')[0]
            if crop not in crops_shown and len(crops_shown) < 5:
                crops_shown.add(crop)
                npk = CLASS_TO_NPK[label]
                print(f"     • {label}: N={npk['N']}, P={npk['P']}, K={npk['K']}, Mg={npk['Mg']}")
        
        return True

def test_crop_coverage():
    """Test if all 9 crops are covered"""
    print("\n" + "="*70)
    print("🧪 TEST 5: Crop Coverage")
    print("="*70)
    
    expected_crops = ['rice', 'wheat', 'maize', 'banana', 'coffee', 
                     'ashgourd', 'eggplant', 'snakegourd', 'bittergourd']
    
    labels = get_unified_labels()
    found_crops = set()
    
    for label in labels:
        crop = label.split('_')[0]
        found_crops.add(crop)
    
    missing_crops = set(expected_crops) - found_crops
    extra_crops = found_crops - set(expected_crops)
    
    if missing_crops:
        print(f"❌ Missing crops: {', '.join(missing_crops)}")
        return False
    
    if extra_crops:
        print(f"⚠️  Extra crops (legacy?): {', '.join(extra_crops)}")
    
    print(f"✅ All {len(expected_crops)} expected crops found!")
    print(f"\n   Breakdown:")
    for crop in expected_crops:
        crop_classes = [l for l in labels if l.startswith(f"{crop}_")]
        print(f"     • {crop.capitalize()}: {len(crop_classes)} classes")
    
    return True

def main():
    """Run all tests"""
    print("\n🚀 FasalVaidya Unified Model v2 Test Suite")
    print("="*70)
    
    tests = [
        ("Model Loading", test_model_loading),
        ("Metadata", test_metadata),
        ("Labels", test_labels),
        ("NPK Mapping", test_npk_mapping),
        ("Crop Coverage", test_crop_coverage),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Test '{name}' crashed: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status}: {name}")
    
    print(f"\n   Result: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Unified Model v2 is ready!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review.")
        return 1

if __name__ == '__main__':
    exit(main())
