"""
FasalVaidya Unified Model Inference
===================================
Handles inference using the unified multi-crop TFLite model trained on 4 crops.
Maps class predictions to NPK deficiency scores.
Generates beautiful Grad-CAM style heatmaps showing deficiency areas.
"""

import os
import json
import base64
import logging
import numpy as np
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageFilter

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

try:
    import tensorflow as tf
    HAS_TF = True
except ImportError:
    HAS_TF = False

# Paths
MODELS_DIR = Path(__file__).parent / 'models'
UNIFIED_KERAS_PATH = MODELS_DIR / 'unified_rebuilt.keras'  # Use rebuilt model
UNIFIED_KERAS_ORIGINAL_PATH = MODELS_DIR / 'unified_nutrient_best.keras'  # Original (has loading issues)
UNIFIED_SAVEDMODEL_PATH = MODELS_DIR / 'unified_savedmodel'
UNIFIED_TFLITE_PATH = MODELS_DIR / 'fasalvaidya_unified.tflite'
UNIFIED_METADATA_PATH = MODELS_DIR / 'unified_model_metadata.json'
UNIFIED_LABELS_PATH = MODELS_DIR / 'unified_labels.txt'

logger = logging.getLogger('fasalvaidya.unified')

# Global model cache
_unified_model = None
_unified_interpreter = None
_unified_metadata = None
_unified_labels = None

# =============================================================================
# CLASS TO NPK MAPPING
# =============================================================================
# Maps each class to NPK+Mg deficiency scores (0.0 = healthy, 1.0 = severe deficiency)

CLASS_TO_NPK = {
    # MAIZE classes
    'maize_ALL Present': {'N': 0.0, 'P': 0.0, 'K': 0.0, 'Mg': 0.0},  # All nutrients present = healthy
    'maize_ALLAB': {'N': 0.0, 'P': 0.0, 'K': 0.0, 'Mg': 0.0},  # All absent baseline
    'maize_NAB': {'N': 0.85, 'P': 0.1, 'K': 0.1, 'Mg': 0.0},  # Nitrogen absent
    'maize_PAB': {'N': 0.1, 'P': 0.85, 'K': 0.1, 'Mg': 0.0},  # Phosphorus absent
    'maize_KAB': {'N': 0.1, 'P': 0.1, 'K': 0.85, 'Mg': 0.0},  # Potassium absent
    'maize_ZNAB': {'N': 0.1, 'P': 0.1, 'K': 0.1, 'Mg': 0.7},  # Zinc absent (map to Mg)
    
    # RICE classes
    'rice_Nitrogen(N)': {'N': 0.85, 'P': 0.1, 'K': 0.1, 'Mg': 0.0},
    'rice_Phosphorus(P)': {'N': 0.1, 'P': 0.85, 'K': 0.1, 'Mg': 0.0},
    'rice_Potassium(K)': {'N': 0.1, 'P': 0.1, 'K': 0.85, 'Mg': 0.0},
    
    # TOMATO classes
    'tomato_Tomato - Healthy': {'N': 0.0, 'P': 0.0, 'K': 0.0, 'Mg': 0.0},
    'tomato_Tomato - Nitrogen Deficiency': {'N': 0.85, 'P': 0.1, 'K': 0.1, 'Mg': 0.0},
    'tomato_Tomato - Potassium Deficiency': {'N': 0.1, 'P': 0.1, 'K': 0.85, 'Mg': 0.0},
    'tomato_Tomato - Nitrogen and Potassium Deficiency': {'N': 0.75, 'P': 0.1, 'K': 0.75, 'Mg': 0.0},
    'tomato_Tomato - Leaf Miner': {'N': 0.2, 'P': 0.2, 'K': 0.2, 'Mg': 0.0},  # Pest - minor stress
    'tomato_Tomato - Mite': {'N': 0.2, 'P': 0.2, 'K': 0.2, 'Mg': 0.0},
    'tomato_Tomato - Jassid and Mite': {'N': 0.3, 'P': 0.2, 'K': 0.3, 'Mg': 0.0},
    
    # WHEAT classes
    'wheat_control': {'N': 0.0, 'P': 0.0, 'K': 0.0, 'Mg': 0.0},  # Healthy control
    'wheat_deficiency': {'N': 0.75, 'P': 0.3, 'K': 0.3, 'Mg': 0.0},  # General deficiency (mainly N)
}

