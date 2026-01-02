"""
FasalVaidya ML Inference Service
================================
Handles image preprocessing, model loading, and NPK deficiency prediction.
Provides Grad-CAM heatmap generation for explainability.
Supports crop-specific models from train_crop_model.py
"""

import os
import sys
import json
import base64
import logging
import numpy as np
from pathlib import Path
from io import BytesIO
from PIL import Image

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TF warnings

import tensorflow as tf
from tensorflow import keras
try:
    import cv2  # Optional: used for Grad-CAM heatmaps and blending
except Exception:
    cv2 = None

# Paths
MODELS_DIR = Path(__file__).parent / 'models'
CROP_REGISTRY_PATH = MODELS_DIR / 'crop_registry.json'

# Legacy model configuration (fallback for generic model)
MODEL_CONFIG = {
    # Prefer the best checkpoint produced during training (also for "no early stop" runs).
    'best_model_path': os.path.join(os.path.dirname(__file__), 'models', 'fasalvaidya_npk_best.keras'),
    'model_path': os.path.join(os.path.dirname(__file__), 'models', 'fasalvaidya_npk_model.keras'),
    'tflite_path': os.path.join(os.path.dirname(__file__), 'models', 'fasalvaidya_npk_model.tflite'),
    'metadata_path': os.path.join(os.path.dirname(__file__), 'models', 'model_metadata.json'),
    'input_size': (224, 224),
    'output_labels': ['nitrogen', 'phosphorus', 'potassium'],
}

# Severity thresholds
SEVERITY_THRESHOLDS = {
    'critical': 0.7,    # >= 70% deficiency score
    'attention': 0.4,   # >= 40% deficiency score
    'healthy': 0.0      # < 40% deficiency score
}

# Global model cache (crop_id -> model)
_crop_models = {}
_default_model = None
_default_model_path = None

logger = logging.getLogger('fasalvaidya.ml')


def load_crop_registry():
    """Load the crop model registry."""
    if CROP_REGISTRY_PATH.exists():
        with open(CROP_REGISTRY_PATH) as f:
            return json.load(f)
    return {}


def get_crop_model(crop_id):
    """
    Load model for a specific crop.
    
    Args:
        crop_id: Crop identifier (e.g., 'rice', 'tomato', 'wheat')
    
    Returns:
        tuple: (model, model_path, outputs) or (None, None, None) if not found
    """
    global _crop_models
    
    if crop_id in _crop_models:
        return _crop_models[crop_id]
    
    registry = load_crop_registry()
    
    if crop_id in registry:
        entry = registry[crop_id]
        model_path = entry.get('model_path')
        
        if model_path and os.path.exists(model_path):
            logger.info("ml_crop_model_loading crop=%s path=%s", crop_id, model_path)
            try:
                model = keras.models.load_model(model_path)
                outputs = entry.get('outputs', ['N', 'P', 'K'])
                _crop_models[crop_id] = (model, model_path, outputs)
                logger.info("ml_crop_model_loaded crop=%s ok=true", crop_id)
                return _crop_models[crop_id]
            except Exception as e:
                logger.error("ml_crop_model_load_error crop=%s error=%s", crop_id, str(e))
    
    # Crop model not found
    logger.warning("ml_crop_model_not_found crop=%s", crop_id)
    return None, None, None


def get_model():
    """Lazy load and cache the default (generic) model."""
    global _default_model
    global _default_model_path
    
    if _default_model is None:
        # Allow explicit override
        override_path = os.getenv('FASALVAIDYA_MODEL_PATH')
        candidate_paths = [
            override_path,
            MODEL_CONFIG.get('best_model_path'),
            MODEL_CONFIG.get('model_path'),
        ]
        candidate_paths = [p for p in candidate_paths if p]

        chosen_path = None
        for p in candidate_paths:
            if os.path.exists(p):
                chosen_path = p
                break

        if chosen_path:
            logger.info("ml_model_loading path=%s", chosen_path)
            _default_model = keras.models.load_model(chosen_path)
            _default_model_path = chosen_path
            logger.info("ml_model_loaded ok=true")
        else:
            logger.warning("ml_model_missing candidates=%s", candidate_paths)
            _default_model = None
            _default_model_path = None
    
    return _default_model


