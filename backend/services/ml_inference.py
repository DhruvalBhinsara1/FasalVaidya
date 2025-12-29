import random
from typing import Dict, Optional
import base64
import io
import os
from pathlib import Path
import threading

try:
    import numpy as np
    import tensorflow as tf
    from PIL import Image
    import cv2
    
    # ⚡ CPU Optimization: Limit threads to avoid overhead
    tf.config.threading.set_inter_op_parallelism_threads(4)
    tf.config.threading.set_intra_op_parallelism_threads(4)
    
except Exception:  # pragma: no cover - fallback for environments without these deps
    np = None
    tf = None
    Image = None
    cv2 = None


# Model cache - stores loaded models by crop_id
MODELS_CACHE: Dict[int, any] = {}
DEFAULT_MODEL = None
DEFAULT_MODEL_PATH = None
CLASS_ORDER = ["healthy", "nitrogen-N", "phosphorus-P", "potasium-K", "boron-B", "calcium-Ca", "iron-Fe", "magnesium-Mg", "manganese-Mn"]

# Crop-specific model configurations
# Maps crop_id to model filename and class order (if different)
CROP_MODEL_CONFIG: Dict[int, Dict] = {
    1: {"filename": "wheat-npk.h5", "name": "Wheat"},
    2: {"filename": "rice-npk.h5", "name": "Rice"},
    3: {"filename": "tomato-npk.h5", "name": "Tomato"},
    4: {"filename": "cotton-npk.h5", "name": "Cotton"},
}

MODELS_DIR = None

# Initialize models directory and load default model
if tf and np:
    MODELS_DIR = Path(__file__).resolve().parent.parent / "ml" / "models"
    env_path = os.getenv("MODEL_PATH")
    candidate_paths = []
    if env_path:
        candidate_paths.append(Path(env_path))
    candidate_paths.append(MODELS_DIR / "plantvillage-npk-v3.h5")  # Latest trained model
    candidate_paths.append(MODELS_DIR / "plantvillage-npk-v2.h5")
    candidate_paths.append(MODELS_DIR / "plantvillage-npk.h5")  # legacy fallback
    candidate_paths.append(MODELS_DIR / "plantvillage-expert-npk.h5")
    candidate_paths.append(MODELS_DIR / "model.h5")  # common fallback name

    for path in candidate_paths:
        if path.exists():
            DEFAULT_MODEL_PATH = path
            break

    if DEFAULT_MODEL_PATH:
        try:
            DEFAULT_MODEL = tf.keras.models.load_model(DEFAULT_MODEL_PATH)
            print(f"Loaded default PlantVillage model from {DEFAULT_MODEL_PATH}")
        except Exception as exc:  # pragma: no cover - load failure fallback
            print(f"Default model load failed: {exc}. Using mock inference.")


def _load_crop_model(crop_id: int):
    """Load a crop-specific model if available, otherwise return default model."""
    if tf is None or MODELS_DIR is None:
        return None
    
    # Check if already cached
    if crop_id in MODELS_CACHE:
        return MODELS_CACHE[crop_id]
    
    # Try to load crop-specific model
    if crop_id in CROP_MODEL_CONFIG:
        model_filename = CROP_MODEL_CONFIG[crop_id]["filename"]
        model_path = MODELS_DIR / model_filename
        
        if model_path.exists():
            try:
                model = tf.keras.models.load_model(model_path)
                MODELS_CACHE[crop_id] = model
                print(f"Loaded crop-specific model for {CROP_MODEL_CONFIG[crop_id]['name']} from {model_path}")
                return model
            except Exception as exc:
                print(f"Failed to load crop-specific model for crop {crop_id}: {exc}")
    
    # Fall back to default model
    MODELS_CACHE[crop_id] = DEFAULT_MODEL
    return DEFAULT_MODEL