# Severity thresholds
SEVERITY_THRESHOLDS = {
    'critical': 0.7,
    'attention': 0.4,
    'healthy': 0.0
}


def load_unified_model():
    """Load the unified Keras model (preferred) or TFLite model."""
    global _unified_model, _unified_interpreter, _unified_metadata, _unified_labels
    
    # Return cached model if available
    if _unified_model is not None:
        return _unified_model, 'keras'
    if _unified_interpreter is not None:
        return _unified_interpreter, 'tflite'
    
    # Load metadata first
    if UNIFIED_METADATA_PATH.exists():
        with open(UNIFIED_METADATA_PATH) as f:
            _unified_metadata = json.load(f)
    
    # Load labels
    if UNIFIED_LABELS_PATH.exists():
        with open(UNIFIED_LABELS_PATH) as f:
            _unified_labels = [line.strip() for line in f.readlines()]
    
    # Try rebuilt Keras model first (this is the clean version we created)
    if UNIFIED_KERAS_PATH.exists():
        try:
            import tensorflow as tf
            
            # Clear any previous session state
            tf.keras.backend.clear_session()
            
            # Set float32 policy BEFORE loading
            tf.keras.mixed_precision.set_global_policy('float32')
            
            _unified_model = tf.keras.models.load_model(
                str(UNIFIED_KERAS_PATH), 
                compile=False
            )
            
            logger.info("unified_keras_model_loaded path=%s layers=%d", 
                       UNIFIED_KERAS_PATH, len(_unified_model.layers))
            return _unified_model, 'keras'
        except Exception as e:
            logger.error("unified_keras_model_load_error error=%s", str(e))
            _unified_model = None
    
    # Fallback to SavedModel format
    if UNIFIED_SAVEDMODEL_PATH.exists() and HAS_TF:
        try:
            import tensorflow as tf
            _unified_model = tf.saved_model.load(str(UNIFIED_SAVEDMODEL_PATH))
            logger.info("unified_savedmodel_loaded path=%s", UNIFIED_SAVEDMODEL_PATH)
            return _unified_model, 'savedmodel'
        except Exception as e:
            logger.error("unified_savedmodel_load_error error=%s", str(e))
    
    logger.warning("unified_model_not_found keras=%s savedmodel=%s - will use mock predictions", 
                   UNIFIED_KERAS_PATH.exists(), UNIFIED_SAVEDMODEL_PATH.exists())
    return None, None
    
    logger.warning("unified_model_not_found keras=%s tflite=%s - will use mock predictions", 
                   UNIFIED_KERAS_PATH.exists(), UNIFIED_TFLITE_PATH.exists())
    return None, None


def get_unified_metadata():
    """Get unified model metadata."""
    global _unified_metadata
    if _unified_metadata is None:
        load_unified_model()
    return _unified_metadata or {}


def get_unified_labels():
    """Get unified model class labels."""
    global _unified_labels
    if _unified_labels is None:
        load_unified_model()
    return _unified_labels or []


def preprocess_image(image_input, target_size=(224, 224)):
    """
    Preprocess image for MobileNetV2 inference.
    MobileNetV2 expects input normalized to [-1, 1].
    """
    # Handle different input types
    if isinstance(image_input, str):
        img = Image.open(image_input).convert('RGB')
    elif isinstance(image_input, np.ndarray):
        if image_input.dtype == np.uint8:
            img = Image.fromarray(image_input)
        else:
            img = Image.fromarray((image_input * 255).astype(np.uint8))
    elif hasattr(image_input, 'read'):
        img = Image.open(image_input).convert('RGB')
    elif isinstance(image_input, Image.Image):
        img = image_input.convert('RGB')
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")
    
    # Resize
    img = img.resize(target_size, Image.LANCZOS)
    
    # Convert to numpy array
    img_array = np.array(img, dtype=np.float32)
    
    # MobileNetV2 preprocessing: normalize to [-1, 1]
    img_array = (img_array / 127.5) - 1.0
    
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


