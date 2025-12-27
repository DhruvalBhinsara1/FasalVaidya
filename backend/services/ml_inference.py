import random
from typing import Dict
import base64
import io

try:
    import numpy as np
    import tensorflow as tf
    from PIL import Image
    import cv2
except Exception:  # pragma: no cover - fallback for environments without these deps
    np = None
    tf = None
    Image = None
    cv2 = None


MODEL = None
MODEL_PATH = None
CLASS_ORDER = ["healthy", "nitrogen-N", "phosphorus-P", "potasium-K"]

# Try loading the model if deps available
if tf and np:
    import os
    from pathlib import Path

    default_dir = Path(__file__).resolve().parent.parent / "ml" / "models"
    env_path = os.getenv("MODEL_PATH")
    candidate_paths = []
    if env_path:
        candidate_paths.append(Path(env_path))
    candidate_paths.append(default_dir / "plantvillage-expert-npk.h5")
    candidate_paths.append(default_dir / "model.h5")  # common fallback name

    for path in candidate_paths:
        if path.exists():
            MODEL_PATH = path
            break

    if MODEL_PATH:
        try:
            MODEL = tf.keras.models.load_model(MODEL_PATH)
            print(f"Loaded PlantVillage model from {MODEL_PATH}")
        except Exception as exc:  # pragma: no cover - load failure fallback
            print(f"Model load failed: {exc}. Using mock inference.")


def _mock_response() -> Dict[str, float]:
    # Deterministic-ish mock for demo consistency
    random.seed(42)
    return {
        "n_score": round(random.uniform(0.3, 0.9), 2),
        "p_score": round(random.uniform(0.2, 0.8), 2),
        "k_score": round(random.uniform(0.1, 0.7), 2),
        "n_confidence": 0.9,
        "p_confidence": 0.88,
        "k_confidence": 0.86,
    }


def _get_input_spec():
    """Infer expected (height, width, channels) from the loaded model."""
    if MODEL is None or not hasattr(MODEL, "input_shape"):
        return 224, 224, 3  # safe default

    shape = MODEL.input_shape  # e.g., (None, 28, 28, 1)
    if not shape or len(shape) < 4:
        return 224, 224, 3

    _, h, w, c = shape
    h = h or 224
    w = w or 224
    c = c or 3
    return int(h), int(w), int(c)


def _preprocess(image_path, target_size, channels):
    width, height = target_size  # PIL expects (width, height)
    mode = "L" if channels == 1 else "RGB"
    img = Image.open(image_path).convert(mode)
    img = img.resize((width, height))
    arr = tf.keras.preprocessing.image.img_to_array(img)
    if channels == 1 and arr.ndim == 2:
        arr = arr[..., tf.newaxis]

    # Match training preprocess (EfficientNet): center/scale instead of /255
    try:
        arr = tf.keras.applications.efficientnet.preprocess_input(arr)
    except Exception:
        arr = arr / 255.0

    return arr.reshape((1, height, width, channels))


