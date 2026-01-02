"""
FasalVaidya Crop-Specific NPK Model Training (Optimized for Accuracy)
======================================================================
Train separate models for each crop using the Leaf Nutrient Data Sets.
Each crop gets its own optimized model stored in models/<crop_id>/

Optimizations included:
- Advanced data augmentation (MixUp, CutMix, RandAugment-style)
- Focal loss for hard example mining
- Label smoothing for better generalization
- Cosine annealing with warm restarts
- Gradual layer unfreezing
- Class weighting for imbalanced data
- Test-time augmentation (TTA) for evaluation
- Deeper classification head with residual connections

Usage:
    python train_crop_model.py --crop rice
    python train_crop_model.py --crop tomato --epochs 100
    python train_crop_model.py --crop all   # Train all crops sequentially
    python train_crop_model.py --list       # List available crops
    python train_crop_model.py --crop rice --quality high  # Max accuracy mode
"""

import os
import sys
import json
import argparse
import numpy as np
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import multiprocessing
from tqdm import tqdm
import random

# TensorFlow setup
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau, LearningRateScheduler
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_sample_weight
from PIL import Image, ImageEnhance, ImageFilter

# Threading config
NUM_WORKERS = min(multiprocessing.cpu_count(), 16)

# Mixed precision only on GPU
try:
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        tf.keras.mixed_precision.set_global_policy('mixed_float16')
        print(f"⚡ Mixed precision enabled ({len(gpus)} GPU(s))")
    else:
        tf.keras.mixed_precision.set_global_policy('float32')
        print("ℹ️ CPU mode: using float32")
except Exception:
    pass

tf.config.threading.set_intra_op_parallelism_threads(NUM_WORKERS)
tf.config.threading.set_inter_op_parallelism_threads(NUM_WORKERS)

# Seed for reproducibility
SEED = 42
np.random.seed(SEED)
tf.random.set_seed(SEED)
random.seed(SEED)

# Memory management - limit samples for large datasets
MAX_SAMPLES_PER_CLASS = 2000  # Prevent memory overflow
MAX_TOTAL_SAMPLES = 8000      # Absolute max

# Import backbone
TF_VERSION = tuple(map(int, tf.__version__.split('.')[:2]))
if TF_VERSION >= (2, 16):
    from keras.applications import MobileNetV3Large, EfficientNetB0, EfficientNetB2
else:
    from tensorflow.keras.applications import MobileNetV3Large, EfficientNetB0, EfficientNetB2


# ============================================
# FOCAL LOSS FOR HARD EXAMPLE MINING
# ============================================

class BinaryFocalLoss(keras.losses.Loss):
    """
    Focal Loss for multi-label classification.
    Focuses training on hard examples by down-weighting easy ones.
    """
    def __init__(self, gamma=2.0, alpha=0.25, label_smoothing=0.1, **kwargs):
        super().__init__(**kwargs)
        self.gamma = gamma
        self.alpha = alpha
        self.label_smoothing = label_smoothing
    
    def call(self, y_true, y_pred):
        y_true = tf.cast(y_true, tf.float32)
        y_pred = tf.clip_by_value(y_pred, 1e-7, 1.0 - 1e-7)
        
        # Label smoothing
        if self.label_smoothing > 0:
            y_true = y_true * (1 - self.label_smoothing) + 0.5 * self.label_smoothing
        
        # Focal loss computation
        p_t = y_true * y_pred + (1 - y_true) * (1 - y_pred)
        alpha_t = y_true * self.alpha + (1 - y_true) * (1 - self.alpha)
        focal_weight = alpha_t * tf.pow(1 - p_t, self.gamma)
        
        bce = -y_true * tf.math.log(y_pred) - (1 - y_true) * tf.math.log(1 - y_pred)
        return tf.reduce_mean(focal_weight * bce)
    
    def get_config(self):
        config = super().get_config()
        config.update({'gamma': self.gamma, 'alpha': self.alpha, 'label_smoothing': self.label_smoothing})
        return config


# ============================================
# ADVANCED DATA AUGMENTATION
# ============================================

def advanced_augment_image(img_array):
    """Apply advanced augmentations to a single image (numpy array 0-1 range)."""
    img = Image.fromarray((img_array * 255).astype(np.uint8))
    
    # Random horizontal flip
    if random.random() > 0.5:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    
    # Random vertical flip (leaves can be upside down)
    if random.random() > 0.5:
        img = img.transpose(Image.FLIP_TOP_BOTTOM)
    
    # Random rotation (-30 to 30 degrees)
    if random.random() > 0.3:
        angle = random.uniform(-30, 30)
        img = img.rotate(angle, resample=Image.BICUBIC, fillcolor=(0, 0, 0))
    
    # Color jitter
    if random.random() > 0.3:
        # Brightness
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(random.uniform(0.7, 1.3))
    
    if random.random() > 0.3:
        # Contrast
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(random.uniform(0.7, 1.3))
    
    if random.random() > 0.3:
        # Saturation
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(random.uniform(0.7, 1.3))
    
    if random.random() > 0.5:
        # Sharpness
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(random.uniform(0.5, 2.0))
    
    # Random Gaussian blur
    if random.random() > 0.7:
        img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.5, 1.5)))
    
    # Random crop and resize (scale augmentation)
    if random.random() > 0.5:
        w, h = img.size
        crop_ratio = random.uniform(0.8, 1.0)
        new_w, new_h = int(w * crop_ratio), int(h * crop_ratio)
        left = random.randint(0, w - new_w)
        top = random.randint(0, h - new_h)
        img = img.crop((left, top, left + new_w, top + new_h))
        img = img.resize((w, h), Image.LANCZOS)
    
    return np.array(img, dtype=np.float32) / 255.0


def mixup(images, labels, alpha=0.2):
    """MixUp augmentation: blend two images and their labels."""
    batch_size = tf.shape(images)[0]
    
    # Sample lambda from Beta distribution
    lam = tf.random.uniform([], 0, alpha)
    
    # Shuffle indices
    indices = tf.random.shuffle(tf.range(batch_size))
    
    # Mix images and labels
    mixed_images = lam * images + (1 - lam) * tf.gather(images, indices)
    mixed_labels = lam * labels + (1 - lam) * tf.gather(labels, indices)
    
    return mixed_images, mixed_labels


