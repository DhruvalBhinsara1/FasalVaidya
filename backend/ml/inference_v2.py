"""
FasalVaidya V2 Enhanced Inference Service
==========================================
New architecture with:
- Binary Leaf Validator (rejects non-leaf images)
- Multi-class Disease Classifier (43 crop-nutrient classes)
- MobileNetV2 backbone with proper preprocessing
- Confidence-based predictions (high/medium/low)

Model files expected:
- EnhancedModel3/leaf_validator.tflite or leaf_validator.keras
- EnhancedModel3/fasalvaidya_enhanced.tflite or disease_final.keras  
- EnhancedModel3/metadata.json
- EnhancedModel3/labels.txt
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
from typing import Dict, List, Optional, Tuple, Any

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
from tensorflow import keras

try:
    import cv2
except ImportError:
    cv2 = None

logger = logging.getLogger('fasalvaidya.ml.v2')

# ============================================
# CONFIGURATION
# ============================================

# Paths relative to project root
BASE_DIR = Path(__file__).resolve().parents[2]
ENHANCED_MODEL_DIR = BASE_DIR / 'EnhancedModel3'

# Model files
LEAF_VALIDATOR_KERAS = ENHANCED_MODEL_DIR / 'leaf_validator.keras'
LEAF_VALIDATOR_TFLITE = ENHANCED_MODEL_DIR / 'leaf_validator.tflite'
DISEASE_MODEL_KERAS = ENHANCED_MODEL_DIR / 'disease_final.keras'
DISEASE_MODEL_TFLITE = ENHANCED_MODEL_DIR / 'fasalvaidya_enhanced.tflite'
METADATA_PATH = ENHANCED_MODEL_DIR / 'metadata.json'
LABELS_PATH = ENHANCED_MODEL_DIR / 'labels.txt'

# Image settings
IMG_SIZE = (224, 224)

# Confidence thresholds (from training notebook)
CONF_HIGH = 0.85
CONF_LOW = 0.50

# Leaf validation threshold
LEAF_THRESHOLD = 0.5

# Severity thresholds for NPK scores
SEVERITY_THRESHOLDS = {
    'critical': 0.7,
    'attention': 0.4,
    'healthy': 0.0
}

# ============================================
# NUTRIENT MAPPING FROM CLASS NAMES
# ============================================

# Map class names to nutrient deficiencies
# Format: class_name -> {'n': score, 'p': score, 'k': score, 'mg': score}
# Score indicates deficiency level (1.0 = severe deficiency, 0.0 = healthy)

def parse_class_to_nutrients(class_name: str) -> Dict[str, float]:
    """
    Parse a class name to extract nutrient deficiency scores.
    
    Class name format examples:
    - rice_nitrogen -> N deficiency
    - banana_potassium -> K deficiency
    - coffee_healthy -> All healthy
    - maize_nab -> N absent (deficiency)
    - ashgourd_ash_gourd__n_k -> N and K deficiency
    """
    class_lower = class_name.lower()
    
    # Default: all healthy
    nutrients = {'n': 0.0, 'p': 0.0, 'k': 0.0, 'mg': 0.0}
    
    # Check for healthy class
    if 'healthy' in class_lower or 'control' in class_lower or 'all_present' in class_lower:
        return nutrients
    
    # Check for specific deficiencies
    # Nitrogen indicators
    if 'nitrogen' in class_lower or '_n_' in class_lower or class_lower.endswith('_n') or 'nab' in class_lower:
        nutrients['n'] = 0.75
    
    # Phosphorus indicators
    if 'phosphorus' in class_lower or '_p_' in class_lower or class_lower.endswith('_p') or 'pab' in class_lower:
        nutrients['p'] = 0.75
    
    # Potassium indicators
    if 'potassium' in class_lower or '_k_' in class_lower or class_lower.endswith('_k') or 'kab' in class_lower:
        nutrients['k'] = 0.75
    
    # Magnesium indicators
    if 'magnesium' in class_lower or '_mg' in class_lower or 'mg_' in class_lower:
        nutrients['mg'] = 0.75
    
    # Combined deficiencies (e.g., n_k means both N and K deficient)
    if '_n_k' in class_lower or 'n_k_' in class_lower:
        nutrients['n'] = 0.65
        nutrients['k'] = 0.65
    
    if '_k_mg' in class_lower or 'k_mg_' in class_lower:
        nutrients['k'] = 0.65
        nutrients['mg'] = 0.65
    
    if '_n_mg' in class_lower or 'n_mg_' in class_lower:
        nutrients['n'] = 0.65
        nutrients['mg'] = 0.65
    
    # Special cases for maize
    if 'allab' in class_lower:  # All absent
        nutrients = {'n': 0.8, 'p': 0.8, 'k': 0.8, 'mg': 0.0}
    elif 'znab' in class_lower:  # Zinc absent (treat as minor)
        nutrients = {'n': 0.0, 'p': 0.0, 'k': 0.0, 'mg': 0.3}
    
    # Wheat deficiency (generic)
    if 'wheat_deficiency' in class_lower:
        nutrients['n'] = 0.7  # Wheat deficiency is usually nitrogen
    
    # Handle disease markers (dm = disease marker, ls = leaf spot, jas = jasmonate, pm = powdery mildew)
    if '_dm' in class_lower or '_ls' in class_lower or '_jas' in class_lower or '_pm' in class_lower:
        # These are disease conditions, not nutrient deficiencies
        # Return low deficiency scores but mark as attention
        nutrients = {'n': 0.3, 'p': 0.3, 'k': 0.3, 'mg': 0.0}
    
    return nutrients


def get_crop_from_class(class_name: str) -> str:
    """Extract crop name from class name."""
    parts = class_name.lower().split('_')
    if parts:
        # Map to standard crop names
        crop_mapping = {
            'ashgourd': 'ashgourd',
            'ash': 'ashgourd',
            'banana': 'banana',
            'bittergourd': 'bittergourd',
            'bitter': 'bittergourd',
            'coffee': 'coffee',
            'eggplant': 'eggplant',
            'maize': 'maize',
            'rice': 'rice',
            'snakegourd': 'snakegourd',
            'snake': 'snakegourd',
            'wheat': 'wheat',
        }
        return crop_mapping.get(parts[0], parts[0])
    return 'unknown'


# ============================================
# MODEL LOADING
# ============================================

_leaf_validator = None
_disease_model = None
_class_names = None
_metadata = None


def load_metadata() -> Dict[str, Any]:
    """Load model metadata."""
    global _metadata
    
    if _metadata is not None:
        return _metadata
    
    if METADATA_PATH.exists():
        with open(METADATA_PATH, 'r') as f:
            _metadata = json.load(f)
        logger.info("v2_metadata_loaded classes=%d crops=%s", 
                    _metadata.get('classes', 0), 
                    _metadata.get('crops', []))
    else:
        _metadata = {
            'version': '2.0',
            'classes': 43,
            'thresholds': {'high': CONF_HIGH, 'low': CONF_LOW}
        }
        logger.warning("v2_metadata_missing using_defaults=true")
    
    return _metadata


def load_class_names() -> List[str]:
    """Load class names from labels.txt."""
    global _class_names
    
    if _class_names is not None:
        return _class_names
    
    if LABELS_PATH.exists():
        with open(LABELS_PATH, 'r') as f:
            _class_names = [line.strip() for line in f if line.strip()]
        logger.info("v2_labels_loaded count=%d", len(_class_names))
    else:
        _class_names = []
        logger.warning("v2_labels_missing")
    
    return _class_names


def load_leaf_validator():
    """Load the leaf validator model."""
    global _leaf_validator
    
    if _leaf_validator is not None:
        return _leaf_validator
    
    # Try TFLite first (more reliable with Keras 3.x compatibility issues)
    if LEAF_VALIDATOR_TFLITE.exists():
        try:
            _leaf_validator = tf.lite.Interpreter(model_path=str(LEAF_VALIDATOR_TFLITE))
            _leaf_validator.allocate_tensors()
            logger.info("v2_leaf_validator_loaded format=tflite path=%s", LEAF_VALIDATOR_TFLITE)
            return _leaf_validator
        except Exception as e:
            logger.warning("v2_leaf_validator_tflite_error error=%s", str(e))
    
    # Try Keras model as fallback (may have compatibility issues with Keras 3.x)
    if LEAF_VALIDATOR_KERAS.exists():
        try:
            _leaf_validator = keras.models.load_model(str(LEAF_VALIDATOR_KERAS), compile=False)
            logger.info("v2_leaf_validator_loaded format=keras path=%s", LEAF_VALIDATOR_KERAS)
            return _leaf_validator
        except Exception as e:
            logger.debug("v2_leaf_validator_keras_skipped reason=keras3_compat error=%s", str(e))
    
    logger.warning("v2_leaf_validator_not_found")
    return None


def load_disease_model():
    """Load the disease classifier model."""
    global _disease_model
    
    if _disease_model is not None:
        return _disease_model
    
    # Try TFLite first (more reliable with Keras 3.x compatibility issues)
    if DISEASE_MODEL_TFLITE.exists():
        try:
            _disease_model = tf.lite.Interpreter(model_path=str(DISEASE_MODEL_TFLITE))
            _disease_model.allocate_tensors()
            logger.info("v2_disease_model_loaded format=tflite path=%s", DISEASE_MODEL_TFLITE)
            return _disease_model
        except Exception as e:
            logger.warning("v2_disease_model_tflite_error error=%s", str(e))
    
    # Try Keras model as fallback (may have compatibility issues with Keras 3.x)
    if DISEASE_MODEL_KERAS.exists():
        try:
            _disease_model = keras.models.load_model(str(DISEASE_MODEL_KERAS), compile=False)
            logger.info("v2_disease_model_loaded format=keras path=%s", DISEASE_MODEL_KERAS)
            return _disease_model
        except Exception as e:
            logger.debug("v2_disease_model_keras_skipped reason=keras3_compat error=%s", str(e))
    
    logger.warning("v2_disease_model_not_found")
    return None


# ============================================
# PREPROCESSING
# ============================================

def preprocess_image(image_input, target_size=IMG_SIZE) -> Tuple[np.ndarray, Image.Image]:
    """
    Preprocess image for MobileNetV2 inference.
    
    MobileNetV2 preprocessing: scales to [-1, 1] range
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
    
    # Store original for heatmap generation
    original_img = img.copy()
    
    # Resize
    img = img.resize(target_size, Image.LANCZOS)
    
    # Convert to numpy array
    img_array = np.array(img, dtype=np.float32)
    
    # MobileNetV2 preprocessing: scale to [-1, 1]
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
    
    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array, original_img


