"""Quick test of inference fix"""
from ml.unified_inference import predict_unified

print("Testing last uploaded image...")
r = predict_unified('uploads/f8d91206-c4e4-4d15-a10e-444c27648eb5.jpg', 'rice')

print(f"\nDetected: {r['detected_class']} ({r['detected_confidence']*100:.1f}%)")
print(f"N: {r['n_percentage']}% health ({r['n_severity']})")
print(f"P: {r['p_percentage']}% health ({r['p_severity']})")
print(f"K: {r['k_percentage']}% health ({r['k_severity']})")
print(f"Overall: {r['overall_status']}")
print(f"\nTop 5 predictions: {r['top_predictions'][:5]}")