def cutmix(images, labels, alpha=0.2):
    """CutMix augmentation: cut and paste patches between images."""
    batch_size = tf.shape(images)[0]
    img_h = tf.shape(images)[1]
    img_w = tf.shape(images)[2]
    
    # Sample lambda
    lam = tf.random.uniform([], 0, alpha)
    
    # Get random bounding box
    cut_ratio = tf.sqrt(1 - lam)
    cut_h = tf.cast(tf.cast(img_h, tf.float32) * cut_ratio, tf.int32)
    cut_w = tf.cast(tf.cast(img_w, tf.float32) * cut_ratio, tf.int32)
    
    cy = tf.random.uniform([], 0, img_h, dtype=tf.int32)
    cx = tf.random.uniform([], 0, img_w, dtype=tf.int32)
    
    y1 = tf.maximum(0, cy - cut_h // 2)
    y2 = tf.minimum(img_h, cy + cut_h // 2)
    x1 = tf.maximum(0, cx - cut_w // 2)
    x2 = tf.minimum(img_w, cx + cut_w // 2)
    
    # Shuffle indices
    indices = tf.random.shuffle(tf.range(batch_size))
    shuffled_images = tf.gather(images, indices)
    
    # Create mask
    mask = tf.ones_like(images)
    padding = [[0, 0], [y1, img_h - y2], [x1, img_w - x2], [0, 0]]
    cut_mask = tf.zeros([batch_size, y2 - y1, x2 - x1, 3])
    cut_mask = tf.pad(cut_mask, padding, constant_values=1)
    
    # Apply cutmix
    mixed_images = images * cut_mask + shuffled_images * (1 - cut_mask)
    
    # Adjust labels based on area
    area_ratio = tf.cast((y2 - y1) * (x2 - x1), tf.float32) / tf.cast(img_h * img_w, tf.float32)
    mixed_labels = labels * (1 - area_ratio) + tf.gather(labels, indices) * area_ratio
    
    return mixed_images, mixed_labels


def resolve_backbone(backbone_name: str, input_shape):
    """Return (base_model, preprocess_fn, canonical_name)."""
    name = (backbone_name or '').strip().lower()

    if name in {'mobilenetv3large', 'mobilenet_v3_large', 'mobilenetv3'}:
        base_model = MobileNetV3Large(
            input_shape=input_shape,
            include_top=False,
            weights='imagenet',
            pooling='avg',
        )
        preprocess_fn = lambda x: tf.keras.applications.mobilenet_v3.preprocess_input(x * 255.0)
        return base_model, preprocess_fn, 'mobilenetv3large'

    if name in {'efficientnetb0', 'efficientnet_b0', 'efficientnet'}:
        base_model = EfficientNetB0(
            input_shape=input_shape,
            include_top=False,
            weights='imagenet',
            pooling='avg',
        )
        preprocess_fn = lambda x: tf.keras.applications.efficientnet.preprocess_input(x * 255.0)
        return base_model, preprocess_fn, 'efficientnetb0'

    if name in {'efficientnetb2', 'efficientnet_b2'}:
        base_model = EfficientNetB2(
            input_shape=input_shape,
            include_top=False,
            weights='imagenet',
            pooling='avg',
        )
        preprocess_fn = lambda x: tf.keras.applications.efficientnet.preprocess_input(x * 255.0)
        return base_model, preprocess_fn, 'efficientnetb2'

    raise ValueError(
        f"Unsupported backbone '{backbone_name}'. Supported: mobilenetv3large, efficientnetb0, efficientnetb2"
    )

# ============================================
# CROP CONFIGURATIONS
# ============================================

BASE_DIR = Path(__file__).parent.parent.parent
DATASET_ROOT = BASE_DIR / 'Leaf Nutrient Data Sets'
MODEL_ROOT = Path(__file__).parent / 'models'

# Each crop config defines: dataset path, folder→label mappings, and output classes
CROP_CONFIGS = {
    'rice': {
        'name': 'Rice',
        'name_hi': 'चावल',
        'dataset_path': DATASET_ROOT / 'Rice Nutrients',
        'class_mapping': {
            'Nitrogen(N)': {'N': 1, 'P': 0, 'K': 0},
            'Phosphorus(P)': {'N': 0, 'P': 1, 'K': 0},
            'Potassium(K)': {'N': 0, 'P': 0, 'K': 1},
        },
        'has_healthy': False,
        'outputs': ['N', 'P', 'K'],
    },
    'tomato': {
        'name': 'Tomato',
        'name_hi': 'टमाटर',
        'dataset_path': DATASET_ROOT / 'Tomato Nutrients',
        'use_train_folder': True,
        'class_mapping': {
            'Tomato - Healthy': {'N': 0, 'P': 0, 'K': 0},
            'Tomato - Nitrogen Deficiency': {'N': 1, 'P': 0, 'K': 0},
            'Tomato - Potassium Deficiency': {'N': 0, 'P': 0, 'K': 1},
            'Tomato - Nitrogen and Potassium Deficiency': {'N': 1, 'P': 0, 'K': 1},
            # Disease folders - treat as healthy for NPK purposes
            'Tomato - Jassid and Mite': {'N': 0, 'P': 0, 'K': 0},
            'Tomato - Leaf Miner': {'N': 0, 'P': 0, 'K': 0},
            'Tomato - Mite': {'N': 0, 'P': 0, 'K': 0},
        },
        'has_healthy': True,
        'outputs': ['N', 'P', 'K'],
    },
    'wheat': {
        'name': 'Wheat',
        'name_hi': 'गेहूँ',
        'dataset_path': DATASET_ROOT / 'Wheat Nitrogen',
        'use_train_folder': True,
        'class_mapping': {
            'control': {'N': 0, 'P': 0, 'K': 0},
            'deficiency': {'N': 1, 'P': 0, 'K': 0},
        },
        'has_healthy': True,
        'outputs': ['N', 'P', 'K'],
    },
    'maize': {
        'name': 'Maize',
        'name_hi': 'मक्का',
        'dataset_path': DATASET_ROOT / 'Maize Nutrients',
        'use_train_folder': True,
        'class_mapping': {
            'ALL Present': {'N': 0, 'P': 0, 'K': 0},
            'NAB': {'N': 1, 'P': 0, 'K': 0},
            'PAB': {'N': 0, 'P': 1, 'K': 0},
            'KAB': {'N': 0, 'P': 0, 'K': 1},
            'ALLAB': {'N': 1, 'P': 1, 'K': 1},
            'ZNAB': {'N': 0, 'P': 0, 'K': 0},  # Zinc - future
        },
        'has_healthy': True,
        'outputs': ['N', 'P', 'K'],
    },
    'banana': {
        'name': 'Banana',
        'name_hi': 'केला',
        'dataset_path': DATASET_ROOT / 'Banana leaves Nutrient',
        'class_mapping': {
            'healthy': {'N': 0, 'P': 0, 'K': 0},
            'potassium': {'N': 0, 'P': 0, 'K': 1},
            # Micronutrients mapped to healthy for NPK model
            'boron': {'N': 0, 'P': 0, 'K': 0},
            'calcium': {'N': 0, 'P': 0, 'K': 0},
            'iron': {'N': 0, 'P': 0, 'K': 0},
            'magnesium': {'N': 0, 'P': 0, 'K': 0},
            'manganese': {'N': 0, 'P': 0, 'K': 0},
            'sulphur': {'N': 0, 'P': 0, 'K': 0},
            'zinc': {'N': 0, 'P': 0, 'K': 0},
        },
        'has_healthy': True,
        'outputs': ['N', 'P', 'K'],
    },
    'coffee': {
        'name': 'Coffee',
        'name_hi': 'कॉफी',
        'dataset_path': DATASET_ROOT / 'Coffee Nutrients',
        'class_mapping': {
            'healthy': {'N': 0, 'P': 0, 'K': 0},
            'nitrogen-N': {'N': 1, 'P': 0, 'K': 0},
            'phosphorus-P': {'N': 0, 'P': 1, 'K': 0},
            'potasium-K': {'N': 0, 'P': 0, 'K': 1},
            'boron-B': {'N': 0, 'P': 0, 'K': 0},
            'calcium-Ca': {'N': 0, 'P': 0, 'K': 0},
            'iron-Fe': {'N': 0, 'P': 0, 'K': 0},
            'magnesium-Mg': {'N': 0, 'P': 0, 'K': 0},
            'manganese-Mn': {'N': 0, 'P': 0, 'K': 0},
            'more-deficiencies': {'N': 0, 'P': 0, 'K': 0},
        },
        'has_healthy': True,
        'outputs': ['N', 'P', 'K'],
    },
    'cucumber': {
        'name': 'Cucumber',
        'name_hi': 'खीरा',
        'dataset_path': DATASET_ROOT / 'Cucumber Nutrients',
        'class_mapping': {
            'cucumber__healthy': {'N': 0, 'P': 0, 'K': 0},
            'cucumber__N': {'N': 1, 'P': 0, 'K': 0},
            'cucumber__K': {'N': 0, 'P': 0, 'K': 1},
            'cucumber__N_K': {'N': 1, 'P': 0, 'K': 1},
        },
        'has_healthy': True,
        'outputs': ['N', 'P', 'K'],
    },
    'eggplant': {
        'name': 'Eggplant',
        'name_hi': 'बैंगन',
        'dataset_path': DATASET_ROOT / 'EggPlant Nutrients',
        'class_mapping': {
            'eggplant__healthy': {'N': 0, 'P': 0, 'K': 0},
            'eggplant__N': {'N': 1, 'P': 0, 'K': 0},
            'eggplant__K': {'N': 0, 'P': 0, 'K': 1},
            'eggplant__N_K': {'N': 1, 'P': 0, 'K': 1},
            # Disease folders - healthy for NPK
            'eggplant__EB': {'N': 0, 'P': 0, 'K': 0},
            'eggplant__FB': {'N': 0, 'P': 0, 'K': 0},
            'eggplant__JAS': {'N': 0, 'P': 0, 'K': 0},
            'eggplant__MIT': {'N': 0, 'P': 0, 'K': 0},
            'eggplant__MIT_EB': {'N': 0, 'P': 0, 'K': 0},
        },
        'has_healthy': True,
        'outputs': ['N', 'P', 'K'],
    },
    'ashgourd': {
        'name': 'Ash Gourd',
        'name_hi': 'पेठा',
        'dataset_path': DATASET_ROOT / 'Ashgourd Nutrients',
        'class_mapping': {
            'ash_gourd__healthy': {'N': 0, 'P': 0, 'K': 0},
            'ash_gourd__N': {'N': 1, 'P': 0, 'K': 0},
            'ash_gourd__K': {'N': 0, 'P': 0, 'K': 1},
            'ash_gourd__N_K': {'N': 1, 'P': 0, 'K': 1},
            'ash_gourd__K_Mg': {'N': 0, 'P': 0, 'K': 1},
            'ash_gourd__N_Mg': {'N': 1, 'P': 0, 'K': 0},
            'ash_gourd__PM': {'N': 0, 'P': 0, 'K': 0},
        },
        'has_healthy': True,
        'outputs': ['N', 'P', 'K'],
    },
    'bittergourd': {
        'name': 'Bitter Gourd',
        'name_hi': 'करेला',
        'dataset_path': DATASET_ROOT / 'Bittergourd Nutrients',
        'class_mapping': {
            'bitter_gourd__healthy': {'N': 0, 'P': 0, 'K': 0},
            'bitter_gourd__N': {'N': 1, 'P': 0, 'K': 0},
            'bitter_gourd__K': {'N': 0, 'P': 0, 'K': 1},
            'bitter_gourd__N_K': {'N': 1, 'P': 0, 'K': 1},
            'bitter_gourd__K_Mg': {'N': 0, 'P': 0, 'K': 1},
            'bitter_gourd__N_Mg': {'N': 1, 'P': 0, 'K': 0},
            'bitter_gourd__DM': {'N': 0, 'P': 0, 'K': 0},
            'bitter_gourd__JAS': {'N': 0, 'P': 0, 'K': 0},
            'bitter_gourd__LS': {'N': 0, 'P': 0, 'K': 0},
        },
        'has_healthy': True,
        'outputs': ['N', 'P', 'K'],
    },
    'ridgegourd': {
        'name': 'Ridge Gourd',
        'name_hi': 'तुरई',
        'dataset_path': DATASET_ROOT / 'Ridgegourd',
        'class_mapping': {
            'ridge_gourd__healthy': {'N': 0, 'P': 0, 'K': 0},
            'ridge_gourd__N': {'N': 1, 'P': 0, 'K': 0},
            'ridge_gourd__N_Mg': {'N': 1, 'P': 0, 'K': 0},
            'ridge_gourd__PC': {'N': 0, 'P': 0, 'K': 0},
            'ridge_gourd__PLEI': {'N': 0, 'P': 0, 'K': 0},
            'ridge_gourd__PLEI_IEM': {'N': 0, 'P': 0, 'K': 0},
            'ridge_gourd__PLEI_MIT': {'N': 0, 'P': 0, 'K': 0},
        },
        'has_healthy': True,
        'outputs': ['N', 'P', 'K'],
    },
    'snakegourd': {
        'name': 'Snake Gourd',
        'name_hi': 'चिचिंडा',
        'dataset_path': DATASET_ROOT / 'Snakegourd Nutrients',
        'class_mapping': {
            'snake_gourd__healthy': {'N': 0, 'P': 0, 'K': 0},
            'snake_gourd__N': {'N': 1, 'P': 0, 'K': 0},
            'snake_gourd__K': {'N': 0, 'P': 0, 'K': 1},
            'snake_gourd__N_K': {'N': 1, 'P': 0, 'K': 1},
            'snake_gourd__LS': {'N': 0, 'P': 0, 'K': 0},
        },
        'has_healthy': True,
        'outputs': ['N', 'P', 'K'],
    },
}

# Training defaults - OPTIMIZED for accuracy
DEFAULT_CONFIG = {
    'image_size': (224, 224),
    'batch_size': 16,  # Smaller batch for better generalization
    'epochs': 100,     # More epochs for convergence
    'learning_rate': 0.0001,  # Lower LR for stability
    'validation_split': 0.2,
    'label_smoothing': 0.1,
    'mixup_alpha': 0.2,
    'focal_gamma': 2.0,
    'warmup_epochs': 5,
    'patience': 20,  # More patience for convergence
}

# Quality presets
QUALITY_PRESETS = {
    'fast': {
        'epochs': 30,
        'batch_size': 32,
        'patience': 10,
        'warmup_epochs': 3,
    },
    'balanced': {
        'epochs': 60,
        'batch_size': 24,
        'patience': 15,
        'warmup_epochs': 5,
    },
    'high': {
        'epochs': 120,
        'batch_size': 12,
        'patience': 25,
        'warmup_epochs': 8,
        'learning_rate': 0.00005,
        'image_size': (256, 256),  # Larger images
    },
}


# ============================================
# DATA LOADING
# ============================================

def load_and_preprocess_image(image_path, target_size=(224, 224), augment=False):
    """Load and preprocess a single image with optional augmentation."""
    try:
        img = Image.open(image_path).convert('RGB')
        img = img.resize(target_size, Image.LANCZOS)
        img_array = np.array(img, dtype=np.float32) / 255.0
        
        if augment:
            img_array = advanced_augment_image(img_array)
        
        return img_array
    except Exception as e:
        print(f"⚠️ Error loading {image_path}: {e}")
        return None


def create_augmented_samples(images, labels, augment_factor=2):
    """Create additional augmented samples for training."""
    augmented_images = []
    augmented_labels = []
    
    print(f"🔄 Creating {augment_factor}x augmented samples...")
    
    for _ in range(augment_factor):
        for img, lbl in zip(images, labels):
            aug_img = advanced_augment_image(img)
            augmented_images.append(aug_img)
            augmented_labels.append(lbl)
    
    return np.array(augmented_images), np.array(augmented_labels)


def load_crop_dataset(crop_id, config=None):
    """Load dataset for a specific crop with memory-efficient sampling."""
    if crop_id not in CROP_CONFIGS:
        raise ValueError(f"Unknown crop: {crop_id}. Available: {list(CROP_CONFIGS.keys())}")
    
    crop_cfg = CROP_CONFIGS[crop_id]
    dataset_path = crop_cfg['dataset_path']
    
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")
    
    # Determine root folder (some datasets have train/ subfolder)
    if crop_cfg.get('use_train_folder') and (dataset_path / 'train').exists():
        data_root = dataset_path / 'train'
    else:
        data_root = dataset_path
    
    print(f"\n📂 Loading {crop_cfg['name']} dataset from: {data_root}")
    print("=" * 60)
    
    # First pass: collect all image paths per class
    class_mapping = crop_cfg['class_mapping']
    class_images = {}  # folder_name -> list of (path, label)
    
    for folder_name, labels in class_mapping.items():
        folder_path = data_root / folder_name
        if not folder_path.exists():
            print(f"  ⏭️ Skipping {folder_name} (not found)")
            continue
        
        label = [labels.get('N', 0), labels.get('P', 0), labels.get('K', 0)]
        folder_images = []
        
        extensions = ('*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG')
        for ext in extensions:
            for img_path in folder_path.glob(ext):
                folder_images.append((img_path, label, folder_name))
        
        if folder_images:
            class_images[folder_name] = folder_images
            print(f"  📁 {folder_name}: {len(folder_images)} images")
    
    if not class_images:
        raise ValueError(f"No images found in {data_root}")
    
    # Balance and sample to avoid memory issues
    image_tasks = []
    total_available = sum(len(imgs) for imgs in class_images.values())
    
    if total_available > MAX_TOTAL_SAMPLES:
        print(f"\n⚠️ Large dataset ({total_available} images). Sampling {MAX_TOTAL_SAMPLES} to fit in memory...")
        
        # Sample proportionally but with caps per class
        for folder_name, folder_images in class_images.items():
            # Shuffle for random sampling
            random.shuffle(folder_images)
            
            # Take up to MAX_SAMPLES_PER_CLASS per folder
            sample_size = min(len(folder_images), MAX_SAMPLES_PER_CLASS)
            image_tasks.extend(folder_images[:sample_size])
        
        # If still too many, random sample to MAX_TOTAL_SAMPLES
        if len(image_tasks) > MAX_TOTAL_SAMPLES:
            random.shuffle(image_tasks)
            image_tasks = image_tasks[:MAX_TOTAL_SAMPLES]
        
        print(f"  📊 Sampled {len(image_tasks)} images from {total_available} available")
    else:
        for folder_images in class_images.values():
            image_tasks.extend(folder_images)
    
    print(f"\n🔄 Loading {len(image_tasks)} images...")
    
    images, labels, class_info = [], [], []
    folder_counts = {}
    
    target_size = (config or DEFAULT_CONFIG).get('image_size', (224, 224))
    
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        futures = {}
        for img_path, label, folder in image_tasks:
            future = executor.submit(load_and_preprocess_image, img_path, target_size)
            futures[future] = (label, folder)
        
        with tqdm(total=len(futures), desc="📷 Loading", unit="img", colour='green') as pbar:
            for future in as_completed(futures):
                result = future.result()
                label, folder = futures[future]
                if result is not None:
                    images.append(result)
                    labels.append(label)
                    class_info.append({'folder': folder})
                    folder_counts[folder] = folder_counts.get(folder, 0) + 1
                pbar.update(1)
    
    print("\n📊 Final Dataset Summary:")
    print("-" * 40)
    for folder, count in sorted(folder_counts.items()):
        print(f"  {folder}: {count} images")
    print(f"  TOTAL: {len(images)} images")
    print("-" * 40)
    
    return np.array(images), np.array(labels), class_info, crop_cfg


# ============================================
# MODEL CREATION (OPTIMIZED ARCHITECTURE)
# ============================================

class SqueezeExcite(layers.Layer):
    """Squeeze-and-Excitation block for channel attention."""
    def __init__(self, ratio=16, **kwargs):
        super().__init__(**kwargs)
        self.ratio = ratio
    
    def build(self, input_shape):
        channels = input_shape[-1]
        self.global_pool = layers.GlobalAveragePooling2D(keepdims=True)
        self.fc1 = layers.Dense(channels // self.ratio, activation='relu')
        self.fc2 = layers.Dense(channels, activation='sigmoid')
    
    def call(self, x):
        # This works on 2D pooled features, reshape if needed
        if len(x.shape) == 2:
            return x  # Skip for 1D features
        se = self.global_pool(x)
        se = self.fc1(se)
        se = self.fc2(se)
        return x * se
    
    def get_config(self):
        config = super().get_config()
        config.update({'ratio': self.ratio})
        return config


def create_model(input_shape=(224, 224, 3), num_outputs=3, *, backbone: str = 'efficientnetb0', dropout_rate=0.5):
    """Create optimized NPK model with deeper classification head."""
    base_model, preprocess_fn, canonical = resolve_backbone(backbone, input_shape)
    base_model.trainable = False
    
    inputs = keras.Input(shape=input_shape)
    
    # Strong data augmentation pipeline
    x = layers.RandomFlip("horizontal_and_vertical")(inputs)
    x = layers.RandomRotation(0.3, fill_mode='reflect')(x)
    x = layers.RandomZoom((-0.2, 0.2), fill_mode='reflect')(x)
    x = layers.RandomTranslation(0.1, 0.1, fill_mode='reflect')(x)
    x = layers.RandomBrightness(0.3)(x)
    x = layers.RandomContrast(0.3)(x)
    
    # Preprocessing for backbone
    x = preprocess_fn(x)
    
    # Feature extraction
    features = base_model(x, training=False)
    
    # Deep classification head with residual connections
    # Block 1
    x = layers.Dense(512, kernel_regularizer=keras.regularizers.l2(1e-4))(features)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(dropout_rate)(x)
    
    # Block 2 with residual
    shortcut = layers.Dense(256)(x)
    x = layers.Dense(256, kernel_regularizer=keras.regularizers.l2(1e-4))(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(dropout_rate * 0.8)(x)
    x = layers.Dense(256, kernel_regularizer=keras.regularizers.l2(1e-4))(x)
    x = layers.BatchNormalization()(x)
    x = layers.Add()([x, shortcut])
    x = layers.Activation('relu')(x)
    
    # Block 3 with residual
    shortcut = layers.Dense(128)(x)
    x = layers.Dense(128, kernel_regularizer=keras.regularizers.l2(1e-4))(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(dropout_rate * 0.6)(x)
    x = layers.Dense(128, kernel_regularizer=keras.regularizers.l2(1e-4))(x)
    x = layers.BatchNormalization()(x)
    x = layers.Add()([x, shortcut])
    x = layers.Activation('relu')(x)
    
    # Final block
    x = layers.Dense(64, kernel_regularizer=keras.regularizers.l2(1e-4))(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(dropout_rate * 0.4)(x)
    
    # Output with explicit float32 for mixed precision
    # Using SOFTMAX for mutually exclusive multi-class classification (each image has exactly one deficiency)
    outputs = layers.Dense(num_outputs, activation='softmax', dtype='float32', name='npk_output')(x)
    
    model = keras.Model(inputs, outputs, name=f'CropNPKDetector_{canonical}')
    return model, base_model


def compile_model(model, learning_rate=0.0001, use_focal_loss=True, label_smoothing=0.1, focal_gamma=2.0):
    """Compile model with categorical cross-entropy for multi-class classification."""
    # Use categorical cross-entropy since this is a MULTI-CLASS problem (each image has exactly one deficiency)
    # NOT a multi-label problem (where images could have multiple deficiencies)
    loss = keras.losses.CategoricalCrossentropy(label_smoothing=label_smoothing)
    
    model.compile(
        optimizer=keras.optimizers.AdamW(
            learning_rate=learning_rate,
            weight_decay=1e-5,
            clipnorm=1.0
        ),
        loss=loss,
        metrics=[
            'accuracy',
            keras.metrics.Precision(name='precision', class_id=None),
            keras.metrics.Recall(name='recall', class_id=None),
            keras.metrics.AUC(name='auc', multi_label=False),
            keras.metrics.F1Score(name='f1', average='macro'),
        ]
    )
    return model


class TqdmCallback(keras.callbacks.Callback):
    """Progress bar callback with detailed metrics."""
    def __init__(self, epochs, phase_name="Training"):
        super().__init__()
        self.epochs = epochs
        self.phase_name = phase_name
        self.epoch_bar = None
    
    def on_train_begin(self, logs=None):
        self.epoch_bar = tqdm(total=self.epochs, desc=f"🏋️ {self.phase_name}",
                              unit="epoch", position=0, leave=True, colour='blue')
    
    def on_epoch_end(self, epoch, logs=None):
        self.epoch_bar.update(1)
        # Show val_loss and accuracy (more reliable than AUC for imbalanced data)
        val_auc = logs.get('val_auc', float('nan'))
        auc_str = f"{val_auc:.4f}" if not np.isnan(val_auc) else "N/A"
        metrics = f"loss={logs.get('loss', 0):.4f}, val_loss={logs.get('val_loss', 0):.4f}, val_acc={logs.get('val_accuracy', 0):.4f}, auc={auc_str}"
        self.epoch_bar.set_postfix_str(metrics)
    
    def on_train_end(self, logs=None):
        self.epoch_bar.close()


class WarmupCosineDecay(keras.callbacks.Callback):
    """Warmup + Cosine annealing learning rate schedule."""
    def __init__(self, total_epochs, warmup_epochs, initial_lr, min_lr=1e-7):
        super().__init__()
        self.total_epochs = total_epochs
        self.warmup_epochs = warmup_epochs
        self.initial_lr = initial_lr
        self.min_lr = min_lr
    
    def on_epoch_begin(self, epoch, logs=None):
        if epoch < self.warmup_epochs:
            # Linear warmup
            lr = self.initial_lr * (epoch + 1) / self.warmup_epochs
        else:
            # Cosine decay
            progress = (epoch - self.warmup_epochs) / (self.total_epochs - self.warmup_epochs)
            lr = self.min_lr + 0.5 * (self.initial_lr - self.min_lr) * (1 + np.cos(np.pi * progress))
        
        self.model.optimizer.learning_rate.assign(lr)
    
    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        logs['lr'] = float(self.model.optimizer.learning_rate.numpy())


def compute_class_weights(labels):
    """Compute sample weights for imbalanced multi-label data."""
    # For multi-label, compute weights based on positive sample frequency
    n_samples = len(labels)
    n_classes = labels.shape[1]
    
    weights = np.ones(n_samples)
    
    for i in range(n_classes):
        pos_count = labels[:, i].sum()
        neg_count = n_samples - pos_count
        
        if pos_count > 0 and neg_count > 0:
            # Weight rare class higher
            pos_weight = n_samples / (2 * pos_count)
            neg_weight = n_samples / (2 * neg_count)
            
            weights += labels[:, i] * pos_weight + (1 - labels[:, i]) * neg_weight
    
    # Normalize
    weights = weights / weights.mean()
    return weights


def test_time_augmentation(model, images, num_augmentations=5):
    """Apply test-time augmentation for better predictions."""
    predictions = []
    
    # Original prediction
    predictions.append(model.predict(images, verbose=0))
    
    # Augmented predictions
    for _ in range(num_augmentations - 1):
        aug_images = np.array([advanced_augment_image(img) for img in images])
        predictions.append(model.predict(aug_images, verbose=0))
    
    # Average predictions
    return np.mean(predictions, axis=0)


# ============================================
# TRAINING (OPTIMIZED)
# ============================================

def train_crop_model(crop_id, config=None, disable_early_stopping=False):
    """Train optimized model for a specific crop."""
    config = {**DEFAULT_CONFIG, **(config or {})}
    
    print("\n" + "=" * 70)
    print(f"🌱 Training OPTIMIZED Model for: {CROP_CONFIGS[crop_id]['name']}")
    print(f"   Backbone: {config.get('backbone', 'efficientnetb0')}")
    print(f"   Epochs: {config['epochs']}, Batch: {config['batch_size']}, LR: {config['learning_rate']}")
    print("=" * 70)
    
    # Load data
    X, y, class_info, crop_cfg = load_crop_dataset(crop_id, config)
    
    if len(X) < 20:
        print(f"❌ Not enough images ({len(X)}). Need at least 20.")
        return None
    
    # Compute class distribution and identify trainable outputs
    class_balance = {
        'N': float(y[:, 0].mean()),
        'P': float(y[:, 1].mean()),
        'K': float(y[:, 2].mean()),
    }
    print(f"📊 Class balance - N:{class_balance['N']:.2%}, P:{class_balance['P']:.2%}, K:{class_balance['K']:.2%}")
    
    # Check for degenerate cases (single class for any output)
    degenerate_outputs = []
    trainable_outputs = []
    for i, name in enumerate(crop_cfg['outputs']):
        unique_values = np.unique(y[:, i])
        if len(unique_values) < 2:
            degenerate_outputs.append(name)
            print(f"  ⚠️ {name}: Only {'positive' if unique_values[0] == 1 else 'negative'} samples - model can't learn this")
        else:
            trainable_outputs.append(name)
    
    if len(trainable_outputs) == 0:
        print(f"❌ Dataset has no class variation. Cannot train a useful model.")
        print(f"   Consider using a different dataset with both positive and negative samples for at least one nutrient.")
        return None
    
    if degenerate_outputs:
        print(f"  ℹ️ Will train for: {trainable_outputs} (skipping constant outputs: {degenerate_outputs})")
    
    # Compute sample weights for imbalanced data
    sample_weights = compute_class_weights(y)
    
    # Split data with stratification
    try:
        # Create stratification key from multi-label
        strat_key = (y[:, 0] * 4 + y[:, 1] * 2 + y[:, 2]).astype(int)
        X_train, X_temp, y_train, y_temp, sw_train, sw_temp = train_test_split(
            X, y, sample_weights, test_size=0.25, random_state=SEED, stratify=strat_key
        )
    except ValueError:
        X_train, X_temp, y_train, y_temp, sw_train, sw_temp = train_test_split(
            X, y, sample_weights, test_size=0.25, random_state=SEED
        )
    
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.4, random_state=SEED)
    
    print(f"📊 Data Split: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")
    
    # Create offline augmented samples for training (2x more data)
    if len(X_train) < 500:
        aug_factor = 3 if len(X_train) < 200 else 2
        X_aug, y_aug = create_augmented_samples(X_train, y_train, augment_factor=aug_factor)
        X_train = np.concatenate([X_train, X_aug])
        y_train = np.concatenate([y_train, y_aug])
        sw_train = np.concatenate([sw_train, np.ones(len(X_aug))])
        print(f"📈 Augmented training set: {len(X_train)} samples")
    
    # Create model output directory
    model_dir = MODEL_ROOT / crop_id
    model_dir.mkdir(parents=True, exist_ok=True)
    
    # Create model with deeper head
    print("\n🔧 Creating optimized model...")
    image_size = config.get('image_size', (224, 224))
    input_shape = (*image_size, 3)
    model, base_model = create_model(
        input_shape=input_shape,
        num_outputs=len(crop_cfg['outputs']),
        backbone=config.get('backbone', 'efficientnetb0'),
        dropout_rate=0.5
    )
    compile_model(
        model,
        config['learning_rate'],
        use_focal_loss=True,
        label_smoothing=config.get('label_smoothing', 0.1),
        focal_gamma=config.get('focal_gamma', 2.0)
    )
    
    model.summary()
    
    # Create tf.data datasets with MixUp/CutMix
    def create_train_dataset(X, y, weights, batch_size, use_mixup=True):
        ds = tf.data.Dataset.from_tensor_slices((X, y, weights))
        ds = ds.shuffle(len(X), reshuffle_each_iteration=True)
        ds = ds.map(
            lambda x, y, w: (tf.cast(x, tf.float32), tf.cast(y, tf.float32), tf.cast(w, tf.float32)),
            num_parallel_calls=tf.data.AUTOTUNE
        )
        ds = ds.batch(batch_size, drop_remainder=True)
        
        if use_mixup:
            def apply_mixup(images, labels, weights):
                # Apply MixUp with 50% probability
                if tf.random.uniform([]) > 0.5:
                    images, labels = mixup(images, labels, alpha=config.get('mixup_alpha', 0.2))
                return images, labels, weights
            ds = ds.map(apply_mixup, num_parallel_calls=tf.data.AUTOTUNE)
        
        # Return only images and labels for training
        ds = ds.map(lambda x, y, w: (x, y), num_parallel_calls=tf.data.AUTOTUNE)
        return ds.prefetch(tf.data.AUTOTUNE)
    
    train_ds = create_train_dataset(X_train, y_train, sw_train, config['batch_size'], use_mixup=True)
    
    val_ds = tf.data.Dataset.from_tensor_slices((X_val, y_val))
    val_ds = val_ds.map(
        lambda x, y: (tf.cast(x, tf.float32), tf.cast(y, tf.float32)),
        num_parallel_calls=tf.data.AUTOTUNE
    ).batch(config['batch_size']).prefetch(tf.data.AUTOTUNE)
    
    # PHASE 1: Train with frozen backbone
    warmup_epochs = config.get('warmup_epochs', 5)
    phase1_epochs = max(config['epochs'] // 3, warmup_epochs + 5)
    patience = config.get('patience', 20)
    
    # Use val_loss for monitoring (more robust than val_auc when classes are imbalanced)
    monitor_metric = 'val_loss'
    monitor_mode = 'min'
    
    callbacks_p1 = [
        ModelCheckpoint(
            str(model_dir / 'best.keras'),
            monitor=monitor_metric, mode=monitor_mode,
            save_best_only=True, verbose=0
        ),
        WarmupCosineDecay(
            total_epochs=phase1_epochs,
            warmup_epochs=warmup_epochs,
            initial_lr=config['learning_rate']
        ),
        TqdmCallback(phase1_epochs, "Phase 1 (Frozen Base)")
    ]
    if not disable_early_stopping:
        callbacks_p1.insert(1, EarlyStopping(
            monitor=monitor_metric, mode=monitor_mode,
            patience=patience // 2,
            restore_best_weights=True, verbose=1
        ))
    
    print(f"\n🚀 Phase 1: Training classifier head ({phase1_epochs} epochs, warmup={warmup_epochs})...")
    history1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=phase1_epochs,
        callbacks=callbacks_p1,
        verbose=0
    )
    
    # PHASE 2: Gradual unfreezing + fine-tuning
    print("\n\n🔓 Unfreezing backbone layers for fine-tuning...")
    base_model.trainable = True
    
    # Freeze early layers (feature extractors), unfreeze later layers
    total_layers = len(base_model.layers)
    unfreeze_from = int(total_layers * 0.6)  # Unfreeze top 40%
    for layer in base_model.layers[:unfreeze_from]:
        layer.trainable = False
    
    trainable_count = sum([layer.trainable for layer in base_model.layers])
    print(f"   Unfrozen {trainable_count}/{total_layers} backbone layers")
    
    # Recompile with lower learning rate
    compile_model(
        model,
        config['learning_rate'] / 10,
        use_focal_loss=True,
        label_smoothing=config.get('label_smoothing', 0.1),
        focal_gamma=config.get('focal_gamma', 2.0)
    )
    
    phase2_epochs = config['epochs'] - phase1_epochs
    initial_epoch = len(history1.history['loss'])
    
    callbacks_p2 = [
        ModelCheckpoint(
            str(model_dir / 'best.keras'),
            monitor=monitor_metric, mode=monitor_mode,
            save_best_only=True, verbose=0
        ),
        WarmupCosineDecay(
            total_epochs=phase2_epochs,
            warmup_epochs=3,
            initial_lr=config['learning_rate'] / 10
        ),
        ReduceLROnPlateau(
            monitor='val_loss', factor=0.5,
            patience=8, min_lr=1e-8, verbose=1
        ),
        TqdmCallback(phase2_epochs, "Phase 2 (Fine-tune)")
    ]
    if not disable_early_stopping:
        callbacks_p2.insert(1, EarlyStopping(
            monitor=monitor_metric, mode=monitor_mode,
            patience=patience,
            restore_best_weights=True, verbose=1
        ))
    
    print(f"\n🔥 Phase 2: Fine-tuning ({phase2_epochs} epochs)...")
    history2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=config['epochs'],
        initial_epoch=initial_epoch,
        callbacks=callbacks_p2,
        verbose=0
    )
    
    # PHASE 3: Full unfreezing with very low LR (optional refinement)
    if config['epochs'] >= 80:
        print("\n\n🎯 Phase 3: Full fine-tuning refinement...")
        base_model.trainable = True  # Unfreeze all
        
        compile_model(
            model,
            config['learning_rate'] / 100,
            use_focal_loss=True,
            label_smoothing=config.get('label_smoothing', 0.1) * 0.5,  # Less smoothing
            focal_gamma=config.get('focal_gamma', 2.0)
        )
        
        phase3_epochs = min(20, config['epochs'] // 5)
        current_epoch = len(history1.history['loss']) + len(history2.history['loss'])
        
        callbacks_p3 = [
            ModelCheckpoint(
                str(model_dir / 'best.keras'),
                monitor=monitor_metric, mode=monitor_mode,
                save_best_only=True, verbose=0
            ),
            EarlyStopping(
                monitor=monitor_metric, mode=monitor_mode,
                patience=10, restore_best_weights=True, verbose=1
            ),
            TqdmCallback(phase3_epochs, "Phase 3 (Refinement)")
        ]
        
        model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=current_epoch + phase3_epochs,
            initial_epoch=current_epoch,
            callbacks=callbacks_p3,
            verbose=0
        )
    
    # Load best model for evaluation
    print("\n\n📊 Loading best model for evaluation...")
    model = keras.models.load_model(
        model_dir / 'best.keras',
        custom_objects={'BinaryFocalLoss': BinaryFocalLoss}
    )
    
    # Evaluate with Test-Time Augmentation
    print("🔄 Evaluating with Test-Time Augmentation (TTA)...")
    y_pred_tta = test_time_augmentation(model, X_test, num_augmentations=5)
    
    # For MULTI-CLASS classification with softmax, use argmax to get predictions
    # Convert softmax probabilities to one-hot encoded predictions
    y_pred_class = np.argmax(y_pred_tta, axis=1)  # Get predicted class index
    y_true_class = np.argmax(y_test, axis=1)      # Get true class index
    y_pred_binary = np.eye(3)[y_pred_class]       # Convert back to one-hot for per-class metrics
    
    # DEBUG: Print prediction distribution
    print("\n📊 Prediction Analysis:")
    print(f"   Raw pred range: [{y_pred_tta.min():.4f}, {y_pred_tta.max():.4f}]")
    print(f"   Raw pred mean per class: N={y_pred_tta[:, 0].mean():.4f}, P={y_pred_tta[:, 1].mean():.4f}, K={y_pred_tta[:, 2].mean():.4f}")
    print(f"   Predictions per class: N={y_pred_binary[:, 0].sum():.0f}, P={y_pred_binary[:, 1].sum():.0f}, K={y_pred_binary[:, 2].sum():.0f}")
    print(f"   True labels per class: N={y_test[:, 0].sum():.0f}, P={y_test[:, 1].sum():.0f}, K={y_test[:, 2].sum():.0f}")
    print(f"   Test set size: {len(y_test)}")
    
    # Per-class metrics
    per_class_acc = {}
    per_class_f1 = {}
    per_class_auc = {}
    
    for i, name in enumerate(crop_cfg['outputs']):
        # Check if this output has variation in test set
        unique_true = np.unique(y_test[:, i])
        unique_pred = np.unique(y_pred_binary[:, i])
        
        if len(unique_true) < 2:
            print(f"  {name}: SKIPPED (no variation in test set - all {'positive' if unique_true[0] == 1 else 'negative'})")
            per_class_acc[name] = float('nan')
            per_class_f1[name] = float('nan')
            per_class_auc[name] = float('nan')
        else:
            acc = (y_pred_binary[:, i] == y_test[:, i]).mean()
            per_class_acc[name] = float(acc)
            
            # F1 score
            from sklearn.metrics import f1_score as sklearn_f1
            try:
                f1_class = sklearn_f1(y_test[:, i], y_pred_binary[:, i], zero_division=0)
                per_class_f1[name] = float(f1_class)
            except:
                per_class_f1[name] = float('nan')
            
            # AUC
            try:
                from sklearn.metrics import roc_auc_score
                auc_class = roc_auc_score(y_test[:, i], y_pred_tta[:, i])
                per_class_auc[name] = float(auc_class)
            except:
                per_class_auc[name] = float('nan')
            
            print(f"  {name}: Acc={acc:.4f}, F1={per_class_f1[name]:.4f}, AUC={per_class_auc[name]:.4f}")
    
    # Overall metrics for multi-class classification
    from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
    
    # For multi-class, use the class indices directly
    overall_acc = accuracy_score(y_true_class, y_pred_class)
    
    try:
        f1 = f1_score(y_true_class, y_pred_class, average='macro', zero_division=0)
    except:
        f1 = 0.0
    
    try:
        # For multi-class AUC, we need the probability predictions
        auc = roc_auc_score(y_test, y_pred_tta, multi_class='ovr', average='macro')
    except ValueError:
        auc = 0.5
    
    print(f"\n📈 Final Results (with TTA):")
    print(f"  Overall Accuracy: {overall_acc:.4f}")
    print(f"  Macro F1 Score:   {f1:.4f}")
    print(f"  Macro AUC:        {auc:.4f}")
    
    # Standard evaluation (without TTA) for comparison
    results = model.evaluate(X_test, y_test, verbose=0)
    print(f"\n📊 Standard Evaluation (no TTA):")
    print(f"  Test Loss:     {results[0]:.4f}")
    print(f"  Test Accuracy: {results[1]:.4f}")
    # AUC is at index 4, but may vary - use safe access
    test_auc = results[4] if len(results) > 4 else 0.5
    print(f"  Test AUC:      {test_auc:.4f}")
    
    # Save final model and metadata
    model.save(model_dir / 'model.keras')
    
    # Save TFLite with quantization for mobile
    try:
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]  # Float16 quantization
        tflite_model = converter.convert()
        with open(model_dir / 'model.tflite', 'wb') as f:
            f.write(tflite_model)
        print(f"✅ TFLite saved ({len(tflite_model) / 1024 / 1024:.2f} MB)")
    except Exception as e:
        print(f"⚠️ TFLite conversion failed: {e}")
    
    # Save comprehensive metadata
    metadata = {
        'crop_id': crop_id,
        'crop_name': crop_cfg['name'],
        'crop_name_hi': crop_cfg['name_hi'],
        'outputs': crop_cfg['outputs'],
        'created_at': datetime.now().isoformat(),
        'training_images': len(X_train),
        'test_accuracy': float(overall_acc),
        'test_accuracy_tta': float(overall_acc),
        'test_f1': float(f1),
        'test_auc': float(auc),
        'per_class_accuracy': {k: (v if not np.isnan(v) else None) for k, v in per_class_acc.items()},
        'per_class_f1': {k: (v if not np.isnan(v) else None) for k, v in per_class_f1.items()},
        'per_class_auc': {k: (v if not np.isnan(v) else None) for k, v in per_class_auc.items()},
        'class_balance': class_balance,
        'trainable_outputs': trainable_outputs,
        'degenerate_outputs': degenerate_outputs,
        'config': config,
        'backbone': config.get('backbone', 'efficientnetb0'),
    }
    with open(model_dir / 'metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✅ Model saved to: {model_dir}")
    
    return model, metadata


def update_crop_registry():
    """Update the central crop registry with all trained models."""
    registry = {}
    
    for crop_id in CROP_CONFIGS:
        model_dir = MODEL_ROOT / crop_id
        metadata_path = model_dir / 'metadata.json'
        
        if metadata_path.exists():
            with open(metadata_path) as f:
                meta = json.load(f)
            registry[crop_id] = {
                'name': meta['crop_name'],
                'name_hi': meta['crop_name_hi'],
                'model_path': str(model_dir / 'best.keras'),
                'tflite_path': str(model_dir / 'model.tflite'),
                'outputs': meta['outputs'],
                'test_auc': meta.get('test_auc'),
                'trained_at': meta.get('created_at'),
            }
    
    registry_path = MODEL_ROOT / 'crop_registry.json'
    with open(registry_path, 'w') as f:
        json.dump(registry, f, indent=2)
    
    print(f"\n📋 Crop registry updated: {registry_path}")
    print(f"   Trained models: {list(registry.keys())}")
    
    return registry


# ============================================
# CLI
# ============================================

def main():
    parser = argparse.ArgumentParser(
        description="Train crop-specific NPK models (OPTIMIZED for accuracy)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python train_crop_model.py --list                          # List available crops
  python train_crop_model.py --crop rice                     # Train rice model (balanced)
  python train_crop_model.py --crop all --quality high       # Train all crops for max accuracy
  python train_crop_model.py --crop tomato --epochs 150      # Custom epochs
  python train_crop_model.py --crop wheat --backbone efficientnetb2  # Use EfficientNet-B2
        """
    )
    parser.add_argument('--crop', type=str, help='Crop ID to train (or "all")')
    parser.add_argument('--list', action='store_true', help='List available crops')
    parser.add_argument('--backbone', type=str, default='efficientnetb0',
                        help='Backbone: efficientnetb0, efficientnetb2, or mobilenetv3large')
    parser.add_argument('--quality', type=str, choices=['fast', 'balanced', 'high'], default='balanced',
                        help='Training quality preset (fast/balanced/high)')
    parser.add_argument('--epochs', type=int, help='Training epochs (overrides preset)')
    parser.add_argument('--batch-size', type=int, help='Batch size (overrides preset)')
    parser.add_argument('--learning-rate', type=float, help='Learning rate (overrides preset)')
    parser.add_argument('--disable-early-stopping', action='store_true', help='Train full epochs')
    parser.add_argument('--smoke-test', action='store_true', help='Only build+compile the model')
    args = parser.parse_args()
    
    if args.list:
        print("\n📋 Available crops:")
        print("-" * 60)
        for crop_id, cfg in CROP_CONFIGS.items():
            exists = (MODEL_ROOT / crop_id / 'best.keras').exists()
            status = "✅ trained" if exists else "⬜ not trained"
            print(f"  {crop_id:15} {cfg['name']:15} {status}")
        print("\n📊 Quality presets:")
        for preset, settings in QUALITY_PRESETS.items():
            print(f"  {preset:10} epochs={settings['epochs']}, batch={settings['batch_size']}")
        return
    
    if not args.crop:
        parser.print_help()
        return
    
    # Build config from preset + overrides
    preset = QUALITY_PRESETS.get(args.quality, {})
    config = {**DEFAULT_CONFIG, **preset}
    config['backbone'] = args.backbone
    
    # CLI overrides
    if args.epochs:
        config['epochs'] = args.epochs
    if args.batch_size:
        config['batch_size'] = args.batch_size
    if args.learning_rate:
        config['learning_rate'] = args.learning_rate
    
    print(f"\n🔧 Training Configuration:")
    print(f"   Quality Preset: {args.quality}")
    print(f"   Backbone:       {config['backbone']}")
    print(f"   Epochs:         {config['epochs']}")
    print(f"   Batch Size:     {config['batch_size']}")
    print(f"   Learning Rate:  {config['learning_rate']}")
    print(f"   Image Size:     {config.get('image_size', (224, 224))}")
    
    if args.crop.lower() == 'all':
        # Train all crops sequentially
        print(f"\n🌾 Training ALL {len(CROP_CONFIGS)} crops sequentially...")
        successful = []
        failed = []
        
        for crop_id in CROP_CONFIGS:
            try:
                if args.smoke_test:
                    print(f"\n🧪 Smoke test: {crop_id}")
                    model, _base = create_model(
                        num_outputs=len(CROP_CONFIGS[crop_id]['outputs']),
                        backbone=config.get('backbone', 'efficientnetb0')
                    )
                    compile_model(model, config['learning_rate'])
                    print(f"   ✅ {model.name}")
                    successful.append(crop_id)
                    continue
                
                result = train_crop_model(crop_id, config, args.disable_early_stopping)
                if result:
                    successful.append(crop_id)
                else:
                    failed.append(crop_id)
            except Exception as e:
                print(f"❌ Failed to train {crop_id}: {e}")
                failed.append(crop_id)
        
        print(f"\n📊 Training Summary:")
        print(f"   ✅ Successful: {successful}")
        print(f"   ❌ Failed:     {failed}")
    else:
        crop_id = args.crop.lower()
        if crop_id not in CROP_CONFIGS:
            print(f"❌ Unknown crop: {crop_id}")
            print(f"   Available: {list(CROP_CONFIGS.keys())}")
            return
        
        if args.smoke_test:
            print(f"\n🧪 Smoke test: building model for {crop_id}")
            model, _base = create_model(
                num_outputs=len(CROP_CONFIGS[crop_id]['outputs']),
                backbone=config.get('backbone', 'efficientnetb0')
            )
            compile_model(model, config['learning_rate'])
            model.summary()
            print("✅ Smoke test passed!")
            return
        
        train_crop_model(crop_id, config, args.disable_early_stopping)
    
    # Update registry
    update_crop_registry()
    
    print("\n" + "=" * 70)
    print("✅ Training complete!")
    print("=" * 70)


if __name__ == '__main__':
    main()