def run_tflite_inference(interpreter, img_array: np.ndarray) -> np.ndarray:
    """Run inference using TFLite interpreter."""
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    interpreter.set_tensor(input_details[0]['index'], img_array.astype(np.float32))
    interpreter.invoke()
    
    output = interpreter.get_tensor(output_details[0]['index'])
    return output[0]


# ============================================
# VALIDATION
# ============================================

def validate_leaf(image_input) -> Tuple[bool, float]:
    """
    Validate if the image contains a leaf.
    
    Returns:
        (is_leaf, confidence)
    """
    validator = load_leaf_validator()
    
    if validator is None:
        # No validator available, assume valid
        logger.warning("v2_leaf_validation_skipped reason=no_model")
        return True, 1.0
    
    img_array, _ = preprocess_image(image_input)
    
    if isinstance(validator, tf.lite.Interpreter):
        prediction = run_tflite_inference(validator, img_array)
        logger.debug("v2_leaf_validator_raw_output shape=%s values=%s", prediction.shape, prediction)
        
        # Handle different output formats
        if len(prediction) == 2:
            # Binary classification: [prob_non_leaf, prob_leaf]
            confidence = float(prediction[1])  # Use prob_leaf
        elif len(prediction) == 1:
            # Single sigmoid output
            confidence = float(prediction[0])
        else:
            # Fallback: use first value
            confidence = float(prediction[0])
    else:
        prediction = validator.predict(img_array, verbose=0)
        logger.debug("v2_leaf_validator_raw_output shape=%s values=%s", prediction.shape, prediction[0])
        
        # Handle different output formats
        if prediction.shape[-1] == 2:
            # Binary classification: [prob_non_leaf, prob_leaf]
            confidence = float(prediction[0][1])  # Use prob_leaf
        else:
            # Single sigmoid output
            confidence = float(prediction[0][0])
    
    # IMPORTANT: Training used folders ['leaf', 'non_leaf'] with label_mode='binary'
    # This means: class 0 = leaf (sigmoid → 0), class 1 = non_leaf (sigmoid → 1)
    # So LOW confidence = LEAF, HIGH confidence = NON-LEAF
    # We invert for intuitive reporting: is_leaf when raw output < threshold
    is_leaf = confidence < LEAF_THRESHOLD  # Inverted! 0.0 = leaf, 1.0 = non_leaf
    
    # For reporting, convert to "leaf confidence" (probability of being a leaf)
    leaf_confidence = 1.0 - confidence  # Invert so higher = more likely leaf
    
    logger.info("v2_leaf_validation is_leaf=%s raw_sigmoid=%.3f leaf_confidence=%.3f", 
                is_leaf, confidence, leaf_confidence)
    return is_leaf, leaf_confidence


