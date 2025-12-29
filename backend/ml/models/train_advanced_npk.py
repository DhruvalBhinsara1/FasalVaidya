"""
Advanced NPK Deficiency Detection Model Training
================================================
Uses combined datasets with multiple augmentation strategies.
Supports AMD GPU via DirectML on Windows.

Dataset structure:
- Bigger CoLeaf DATASET/CoLeaf DATASET/ (original larger dataset)
- Propossed_Data/Contrast_Stretching/
- Propossed_Data/Histogram_Equalization/
- Propossed_Data/Log_Transformation/

Author: FasalVaidya Team
"""

import os
import sys
import shutil
import random
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import multiprocessing
from tqdm import tqdm

# Try to enable AMD GPU support via DirectML (Windows)
try:
    import tensorflow as tf
    # Check for DirectML plugin (AMD GPU on Windows)
    try:
        import tensorflow_directml_plugin
        print("✓ DirectML plugin found - AMD GPU acceleration enabled!")
    except ImportError:
        print("⚠ DirectML not found. To use AMD GPU, install: pip install tensorflow-directml-plugin")
        print("  Continuing with CPU/default GPU...")
except ImportError:
    print("TensorFlow not found. Please install tensorflow.")
    sys.exit(1)

import numpy as np
from tensorflow.keras import layers, models, callbacks
from tensorflow.keras.applications import EfficientNetV2S, EfficientNetB0
from sklearn.model_selection import train_test_split

# =============================================================================
# CONFIGURATION
# =============================================================================

BASE_DIR = Path(__file__).parent
OUTPUT_MODEL = BASE_DIR / "plantvillage-npk-v2.h5"
COMBINED_DATA_DIR = BASE_DIR / "combined_dataset"

# Source data directories
DATA_SOURCES = [
    BASE_DIR / "Bigger CoLeaf DATASET" / "CoLeaf DATASET",
    BASE_DIR / "Propossed_Data" / "Contrast_Stretching",
    BASE_DIR / "Propossed_Data" / "Histogram_Equalization",
    BASE_DIR / "Propossed_Data" / "Log_Transformation",
]

# Classes we care about (NPK + healthy)
# Note: We'll also include other deficiencies to make the model more robust
TARGET_CLASSES = ["healthy", "nitrogen-N", "phosphorus-P", "potasium-K"]
EXTRA_CLASSES = ["boron-B", "calcium-Ca", "iron-Fe", "magnesium-Mg", "manganese-Mn"]  # Train on these too

# Training hyperparameters
IMG_SIZE = (224, 224)
BATCH_SIZE = 16  # Smaller batch for stability with limited data
EPOCHS_PHASE1 = 30  # Head training
EPOCHS_PHASE2 = 20  # Fine-tuning top layers
EPOCHS_PHASE3 = 15  # Deep fine-tuning
VALIDATION_SPLIT = 0.15
TEST_SPLIT = 0.10

# Use mixed precision for faster training (if supported)
USE_MIXED_PRECISION = False  # Set True if you have GPU with tensor cores

# Multithreading settings
NUM_WORKERS = min(8, multiprocessing.cpu_count())  # Number of parallel threads

# =============================================================================
# SETUP
# =============================================================================

print(f"\n{'='*60}")
print("FasalVaidya Advanced NPK Model Training")
print(f"{'='*60}")
print(f"TensorFlow version: {tf.__version__}")
print(f"GPUs available: {tf.config.list_physical_devices('GPU')}")

# Enable mixed precision if requested
if USE_MIXED_PRECISION:
    try:
        tf.keras.mixed_precision.set_global_policy('mixed_float16')
        print("✓ Mixed precision enabled (float16)")
    except:
        print("⚠ Mixed precision not available")

# Memory growth (prevents OOM)
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    for gpu in gpus:
        try:
            tf.config.experimental.set_memory_growth(gpu, True)
            print(f"✓ Memory growth enabled for {gpu}")
        except RuntimeError as e:
            print(f"⚠ Could not set memory growth: {e}")


# =============================================================================
# DATA PREPARATION (Multithreaded)
# =============================================================================

def copy_single_file(args):
    """Thread worker for copying a single file."""
    src, dest = args
    if not dest.exists():
        shutil.copy2(src, dest)
        return 1
    return 0