def get_tflite_interpreter():
    """Get TFLite interpreter for mobile inference."""
    global _tflite_interpreter
    
    if _tflite_interpreter is None:
        tflite_path = MODEL_CONFIG['tflite_path']
        
        if os.path.exists(tflite_path):
            _tflite_interpreter = tf.lite.Interpreter(model_path=tflite_path)
            _tflite_interpreter.allocate_tensors()
    
    return _tflite_interpreter


def preprocess_image(image_input, target_size=(224, 224)):
    """
    Preprocess image for model inference.
    
    Args:
        image_input: Can be file path, PIL Image, numpy array, or file-like object
        target_size: Target size for resize (default: 224x224)
    
    Returns:
        Preprocessed numpy array ready for model input
    """
    # Handle different input types
    if isinstance(image_input, str):
        # File path
        img = Image.open(image_input).convert('RGB')
    elif isinstance(image_input, np.ndarray):
        # Numpy array
        if image_input.dtype == np.uint8:
            img = Image.fromarray(image_input)
        else:
            img = Image.fromarray((image_input * 255).astype(np.uint8))
    elif hasattr(image_input, 'read'):
        # File-like object (Flask upload)
        img = Image.open(image_input).convert('RGB')
    elif isinstance(image_input, Image.Image):
        # PIL Image
        img = image_input.convert('RGB')
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")
    
    # Resize
    img = img.resize(target_size, Image.LANCZOS)
    
    # Convert to numpy array and normalize
    img_array = np.array(img, dtype=np.float32)
    img_array = img_array / 255.0
    
    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array, img


def get_severity(score):
    """Determine severity level based on deficiency score."""
    if score >= SEVERITY_THRESHOLDS['critical']:
        return 'critical'
    elif score >= SEVERITY_THRESHOLDS['attention']:
        return 'attention'
    else:
        return 'healthy'


def get_severity_color(severity):
    """Get color code for severity level."""
    colors = {
        'critical': '#D63D3D',    # Red
        'attention': '#F5A623',   # Orange
        'healthy': '#208F78'      # Teal/Green
    }
    return colors.get(severity, '#6B7280')


def predict_npk(image_input, use_tflite=False, crop_id=None):
    """
    Run NPK deficiency prediction on an image.
    
    Args:
        image_input: Image to analyze (path, PIL Image, numpy array, or file object)
        use_tflite: Use TFLite model for faster inference (optional)
        crop_id: Optional crop identifier for crop-specific model
    
    Returns:
        dict with predictions, confidence scores, severity, and metadata
    """
    # Preprocess image
    img_array, original_img = preprocess_image(image_input)
    
    model = None
    model_path_used = None
    outputs = ['N', 'P', 'K']
    
    # Try crop-specific model first
    if crop_id:
        model, model_path_used, outputs = get_crop_model(crop_id)
    
    # Fallback to default model
    if model is None:
        model = get_model()
        model_path_used = _default_model_path
    
    if model is not None:
        # Real model prediction
        predictions = model.predict(img_array, verbose=0)[0]
        
        # Calculate confidence based on prediction certainty
        # Higher confidence when predictions are closer to 0 or 1
        confidences = np.abs(predictions - 0.5) * 2  # Scale to [0, 1]
        confidences = np.clip(confidences * 1.2, 0.6, 0.98)  # Adjust range
        inference_method = 'tflite' if use_tflite else 'keras'
        
    else:
        # Mock predictions for demo (when model not trained yet)
        predictions = generate_mock_predictions(img_array)
        confidences = np.array([0.85, 0.82, 0.78])
        inference_method = 'mock'
        logger.warning("ml_inference_mock reason=model_unavailable crop=%s", crop_id)
    
    # Build response
    n_score, p_score, k_score = predictions[:3]  # Take first 3 outputs
    n_conf, p_conf, k_conf = confidences[:3]
    
    result = {
        # Raw scores (0-1 range)
        'n_score': float(n_score),
        'p_score': float(p_score),
        'k_score': float(k_score),
        
        # Percentage scores (0-100)
        'n_percentage': round(float(n_score) * 100, 1),
        'p_percentage': round(float(p_score) * 100, 1),
        'k_percentage': round(float(k_score) * 100, 1),
        
        # Confidence scores
        'n_confidence': round(float(n_conf), 2),
        'p_confidence': round(float(p_conf), 2),
        'k_confidence': round(float(k_conf), 2),
        
        # Severity levels
        'n_severity': get_severity(n_score),
        'p_severity': get_severity(p_score),
        'k_severity': get_severity(k_score),
        
        # Overall status
        'overall_status': determine_overall_status(n_score, p_score, k_score),
        
        # Detected class (primary deficiency)
        'detected_class': determine_detected_class(n_score, p_score, k_score),
        
        # Model metadata
        'model_version': '1.0.0',
        'inference_method': inference_method,
        'model_path_used': model_path_used,
        'crop_id': crop_id,
    }
    
    return result