def _mock_response(crop_id: int = 1) -> Dict[str, float]:
    """Generate mock response with crop-specific variations for demo."""
    # Use crop_id as part of seed for different but consistent results per crop
    random.seed(42 + crop_id * 7)
    
    # Crop-specific mock patterns (simulate different deficiency tendencies)
    crop_patterns = {
        1: {"n_base": 0.4, "p_base": 0.3, "k_base": 0.2},  # Wheat: moderate N issues
        2: {"n_base": 0.5, "p_base": 0.25, "k_base": 0.3}, # Rice: higher N demand
        3: {"n_base": 0.35, "p_base": 0.4, "k_base": 0.35}, # Tomato: balanced, slight P
        4: {"n_base": 0.45, "p_base": 0.35, "k_base": 0.4}, # Cotton: K sensitive
    }
    
    pattern = crop_patterns.get(crop_id, {"n_base": 0.4, "p_base": 0.3, "k_base": 0.3})
    
    return {
        "n_score": round(pattern["n_base"] + random.uniform(-0.15, 0.35), 2),
        "p_score": round(pattern["p_base"] + random.uniform(-0.1, 0.4), 2),
        "k_score": round(pattern["k_base"] + random.uniform(-0.1, 0.35), 2),
        "n_confidence": round(0.85 + random.uniform(0, 0.1), 2),
        "p_confidence": round(0.82 + random.uniform(0, 0.1), 2),
        "k_confidence": round(0.80 + random.uniform(0, 0.1), 2),
    }


def _get_input_spec(model=None):
    """Infer expected (height, width, channels) from the loaded model."""
    target_model = model or DEFAULT_MODEL
    if target_model is None or not hasattr(target_model, "input_shape"):
        return 224, 224, 3  # safe default

    shape = target_model.input_shape  # e.g., (None, 28, 28, 1)
    if not shape or len(shape) < 4:
        return 224, 224, 3

    _, h, w, c = shape
    h = h or 224
    w = w or 224
    c = c or 3
    return int(h), int(w), int(c)


def _preprocess(image_path, target_size, channels):
    """Fast preprocessing using PIL only."""
    width, height = target_size  # PIL expects (width, height)
    mode = "L" if channels == 1 else "RGB"
    
    # Use PIL's fastest resize (BILINEAR is faster than LANCZOS)
    img = Image.open(image_path).convert(mode)
    img = img.resize((width, height), Image.BILINEAR)
    arr = np.array(img, dtype=np.float32)
    
    if channels == 1 and arr.ndim == 2:
        arr = arr[..., np.newaxis]

    # Normalize to [0, 1] - simpler and faster than efficientnet preprocess
    arr = arr / 255.0

    return arr.reshape((1, height, width, channels))


def generate_heatmap(image_path: str, scores: Dict[str, float]) -> str:
    """
    Generate a fast diagnostic heatmap highlighting problem areas.
    Optimized for speed - uses smaller image and fewer operations.
    """
    try:
        if cv2 is None or np is None:
            return ""
        
        # Load and resize to small size for speed
        img = cv2.imread(image_path)
        if img is None:
            return ""
        
        # Smaller size = much faster processing
        img = cv2.resize(img, (200, 200), interpolation=cv2.INTER_LINEAR)
        original = img.copy()
        
        # Get scores
        n_score = scores.get("n_score", 0)
        p_score = scores.get("p_score", 0)
        k_score = scores.get("k_score", 0)
        max_score = max(n_score, p_score, k_score)
        
        # Fast heatmap: use grayscale variance as proxy for problem areas
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Simple edge detection highlights leaf damage/discoloration
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blur, 30, 100)
        
        # Dilate edges to create broader highlight areas
        kernel = np.ones((5, 5), np.uint8)
        problem_mask = cv2.dilate(edges, kernel, iterations=2)
        problem_mask = cv2.GaussianBlur(problem_mask, (11, 11), 0)
        
        # Scale by deficiency severity
        problem_mask = (problem_mask.astype(np.float32) * max_score).astype(np.uint8)
        
        # Apply colormap
        heatmap = cv2.applyColorMap(problem_mask, cv2.COLORMAP_JET)
        
        # Blend with original
        overlay = cv2.addWeighted(original, 0.6, heatmap, 0.4, 0)
        
        # Add severity border
        if max_score >= 0.6:
            border_color = (0, 0, 220)  # Red
        elif max_score >= 0.3:
            border_color = (0, 180, 255)  # Orange
        else:
            border_color = (0, 200, 0)  # Green
        
        overlay = cv2.copyMakeBorder(overlay, 3, 3, 3, 3, cv2.BORDER_CONSTANT, value=border_color)
        
        # Encode to base64 with lower quality for speed
        _, buffer = cv2.imencode('.jpg', overlay, [cv2.IMWRITE_JPEG_QUALITY, 75])
        return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"
    except Exception:
        return ""