def combine_datasets():
    """Combine all data sources into a single directory structure using parallel threads."""
    print("\n📁 Combining datasets with multithreading...")
    print(f"   Using {NUM_WORKERS} parallel threads")
    
    # Use all classes for training (makes model more robust)
    all_classes = TARGET_CLASSES + EXTRA_CLASSES
    
    # Create combined directory
    if COMBINED_DATA_DIR.exists():
        print(f"   Removing old combined dataset...")
        shutil.rmtree(COMBINED_DATA_DIR)
    
    COMBINED_DATA_DIR.mkdir(exist_ok=True)
    
    # Create class directories
    for cls in all_classes:
        (COMBINED_DATA_DIR / cls).mkdir(exist_ok=True)
    
    # Collect all copy tasks first
    copy_tasks = []
    class_counts = {cls: 0 for cls in all_classes}
    
    print("   🔍 Scanning source directories...")
    for source in DATA_SOURCES:
        if not source.exists():
            print(f"   ⚠ Source not found: {source}")
            continue
        
        source_name = source.parent.name if source.name == "CoLeaf DATASET" else source.name
        print(f"   📂 Found: {source_name}")
        
        for cls in all_classes:
            cls_dir = source / cls
            if not cls_dir.exists():
                continue
            
            for img_file in cls_dir.glob("*"):
                if img_file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.bmp']:
                    new_name = f"{source_name}_{img_file.name}"
                    dest = COMBINED_DATA_DIR / cls / new_name
                    copy_tasks.append((img_file, dest))
                    class_counts[cls] += 1
    
    # Execute parallel copy with ThreadPool and progress bar
    print(f"\n   🔄 Copying {len(copy_tasks)} files...")
    total_copied = 0
    
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        futures = {executor.submit(copy_single_file, task): task for task in copy_tasks}
        
        with tqdm(total=len(copy_tasks), desc="   📁 Copying", unit="file", 
                  bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]') as pbar:
            for future in as_completed(futures):
                result = future.result()
                total_copied += result
                pbar.update(1)
    
    print(f"\n📊 Combined dataset statistics:")
    for cls, count in sorted(class_counts.items(), key=lambda x: -x[1]):
        bar = "█" * (count // 10) + "░" * (25 - count // 10)
        print(f"   {cls:15s}: {bar} {count:4d} images")
    print(f"   {'─'*45}")
    print(f"   {'TOTAL':15s}: {' '*25} {total_copied:4d} images")
    
    return class_counts


def scan_class_directory(args):
    """Thread worker for scanning a class directory."""
    cls, cls_dir, class_idx = args
    images = []
    labels = []
    
    if not cls_dir.exists():
        return images, labels
    
    for img_file in cls_dir.glob("*"):
        if img_file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.bmp']:
            images.append(str(img_file))
            labels.append(class_idx)
    
    return images, labels


def create_train_val_test_split(class_counts):
    """Create proper train/val/test splits with stratification using parallel scanning."""
    print("\n🔀 Creating train/val/test splits...")
    
    all_classes = TARGET_CLASSES + EXTRA_CLASSES
    class_to_idx = {cls: idx for idx, cls in enumerate(all_classes)}
    
    # Prepare scan tasks
    scan_tasks = [
        (cls, COMBINED_DATA_DIR / cls, class_to_idx[cls])
        for cls in all_classes
    ]
    
    # Parallel scan directories
    all_images = []
    all_labels = []
    
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        results = list(executor.map(scan_class_directory, scan_tasks))
    
    for images, labels in results:
        all_images.extend(images)
        all_labels.extend(labels)
    
    # Convert to numpy
    all_images = np.array(all_images)
    all_labels = np.array(all_labels)
    
    print(f"   Total images found: {len(all_images)}")
    
    # First split: separate test set
    train_val_imgs, test_imgs, train_val_labels, test_labels = train_test_split(
        all_images, all_labels,
        test_size=TEST_SPLIT,
        stratify=all_labels,
        random_state=42
    )
    
    # Second split: separate validation from training
    val_ratio = VALIDATION_SPLIT / (1 - TEST_SPLIT)
    train_imgs, val_imgs, train_labels, val_labels = train_test_split(
        train_val_imgs, train_val_labels,
        test_size=val_ratio,
        stratify=train_val_labels,
        random_state=42
    )
    
    print(f"   Train: {len(train_imgs):4d} images")
    print(f"   Val:   {len(val_imgs):4d} images")
    print(f"   Test:  {len(test_imgs):4d} images")
    
    return (train_imgs, train_labels), (val_imgs, val_labels), (test_imgs, test_labels), all_classes


# =============================================================================
# DATA LOADING & AUGMENTATION
# =============================================================================

def load_and_preprocess_image(path, label):
    """Load and preprocess a single image."""
    img = tf.io.read_file(path)
    img = tf.image.decode_jpeg(img, channels=3)
    img = tf.image.resize(img, IMG_SIZE)
    return img, label


def create_dataset(images, labels, num_classes, is_training=False, augment=False):
    """Create a tf.data.Dataset with optional augmentation."""
    
    # Create dataset from tensors
    ds = tf.data.Dataset.from_tensor_slices((images, labels))
    
    # Shuffle if training
    if is_training:
        ds = ds.shuffle(buffer_size=len(images), reshuffle_each_iteration=True)
    
    # Load images
    ds = ds.map(load_and_preprocess_image, num_parallel_calls=tf.data.AUTOTUNE)
    
    # One-hot encode labels
    ds = ds.map(lambda x, y: (x, tf.one_hot(y, num_classes)), num_parallel_calls=tf.data.AUTOTUNE)
    
    # Batch
    ds = ds.batch(BATCH_SIZE)
    
    # Prefetch
    ds = ds.prefetch(tf.data.AUTOTUNE)
    
    return ds


# =============================================================================
# MODEL ARCHITECTURE
# =============================================================================

def create_data_augmentation():
    """Create data augmentation pipeline."""
    return tf.keras.Sequential([
        layers.RandomFlip("horizontal_and_vertical"),
        layers.RandomRotation(0.15),
        layers.RandomZoom(0.2),
        layers.RandomTranslation(0.1, 0.1),
        layers.RandomBrightness(0.2),
        layers.RandomContrast(0.2),
    ], name="data_augmentation")


def create_model(num_classes, use_efficientnetv2=True):
    """Create the model architecture with EfficientNet backbone."""
    print("\n🏗️  Building model architecture...")
    
    # Choose backbone
    if use_efficientnetv2:
        try:
            base = EfficientNetV2S(
                include_top=False,
                weights="imagenet",
                input_shape=(*IMG_SIZE, 3),
                pooling="avg"
            )
            backbone_name = "EfficientNetV2-S"
        except:
            print("   EfficientNetV2 not available, falling back to EfficientNetB0")
            base = EfficientNetB0(
                include_top=False,
                weights="imagenet",
                input_shape=(*IMG_SIZE, 3),
                pooling="avg"
            )
            backbone_name = "EfficientNetB0"
    else:
        base = EfficientNetB0(
            include_top=False,
            weights="imagenet",
            input_shape=(*IMG_SIZE, 3),
            pooling="avg"
        )
        backbone_name = "EfficientNetB0"
    
    print(f"   Backbone: {backbone_name}")
    print(f"   Total backbone layers: {len(base.layers)}")
    
    # Freeze backbone initially
    base.trainable = False
    
    # Build model
    inputs = layers.Input(shape=(*IMG_SIZE, 3), name="input_image")
    
    # Data augmentation (only during training)
    x = create_data_augmentation()(inputs)
    
    # Preprocessing for EfficientNet
    x = tf.keras.applications.efficientnet.preprocess_input(x)
    
    # Backbone
    x = base(x, training=False)
    
    # Classification head with regularization
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(256, activation="relu", kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(128, activation="relu", kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)
    x = layers.Dropout(0.2)(x)
    
    # Output layer
    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)
    
    model = models.Model(inputs, outputs, name="npk_detector")
    
    print(f"   Output classes: {num_classes}")
    print(f"   Total parameters: {model.count_params():,}")
    
    return model, base, backbone_name


def compute_class_weights(labels, num_classes):
    """Compute balanced class weights."""
    from collections import Counter
    counts = Counter(labels)
    total = len(labels)
    weights = {}
    
    for i in range(num_classes):
        count = counts.get(i, 1)
        # Inverse frequency weighting with smoothing
        weights[i] = total / (num_classes * count)
    
    # Normalize so mean weight is 1
    mean_weight = sum(weights.values()) / len(weights)
    weights = {k: v / mean_weight for k, v in weights.items()}
    
    return weights


def focal_loss(gamma=2.0, alpha=None):
    """Focal loss for handling class imbalance."""
    # Note: alpha must be a list of floats, not None values
    return tf.keras.losses.CategoricalFocalCrossentropy(
        gamma=gamma,
        alpha=alpha,  # Will be None if not provided
        from_logits=False,
        label_smoothing=0.1,  # Label smoothing for regularization
    )


def simple_categorical_loss():
    """Simple categorical crossentropy with label smoothing."""
    return tf.keras.losses.CategoricalCrossentropy(
        from_logits=False,
        label_smoothing=0.1,
    )


# =============================================================================
# TRAINING CALLBACKS
# =============================================================================

class TqdmProgressCallback(callbacks.Callback):
    """Custom callback for tqdm progress bar during training."""
    def __init__(self, epochs, phase_name="Training"):
        super().__init__()
        self.epochs = epochs
        self.phase_name = phase_name
        self.epoch_bar = None
        
    def on_train_begin(self, logs=None):
        self.epoch_bar = tqdm(
            total=self.epochs, 
            desc=f"   🚀 {self.phase_name}", 
            unit="epoch",
            bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]'
        )
    
    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        self.epoch_bar.set_postfix({
            'loss': f"{logs.get('loss', 0):.4f}",
            'acc': f"{logs.get('accuracy', 0):.2%}",
            'val_acc': f"{logs.get('val_accuracy', 0):.2%}"
        })
        self.epoch_bar.update(1)
    
    def on_train_end(self, logs=None):
        self.epoch_bar.close()


