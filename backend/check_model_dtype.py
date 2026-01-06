"""Check if model was trained with mixed precision."""
import zipfile
import json

keras_path = '../unified model and images/unified_nutrient_best.keras'

with zipfile.ZipFile(keras_path, 'r') as z:
    config_json = z.read('config.json').decode('utf-8')
    config = json.loads(config_json)
    
layers = config.get('config', {}).get('layers', [])
print(f'Total layers: {len(layers)}\n')

print('Checking for mixed precision dtype policies...\n')
has_mixed = False
for layer in layers:
    cfg = layer.get('config', {})
    if 'dtype' in cfg:
        dtype_val = cfg['dtype']
        if isinstance(dtype_val, dict):
            name = cfg.get('name', 'unknown')
            print(f'❌ {name}: {dtype_val}')
            has_mixed = True

if has_mixed:
    print('\n⚠️ MODEL STILL HAS MIXED PRECISION!')
    print('The notebook cell was not changed correctly.')
    print('\nIn Colab, find this line:')
    print("  tf.keras.mixed_precision.set_global_policy('mixed_float16')")
    print('\nChange to:')
    print("  tf.keras.mixed_precision.set_global_policy('float32')")
else:
    print('\n✅ Model is using float32 - should load correctly!')