def predict_unified(image_input, crop_id=None):
    """
    Run unified model prediction on an image.
    
    Args:
        image_input: Image to analyze (path, PIL Image, numpy array, or file object)
        crop_id: Optional crop identifier to filter classes (rice, wheat, tomato, maize)
    
    Returns:
        dict with predictions, NPK scores, severity, and metadata
    """
    model_or_interpreter, model_type = load_unified_model()
    labels = get_unified_labels()
    metadata = get_unified_metadata()
    
    if model_or_interpreter is None:
        logger.warning("unified_inference_mock reason=model_unavailable")
        return generate_mock_result(crop_id)
    
    # Preprocess image
    img_array, original_img = preprocess_image(image_input)
    
    # Run inference based on model type
    if model_type == 'keras':
        # Keras model inference
        predictions = model_or_interpreter.predict(img_array, verbose=0)[0]
    elif model_type == 'savedmodel':
        # SavedModel inference
        import tensorflow as tf
        result = model_or_interpreter.signatures['serve'](tf.constant(img_array))
        # Get the output tensor (might be named 'output_0' or similar)
        output_key = list(result.keys())[0]
        predictions = result[output_key].numpy()[0]
    else:
        # TFLite inference
        input_details = model_or_interpreter.get_input_details()
        output_details = model_or_interpreter.get_output_details()
        model_or_interpreter.set_tensor(input_details[0]['index'], img_array)
        model_or_interpreter.invoke()
        predictions = model_or_interpreter.get_tensor(output_details[0]['index'])[0]
    
    # Get top predictions
    top_indices = np.argsort(predictions)[::-1][:5]
    top_classes = [(labels[i], float(predictions[i])) for i in top_indices if i < len(labels)]
    
    logger.info("unified_predictions top=%s", top_classes[:3])
    
    # Filter by crop if specified
    if crop_id:
        crop_prefix = f"{crop_id.lower()}_"
        crop_indices = [i for i, label in enumerate(labels) if label.startswith(crop_prefix)]
        if crop_indices:
            crop_predictions = [(labels[i], float(predictions[i])) for i in crop_indices]
            crop_predictions.sort(key=lambda x: x[1], reverse=True)
            top_class, top_confidence = crop_predictions[0]
        else:
            top_class, top_confidence = top_classes[0]
    else:
        top_class, top_confidence = top_classes[0]
    
    # Map class to NPK scores
    npk_scores = CLASS_TO_NPK.get(top_class, {'N': 0.3, 'P': 0.3, 'K': 0.3, 'Mg': 0.0})
    
    # Adjust scores based on confidence
    n_score = npk_scores['N'] * top_confidence
    p_score = npk_scores['P'] * top_confidence
    k_score = npk_scores['K'] * top_confidence
    mg_score = npk_scores['Mg'] * top_confidence
    
    # Calculate confidence (based on prediction certainty)
    base_conf = min(0.98, top_confidence + 0.1)
    
    result = {
        # Raw scores (0-1 range)
        'n_score': float(n_score),
        'p_score': float(p_score),
        'k_score': float(k_score),
        'mg_score': float(mg_score),
        
        # Percentage scores (0-100)
        'n_percentage': round(n_score * 100, 1),
        'p_percentage': round(p_score * 100, 1),
        'k_percentage': round(k_score * 100, 1),
        'mg_percentage': round(mg_score * 100, 1),
        
        # Confidence scores
        'n_confidence': round(base_conf, 2),
        'p_confidence': round(base_conf, 2),
        'k_confidence': round(base_conf, 2),
        'mg_confidence': round(base_conf, 2),
        
        # Severity levels
        'n_severity': get_severity(n_score),
        'p_severity': get_severity(p_score),
        'k_severity': get_severity(k_score),
        'mg_severity': get_severity(mg_score),
        
        # Overall status
        'overall_status': determine_overall_status(n_score, p_score, k_score, mg_score),
        
        # Detected class info
        'detected_class': top_class,
        'detected_confidence': float(top_confidence),
        'top_predictions': top_classes[:5],
        
        # Model metadata
        'model_version': '2.0.0',
        'model_type': 'unified_multi_crop',
        'inference_method': 'tflite_unified',
        'crop_id': crop_id,
        'supported_crops': metadata.get('supported_crops', ['rice', 'wheat', 'tomato', 'maize']),
    }
    
    return result