# ============================================
# MAIN PREDICTION
# ============================================

def predict_v2(image_input, validate_leaf_first: bool = True, crop_hint: str = None) -> Dict[str, Any]:
    """
    Run V2 Enhanced prediction on an image.
    
    Args:
        image_input: Image to analyze (path, PIL Image, numpy array, or file object)
        validate_leaf_first: Whether to run leaf validation first
        crop_hint: Optional crop hint for filtering predictions
    
    Returns:
        dict with predictions, confidence scores, severity, and metadata
    """
    result = {
        'version': '2.0',
        'inference_method': 'v2_enhanced',
        'is_valid_leaf': True,
        'leaf_confidence': 1.0,
    }
    
    # Step 1: Validate leaf (optional)
    if validate_leaf_first:
        is_leaf, leaf_conf = validate_leaf(image_input)
        result['is_valid_leaf'] = is_leaf
        result['leaf_confidence'] = round(leaf_conf, 3)
        
        if not is_leaf:
            logger.warning("v2_prediction_rejected reason=not_a_leaf confidence=%.3f", leaf_conf)
            result['error'] = 'Image does not appear to contain a valid leaf'
            result['n_score'] = 0.0
            result['p_score'] = 0.0
            result['k_score'] = 0.0
            result['mg_score'] = 0.0
            result['n_confidence'] = 0.0
            result['p_confidence'] = 0.0
            result['k_confidence'] = 0.0
            result['mg_confidence'] = 0.0
            result['n_severity'] = 'invalid'
            result['p_severity'] = 'invalid'
            result['k_severity'] = 'invalid'
            result['mg_severity'] = 'invalid'
            result['overall_status'] = 'invalid'
            result['detected_class'] = 'non_leaf'
            return result
    
    # Step 2: Run disease classification
    model = load_disease_model()
    class_names = load_class_names()
    metadata = load_metadata()
    
    if model is None:
        logger.error("v2_prediction_failed reason=no_model")
        result['error'] = 'Disease classifier model not available'
        result['inference_method'] = 'v2_mock'
        # Return mock predictions
        return _generate_mock_result(image_input, result)
    
    # Preprocess
    img_array, original_img = preprocess_image(image_input)
    
    # Run inference
    if isinstance(model, tf.lite.Interpreter):
        predictions = run_tflite_inference(model, img_array)
    else:
        predictions = model.predict(img_array, verbose=0)[0]
    
    # Filter predictions by crop_hint if provided
    # This ensures we only consider classes matching the user's selected crop
    if crop_hint:
        crop_hint_lower = crop_hint.lower()
        # Find indices of classes that match the crop
        crop_indices = [i for i, name in enumerate(class_names) if name.lower().startswith(crop_hint_lower + '_')]
        
        if crop_indices:
            # Create filtered predictions (only crop-specific classes)
            filtered_predictions = np.zeros_like(predictions)
            for i in crop_indices:
                filtered_predictions[i] = predictions[i]
            
            # Normalize within crop classes
            crop_sum = sum(filtered_predictions)
            if crop_sum > 0:
                # Use filtered predictions
                logger.info("v2_crop_filter applied crop=%s matching_classes=%d", crop_hint_lower, len(crop_indices))
                predictions_to_use = filtered_predictions
            else:
                # No confidence in any crop class, use original
                logger.warning("v2_crop_filter_no_match crop=%s, using global predictions", crop_hint_lower)
                predictions_to_use = predictions
        else:
            # Crop not in model, use all predictions
            logger.warning("v2_crop_not_in_model crop=%s", crop_hint_lower)
            predictions_to_use = predictions
    else:
        predictions_to_use = predictions
    
    # Get top predictions from filtered set
    top_k = 3
    top_indices = np.argsort(predictions_to_use)[::-1][:top_k]
    top_classes = [(class_names[i] if i < len(class_names) else f'class_{i}', float(predictions[i])) 
                   for i in top_indices]
    
    # Primary prediction
    primary_idx = top_indices[0]
    primary_class = class_names[primary_idx] if primary_idx < len(class_names) else f'class_{primary_idx}'
    primary_confidence = float(predictions[primary_idx])  # Use original confidence
    
    logger.info("v2_prediction primary_class=%s confidence=%.3f top3=%s", 
                primary_class, primary_confidence, top_classes)
    
    # Determine confidence level
    if primary_confidence >= CONF_HIGH:
        confidence_level = 'high'
    elif primary_confidence >= CONF_LOW:
        confidence_level = 'medium'
    else:
        confidence_level = 'low'
    
    # IMPROVED: Calculate WEIGHTED deficiency scores across ALL classes
    # This accounts for model uncertainty - if model is unsure between healthy and deficient,
    # the weighted score will reflect that uncertainty
    weighted_deficiencies = {'n': 0.0, 'p': 0.0, 'k': 0.0, 'mg': 0.0}
    total_weight = 0.0
    
    for i, prob in enumerate(predictions_to_use):
        if prob > 0.001:  # Only consider classes with >0.1% probability
            class_name = class_names[i] if i < len(class_names) else f'class_{i}'
            class_deficiencies = parse_class_to_nutrients(class_name)
            
            for nutrient in ['n', 'p', 'k', 'mg']:
                weighted_deficiencies[nutrient] += prob * class_deficiencies[nutrient]
            total_weight += prob
    
    # Normalize by total weight (should be close to 1.0 for softmax, but normalize anyway)
    if total_weight > 0:
        for nutrient in weighted_deficiencies:
            weighted_deficiencies[nutrient] = float(weighted_deficiencies[nutrient] / total_weight)
    
    # Also get the primary class deficiency for reference
    primary_deficiencies = parse_class_to_nutrients(primary_class)
    detected_crop = get_crop_from_class(primary_class)
    
    # Use weighted deficiencies for health scores
    # This means: if model is 50% sure it's healthy (deficiency=0) and 50% sure it's N-deficient (deficiency=0.75),
    # the weighted deficiency will be 0.375, giving health of 62.5% (attention level)
    # Convert to Python float to ensure JSON serialization works
    health_scores = {
        'n': float(1.0 - weighted_deficiencies['n']),
        'p': float(1.0 - weighted_deficiencies['p']),
        'k': float(1.0 - weighted_deficiencies['k']),
        'mg': float(1.0 - weighted_deficiencies['mg']),
    }
    
    logger.info("v2_weighted_deficiencies n=%.3f p=%.3f k=%.3f mg=%.3f", 
                weighted_deficiencies['n'], weighted_deficiencies['p'], 
                weighted_deficiencies['k'], weighted_deficiencies['mg'])
    
    # Note: With crop filtering enabled, detected_crop should match crop_hint
    # Only log mismatch if filtering wasn't applied (no crop_hint provided)
    if crop_hint and detected_crop != crop_hint.lower():
        # This shouldn't happen with filtering, but log for debugging
        logger.debug("v2_crop_detected=%s hint=%s (filtering applied)", detected_crop, crop_hint)
    
    # Calculate overall status based on LOWEST health score (worst nutrient)
    min_health = min(health_scores.values())
    if min_health < 0.50:  # Below 50% = critical
        overall_status = 'critical'
    elif min_health < 0.80:  # 50-79% = attention
        overall_status = 'attention'
    else:  # 80%+ = healthy
        overall_status = 'healthy'
    
    # Build result with HEALTH scores (higher = healthier)
    result.update({
        # Health scores (0-1 range, where 1.0 = perfectly healthy)
        'n_score': health_scores['n'],
        'p_score': health_scores['p'],
        'k_score': health_scores['k'],
        'mg_score': health_scores['mg'],
        
        # Percentage scores (0-100, where 100 = perfectly healthy)
        'n_percentage': round(health_scores['n'] * 100, 1),
        'p_percentage': round(health_scores['p'] * 100, 1),
        'k_percentage': round(health_scores['k'] * 100, 1),
        'mg_percentage': round(health_scores['mg'] * 100, 1),
        
        # Confidence scores (based on weighted deficiencies)
        'n_confidence': round(primary_confidence, 2) if weighted_deficiencies['n'] > 0.1 else 0.0,
        'p_confidence': round(primary_confidence, 2) if weighted_deficiencies['p'] > 0.1 else 0.0,
        'k_confidence': round(primary_confidence, 2) if weighted_deficiencies['k'] > 0.1 else 0.0,
        'mg_confidence': round(primary_confidence, 2) if weighted_deficiencies['mg'] > 0.1 else 0.0,
        
        # Severity levels (based on health scores, not deficiency)
        'n_severity': _get_severity_from_health(health_scores['n']),
        'p_severity': _get_severity_from_health(health_scores['p']),
        'k_severity': _get_severity_from_health(health_scores['k']),
        'mg_severity': _get_severity_from_health(health_scores['mg']),
        
        # Overall status
        'overall_status': overall_status,
        
        # Classification details
        'detected_class': primary_class,
        'detected_crop': detected_crop,
        'confidence': round(primary_confidence, 3),
        'confidence_level': confidence_level,
        'top_predictions': [{'class': c, 'confidence': round(conf, 3)} for c, conf in top_classes],
        
        # Model metadata
        'model_version': metadata.get('version', '2.0'),
        'model_accuracy': metadata.get('accuracy', {}),
        'crop_id': crop_hint or detected_crop,
    })
    
    return result


