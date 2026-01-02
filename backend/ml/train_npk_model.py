"""
FasalVaidya NPK Deficiency Detection Model Training
====================================================
This script trains a multi-label classification model to detect:
- Nitrogen (N) deficiency
- Phosphorus (P) deficiency
- Potassium (K) deficiency
- Healthy leaves

Uses MobileNetV3 Large as backbone for efficient inference on mobile devices.
Dataset: CoLeaf DATASET with NPK deficiency images

Backbones:
- MobileNetV3Large (fast, smaller)
- EfficientNetB0 (often better accuracy, still mobile-friendly)

Tip:
Use --smoke-test to validate model build/compile without loading the dataset.
"""

import os
import sys
import json
import numpy as np
from pathlib import Path
from datetime import datetime
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import multiprocessing
from tqdm import tqdm

# Get optimal thread count
NUM_WORKERS = min(multiprocessing.cpu_count(), 16)
print(f"🔧 Using {NUM_WORKERS} worker threads for parallel processing")

# TensorFlow imports
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TF warnings
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from sklearn.model_selection import train_test_split
from PIL import Image

# Enable mixed precision only when a GPU is available.
# Mixed precision on CPU often slows down and can destabilize training (NaNs).
try:
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        tf.keras.mixed_precision.set_global_policy('mixed_float16')
        print(f"⚡ Mixed precision (float16) enabled on GPU ({len(gpus)} detected)")
    else:
        tf.keras.mixed_precision.set_global_policy('float32')
        print("ℹ️ No GPU detected; using float32 for numerical stability")
except Exception as e:
    print(f"ℹ️ Mixed precision policy setup skipped: {e}")

# Configure TensorFlow threading
tf.config.threading.set_intra_op_parallelism_threads(NUM_WORKERS)
tf.config.threading.set_inter_op_parallelism_threads(NUM_WORKERS)

# Check TensorFlow version and use appropriate imports
TF_VERSION = tuple(map(int, tf.__version__.split('.')[:2]))
if TF_VERSION >= (2, 16):
    # TF 2.16+ uses keras 3
    from keras.applications import MobileNetV3Large, EfficientNetB0
else:
    from tensorflow.keras.applications import MobileNetV3Large, EfficientNetB0

# Configuration
CONFIG = {
    'dataset_path': os.path.join(os.path.dirname(__file__), '..', '..', 'CoLeaf DATASET'),
    'model_save_path': os.path.join(os.path.dirname(__file__), 'models'),
    'image_size': (224, 224),
    'batch_size': 32,  # Increased for faster training
    'epochs': 50,
    # Lower LR helps prevent divergence/NaNs, especially with fine-tuning.
    'learning_rate': 0.0003,
    'validation_split': 0.2,
    'test_split': 0.1,
    'num_workers': NUM_WORKERS,
    'prefetch_buffer': tf.data.AUTOTUNE,
    # Default backbone can be overridden via CLI.
    'backbone': 'efficientnetb0',
}


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

    raise ValueError(
        f"Unsupported backbone '{backbone_name}'. Supported: mobilenetv3large, efficientnetb0"
    )

# Class definitions for multi-label classification
CLASSES = {
    'healthy': {'N': 0, 'P': 0, 'K': 0},
    'nitrogen-N': {'N': 1, 'P': 0, 'K': 0},
    'phosphorus-P': {'N': 0, 'P': 1, 'K': 0},
    'potasium-K': {'N': 0, 'P': 0, 'K': 1},
    # Micronutrient deficiencies (treated as separate category for now)
    'boron-B': {'N': 0, 'P': 0, 'K': 0, 'micro': 'B'},
    'calcium-Ca': {'N': 0, 'P': 0, 'K': 0, 'micro': 'Ca'},
    'iron-Fe': {'N': 0, 'P': 0, 'K': 0, 'micro': 'Fe'},
    'magnesium-Mg': {'N': 0, 'P': 0, 'K': 0, 'micro': 'Mg'},
    'manganese-Mn': {'N': 0, 'P': 0, 'K': 0, 'micro': 'Mn'},
}


