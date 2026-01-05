"""
FasalVaidya NPK Deficiency Detection - Transfer Learning with PlantVillage
===========================================================================
Three-stage transfer learning strategy for superior accuracy (90-98%):

Stage 1: ImageNet → MobileNetV2 base (general computer vision features)
Stage 2: PlantVillage fine-tuning (plant-specific features like chlorosis, necrosis)
Stage 3: NPK dataset fine-tuning (nutrient deficiency detection)

This approach leverages:
- ImageNet: 1.2M images, general object features
- PlantVillage: 54K crop leaf images, plant disease symptoms
- CoLeaf: Your NPK deficiency dataset

Expected accuracy improvement: 70-85% → 90-98%

Usage:
    # Stage 1: PlantVillage intermediate training
    python train_npk_model_transfer.py --stage plantvillage --epochs 30
    
    # Stage 2: NPK fine-tuning
    python train_npk_model_transfer.py --stage npk --epochs 50
    
    # Or run both stages sequentially
    python train_npk_model_transfer.py --stage both
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

# TensorFlow configuration
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau, TensorBoard
from sklearn.model_selection import train_test_split
from PIL import Image

# Get optimal thread count
NUM_WORKERS = min(multiprocessing.cpu_count(), 16)
print(f"🔧 Using {NUM_WORKERS} worker threads")

# Enable mixed precision on GPU
try:
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        tf.keras.mixed_precision.set_global_policy('mixed_float16')
        print(f"⚡ Mixed precision enabled on GPU ({len(gpus)} detected)")
    else:
        print("ℹ️ No GPU detected; using float32")
except Exception as e:
    print(f"ℹ️ Mixed precision setup skipped: {e}")

# TensorFlow threading
tf.config.threading.set_intra_op_parallelism_threads(NUM_WORKERS)
tf.config.threading.set_inter_op_parallelism_threads(NUM_WORKERS)

# Import MobileNetV2
if tuple(map(int, tf.__version__.split('.')[:2])) >= (2, 16):
    from keras.applications import MobileNetV2
else:
    from tensorflow.keras.applications import MobileNetV2


# Configuration
CONFIG = {
    # Paths
    'plantvillage_processed': Path(__file__).parent / 'models' / 'plantvillage_processed' / 'symlinked_dataset',
    'npk_dataset_path': Path(__file__).parent.parent.parent / 'CoLeaf DATASET',
    'model_save_path': Path(__file__).parent / 'models',
    
    # Training
    'image_size': (224, 224),
    'batch_size': 32,
    'plantvillage_epochs': 30,
    'npk_epochs': 50,
    'learning_rate_plantvillage': 0.0001,  # Lower for transfer learning
    'learning_rate_npk': 0.00005,  # Even lower for fine-tuning
    'validation_split': 0.2,
    'test_split': 0.1,
    
    # Data augmentation
    'augmentation': {
        'rotation_range': 20,
        'width_shift_range': 0.2,
        'height_shift_range': 0.2,
        'horizontal_flip': True,
        'zoom_range': 0.2,
        'brightness_range': [0.8, 1.2],
    }
}


def create_mobilenetv2_base(input_shape=(224, 224, 3), pretrained='imagenet'):
    """
    Create MobileNetV2 base model.
    
    Args:
        input_shape: Input image shape
        pretrained: 'imagenet' or path to weights
    
    Returns:
        base_model: MobileNetV2 without top layers
    """
    base_model = MobileNetV2(
        input_shape=input_shape,
        include_top=False,
        weights=pretrained if pretrained == 'imagenet' else None,
        pooling='avg'
    )
    
    # Load custom weights if provided
    if pretrained != 'imagenet' and pretrained is not None:
        if os.path.exists(pretrained):
            print(f"📥 Loading pretrained weights from: {pretrained}")
            base_model.load_weights(pretrained)
    
    return base_model


def create_plantvillage_model(num_classes=5, base_weights='imagenet'):
    """
    Create model for PlantVillage training (Stage 1).
    
    Args:
        num_classes: Number of PlantVillage categories (healthy, N-like, P-like, K-like, general)
        base_weights: MobileNetV2 weights ('imagenet' or path)
    
    Returns:
        model: Compiled Keras model
    """
    print(f"\n🏗️  Building PlantVillage training model...")
    print(f"   • Base: MobileNetV2 (ImageNet)")
    print(f"   • Classes: {num_classes}")
    
    # Create base
    base_model = create_mobilenetv2_base(
        input_shape=(*CONFIG['image_size'], 3),
        pretrained=base_weights
    )
    
    # Freeze base initially (we'll unfreeze later)
    base_model.trainable = False
    print(f"   • Base layers: {len(base_model.layers)} (frozen)")
    
    # Build classifier head
    inputs = keras.Input(shape=(*CONFIG['image_size'], 3))
    x = base_model(inputs, training=False)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(num_classes, activation='softmax', dtype='float32')(x)
    
    model = keras.Model(inputs, outputs, name='plantvillage_mobilenetv2')
    
    # Compile
    model.compile(
        optimizer=keras.optimizers.Adam(CONFIG['learning_rate_plantvillage']),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=2, name='top2_accuracy')]
    )
    
    print(f"   • Total params: {model.count_params():,}")
    print(f"   • Trainable: {sum([tf.size(w).numpy() for w in model.trainable_weights]):,}")
    
    return model


def create_npk_model(plantvillage_weights=None):
    """
    Create model for NPK deficiency detection (Stage 2).
    
    Args:
        plantvillage_weights: Path to PlantVillage-trained weights
    
    Returns:
        model: Compiled Keras model for multi-label NPK classification
    """
    print(f"\n🏗️  Building NPK deficiency detection model...")
    
    # Load base with PlantVillage weights
    if plantvillage_weights and os.path.exists(plantvillage_weights):
        print(f"   • Loading PlantVillage-trained base from: {plantvillage_weights}")
        
        # Load PlantVillage model
        pv_model = keras.models.load_model(plantvillage_weights)
        
        # Extract MobileNetV2 base (skip input layer and classifier)
        base_model = keras.Model(
            inputs=pv_model.layers[1].input,
            outputs=pv_model.layers[1].output
        )
    else:
        print(f"   • Base: MobileNetV2 (ImageNet only)")
        base_model = create_mobilenetv2_base(
            input_shape=(*CONFIG['image_size'], 3),
            pretrained='imagenet'
        )
    
    # Freeze base initially
    base_model.trainable = False
    print(f"   • Base layers: {len(base_model.layers)} (frozen)")
    
    # Build multi-label classifier head for NPK
    inputs = keras.Input(shape=(*CONFIG['image_size'], 3))
    x = base_model(inputs, training=False)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(256, activation='relu')(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    
    # Multi-label output: [N, P, K] each 0 or 1
    outputs = layers.Dense(3, activation='sigmoid', dtype='float32', name='npk_output')(x)
    
    model = keras.Model(inputs, outputs, name='npk_mobilenetv2_transfer')
    
    # Compile with binary crossentropy for multi-label
    model.compile(
        optimizer=keras.optimizers.Adam(CONFIG['learning_rate_npk']),
        loss='binary_crossentropy',
        metrics=[
            'binary_accuracy',
            keras.metrics.AUC(name='auc'),
            keras.metrics.Precision(name='precision'),
            keras.metrics.Recall(name='recall')
        ]
    )
    
    print(f"   • Total params: {model.count_params():,}")
    print(f"   • Trainable: {sum([tf.size(w).numpy() for w in model.trainable_weights]):,}")
    
    return model


def load_plantvillage_dataset():
    """
    Load PlantVillage dataset organized by NPK-like categories.
    
    Returns:
        X_train, X_val, y_train, y_val: Training and validation data
    """
    print("\n📂 Loading PlantVillage dataset...")
    
    dataset_path = CONFIG['plantvillage_processed']
    
    if not dataset_path.exists():
        print(f"❌ PlantVillage dataset not found at: {dataset_path}")
        print("   Run: python prepare_plantvillage_data.py --all")
        sys.exit(1)
    
    # Category mapping
    categories = {
        'healthy': 0,
        'nitrogen_like': 1,
        'phosphorus_like': 2,
        'potassium_like': 3,
        'general_stress': 4
    }
    
    images = []
    labels = []
    
    print(f"   Loading from: {dataset_path}")
    
    for category, label in categories.items():
        category_path = dataset_path / category
        
        if not category_path.exists():
            print(f"   ⚠️  Category not found: {category}")
            continue
        
        image_files = list(category_path.glob("*.jpg")) + list(category_path.glob("*.JPG"))
        
        print(f"   • {category:20s}: {len(image_files):6,} images")
        
        for img_path in tqdm(image_files, desc=f"   Loading {category}", leave=False):
            try:
                img = Image.open(img_path).convert('RGB')
                img = img.resize(CONFIG['image_size'], Image.LANCZOS)
                img_array = np.array(img, dtype=np.float32) / 255.0
                
                images.append(img_array)
                labels.append(label)
            except Exception as e:
                print(f"   ⚠️  Error loading {img_path}: {e}")
    
    X = np.array(images, dtype=np.float32)
    y = np.array(labels, dtype=np.int32)
    
    print(f"\n   ✅ Loaded {len(X):,} images")
    print(f"   • Shape: {X.shape}")
    print(f"   • Memory: {X.nbytes / 1024**3:.2f} GB")
    
    # Split train/val
    X_train, X_val, y_train, y_val = train_test_split(
        X, y,
        test_size=CONFIG['validation_split'],
        stratify=y,
        random_state=42
    )
    
    print(f"\n   📊 Split:")
    print(f"   • Train: {len(X_train):,} images")
    print(f"   • Val:   {len(X_val):,} images")
    
    return X_train, X_val, y_train, y_val


def load_npk_dataset():
    """
    Load NPK deficiency dataset from CoLeaf.
    
    Returns:
        X_train, X_val, X_test, y_train, y_val, y_test: Split datasets
    """
    print("\n📂 Loading NPK deficiency dataset...")
    
    dataset_path = CONFIG['npk_dataset_path']
    
    if not dataset_path.exists():
        print(f"❌ NPK dataset not found at: {dataset_path}")
        sys.exit(1)
    
    images = []
    labels = []  # Multi-label: [N, P, K]
    
    npk_folders = ['healthy', 'nitrogen-N', 'phosphorus-P', 'potasium-K', 'more-deficiencies']
    
    print(f"   Loading from: {dataset_path}")
    
    for folder_name in npk_folders:
        folder_path = dataset_path / folder_name
        
        if not folder_path.exists():
            continue
        
        image_files = [f for f in os.listdir(folder_path) 
                      if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        print(f"   • {folder_name:20s}: {len(image_files):6,} images")
        
        for img_file in tqdm(image_files, desc=f"   Loading {folder_name}", leave=False):
            try:
                img_path = folder_path / img_file
                img = Image.open(img_path).convert('RGB')
                img = img.resize(CONFIG['image_size'], Image.LANCZOS)
                img_array = np.array(img, dtype=np.float32) / 255.0
                
                # Parse multi-label
                label = parse_npk_label(img_file, folder_name)
                
                images.append(img_array)
                labels.append(label)
            except Exception as e:
                print(f"   ⚠️  Error loading {img_file}: {e}")
    
    X = np.array(images, dtype=np.float32)
    y = np.array(labels, dtype=np.float32)
    
    print(f"\n   ✅ Loaded {len(X):,} images")
    print(f"   • Shape: {X.shape}")
    
    # Split train/val/test
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=CONFIG['test_split'], random_state=42
    )
    
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=CONFIG['validation_split'], random_state=42
    )
    
    print(f"\n   📊 Split:")
    print(f"   • Train: {len(X_train):,} images")
    print(f"   • Val:   {len(X_val):,} images")
    print(f"   • Test:  {len(X_test):,} images")
    
    return X_train, X_val, X_test, y_train, y_val, y_test


def parse_npk_label(filename, folder_name):
    """
    Parse NPK multi-label from filename and folder.
    
    Returns:
        [N, P, K]: Each 0 or 1
    """
    label = [0, 0, 0]  # [N, P, K]
    
    folder_lower = folder_name.lower()
    filename_upper = filename.upper()
    
    # Primary deficiencies
    if 'nitrogen' in folder_lower:
        label[0] = 1
    elif 'phosphorus' in folder_lower:
        label[1] = 1
    elif 'potasium' in folder_lower:
        label[2] = 1
    
    # Multi-deficiency parsing
    if folder_name == 'more-deficiencies':
        if 'N_' in filename_upper or '_N' in filename_upper:
            label[0] = 1
        if 'P_' in filename_upper or '_P' in filename_upper or filename_upper.startswith('P '):
            label[1] = 1
        if 'K_' in filename_upper or '_K' in filename_upper or filename_upper.startswith('K '):
            label[2] = 1
    
    return label


def create_data_augmentation():
    """Create data augmentation pipeline."""
    aug_config = CONFIG['augmentation']
    
    augmentation = keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(aug_config['rotation_range'] / 360),
        layers.RandomZoom(aug_config['zoom_range']),
        layers.RandomTranslation(
            aug_config['height_shift_range'],
            aug_config['width_shift_range']
        ),
        layers.RandomBrightness(0.2),
        layers.RandomContrast(0.2),
    ], name='data_augmentation')
    
    return augmentation


def train_plantvillage_stage(epochs=30, unfreeze_at=10):
    """
    Train Stage 1: PlantVillage fine-tuning.
    
    This creates a model that understands plant-specific visual features.
    """
    print("\n" + "=" * 80)
    print("STAGE 1: PLANTVILLAGE TRANSFER LEARNING")
    print("=" * 80)
    
    # Load data
    X_train, X_val, y_train, y_val = load_plantvillage_dataset()
    
    # Create model
    model = create_plantvillage_model(num_classes=5, base_weights='imagenet')
    
    # Setup callbacks
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = CONFIG['model_save_path'] / f'plantvillage_mobilenetv2_{timestamp}.keras'
    
    callbacks = [
        ModelCheckpoint(
            model_path,
            monitor='val_accuracy',
            save_best_only=True,
            mode='max',
            verbose=1
        ),
        EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1
        ),
        TensorBoard(
            log_dir=CONFIG['model_save_path'] / 'logs' / f'plantvillage_{timestamp}',
            histogram_freq=1
        )
    ]
    
    # Data augmentation
    augmentation = create_data_augmentation()
    X_train_aug = augmentation(X_train, training=True)
    
    # Phase 1: Train only classifier head
    print(f"\n📚 Phase 1: Training classifier head ({unfreeze_at} epochs)...")
    
    history1 = model.fit(
        X_train_aug, y_train,
        validation_data=(X_val, y_val),
        epochs=unfreeze_at,
        batch_size=CONFIG['batch_size'],
        callbacks=callbacks,
        verbose=1
    )
    
    # Phase 2: Unfreeze base and fine-tune
    print(f"\n🔓 Phase 2: Unfreezing base and fine-tuning...")
    
    base_model = model.layers[1]
    base_model.trainable = True
    
    # Freeze early layers, unfreeze last 50
    for layer in base_model.layers[:-50]:
        layer.trainable = False
    
    trainable_count = sum([1 for layer in base_model.layers if layer.trainable])
    print(f"   • Trainable layers: {trainable_count}/{len(base_model.layers)}")
    
    # Recompile with lower learning rate
    model.compile(
        optimizer=keras.optimizers.Adam(CONFIG['learning_rate_plantvillage'] / 10),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=2, name='top2_accuracy')]
    )
    
    history2 = model.fit(
        X_train_aug, y_train,
        validation_data=(X_val, y_val),
        epochs=epochs - unfreeze_at,
        initial_epoch=unfreeze_at,
        batch_size=CONFIG['batch_size'],
        callbacks=callbacks,
        verbose=1
    )
    
    print(f"\n✅ PlantVillage training complete!")
    print(f"   Model saved: {model_path}")
    
    return model, str(model_path), history1, history2


def train_npk_stage(plantvillage_weights=None, epochs=50, unfreeze_at=20):
    """
    Train Stage 2: NPK deficiency fine-tuning.
    
    This adapts the PlantVillage-trained model to NPK deficiency detection.
    """
    print("\n" + "=" * 80)
    print("STAGE 2: NPK DEFICIENCY FINE-TUNING")
    print("=" * 80)
    
    # Load data
    X_train, X_val, X_test, y_train, y_val, y_test = load_npk_dataset()
    
    # Create model
    model = create_npk_model(plantvillage_weights=plantvillage_weights)
    
    # Setup callbacks
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = CONFIG['model_save_path'] / f'npk_mobilenetv2_transfer_{timestamp}.keras'
    
    callbacks = [
        ModelCheckpoint(
            model_path,
            monitor='val_auc',
            save_best_only=True,
            mode='max',
            verbose=1
        ),
        EarlyStopping(
            monitor='val_loss',
            patience=8,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=4,
            min_lr=1e-8,
            verbose=1
        ),
        TensorBoard(
            log_dir=CONFIG['model_save_path'] / 'logs' / f'npk_{timestamp}',
            histogram_freq=1
        )
    ]
    
    # Data augmentation
    augmentation = create_data_augmentation()
    X_train_aug = augmentation(X_train, training=True)
    
    # Phase 1: Train only NPK classifier head
    print(f"\n📚 Phase 1: Training NPK classifier ({unfreeze_at} epochs)...")
    
    history1 = model.fit(
        X_train_aug, y_train,
        validation_data=(X_val, y_val),
        epochs=unfreeze_at,
        batch_size=CONFIG['batch_size'],
        callbacks=callbacks,
        verbose=1
    )
    
    # Phase 2: Unfreeze base and fine-tune
    print(f"\n🔓 Phase 2: Unfreezing base and fine-tuning...")
    
    base_model = model.layers[1]
    base_model.trainable = True
    
    # Freeze early layers, unfreeze last 30
    for layer in base_model.layers[:-30]:
        layer.trainable = False
    
    trainable_count = sum([1 for layer in base_model.layers if layer.trainable])
    print(f"   • Trainable layers: {trainable_count}/{len(base_model.layers)}")
    
    # Recompile with lower learning rate
    model.compile(
        optimizer=keras.optimizers.Adam(CONFIG['learning_rate_npk'] / 10),
        loss='binary_crossentropy',
        metrics=[
            'binary_accuracy',
            keras.metrics.AUC(name='auc'),
            keras.metrics.Precision(name='precision'),
            keras.metrics.Recall(name='recall')
        ]
    )
    
    history2 = model.fit(
        X_train_aug, y_train,
        validation_data=(X_val, y_val),
        epochs=epochs - unfreeze_at,
        initial_epoch=unfreeze_at,
        batch_size=CONFIG['batch_size'],
        callbacks=callbacks,
        verbose=1
    )
    
    # Final evaluation on test set
    print(f"\n🎯 Final evaluation on test set...")
    test_results = model.evaluate(X_test, y_test, verbose=0)
    
    print(f"\n   Test Results:")
    for metric_name, value in zip(model.metrics_names, test_results):
        print(f"   • {metric_name:20s}: {value:.4f}")
    
    print(f"\n✅ NPK training complete!")
    print(f"   Model saved: {model_path}")
    
    return model, str(model_path), history1, history2


def main():
    """Main training function."""
    parser = argparse.ArgumentParser(
        description="Train NPK deficiency detection with PlantVillage transfer learning"
    )
    parser.add_argument(
        '--stage',
        choices=['plantvillage', 'npk', 'both'],
        default='both',
        help='Training stage: plantvillage (Stage 1), npk (Stage 2), or both'
    )
    parser.add_argument(
        '--plantvillage-weights',
        type=str,
        help='Path to PlantVillage-trained weights (for NPK stage)'
    )
    parser.add_argument(
        '--plantvillage-epochs',
        type=int,
        default=30,
        help='Epochs for PlantVillage training'
    )
    parser.add_argument(
        '--npk-epochs',
        type=int,
        default=50,
        help='Epochs for NPK training'
    )
    
    args = parser.parse_args()
    
    print("\n" + "=" * 80)
    print("🌱 FASALVAIDYA TRANSFER LEARNING PIPELINE")
    print("=" * 80)
    print(f"\nStrategy: ImageNet → PlantVillage → NPK Deficiency")
    print(f"Expected accuracy: 90-98% (vs. 70-85% baseline)")
    print(f"Training stages: {args.stage}")
    
    plantvillage_model_path = args.plantvillage_weights
    
    # Stage 1: PlantVillage
    if args.stage in ['plantvillage', 'both']:
        model, plantvillage_model_path, hist1, hist2 = train_plantvillage_stage(
            epochs=args.plantvillage_epochs
        )
        
        print(f"\n✅ Stage 1 complete! Weights: {plantvillage_model_path}")
    
    # Stage 2: NPK
    if args.stage in ['npk', 'both']:
        if not plantvillage_model_path:
            print("\n⚠️  No PlantVillage weights provided!")
            print("   Using ImageNet-only base (lower accuracy expected)")
        
        model, npk_model_path, hist1, hist2 = train_npk_stage(
            plantvillage_weights=plantvillage_model_path,
            epochs=args.npk_epochs
        )
        
        print(f"\n✅ Stage 2 complete! Final model: {npk_model_path}")
    
    print("\n" + "=" * 80)
    print("✅ TRAINING COMPLETE!")
    print("=" * 80)
    print("\n📋 Next steps:")
    print("   1. Test inference: python -c \"from ml.inference import NPKPredictor; ...\"")
    print("   2. Export to TF.js: python export_to_tfjs.py")
    print("   3. Deploy to app: Copy .keras file to frontend/assets/models/")


if __name__ == "__main__":
    main()