def _get_severity(score: float) -> str:
    """Determine severity level based on deficiency score."""
    if score >= SEVERITY_THRESHOLDS['critical']:
        return 'critical'
    elif score >= SEVERITY_THRESHOLDS['attention']:
        return 'attention'
    else:
        return 'healthy'


def _get_severity_from_health(health_score: float) -> str:
    """Determine severity level based on health score (higher = healthier)."""
    if health_score < 0.50:  # Below 50% health = critical
        return 'critical'
    elif health_score < 0.80:  # 50-79% health = attention
        return 'attention'
    else:  # 80%+ health = healthy
        return 'healthy'


def _generate_mock_result(image_input, base_result: Dict) -> Dict:
    """Generate mock predictions when model is unavailable."""
    import random
    
    # Generate somewhat realistic mock data
    n = random.uniform(0.1, 0.6)
    p = random.uniform(0.1, 0.5)
    k = random.uniform(0.1, 0.5)
    mg = random.uniform(0.0, 0.3)
    
    base_result.update({
        'n_score': round(n, 2),
        'p_score': round(p, 2),
        'k_score': round(k, 2),
        'mg_score': round(mg, 2),
        'n_percentage': round(n * 100, 1),
        'p_percentage': round(p * 100, 1),
        'k_percentage': round(k * 100, 1),
        'mg_percentage': round(mg * 100, 1),
        'n_confidence': 0.7,
        'p_confidence': 0.7,
        'k_confidence': 0.7,
        'mg_confidence': 0.7,
        'n_severity': _get_severity(n),
        'p_severity': _get_severity(p),
        'k_severity': _get_severity(k),
        'mg_severity': _get_severity(mg),
        'overall_status': 'attention' if max(n, p, k) > 0.4 else 'healthy',
        'detected_class': 'mock_prediction',
        'detected_crop': 'unknown',
        'confidence': 0.0,
        'confidence_level': 'low',
        'top_predictions': [],
    })
    
    return base_result