def load_and_preprocess_image(image_path, target_size=(224, 224)):
    """Load and preprocess a single image."""
    try:
        img = Image.open(image_path).convert('RGB')
        img = img.resize(target_size, Image.LANCZOS)
        img_array = np.array(img, dtype=np.float32)
        img_array = img_array / 255.0  # Normalize to [0, 1]
        return img_array
    except Exception as e:
        print(f"Error loading image {image_path}: {e}")
        return None


def parse_deficiency_label(filename, folder_name):
    """
    Parse deficiency labels from filename and folder.
    Returns: dict with N, P, K scores (0 or 1), confidence, and detected class.
    """
    # Default: healthy
    labels = {'N': 0, 'P': 0, 'K': 0}
    detected_class = 'healthy'
    
    folder_lower = folder_name.lower()
    
    # Primary NPK deficiencies from folder name
    if 'nitrogen' in folder_lower or folder_name == 'nitrogen-N':
        labels['N'] = 1
        detected_class = 'nitrogen_deficiency'
    elif 'phosphorus' in folder_lower or folder_name == 'phosphorus-P':
        labels['P'] = 1
        detected_class = 'phosphorus_deficiency'
    elif 'potasium' in folder_lower or folder_name == 'potasium-K':
        labels['K'] = 1
        detected_class = 'potassium_deficiency'
    elif 'healthy' in folder_lower:
        detected_class = 'healthy'
    
    # Handle multi-deficiency folder (more-deficiencies)
    if folder_name == 'more-deficiencies':
        filename_upper = filename.upper()
        # Parse combined deficiencies like "N_P", "K_P", etc.
        if 'N_' in filename_upper or '_N' in filename_upper:
            labels['N'] = 1
        if 'P_' in filename_upper or '_P' in filename_upper or filename_upper.startswith('P '):
            labels['P'] = 1
        if 'K_' in filename_upper or '_K' in filename_upper or filename_upper.startswith('K '):
            labels['K'] = 1
        
        # Determine detected class based on combination
        deficiencies = []
        if labels['N']: deficiencies.append('N')
        if labels['P']: deficiencies.append('P')
        if labels['K']: deficiencies.append('K')
        
        if deficiencies:
            detected_class = '_'.join(deficiencies) + '_deficiency'
        else:
            detected_class = 'other_deficiency'
    
    return labels, detected_class


def process_single_image(args):
    """Process a single image (used for parallel loading)."""
    img_path, folder_name, img_file = args
    img_array = load_and_preprocess_image(str(img_path))
    if img_array is not None:
        label, detected_class = parse_deficiency_label(img_file, folder_name)
        return {
            'image': img_array,
            'label': [label['N'], label['P'], label['K']],
            'info': {
                'path': str(img_path),
                'folder': folder_name,
                'detected_class': detected_class,
                'labels': label
            }
        }
    return None


def load_dataset():
    """
    Load dataset from CoLeaf DATASET folder using multi-threading.
    Returns: X (images), y (multi-label), class_names
    """
    dataset_path = Path(CONFIG['dataset_path'])
    
    images = []
    labels = []
    class_info = []
    
    print(f"\n📂 Loading dataset from: {dataset_path}")
    print(f"⚡ Using {NUM_WORKERS} parallel workers for faster loading")
    print("=" * 60)
    
    # Focus on NPK-related folders for MVP
    npk_folders = ['healthy', 'nitrogen-N', 'phosphorus-P', 'potasium-K', 'more-deficiencies']
    
    folder_counts = {}
    
    # Collect all image paths first
    image_tasks = []
    
    for folder_name in os.listdir(dataset_path):
        folder_path = dataset_path / folder_name
        if not folder_path.is_dir():
            continue
            
        # Skip micronutrient folders for MVP (focus on NPK)
        if folder_name not in npk_folders:
            print(f"  ⏭️  Skipping {folder_name} (micronutrient, future phase)")
            continue
        
        folder_counts[folder_name] = 0
        
        for img_file in os.listdir(folder_path):
            if not img_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                continue
            
            img_path = folder_path / img_file
            image_tasks.append((img_path, folder_name, img_file))
    
    print(f"\n🔄 Loading {len(image_tasks)} images in parallel...")
    
    # Process images in parallel using ThreadPoolExecutor with tqdm progress bar
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        futures = {executor.submit(process_single_image, task): task for task in image_tasks}
        
        with tqdm(total=len(image_tasks), desc="📷 Loading images", unit="img", 
                  bar_format='{l_bar}{bar:30}{r_bar}{bar:-10b}', colour='green') as pbar:
            for future in as_completed(futures):
                result = future.result()
                if result is not None:
                    images.append(result['image'])
                    labels.append(result['label'])
                    class_info.append(result['info'])
                    folder_counts[result['info']['folder']] += 1
                pbar.update(1)
    
    print("\n📊 Dataset Summary:")
    print("-" * 40)
    for folder, count in folder_counts.items():
        print(f"  {folder}: {count} images")
    print(f"  TOTAL: {len(images)} images")
    print("-" * 40)
    
    return np.array(images), np.array(labels), class_info