def create_callbacks(phase_name, epochs):
    """Create training callbacks with progress bar."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    return [
        TqdmProgressCallback(epochs, phase_name),
        callbacks.EarlyStopping(
            monitor='val_loss',
            patience=7,
            restore_best_weights=True,
            verbose=0  # Reduced verbosity for cleaner output
        ),
        callbacks.ModelCheckpoint(
            str(OUTPUT_MODEL),
            monitor='val_accuracy',
            save_best_only=True,
            verbose=0  # Reduced verbosity
        ),
        callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1
        ),
        callbacks.TensorBoard(
            log_dir=str(BASE_DIR / "logs" / f"{phase_name}_{timestamp}"),
            histogram_freq=0,
            write_graph=False,
        ),
    ]


# =============================================================================
# TRAINING PHASES
# =============================================================================

def train_phase1(model, train_ds, val_ds, class_weights):
    """Phase 1: Train classification head with frozen backbone."""
    print("\n" + "="*60)
    print("PHASE 1: Training Classification Head")
    print("="*60)
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss=simple_categorical_loss(),
        metrics=['accuracy']
    )
    
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_PHASE1,
        callbacks=create_callbacks("Phase1_Head", EPOCHS_PHASE1),
        class_weight=class_weights,
        verbose=0  # Use tqdm instead
    )
    
    print(f"\n   ✅ Phase 1 Complete! Best val_acc: {max(history.history['val_accuracy']):.2%}")
    return history


def train_phase2(model, base, train_ds, val_ds, class_weights):
    """Phase 2: Fine-tune top layers of backbone."""
    print("\n" + "="*60)
    print("PHASE 2: Fine-tuning Top Backbone Layers")
    print("="*60)
    
    # Unfreeze top 30% of backbone layers
    base.trainable = True
    num_layers = len(base.layers)
    freeze_until = int(num_layers * 0.7)
    
    for layer in base.layers[:freeze_until]:
        layer.trainable = False
    
    trainable = sum(1 for layer in base.layers if layer.trainable)
    print(f"   Unfroze {trainable} of {num_layers} backbone layers")
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss=simple_categorical_loss(),
        metrics=['accuracy']
    )
    
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_PHASE2,
        callbacks=create_callbacks("Phase2_FineTune", EPOCHS_PHASE2),
        class_weight=class_weights,
        verbose=0  # Use tqdm instead
    )
    
    print(f"\n   ✅ Phase 2 Complete! Best val_acc: {max(history.history['val_accuracy']):.2%}")
    return history


def train_phase3(model, base, train_ds, val_ds, class_weights):
    """Phase 3: Deep fine-tuning of entire model."""
    print("\n" + "="*60)
    print("PHASE 3: Deep Fine-tuning (Full Backbone)")
    print("="*60)
    
    # Unfreeze all layers
    base.trainable = True
    print(f"   All {len(base.layers)} backbone layers now trainable")
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss=simple_categorical_loss(),
        metrics=['accuracy']
    )
    
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_PHASE3,
        callbacks=create_callbacks("Phase3_DeepTune", EPOCHS_PHASE3),
        class_weight=class_weights,
        verbose=0  # Use tqdm instead
    )
    
    print(f"\n   ✅ Phase 3 Complete! Best val_acc: {max(history.history['val_accuracy']):.2%}")
    return history


# =============================================================================
# EVALUATION
# =============================================================================

def evaluate_model(model, test_ds, class_names):
    """Evaluate model on test set with progress bar."""
    print("\n" + "="*60)
    print("MODEL EVALUATION")
    print("="*60)
    
    # Overall metrics
    print("\n📊 Evaluating on test set...")
    loss, accuracy = model.evaluate(test_ds, verbose=0)
    print(f"\n📊 Test Results:")
    print(f"   Loss:     {loss:.4f}")
    print(f"   Accuracy: {accuracy:.4f} ({accuracy*100:.1f}%)")
    
    # Per-class predictions with progress bar
    print(f"\n📋 Per-Class Performance:")
    
    y_true = []
    y_pred = []
    
    for images, labels in tqdm(test_ds, desc="   🔮 Predicting", unit="batch"):
        predictions = model.predict(images, verbose=0)
        y_true.extend(np.argmax(labels.numpy(), axis=1))
        y_pred.extend(np.argmax(predictions, axis=1))
    
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    # Calculate per-class accuracy
    for idx, cls_name in enumerate(class_names):
        mask = y_true == idx
        if mask.sum() > 0:
            cls_acc = (y_pred[mask] == idx).mean()
            count = mask.sum()
            print(f"   {cls_name:15s}: {cls_acc*100:5.1f}% ({count} samples)")
    
    # Confusion matrix for NPK classes
    print(f"\n🔢 Confusion Matrix (NPK Classes):")
    npk_indices = [class_names.index(c) for c in TARGET_CLASSES if c in class_names]
    
    from collections import defaultdict
    confusion = defaultdict(lambda: defaultdict(int))
    
    for true, pred in zip(y_true, y_pred):
        if true in npk_indices:
            true_name = class_names[true]
            pred_name = class_names[pred] if pred < len(class_names) else "unknown"
            confusion[true_name][pred_name] += 1
    
    # Print confusion matrix
    header = "Actual \\ Predicted"
    print(f"\n   {header:20s}", end="")
    for cls in TARGET_CLASSES:
        print(f"{cls:12s}", end="")
    print()
    print("   " + "-" * (20 + 12 * len(TARGET_CLASSES)))
    
    for true_cls in TARGET_CLASSES:
        print(f"   {true_cls:20s}", end="")
        for pred_cls in TARGET_CLASSES:
            count = confusion[true_cls][pred_cls]
            print(f"{count:12d}", end="")
        print()
    
    return accuracy


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("\n🌱 Starting FasalVaidya NPK Model Training\n")
    
    # Step 1: Combine datasets
    class_counts = combine_datasets()
    
    # Step 2: Create train/val/test splits
    (train_imgs, train_labels), (val_imgs, val_labels), (test_imgs, test_labels), class_names = \
        create_train_val_test_split(class_counts)
    
    num_classes = len(class_names)
    print(f"\n📚 Classes ({num_classes}): {class_names}")
    
    # Step 3: Create datasets
    print("\n📦 Creating data pipelines...")
    train_ds = create_dataset(train_imgs, train_labels, num_classes, is_training=True, augment=True)
    val_ds = create_dataset(val_imgs, val_labels, num_classes, is_training=False)
    test_ds = create_dataset(test_imgs, test_labels, num_classes, is_training=False)
    
    # Step 4: Compute class weights
    class_weights = compute_class_weights(train_labels, num_classes)
    print(f"\n⚖️  Class weights:")
    for idx, cls in enumerate(class_names):
        print(f"   {cls:15s}: {class_weights[idx]:.3f}")
    
    # Step 5: Create model
    model, base, backbone_name = create_model(num_classes, use_efficientnetv2=True)
    
    # Step 6: Training phases
    print(f"\n🚀 Starting training with {backbone_name}...")
    print(f"   This may take a while. Go grab a ☕\n")
    
    train_phase1(model, train_ds, val_ds, class_weights)
    train_phase2(model, base, train_ds, val_ds, class_weights)
    train_phase3(model, base, train_ds, val_ds, class_weights)
    
    # Step 7: Final evaluation
    accuracy = evaluate_model(model, test_ds, class_names)
    
    # Step 8: Save final model
    print(f"\n💾 Saving model to: {OUTPUT_MODEL}")
    model.save(str(OUTPUT_MODEL))
    
    # Also save a copy with version info
    versioned_name = f"plantvillage-npk-v2-acc{int(accuracy*100)}.h5"
    model.save(str(BASE_DIR / versioned_name))
    print(f"   Also saved as: {versioned_name}")
    
    # Save class names for inference
    class_info_path = BASE_DIR / "class_names.txt"
    with open(class_info_path, 'w') as f:
        for cls in class_names:
            f.write(f"{cls}\n")
    print(f"   Class names saved to: {class_info_path}")
    
    print("\n" + "="*60)
    print("✅ TRAINING COMPLETE!")
    print("="*60)
    print(f"\n📈 Final Test Accuracy: {accuracy*100:.1f}%")
    print(f"📁 Model saved to: {OUTPUT_MODEL}")
    print("\nTo use this model, update MODEL_PATH in ml_inference.py")
    print("or set environment variable: MODEL_PATH=path/to/plantvillage-npk-v2.h5")


if __name__ == "__main__":
    main()