def generate_mock_predictions(img_array):
    """
    Generate mock predictions based on image color analysis.
    Used when model is not yet trained.
    """
    # Analyze color channels
    img = img_array[0]  # Remove batch dimension
    
    # Calculate mean RGB values
    r_mean = np.mean(img[:, :, 0])
    g_mean = np.mean(img[:, :, 1])
    b_mean = np.mean(img[:, :, 2])
    
    # Simple heuristics based on leaf color
    # Yellow/light green = N deficiency
    # Purple/dark = P deficiency
    # Brown edges = K deficiency
    
    # Nitrogen: Yellow leaves (high R+G, low difference)
    n_score = max(0, min(1, (r_mean + g_mean - b_mean) / 1.5))
    
    # Phosphorus: Purple/dark (low overall brightness)
    brightness = (r_mean + g_mean + b_mean) / 3
    p_score = max(0, min(1, 1 - brightness * 1.5))
    
    # Potassium: Brown edges (simulate with color variance)
    k_score = max(0, min(1, np.std(img) * 2))
    
    # Add some randomness for demo variety
    noise = np.random.uniform(-0.1, 0.1, 3)
    predictions = np.clip([n_score + noise[0], p_score + noise[1], k_score + noise[2]], 0, 1)
    
    return predictions


def determine_overall_status(n_score, p_score, k_score):
    """Determine overall crop health status."""
    max_score = max(n_score, p_score, k_score)
    
    if max_score >= SEVERITY_THRESHOLDS['critical']:
        return 'critical'
    elif max_score >= SEVERITY_THRESHOLDS['attention']:
        return 'attention'
    else:
        return 'healthy'


def determine_detected_class(n_score, p_score, k_score):
    """Determine the primary detected deficiency class."""
    scores = {'nitrogen': n_score, 'phosphorus': p_score, 'potassium': k_score}
    
    # Find highest scoring deficiency
    max_nutrient = max(scores, key=scores.get)
    max_score = scores[max_nutrient]
    
    if max_score >= SEVERITY_THRESHOLDS['attention']:
        return f"{max_nutrient}_deficiency"
    else:
        return 'healthy'


