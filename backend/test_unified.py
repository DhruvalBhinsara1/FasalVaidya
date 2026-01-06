"""Quick test for unified inference."""
from ml.unified_inference import predict_npk_unified
import base64
import json
from PIL import Image
from io import BytesIO

result = predict_npk_unified('test_images/synthetic_rice_leaf.png', crop_id='rice', generate_heatmap=True)

# Print all result keys
print('\n=== Result Keys ===')
print(list(result.keys()))

# Print result (without the heatmap base64)
print('\n=== Prediction Results ===')
print(f'N score: {result["n_score"]*100:.1f}% ({result["n_severity"]})')
print(f'P score: {result["p_score"]*100:.1f}% ({result["p_severity"]})')
print(f'K score: {result["k_score"]*100:.1f}% ({result["k_severity"]})')
print(f'Detected: {result["detected_class"]}')
print(f'Confidence: {result["detected_confidence"]*100:.1f}%')
print(f'Overall status: {result["overall_status"]}')
print(f'Heatmap key present: {"heatmap" in result}')

# Save heatmap if generated
if result.get('heatmap'):
    print(f'Heatmap value type: {type(result["heatmap"])}')
    if isinstance(result['heatmap'], str) and result['heatmap'].startswith('data:image'):
        # Extract base64 part
        img_data_uri = result['heatmap']
        img_data = img_data_uri.split(',')[1]
        img_bytes = base64.b64decode(img_data)
        img = Image.open(BytesIO(img_bytes))
        img.save('test_images/rice_heatmap_output.png')
        print(f'✅ Heatmap saved to test_images/rice_heatmap_output.png (size: {img.size})')
else:
    print('❌ No heatmap generated')