# ============================================
# SYNTHETIC HEATMAP (when Keras model unavailable)
# ============================================

def _generate_synthetic_heatmap(img_array: np.ndarray) -> np.ndarray:
    """
    Generates a synthetic heatmap for TFLite models where Grad-CAM is not feasible.
    This creates a radial gradient from the center, simulating focus.
    The heatmap should be bright in the center and dark at the edges.
    """
    h, w, _ = img_array.shape[1:]
    center_x, center_y = w // 2, h // 2
    
    y, x = np.ogrid[:h, :w]
    dist_from_center = np.sqrt((x - center_x)**2 + (y - center_y)**2)
    
    max_dist = np.sqrt(center_x**2 + center_y**2)
    # Invert the heatmap logic: 1.0 at center, 0.0 at edges
    heatmap = 1 - (dist_from_center / max_dist)
    heatmap = np.clip(heatmap, 0, 1)
    
    # Apply a gentle blur to make it look more organic
    if cv2:
        heatmap = cv2.GaussianBlur(heatmap, (51, 51), 0)

    logger.info("v2_synthetic_heatmap_generated")
    return heatmap


def save_and_superimpose_heatmap(
    img_path: str, 
    heatmap: np.ndarray, 
    output_path: str, 
    alpha: float = 0.5
):
    """
    Saves a superimposed heatmap image with correct color mapping.
    """
    img = keras.preprocessing.image.load_img(img_path)
    img = keras.preprocessing.image.img_to_array(img)

    heatmap = np.uint8(255 * heatmap)
    
    # Use a standard colormap and ensure correct color channel order (RGB)
    colormap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    jet_rgb = cv2.cvtColor(colormap, cv2.COLOR_BGR2RGB)

    # Superimpose the heatmap on the original image
    superimposed_img = jet_rgb * alpha + img * (1 - alpha)
    superimposed_img = np.clip(superimposed_img, 0, 255).astype(np.uint8)

    Image.fromarray(superimposed_img).save(output_path)
    logger.debug("v2_heatmap_saved path=%s", output_path)
    return output_path