def generate_gradcam_heatmap(image_input, target_class=None):
    """
    Generate Grad-CAM heatmap for visual explanation.
    
    Args:
        image_input: Image to analyze
        target_class: Class index to explain (0=N, 1=P, 2=K, None=highest)
    
    Returns:
        Base64 encoded heatmap overlay image
    """
    model = get_model()
    
    if model is None:
        return None
    
    # Preprocess image
    img_array, original_img = preprocess_image(image_input)
    
    # Get predictions to determine target class
    predictions = model.predict(img_array, verbose=0)[0]
    
    if target_class is None:
        target_class = np.argmax(predictions)
    
    # Find the last convolutional layer
    last_conv_layer = None
    for layer in reversed(model.layers):
        if isinstance(layer, (keras.layers.Conv2D, keras.layers.DepthwiseConv2D)):
            last_conv_layer = layer.name
            break
    
    if last_conv_layer is None:
        # Fallback: return original image with mild overlay
        return create_simple_overlay(original_img, predictions)

    if cv2 is None:
        # Grad-CAM requires OpenCV for resizing/colormap. Fall back to a simple overlay.
        return create_simple_overlay(original_img, predictions)
    
    try:
        # Create gradient model
        grad_model = keras.Model(
            inputs=model.input,
            outputs=[model.get_layer(last_conv_layer).output, model.output]
        )
        
        # Compute gradients
        with tf.GradientTape() as tape:
            conv_output, predictions_tensor = grad_model(img_array)
            loss = predictions_tensor[:, target_class]
        
        grads = tape.gradient(loss, conv_output)
        
        # Global average pooling of gradients
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        # Weight feature maps by gradients
        conv_output = conv_output[0]
        heatmap = conv_output @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)
        
        # Normalize heatmap
        heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap)
        heatmap = heatmap.numpy()
        
        # Resize heatmap to original image size
        heatmap = cv2.resize(heatmap, (original_img.width, original_img.height))
        
        # Convert to colormap
        heatmap = np.uint8(255 * heatmap)
        heatmap_colored = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        
        # Overlay on original image
        original_array = np.array(original_img)
        overlay = cv2.addWeighted(original_array, 0.6, heatmap_colored, 0.4, 0)
        
        # Convert to base64
        overlay_img = Image.fromarray(overlay)
        buffered = BytesIO()
        overlay_img.save(buffered, format="JPEG", quality=85)
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        return f"data:image/jpeg;base64,{img_base64}"
        
    except Exception as e:
        print(f"⚠️  Grad-CAM generation failed: {e}")
        return create_simple_overlay(original_img, predictions)


def create_simple_overlay(original_img, predictions):
    """Create a simple colored overlay based on predictions."""
    # Convert to numpy
    img_array = np.array(original_img)

    def _blend(base, overlay, alpha):
        base_f = base.astype(np.float32)
        overlay_f = overlay.astype(np.float32)
        out = (1.0 - alpha) * base_f + alpha * overlay_f
        return np.clip(out, 0, 255).astype(np.uint8)
    
    # Determine color based on highest deficiency
    max_idx = np.argmax(predictions)
    colors = {
        0: (255, 255, 0),    # Yellow for N
        1: (128, 0, 128),    # Purple for P
        2: (139, 69, 19)     # Brown for K
    }
    
    if predictions[max_idx] >= SEVERITY_THRESHOLDS['attention']:
        color = colors.get(max_idx, (128, 128, 128))
        overlay = np.full_like(img_array, color, dtype=np.uint8)
        if cv2 is not None:
            blended = cv2.addWeighted(img_array, 0.7, overlay, 0.3, 0)
        else:
            blended = _blend(img_array, overlay, 0.3)
    else:
        # Healthy - light green tint
        overlay = np.full_like(img_array, (144, 238, 144), dtype=np.uint8)
        if cv2 is not None:
            blended = cv2.addWeighted(img_array, 0.8, overlay, 0.2, 0)
        else:
            blended = _blend(img_array, overlay, 0.2)
    
    # Convert to base64
    overlay_img = Image.fromarray(blended)
    buffered = BytesIO()
    overlay_img.save(buffered, format="JPEG", quality=85)
    img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    return f"data:image/jpeg;base64,{img_base64}"


def get_model_info():
    """Get model information and metadata."""
    metadata_path = MODEL_CONFIG['metadata_path']
    
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            return json.load(f)
    
    return {
        'model_name': 'FasalVaidya NPK Detector',
        'version': '1.0.0',
        'status': 'mock_mode' if get_model() is None else 'ready',
        'input_shape': [224, 224, 3],
        'output_labels': MODEL_CONFIG['output_labels']
    }


# Test function
if __name__ == '__main__':
    print("🧪 Testing ML Inference Service...")
    
    # Create a test image
    test_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    test_img = Image.fromarray(test_img)
    
    # Run prediction
    result = predict_npk(test_img)
    print(f"\n📊 Prediction Result:")
    print(json.dumps(result, indent=2))
    
    # Get model info
    info = get_model_info()
    print(f"\n📋 Model Info:")
    print(json.dumps(info, indent=2))