def generate_heatmap(image_path: str, scores: Dict[str, float]) -> str:
    """
    Generate a diagnostic heatmap like a plant doctor would - highlighting:
    - Yellow/pale areas (nitrogen deficiency)
    - Purple/reddish areas (phosphorus deficiency)  
    - Brown edges/tips (potassium deficiency)
    - Spots and lesions
    """
    try:
        if cv2 is None or np is None:
            print("Heatmap: cv2 or np not available")
            return ""
        
        # Load original image
        print(f"Heatmap: Loading image from {image_path}")
        img = cv2.imread(image_path)
        if img is None:
            print(f"Heatmap: cv2.imread returned None for {image_path}")
            return ""
        
        print(f"Heatmap: Image loaded, shape: {img.shape}")
        
        # Resize to reasonable size
        img = cv2.resize(img, (300, 300))
        original = img.copy()
        
        # Convert to different color spaces for analysis
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        
        # Get scores
        n_score = scores.get("n_score", 0)
        p_score = scores.get("p_score", 0)
        k_score = scores.get("k_score", 0)
        
        # Initialize problem mask (areas with issues)
        problem_mask = np.zeros((300, 300), dtype=np.float32)
        
        # === NITROGEN DEFICIENCY DETECTION ===
        # Nitrogen deficiency: yellowing, pale green, chlorosis
        # Look for yellow-ish areas (high yellow, low green saturation)
        h, s, v = cv2.split(hsv)
        
        # Yellow hue range (20-35 in OpenCV HSV)
        yellow_mask = cv2.inRange(hsv, np.array([15, 40, 100]), np.array([35, 255, 255]))
        # Pale/light green (low saturation green)
        pale_mask = cv2.inRange(hsv, np.array([25, 20, 150]), np.array([50, 100, 255]))
        
        nitrogen_issues = cv2.bitwise_or(yellow_mask, pale_mask)
        nitrogen_issues = cv2.GaussianBlur(nitrogen_issues.astype(np.float32), (15, 15), 0)
        problem_mask += nitrogen_issues * n_score * 1.5
        
        # === PHOSPHORUS DEFICIENCY DETECTION ===
        # Phosphorus deficiency: purple/reddish tints, dark green
        # Look for purple/red tinged areas
        purple_mask = cv2.inRange(hsv, np.array([120, 30, 50]), np.array([160, 255, 200]))
        # Reddish tints
        red_mask = cv2.inRange(hsv, np.array([0, 50, 50]), np.array([10, 255, 200]))
        
        phosphorus_issues = cv2.bitwise_or(purple_mask, red_mask)
        phosphorus_issues = cv2.GaussianBlur(phosphorus_issues.astype(np.float32), (15, 15), 0)
        problem_mask += phosphorus_issues * p_score * 1.5
        
        # === POTASSIUM DEFICIENCY DETECTION ===
        # Potassium deficiency: brown edges, tip burn, necrosis
        # Look for brown/tan colors
        brown_mask = cv2.inRange(hsv, np.array([8, 50, 50]), np.array([25, 200, 180]))
        # Dark/necrotic spots
        dark_mask = cv2.inRange(hsv, np.array([0, 0, 0]), np.array([180, 255, 60]))
        
        potassium_issues = cv2.bitwise_or(brown_mask, dark_mask)
        potassium_issues = cv2.GaussianBlur(potassium_issues.astype(np.float32), (15, 15), 0)
        problem_mask += potassium_issues * k_score * 1.5
        
        # === EDGE/SPOT DETECTION for general issues ===
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Detect spots using blob detection approach
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        # Local contrast - spots show high local variation
        local_mean = cv2.GaussianBlur(gray.astype(np.float32), (21, 21), 0)
        local_var = cv2.GaussianBlur((gray.astype(np.float32) - local_mean) ** 2, (21, 21), 0)
        spots = np.sqrt(local_var)
        spots = (spots / (spots.max() + 1e-6) * 255).astype(np.float32)
        
        # Add spots to problem mask
        max_score = max(n_score, p_score, k_score)
        problem_mask += spots * max_score * 0.5
        
        # Normalize problem mask
        if problem_mask.max() > 0:
            problem_mask = (problem_mask / problem_mask.max() * 255).astype(np.uint8)
        else:
            # Fallback - just show some texture
            problem_mask = spots.astype(np.uint8)
        
        # Apply colormap - red for problems, blue for healthy
        heatmap = cv2.applyColorMap(problem_mask, cv2.COLORMAP_JET)
        
        # Blend with original - more heatmap where there are issues
        alpha = 0.4  # Base transparency
        overlay = cv2.addWeighted(original, 1 - alpha, heatmap, alpha, 0)
        
        # Add severity border
        max_deficiency = max(n_score, p_score, k_score)
        if max_deficiency >= 0.6:
            border_color = (0, 0, 220)  # Red
        elif max_deficiency >= 0.3:
            border_color = (0, 180, 255)  # Orange
        else:
            border_color = (0, 200, 0)  # Green
        
        overlay = cv2.copyMakeBorder(overlay, 4, 4, 4, 4, cv2.BORDER_CONSTANT, value=border_color)
        
        # Convert to base64
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 90]
        _, buffer = cv2.imencode('.jpg', overlay, encode_params)
        heatmap_base64 = base64.b64encode(buffer).decode('utf-8')
        
        result = f"data:image/jpeg;base64,{heatmap_base64}"
        print(f"Heatmap: Generated successfully, length: {len(result)} chars")
        return result
    except Exception as e:
        import traceback
        print(f"Heatmap generation failed: {e}")
        traceback.print_exc()
        return ""
        return ""


def run_model(image_path: str) -> Dict[str, float]:
    scores = None
    
    if MODEL is None or tf is None or np is None or Image is None:
        scores = _mock_response()
    else:
        try:
            height, width, channels = _get_input_spec()
            input_tensor = _preprocess(image_path, (width, height), channels)
            preds = MODEL.predict(input_tensor)
            try:
                flat = np.array(preds).reshape(-1)
                if flat.size >= 4:
                    # Model outputs [healthy, nitrogen, phosphorus, potasium]
                    n_score = flat[CLASS_ORDER.index("nitrogen-N")]
                    p_score = flat[CLASS_ORDER.index("phosphorus-P")]
                    k_score = flat[CLASS_ORDER.index("potasium-K")]
                elif flat.size >= 3:
                    n_score, p_score, k_score = flat[:3]
                else:
                    raise ValueError(f"Model returned {flat.size} outputs; expected >=3")
            except Exception as exc:
                raise RuntimeError(f"Unexpected model output format: {exc}")
            
            scores = {
                "n_score": float(round(n_score, 2)),
                "p_score": float(round(p_score, 2)),
                "k_score": float(round(k_score, 2)),
                "n_confidence": 0.9,
                "p_confidence": 0.88,
                "k_confidence": 0.86,
            }
        except Exception as exc:  # pragma: no cover - fallback on errors
            print(f"Inference failed: {exc}. Using mock.")
            scores = _mock_response()
    
    # Always try to generate heatmap
    scores["heatmap"] = generate_heatmap(image_path, scores)
    
    return scores