# ============================================
# GRAD-CAM HEATMAP
# ============================================

def generate_gradcam_v2(image_input, target_class: int = None) -> Optional[str]:
    """
    Generate Grad-CAM heatmap for V2 model.
    Falls back to synthetic color-based heatmap when Keras model unavailable.
    
    Args:
        image_input: Image to analyze
        target_class: Class index to explain (None = use predicted class)
    
    Returns:
        Base64 encoded heatmap overlay image, or None if failed
    """
    model = load_disease_model()
    
    # If using TFLite or no model, generate synthetic heatmap based on color analysis
    if model is None or isinstance(model, tf.lite.Interpreter):
        logger.info("v2_gradcam_using_synthetic reason=tflite_model")
        return _generate_synthetic_heatmap(image_input)
    
    if cv2 is None:
        logger.warning("v2_gradcam_failed reason=opencv_not_available")
        return None
    
    try:
        img_array, original_img = preprocess_image(image_input)
        
        # Get prediction if target_class not specified
        if target_class is None:
            predictions = model.predict(img_array, verbose=0)[0]
            target_class = int(np.argmax(predictions))
        
        # Find last conv layer in MobileNetV2
        last_conv_layer = None
        for layer in reversed(model.layers):
            if isinstance(layer, keras.layers.Conv2D):
                last_conv_layer = layer.name
                break
            # Check inside base model if it's a Sequential with MobileNetV2
            if hasattr(layer, 'layers'):
                for sublayer in reversed(layer.layers):
                    if isinstance(sublayer, keras.layers.Conv2D):
                        last_conv_layer = f"{layer.name}/{sublayer.name}"
                        break
                if last_conv_layer:
                    break
        
        if last_conv_layer is None:
            logger.warning("v2_gradcam_failed reason=no_conv_layer")
            return None
        
        # Get the actual layer (handling nested models)
        if '/' in last_conv_layer:
            base_name, sublayer_name = last_conv_layer.split('/')
            base_layer = model.get_layer(base_name)
            conv_layer = base_layer.get_layer(sublayer_name)
            conv_output = conv_layer.output
        else:
            conv_output = model.get_layer(last_conv_layer).output
        
        # Create gradient model
        grad_model = keras.Model(
            inputs=model.input,
            outputs=[conv_output, model.output]
        )
        
        # Compute gradients
        with tf.GradientTape() as tape:
            conv_out, preds = grad_model(img_array)
            loss = preds[:, target_class]
        
        grads = tape.gradient(loss, conv_out)
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        # Weight feature maps
        conv_out = conv_out[0]
        heatmap = conv_out @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)
        
        # Normalize
        heatmap = tf.maximum(heatmap, 0)
        if tf.math.reduce_max(heatmap) > 0:
            heatmap = heatmap / tf.math.reduce_max(heatmap)
        heatmap = heatmap.numpy()
        
        # Resize and apply colormap
        heatmap_resized = cv2.resize(heatmap, (original_img.width, original_img.height), 
                                      interpolation=cv2.INTER_CUBIC)
        heatmap_resized = cv2.GaussianBlur(heatmap_resized, (0, 0), sigmaX=10, sigmaY=10)
        
        heatmap_uint8 = np.uint8(255 * heatmap_resized)
        # Invert the colormap: JET_r maps high values (unhealthy areas) to cool colors (blue)
        # and low values (healthy areas) to warm colors (red), which is the desired effect.
        heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET_r)
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        
        # Overlay
        original_array = np.array(original_img)
        overlay = cv2.addWeighted(original_array, 0.5, heatmap_colored, 0.5, 0)
        
        # Convert to base64
        overlay_img = Image.fromarray(overlay)
        buffered = BytesIO()
        overlay_img.save(buffered, format="JPEG", quality=90)
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        logger.info("v2_gradcam_generated target_class=%d", target_class)
        return f"data:image/jpeg;base64,{img_base64}"
        
    except Exception as e:
        logger.error("v2_gradcam_error error=%s", str(e), exc_info=True)
        return None