def determine_overall_status(n_score, p_score, k_score, mg_score=0.0):
    """Determine overall crop health status."""
    max_score = max(n_score, p_score, k_score, mg_score)
    
    if max_score >= SEVERITY_THRESHOLDS['critical']:
        return 'critical'
    elif max_score >= SEVERITY_THRESHOLDS['attention']:
        return 'attention'
    else:
        return 'healthy'


def generate_mock_result(crop_id=None):
    """Generate mock result when model is unavailable."""
    return {
        'n_score': 0.4,
        'p_score': 0.2,
        'k_score': 0.3,
        'mg_score': 0.1,
        'n_percentage': 40.0,
        'p_percentage': 20.0,
        'k_percentage': 30.0,
        'mg_percentage': 10.0,
        'n_confidence': 0.75,
        'p_confidence': 0.75,
        'k_confidence': 0.75,
        'mg_confidence': 0.75,
        'n_severity': 'attention',
        'p_severity': 'healthy',
        'k_severity': 'healthy',
        'mg_severity': 'healthy',
        'overall_status': 'attention',
        'detected_class': 'mock_prediction',
        'detected_confidence': 0.75,
        'top_predictions': [],
        'model_version': '2.0.0',
        'model_type': 'mock',
        'inference_method': 'mock',
        'crop_id': crop_id,
        'supported_crops': ['rice', 'wheat', 'tomato', 'maize'],
    }


# =============================================================================
# BEAUTIFUL HEATMAP GENERATION
# =============================================================================

def generate_deficiency_heatmap(image_input, predictions_result, crop_id=None):
    """
    Generate a beautiful deficiency heatmap overlaid on the leaf image.
    
    Creates a smooth gradient overlay showing:
    - Blue/Cyan: Healthy areas
    - Yellow: Moderate deficiency
    - Red/Orange: Severe deficiency
    
    Args:
        image_input: Original image (path, PIL Image, numpy array, or file object)
        predictions_result: Result from predict_unified()
        crop_id: Optional crop identifier
    
    Returns:
        Base64 encoded heatmap overlay image
    """
    if not HAS_CV2:
        logger.warning("heatmap_generation_skipped reason=opencv_not_available")
        return None
    
    # Load original image
    if isinstance(image_input, str):
        original_img = Image.open(image_input).convert('RGB')
    elif isinstance(image_input, np.ndarray):
        original_img = Image.fromarray(image_input.astype(np.uint8))
    elif hasattr(image_input, 'read'):
        image_input.seek(0)
        original_img = Image.open(image_input).convert('RGB')
    elif isinstance(image_input, Image.Image):
        original_img = image_input.convert('RGB')
    else:
        return None
    
    # Get dimensions
    width, height = original_img.size
    original_array = np.array(original_img)
    
    # Get deficiency scores
    n_score = predictions_result.get('n_score', 0)
    p_score = predictions_result.get('p_score', 0)
    k_score = predictions_result.get('k_score', 0)
    max_deficiency = max(n_score, p_score, k_score)
    
    # Create leaf mask using color segmentation
    leaf_mask = create_leaf_mask(original_array)
    
    # Generate synthetic deficiency regions based on scores
    heatmap = generate_deficiency_regions(original_array, leaf_mask, predictions_result)
    
    # Apply colormap (custom blue-to-red gradient)
    heatmap_colored = apply_deficiency_colormap(heatmap)
    
    # Blend with original image
    overlay = blend_heatmap_with_image(original_array, heatmap_colored, leaf_mask, alpha=0.5)
    
    # Add legend
    overlay_with_legend = add_heatmap_legend(overlay)
    
    # Convert to base64
    overlay_img = Image.fromarray(overlay_with_legend)
    buffered = BytesIO()
    overlay_img.save(buffered, format="JPEG", quality=92)
    img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    logger.info("heatmap_generated max_deficiency=%.2f", max_deficiency)
    return f"data:image/jpeg;base64,{img_base64}"