def create_model(input_shape=(224, 224, 3), num_outputs=3, *, backbone: str | None = None):
    """
    Create NPK deficiency detection model.
    
    Architecture:
    - MobileNetV3Large (pretrained on ImageNet) as feature extractor
    - Global Average Pooling
    - Dense layers with dropout for regularization
    - 3 sigmoid outputs for multi-label classification (N, P, K)
    """
    base_model, preprocess_fn, canonical = resolve_backbone(backbone or CONFIG.get('backbone'), input_shape)
    
    # Freeze base model layers initially
    base_model.trainable = False
    
    # Build model
    inputs = keras.Input(shape=input_shape)
    
    # Data augmentation layers (applied during training)
    x = layers.RandomFlip("horizontal")(inputs)
    x = layers.RandomRotation(0.2)(x)
    x = layers.RandomZoom(0.2)(x)
    x = layers.RandomBrightness(0.2)(x)
    x = layers.RandomContrast(0.2)(x)
    
    # Backbone-specific preprocessing
    x = preprocess_fn(x)
    
    # Feature extraction
    x = base_model(x, training=False)
    
    # Classification head
    x = layers.Dense(256, activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.5)(x)
    
    x = layers.Dense(128, activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    
    # Multi-label output: 3 sigmoid neurons for N, P, K
    # Force float32 outputs so loss/metrics stay numerically stable even under mixed precision.
    outputs = layers.Dense(num_outputs, activation='sigmoid', dtype='float32', name='npk_output')(x)
    
    model = keras.Model(inputs, outputs, name=f'FasalVaidya_NPK_Detector_{canonical}')
    
    return model, base_model


def compile_model(model, learning_rate=0.001):
    """Compile model with appropriate loss and metrics for multi-label classification."""
    model.compile(
        # Gradient clipping prevents exploding gradients -> NaN loss.
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate, clipnorm=1.0),
        loss='binary_crossentropy',  # Multi-label classification
        metrics=[
            'accuracy',
            keras.metrics.Precision(name='precision'),
            keras.metrics.Recall(name='recall'),
            keras.metrics.AUC(name='auc', multi_label=True)
        ]
    )
    return model


class TqdmCallback(keras.callbacks.Callback):
    """Custom callback for tqdm progress bar during training."""
    
    def __init__(self, epochs, phase_name="Training"):
        super().__init__()
        self.epochs = epochs
        self.phase_name = phase_name
        self.epoch_bar = None
        
    def on_train_begin(self, logs=None):
        self.epoch_bar = tqdm(total=self.epochs, desc=f"🏋️ {self.phase_name}", 
                             unit="epoch", position=0, leave=True,
                             bar_format='{l_bar}{bar:25}{r_bar}', colour='blue')
    
    def on_epoch_end(self, epoch, logs=None):
        self.epoch_bar.update(1)
        metrics = f"loss={logs.get('loss', 0):.4f}, val_loss={logs.get('val_loss', 0):.4f}, auc={logs.get('auc', 0):.4f}"
        self.epoch_bar.set_postfix_str(metrics)
    
    def on_train_end(self, logs=None):
        self.epoch_bar.close()