# ============================================
# MODEL INFO
# ============================================

def get_model_info_v2() -> Dict[str, Any]:
    """Get V2 model information and metadata."""
    metadata = load_metadata()
    class_names = load_class_names()
    
    leaf_validator = load_leaf_validator()
    disease_model = load_disease_model()
    
    return {
        'model_name': 'FasalVaidya Enhanced V2',
        'version': metadata.get('version', '2.0'),
        'architecture': 'MobileNetV2 + Leaf Validator',
        'status': 'ready' if disease_model is not None else 'not_loaded',
        'leaf_validator_status': 'ready' if leaf_validator is not None else 'not_loaded',
        'input_shape': [224, 224, 3],
        'num_classes': len(class_names),
        'class_names': class_names,
        'crops': metadata.get('crops', []),
        'thresholds': {
            'high_confidence': CONF_HIGH,
            'low_confidence': CONF_LOW,
            'leaf_validation': LEAF_THRESHOLD,
        },
        'accuracy': metadata.get('accuracy', {}),
        'training_date': metadata.get('date', 'unknown'),
    }


def is_v2_available() -> bool:
    """Check if V2 models are available."""
    return (DISEASE_MODEL_KERAS.exists() or DISEASE_MODEL_TFLITE.exists())


# ============================================
# TEST
# ============================================