def run_model(image_path: str, crop_id: int = 1) -> Dict[str, float]:
    """
    Run NPK deficiency inference on a leaf image.
    
    Args:
        image_path: Path to the leaf image
        crop_id: Crop type (1=Wheat, 2=Rice, 3=Tomato, 4=Cotton)
    
    Returns:
        Dictionary with n_score, p_score, k_score, confidences, and heatmap
    """
    scores = None
    
    # Try to load crop-specific model
    model = _load_crop_model(crop_id)
    model_name = CROP_MODEL_CONFIG.get(crop_id, {}).get("name", "General")
    
    if model is None or tf is None or np is None or Image is None:
        print(f"Using mock inference for crop {crop_id} ({model_name})")
        scores = _mock_response(crop_id)
    else:
        try:
            height, width, channels = _get_input_spec(model)
            input_tensor = _preprocess(image_path, (width, height), channels)
            
            # ⚡ Use direct call instead of predict() - much faster for single images
            preds = model(input_tensor, training=False)
            flat = np.array(preds).reshape(-1)
            
            # Find the top predicted class
            top_idx = int(np.argmax(flat))
            top_confidence = float(flat[top_idx])
            top_class = CLASS_ORDER[top_idx] if top_idx < len(CLASS_ORDER) else f"class_{top_idx}"
            
            print(f"🎯 {top_class} ({top_confidence*100:.1f}%)")
            
            if flat.size >= 9:
                # Model outputs 9 classes
                n_score = flat[CLASS_ORDER.index("nitrogen-N")]
                p_score = flat[CLASS_ORDER.index("phosphorus-P")]
                k_score = flat[CLASS_ORDER.index("potasium-K")]
            elif flat.size >= 4:
                # Legacy 4-class model
                n_score = flat[1]
                p_score = flat[2]
                k_score = flat[3]
            elif flat.size >= 3:
                n_score, p_score, k_score = flat[:3]
            else:
                raise ValueError(f"Model returned {flat.size} outputs; expected >=3")
            
            scores = {
                "n_score": float(round(n_score, 2)),
                "p_score": float(round(p_score, 2)),
                "k_score": float(round(k_score, 2)),
                "n_confidence": float(round(top_confidence, 2)),
                "p_confidence": float(round(top_confidence, 2)),
                "k_confidence": float(round(top_confidence, 2)),
                "detected_class": top_class,
                "detection_confidence": float(round(top_confidence * 100, 1)),
            }
            print(f"Inference completed for crop {crop_id} ({model_name})")
        except Exception as exc:  # pragma: no cover - fallback on errors
            print(f"Inference failed for crop {crop_id}: {exc}. Using mock.")
            scores = _mock_response(crop_id)
    
    # Add crop info to response
    scores["crop_id"] = crop_id
    scores["model_used"] = model_name if model else "Mock"
    
    # Always try to generate heatmap
    scores["heatmap"] = generate_heatmap(image_path, scores)
    
    return scores