def train_model(
    model,
    base_model,
    X_train,
    y_train,
    X_val,
    y_val,
    *,
    unfreeze_last_n=50,
    early_stopping=True,
    early_stopping_patience=10,
    early_stopping_min_delta=0.0,
):
    """Train the model with callbacks and fine-tuning."""
    
    # Create model save directory
    model_dir = Path(CONFIG['model_save_path'])
    model_dir.mkdir(parents=True, exist_ok=True)
    
    callbacks_phase1 = [
        ModelCheckpoint(
            filepath=str(model_dir / 'fasalvaidya_npk_best.keras'),
            monitor='val_auc',
            mode='max',
            save_best_only=True,
            verbose=0
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=0
        ),
    ]

    if early_stopping:
        callbacks_phase1.insert(
            1,
            EarlyStopping(
                monitor='val_auc',
                mode='max',
                patience=int(max(1, early_stopping_patience)),
                min_delta=float(max(0.0, early_stopping_min_delta)),
                restore_best_weights=True,
                verbose=1,
            ),
        )

    phase1_target_epochs = CONFIG['epochs'] // 2
    callbacks_phase1.append(TqdmCallback(phase1_target_epochs, "Phase 1 (Frozen)"))
    
    print("\n🚀 Phase 1: Training with frozen base model...")
    print("=" * 60)
    
    # Create tf.data datasets for efficient data pipeline
    train_dataset = tf.data.Dataset.from_tensor_slices((X_train, y_train))
    train_dataset = train_dataset.shuffle(buffer_size=len(X_train))
    train_dataset = train_dataset.map(
        lambda x, y: (tf.cast(x, tf.float32), tf.cast(y, tf.float32)),
        num_parallel_calls=tf.data.AUTOTUNE,
    )
    train_dataset = train_dataset.batch(CONFIG['batch_size'])
    train_dataset = train_dataset.prefetch(CONFIG['prefetch_buffer'])
    
    val_dataset = tf.data.Dataset.from_tensor_slices((X_val, y_val))
    val_dataset = val_dataset.map(
        lambda x, y: (tf.cast(x, tf.float32), tf.cast(y, tf.float32)),
        num_parallel_calls=tf.data.AUTOTUNE,
    )
    val_dataset = val_dataset.batch(CONFIG['batch_size'])
    val_dataset = val_dataset.prefetch(CONFIG['prefetch_buffer'])
    
    # Phase 1: Train with frozen base
    history1 = model.fit(
        train_dataset,
        validation_data=val_dataset,
        epochs=phase1_target_epochs,
        callbacks=callbacks_phase1,
        verbose=0
    )

    # If phase 1 stopped early, we still want phase 2 to continue from that epoch.
    # Keras counts epochs globally via initial_epoch.
    phase1_completed_epochs = len(history1.history.get('loss', []))
    
    print("\n\n🔥 Phase 2: Fine-tuning with unfrozen base model...")
    print("=" * 60)
    
    # Phase 2: Unfreeze and fine-tune
    base_model.trainable = True
    
    if unfreeze_last_n is None:
        unfreeze_last_n = 50
    unfreeze_last_n = int(max(0, unfreeze_last_n))
    if unfreeze_last_n == 0:
        # Edge-case: keep base model frozen
        base_model.trainable = False
    else:
        freeze_until = max(0, len(base_model.layers) - unfreeze_last_n)
        for layer in base_model.layers[:freeze_until]:
            layer.trainable = False
    
    # Recompile with lower learning rate
    compile_model(model, learning_rate=CONFIG['learning_rate'] / 10)
    
    callbacks_phase2 = [
        ModelCheckpoint(
            filepath=str(model_dir / 'fasalvaidya_npk_best.keras'),
            monitor='val_auc',
            mode='max',
            save_best_only=True,
            verbose=0
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=0
        ),
    ]

    if early_stopping:
        callbacks_phase2.insert(
            1,
            EarlyStopping(
                monitor='val_auc',
                mode='max',
                patience=int(max(1, early_stopping_patience)),
                min_delta=float(max(0.0, early_stopping_min_delta)),
                restore_best_weights=True,
                verbose=1,
            ),
        )

    phase2_remaining_epochs = max(0, CONFIG['epochs'] - phase1_completed_epochs)
    callbacks_phase2.append(TqdmCallback(phase2_remaining_epochs, "Phase 2 (Fine-tune)"))
    
    history2 = model.fit(
        train_dataset,
        validation_data=val_dataset,
        epochs=CONFIG['epochs'],
        initial_epoch=phase1_completed_epochs,
        callbacks=callbacks_phase2,
        verbose=0
    )
    
    # Combine histories
    history = {
        'loss': history1.history['loss'] + history2.history['loss'],
        'val_loss': history1.history['val_loss'] + history2.history['val_loss'],
        'accuracy': history1.history['accuracy'] + history2.history['accuracy'],
        'val_accuracy': history1.history['val_accuracy'] + history2.history['val_accuracy'],
    }
    
    return history