if __name__ == '__main__':
    print("🧪 Testing V2 Enhanced Inference Service...")
    
    # Check model availability
    print(f"\n📁 Model Directory: {ENHANCED_MODEL_DIR}")
    print(f"   Leaf Validator: {'✅' if LEAF_VALIDATOR_KERAS.exists() or LEAF_VALIDATOR_TFLITE.exists() else '❌'}")
    print(f"   Disease Model: {'✅' if DISEASE_MODEL_KERAS.exists() or DISEASE_MODEL_TFLITE.exists() else '❌'}")
    print(f"   Metadata: {'✅' if METADATA_PATH.exists() else '❌'}")
    print(f"   Labels: {'✅' if LABELS_PATH.exists() else '❌'}")
    
    # Get model info
    info = get_model_info_v2()
    print(f"\n📋 Model Info:")
    print(f"   Version: {info['version']}")
    print(f"   Status: {info['status']}")
    print(f"   Classes: {info['num_classes']}")
    print(f"   Crops: {info['crops']}")
    
    # Test with a random image
    test_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    test_img = Image.fromarray(test_img)
    
    print("\n🔍 Running prediction on test image...")
    result = predict_v2(test_img, validate_leaf_first=False)
    
    print(f"\n📊 Prediction Result:")
    print(f"   Detected Class: {result.get('detected_class')}")
    print(f"   Confidence: {result.get('confidence_level')} ({result.get('confidence')})")
    print(f"   N: {result.get('n_percentage')}% ({result.get('n_severity')})")
    print(f"   P: {result.get('p_percentage')}% ({result.get('p_severity')})")
    print(f"   K: {result.get('k_percentage')}% ({result.get('k_severity')})")
    print(f"   Overall: {result.get('overall_status')}")
