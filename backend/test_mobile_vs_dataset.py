"""Test mobile photo vs dataset photo preprocessing"""
from ml.unified_inference import predict_unified
import json

print("=" * 70)
print("Testing Mobile Photo vs Dataset Photo")
print("=" * 70)

# Test mobile photo
mobile_photo = 'uploads/7b0e2936-2a52-4c05-8273-8c28c7fd7ec7.jpg'
print("\n📱 Mobile Photo Test:")
print(f"File: {mobile_photo}")
result1 = predict_unified(mobile_photo, crop_id='rice')
print(f"Detected: {result1['detected_class']} ({result1['detected_confidence']:.1%})")
print(f"Top 5: {result1['top_predictions'][:5]}")
print(f"N/P/K Scores: {result1['n_percentage']:.1f}% / {result1['p_percentage']:.1f}% / {result1['k_percentage']:.1f}%")

# Test dataset photo
dataset_photo = r'B:\FasalVaidya\Leaf Nutrient Data Sets\Rice\Nitrogen(N)\untitled-37.JPG'
print("\n🗂️  Dataset Photo Test:")
print(f"File: untitled-37.JPG")
result2 = predict_unified(dataset_photo, crop_id='rice')
print(f"Detected: {result2['detected_class']} ({result2['detected_confidence']:.1%})")
print(f"Top 5: {result2['top_predictions'][:5]}")
print(f"N/P/K Scores: {result2['n_percentage']:.1f}% / {result2['p_percentage']:.1f}% / {result2['k_percentage']:.1f}%")

print("\n" + "=" * 70)
print("Analysis:")
print("=" * 70)
print(f"Mobile confidence: {result1['detected_confidence']:.1%}")
print(f"Dataset confidence: {result2['detected_confidence']:.1%}")
print(f"Confidence gap: {(result2['detected_confidence'] - result1['detected_confidence']) * 100:.1f} percentage points")