def evaluate_model(model, X_test, y_test):
    """Evaluate model on test set and print metrics."""
    print("\n📊 Evaluating on Test Set...")
    print("=" * 60)
    
    results = model.evaluate(X_test, y_test, verbose=0)
    
    print(f"  Test Loss: {results[0]:.4f}")
    print(f"  Test Accuracy: {results[1]:.4f}")
    print(f"  Test Precision: {results[2]:.4f}")
    print(f"  Test Recall: {results[3]:.4f}")
    print(f"  Test AUC: {results[4]:.4f}")
    
    # Per-class predictions
    predictions = model.predict(X_test, verbose=0)
    
    print("\n📈 Per-Nutrient Metrics:")
    print("-" * 40)
    
    nutrient_names = ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)']
    for i, name in enumerate(nutrient_names):
        true_positives = np.sum((predictions[:, i] > 0.5) & (y_test[:, i] == 1))
        false_positives = np.sum((predictions[:, i] > 0.5) & (y_test[:, i] == 0))
        false_negatives = np.sum((predictions[:, i] <= 0.5) & (y_test[:, i] == 1))
        
        precision = true_positives / (true_positives + false_positives + 1e-7)
        recall = true_positives / (true_positives + false_negatives + 1e-7)
        f1 = 2 * (precision * recall) / (precision + recall + 1e-7)
        
        print(f"  {name}:")
        print(f"    Precision: {precision:.4f}")
        print(f"    Recall: {recall:.4f}")
        print(f"    F1-Score: {f1:.4f}")
    
    return results


def save_model_artifacts(model, history, class_info):
    """Save model, weights, and metadata."""
    model_dir = Path(CONFIG['model_save_path'])
    model_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Save full model (Keras format)
    model_path = model_dir / 'fasalvaidya_npk_model.keras'
    model.save(model_path)
    print(f"\n✅ Model saved: {model_path}")
    
    # Save TensorFlow SavedModel format (for TF Serving)
    savedmodel_path = model_dir / 'fasalvaidya_npk_savedmodel'
    model.export(savedmodel_path)
    print(f"✅ SavedModel saved: {savedmodel_path}")
    
    # Save model weights only (smaller file)
    weights_path = model_dir / 'fasalvaidya_npk_weights.weights.h5'
    model.save_weights(weights_path)
    print(f"✅ Weights saved: {weights_path}")
    
    # Save TFLite model for mobile deployment
    try:
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        tflite_model = converter.convert()
        
        tflite_path = model_dir / 'fasalvaidya_npk_model.tflite'
        with open(tflite_path, 'wb') as f:
            f.write(tflite_model)
        print(f"✅ TFLite model saved: {tflite_path}")
        print(f"   TFLite size: {len(tflite_model) / 1024 / 1024:.2f} MB")
    except Exception as e:
        print(f"⚠️  TFLite conversion failed: {e}")
    
    # Save model metadata
    metadata = {
        'model_name': 'FasalVaidya NPK Detector',
        'version': '1.0.0',
        'created_at': timestamp,
        'input_shape': [224, 224, 3],
        'output_shape': [3],
        'output_labels': ['nitrogen_deficiency', 'phosphorus_deficiency', 'potassium_deficiency'],
        'preprocessing': {
            'normalize': True,
            'range': [0, 1],
            'resize': [224, 224]
        },
        'training_config': CONFIG,
        'final_metrics': {
            'val_loss': history['val_loss'][-1] if history else None,
            'val_accuracy': history['val_accuracy'][-1] if history else None,
        }
    }
    
    metadata_path = model_dir / 'model_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"✅ Metadata saved: {metadata_path}")