def create_leaf_mask(img_array):
    """
    Create a mask identifying leaf pixels using color segmentation.
    """
    # Convert to HSV for better color segmentation
    hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
    
    # Green leaf mask (hue 25-85 for green/yellow-green)
    lower_green = np.array([20, 20, 20])
    upper_green = np.array([90, 255, 255])
    green_mask = cv2.inRange(hsv, lower_green, upper_green)
    
    # Yellow/brown leaf mask (for deficient leaves)
    lower_yellow = np.array([10, 20, 50])
    upper_yellow = np.array([35, 255, 255])
    yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)
    
    # Combine masks
    leaf_mask = cv2.bitwise_or(green_mask, yellow_mask)
    
    # Clean up mask with morphological operations
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    leaf_mask = cv2.morphologyEx(leaf_mask, cv2.MORPH_CLOSE, kernel)
    leaf_mask = cv2.morphologyEx(leaf_mask, cv2.MORPH_OPEN, kernel)
    
    # Fill holes
    contours, _ = cv2.findContours(leaf_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        # Keep largest contour (main leaf)
        largest_contour = max(contours, key=cv2.contourArea)
        leaf_mask = np.zeros_like(leaf_mask)
        cv2.drawContours(leaf_mask, [largest_contour], -1, 255, -1)
    
    # Smooth the mask edges
    leaf_mask = cv2.GaussianBlur(leaf_mask, (21, 21), 0)
    
    return leaf_mask


def generate_deficiency_regions(img_array, leaf_mask, predictions_result):
    """
    Generate synthetic deficiency regions based on leaf color analysis.
    Areas with yellowing, browning, or discoloration get higher deficiency scores.
    """
    height, width = img_array.shape[:2]
    
    # Analyze leaf colors to find deficiency regions
    hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
    
    # Get deficiency scores
    n_score = predictions_result.get('n_score', 0)
    p_score = predictions_result.get('p_score', 0)
    k_score = predictions_result.get('k_score', 0)
    max_deficiency = max(n_score, p_score, k_score)
    
    # Create base heatmap from color analysis
    heatmap = np.zeros((height, width), dtype=np.float32)
    
    if max_deficiency > 0.1:
        # Nitrogen deficiency: Yellow/pale green areas
        # Hue around 30-50 (yellow-green) with high value
        yellow_mask = cv2.inRange(hsv, np.array([20, 30, 100]), np.array([45, 255, 255]))
        n_heatmap = yellow_mask.astype(np.float32) / 255.0 * n_score
        
        # Phosphorus deficiency: Purple/dark areas
        # Low saturation or purple hues
        dark_mask = cv2.inRange(hsv, np.array([0, 0, 0]), np.array([180, 255, 80]))
        purple_mask = cv2.inRange(hsv, np.array([120, 20, 20]), np.array([160, 255, 200]))
        p_heatmap = (dark_mask.astype(np.float32) + purple_mask.astype(np.float32)) / 510.0 * p_score
        
        # Potassium deficiency: Brown edges, tip burn
        # Create edge-weighted mask
        edge_mask = create_edge_emphasis_mask(leaf_mask, width, height)
        brown_mask = cv2.inRange(hsv, np.array([8, 50, 30]), np.array([25, 255, 180]))
        k_heatmap = (brown_mask.astype(np.float32) / 255.0 * 0.7 + edge_mask * 0.3) * k_score
        
        # Combine heatmaps
        heatmap = np.maximum(np.maximum(n_heatmap, p_heatmap), k_heatmap)
    
    # Apply leaf mask
    heatmap = heatmap * (leaf_mask.astype(np.float32) / 255.0)
    
    # Apply heavy Gaussian blur for smooth transitions
    heatmap = cv2.GaussianBlur(heatmap, (51, 51), 0)
    
    # Normalize to 0-1 range
    if heatmap.max() > 0:
        heatmap = heatmap / heatmap.max()
    
    # Scale by max deficiency
    heatmap = heatmap * max_deficiency
    
    return heatmap


def create_edge_emphasis_mask(leaf_mask, width, height):
    """Create a mask that emphasizes leaf edges (for K deficiency symptoms)."""
    # Distance transform from edges
    dist_transform = cv2.distanceTransform(leaf_mask, cv2.DIST_L2, 5)
    
    # Normalize
    if dist_transform.max() > 0:
        dist_transform = dist_transform / dist_transform.max()
    
    # Invert so edges are bright
    edge_emphasis = 1.0 - dist_transform
    
    # Keep only near-edge areas
    edge_emphasis = np.clip(edge_emphasis * 3 - 2, 0, 1)
    
    return edge_emphasis.astype(np.float32)


def apply_deficiency_colormap(heatmap):
    """
    Apply custom colormap: Blue (healthy) -> Cyan -> Green -> Yellow -> Orange -> Red (deficient)
    """
    # Create custom colormap matching the reference image
    # Blue (healthy) -> Cyan -> Yellow -> Orange -> Red (severe)
    
    heatmap_uint8 = (heatmap * 255).astype(np.uint8)
    
    # Use COLORMAP_JET but reverse it (so blue = low, red = high)
    # Or create custom: Blue -> Cyan -> Yellow -> Red
    colored = np.zeros((*heatmap.shape, 3), dtype=np.uint8)
    
    # Define color stops
    # 0.0 = Blue (healthy)
    # 0.3 = Cyan
    # 0.5 = Green-Yellow
    # 0.7 = Yellow
    # 0.85 = Orange  
    # 1.0 = Red (severe)
    
    for y in range(heatmap.shape[0]):
        for x in range(heatmap.shape[1]):
            v = heatmap[y, x]
            if v < 0.3:
                # Blue to Cyan
                t = v / 0.3
                colored[y, x] = [
                    int(30 + t * 0),       # R
                    int(100 + t * 155),    # G  
                    int(200 + t * 55),     # B
                ]
            elif v < 0.5:
                # Cyan to Green-Yellow
                t = (v - 0.3) / 0.2
                colored[y, x] = [
                    int(30 + t * 170),     # R
                    int(255 - t * 55),     # G
                    int(255 - t * 200),    # B
                ]
            elif v < 0.7:
                # Green-Yellow to Yellow
                t = (v - 0.5) / 0.2
                colored[y, x] = [
                    int(200 + t * 55),     # R
                    int(200 + t * 55),     # G
                    int(55 - t * 55),      # B
                ]
            elif v < 0.85:
                # Yellow to Orange
                t = (v - 0.7) / 0.15
                colored[y, x] = [
                    int(255),              # R
                    int(255 - t * 100),    # G
                    int(0),                # B
                ]
            else:
                # Orange to Red
                t = (v - 0.85) / 0.15
                colored[y, x] = [
                    int(255),              # R
                    int(155 - t * 100),    # G
                    int(0 + t * 50),       # B
                ]
    
    return colored


def blend_heatmap_with_image(original, heatmap_colored, mask, alpha=0.5):
    """Blend heatmap with original image, keeping non-leaf areas unchanged."""
    # Normalize mask to 0-1
    mask_norm = mask.astype(np.float32) / 255.0
    mask_3ch = np.stack([mask_norm] * 3, axis=-1)
    
    # Blend only within leaf mask
    blended = original.astype(np.float32) * (1 - alpha * mask_3ch) + \
              heatmap_colored.astype(np.float32) * alpha * mask_3ch
    
    return np.clip(blended, 0, 255).astype(np.uint8)


def add_heatmap_legend(img_array):
    """Add a small legend showing the deficiency scale."""
    height, width = img_array.shape[:2]
    
    # Create legend dimensions
    legend_width = 180
    legend_height = 30
    margin = 10
    
    # Position: bottom right
    x_start = width - legend_width - margin
    y_start = height - legend_height - margin
    
    # Create legend gradient
    legend = np.zeros((legend_height, legend_width, 3), dtype=np.uint8)
    
    # Background
    legend[:] = [40, 40, 40]
    
    # Gradient bar
    bar_height = 12
    bar_y = 5
    bar_x_start = 5
    bar_width = legend_width - 10
    
    for x in range(bar_width):
        v = x / bar_width
        # Apply same colormap
        if v < 0.3:
            t = v / 0.3
            color = [int(30 + t * 0), int(100 + t * 155), int(200 + t * 55)]
        elif v < 0.5:
            t = (v - 0.3) / 0.2
            color = [int(30 + t * 170), int(255 - t * 55), int(255 - t * 200)]
        elif v < 0.7:
            t = (v - 0.5) / 0.2
            color = [int(200 + t * 55), int(200 + t * 55), int(55 - t * 55)]
        elif v < 0.85:
            t = (v - 0.7) / 0.15
            color = [255, int(255 - t * 100), 0]
        else:
            t = min((v - 0.85) / 0.15, 1.0)
            color = [255, int(155 - t * 100), int(t * 50)]
        
        legend[bar_y:bar_y + bar_height, bar_x_start + x] = color
    
    # Add text labels using cv2
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.35
    cv2.putText(legend, "NUTRIENT DEFICIENCY HEATMAP", (5, legend_height - 5), 
                font, font_scale, (255, 255, 255), 1, cv2.LINE_AA)
    cv2.putText(legend, "Healthy", (5, bar_y + bar_height - 2), 
                font, 0.3, (200, 200, 200), 1, cv2.LINE_AA)
    cv2.putText(legend, "Deficient", (bar_width - 35, bar_y + bar_height - 2), 
                font, 0.3, (200, 200, 200), 1, cv2.LINE_AA)
    
    # Overlay legend on image with transparency
    result = img_array.copy()
    
    # Add semi-transparent background
    overlay_region = result[y_start:y_start + legend_height, x_start:x_start + legend_width]
    blended = cv2.addWeighted(overlay_region, 0.3, legend, 0.7, 0)
    result[y_start:y_start + legend_height, x_start:x_start + legend_width] = blended
    
    return result


# =============================================================================
# MAIN INFERENCE FUNCTION (REPLACES OLD predict_npk)
# =============================================================================

def predict_npk_unified(image_input, crop_id=None, generate_heatmap=True):
    """
    Main inference function for the unified model.
    
    Args:
        image_input: Image to analyze
        crop_id: Optional crop identifier (rice, wheat, tomato, maize)
        generate_heatmap: Whether to generate the deficiency heatmap
    
    Returns:
        dict with predictions and optional heatmap
    """
    # Run prediction
    result = predict_unified(image_input, crop_id)
    
    # Generate heatmap if requested
    if generate_heatmap:
        heatmap = generate_deficiency_heatmap(image_input, result, crop_id)
        result['heatmap'] = heatmap
    
    return result


# Test function
if __name__ == '__main__':
    print("🧪 Testing Unified Model Inference...")
    
    # Load model info
    metadata = get_unified_metadata()
    labels = get_unified_labels()
    
    print(f"\n📋 Model Metadata:")
    print(f"   Type: {metadata.get('model_type')}")
    print(f"   Version: {metadata.get('model_version')}")
    print(f"   Crops: {metadata.get('supported_crops')}")
    print(f"   Classes: {len(labels)}")
    
    # Create a test image
    test_img = np.random.randint(50, 200, (224, 224, 3), dtype=np.uint8)
    test_img[:, :, 1] = 150  # Make it greenish
    
    # Run prediction
    result = predict_npk_unified(Image.fromarray(test_img), crop_id='rice', generate_heatmap=False)
    
    print(f"\n📊 Test Prediction:")
    print(f"   N: {result['n_percentage']}% ({result['n_severity']})")
    print(f"   P: {result['p_percentage']}% ({result['p_severity']})")
    print(f"   K: {result['k_percentage']}% ({result['k_severity']})")
    print(f"   Detected: {result['detected_class']}")
    print(f"   Confidence: {result['detected_confidence']:.2%}")