def main():
    """Main training pipeline."""
    parser = argparse.ArgumentParser(description="Train the FasalVaidya NPK deficiency model")
    parser.add_argument(
        '--backbone',
        type=str,
        default=CONFIG.get('backbone', 'efficientnetb0'),
        help='Backbone to use: efficientnetb0 or mobilenetv3large (default: efficientnetb0)'
    )
    parser.add_argument('--epochs', type=int, default=CONFIG['epochs'], help='Total epochs (includes phase 1 + phase 2)')
    parser.add_argument('--batch-size', type=int, default=CONFIG['batch_size'], help='Batch size')
    parser.add_argument('--learning-rate', type=float, default=CONFIG['learning_rate'], help='Initial learning rate')
    parser.add_argument(
        '--unfreeze-last',
        type=int,
        default=50,
        help='In phase 2, keep only the last N base model layers trainable (default: 50). Use 0 to keep base frozen.'
    )
    parser.add_argument(
        '--disable-early-stopping',
        action='store_true',
        help='Disable EarlyStopping so training runs full epochs.'
    )
    parser.add_argument(
        '--early-stopping-patience',
        type=int,
        default=10,
        help='Patience for EarlyStopping (only if enabled).'
    )
    parser.add_argument(
        '--early-stopping-min-delta',
        type=float,
        default=0.0,
        help='Minimum delta for EarlyStopping improvement (only if enabled).'
    )
    parser.add_argument(
        '--smoke-test',
        action='store_true',
        help='Only build+compile the model (no dataset loading/training).'
    )
    args = parser.parse_args()

    # Apply CLI overrides
    CONFIG['epochs'] = int(max(1, args.epochs))
    CONFIG['batch_size'] = int(max(1, args.batch_size))
    CONFIG['learning_rate'] = float(args.learning_rate)
    CONFIG['backbone'] = str(args.backbone)

    print("\n" + "=" * 60)
    print("🌱 FasalVaidya NPK Deficiency Detection Model Training")
    print("=" * 60)
    
    # Check GPU availability
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f"✅ GPU detected: {gpus[0].name}")
        # Enable memory growth to prevent OOM
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
    else:
        print("⚠️  No GPU detected. Training on CPU (slower).")
    
    # Smoke test (fast validation)
    if args.smoke_test:
        print("\n🧪 Smoke test: building model only")
        print("=" * 60)
        model, _base_model = create_model(backbone=CONFIG['backbone'])
        compile_model(model, CONFIG['learning_rate'])
        model.summary()
        print("\n✅ Smoke test passed")
        return

    # Load dataset
    X, y, class_info = load_dataset()
    
    if len(X) == 0:
        print("❌ No images found in dataset. Check the path.")
        return
    
    # Split dataset
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y.sum(axis=1)
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.33, random_state=42
    )
    
    print(f"\n📊 Data Split:")
    print(f"  Training: {len(X_train)} images")
    print(f"  Validation: {len(X_val)} images")
    print(f"  Test: {len(X_test)} images")
    
    # Create model
    print("\n🔧 Creating model...")
    model, base_model = create_model(backbone=CONFIG['backbone'])
    compile_model(model, CONFIG['learning_rate'])
    
    print(model.summary())
    
    # Train model
    history = train_model(
        model,
        base_model,
        X_train,
        y_train,
        X_val,
        y_val,
        unfreeze_last_n=args.unfreeze_last,
        early_stopping=(not args.disable_early_stopping),
        early_stopping_patience=args.early_stopping_patience,
        early_stopping_min_delta=args.early_stopping_min_delta,
    )
    
    # Evaluate model
    evaluate_model(model, X_test, y_test)
    
    # Save artifacts
    save_model_artifacts(model, history, class_info)
    
    print("\n" + "=" * 60)
    print("✅ Training complete!")
    print("=" * 60)


if __name__ == '__main__':
    main()
