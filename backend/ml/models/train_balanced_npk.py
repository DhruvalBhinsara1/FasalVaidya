"""
FasalVaidya Balanced NPK Model Training
=========================================
Combines multiple datasets with aggressive class balancing for accurate deficiency detection.

Datasets:
- CoLeaf DATASET (Bigger CoLeaf DATASET)
- Propossed_Data (3 augmentation variants)
- Nitrogen deficiency dataset (rice crop)
- ThorCam_semiFiltered (-C=Control, -P=Phosphorus)

Target: Balanced N, P, K detection with high accuracy
"""

import os
import sys
import shutil
import random
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import multiprocessing

# Suppress TF warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'


import numpy as np
import tensorflow as tf
from tqdm import tqdm

# For confusion matrix visualization
import matplotlib.pyplot as plt
import seaborn as sns

# ================= GPU/CPU Selection =====================
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    try:
        # Set memory growth to avoid OOM
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        print(f"✅ Using GPU: {gpus[0].name}")
    except Exception as e:
        print(f"⚠️  Could not set GPU memory growth: {e}\nFalling back to CPU.")
        tf.config.set_visible_devices([], 'GPU')
        print("✅ Using CPU only.")
else:
    print("✅ Using CPU only (no GPU detected).")

# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).parent
COMBINED_DIR = BASE_DIR / "combined_balanced_dataset"


# Use only Bigger CoLeaf DATASET/CoLeaf DATASET as the data source
DATASETS = {
    "CoLeaf": BASE_DIR / "Bigger CoLeaf DATASET" / "CoLeaf DATASET",
}

# Class mapping - normalize all folder names to standard classes
CLASS_MAPPING = {
    # Standard names
    "healthy": "healthy",
    "nitrogen-N": "nitrogen-N",
    "phosphorus-P": "phosphorus-P",
    "potasium-K": "potasium-K",
    "boron-B": "boron-B",
    "calcium-Ca": "calcium-Ca",
    "iron-Fe": "iron-Fe",
    "magnesium-Mg": "magnesium-Mg",
    "manganese-Mn": "manganese-Mn",
    # Alternate names
    "deficiency": "nitrogen-N",  # From Nitrogen deficiency dataset
    "control": "healthy",
    "-C": "healthy",  # ThorCam control
    "-P": "phosphorus-P",  # ThorCam phosphorus
    "-P50": "phosphorus-P",  # ThorCam phosphorus 50%
    "Nitrogen": "nitrogen-N",
    "Phosphorus": "phosphorus-P",
    "Potassium": "potasium-K",
    "N": "nitrogen-N",
    "P": "phosphorus-P",
    "K": "potasium-K",
}

# Target classes (NPK focus + micronutrients)
TARGET_CLASSES = [
    "healthy",
    "nitrogen-N",
    "phosphorus-P",
    "potasium-K",
    "boron-B",
    "calcium-Ca",
    "iron-Fe",
    "magnesium-Mg",
    "manganese-Mn",
]

# Training config
IMG_SIZE = (224, 224)
BATCH_SIZE = 16
NUM_WORKERS = min(16, multiprocessing.cpu_count())

# More aggressive class weights for minority classes
MIN_SAMPLES_PER_CLASS = 100  # Minimum samples we want per class
TARGET_SAMPLES_PER_CLASS = 500  # Target for oversampling

print("=" * 60)
print("FasalVaidya Balanced NPK Model Training")
print("=" * 60)
print(f"TensorFlow version: {tf.__version__}")
print(f"GPUs available: {tf.config.list_physical_devices('GPU')}")
print()


def normalize_class_name(folder_name: str) -> str:
    """Map folder name to standard class name."""
    name = folder_name.strip()
    if name in CLASS_MAPPING:
        return CLASS_MAPPING[name]
    # Try lowercase
    if name.lower() in CLASS_MAPPING:
        return CLASS_MAPPING[name.lower()]
    return None  # Unknown class


def collect_all_images():
    """Scan all datasets and collect image paths by class."""
    print("\n📁 Scanning all datasets...")
    
    class_images = {cls: [] for cls in TARGET_CLASSES}
    
    for dataset_name, dataset_path in DATASETS.items():
        if not dataset_path.exists():
            print(f"   ⚠️ {dataset_name} not found at {dataset_path}")
            continue
        
        print(f"   📂 Scanning {dataset_name}...")
        
        # Handle different dataset structures
        if dataset_name == "NitrogenRice":
            # Special structure: train/deficiency, train/control, etc.
            for split in ["train", "val", "test"]:
                split_dir = dataset_path / split
                if split_dir.exists():
                    for class_dir in split_dir.iterdir():
                        if class_dir.is_dir():
                            std_class = normalize_class_name(class_dir.name)
                            if std_class and std_class in class_images:
                                for img in class_dir.glob("*"):
                                    if img.suffix.lower() in [".jpg", ".jpeg", ".png", ".bmp"]:
                                        class_images[std_class].append(img)
        
        elif dataset_name == "ThorCam":
            # Structure: -C/, -P/, -P50/
            for class_dir in dataset_path.iterdir():
                if class_dir.is_dir():
                    std_class = normalize_class_name(class_dir.name)
                    if std_class and std_class in class_images:
                        for img in class_dir.glob("*"):
                            if img.suffix.lower() in [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"]:
                                class_images[std_class].append(img)
        
        else:
            # Standard structure: class_name/images
            for class_dir in dataset_path.iterdir():
                if class_dir.is_dir():
                    std_class = normalize_class_name(class_dir.name)
                    if std_class and std_class in class_images:
                        for img in class_dir.glob("*"):
                            if img.suffix.lower() in [".jpg", ".jpeg", ".png", ".bmp"]:
                                class_images[std_class].append(img)
    
    return class_images


def print_class_stats(class_images: dict, title: str = "Dataset Statistics"):
    """Print class distribution."""
    print(f"\n📊 {title}:")
    total = 0
    max_count = max(len(imgs) for imgs in class_images.values()) if class_images else 1
    
    for cls in TARGET_CLASSES:
        count = len(class_images.get(cls, []))
        total += count
        bar_len = int(50 * count / max_count) if max_count > 0 else 0
        bar = "█" * bar_len + "░" * (50 - bar_len)
        print(f"   {cls:15s}: {bar} {count:5d}")
    
    print(f"   {'─' * 70}")
    print(f"   {'TOTAL':15s}:                                                    {total:5d}")


def oversample_minority_classes(class_images: dict) -> dict:
    """Oversample minority classes to balance the dataset."""
    print("\n⚖️  Balancing classes with oversampling...")
    
    balanced = {cls: list(imgs) for cls, imgs in class_images.items()}
    
    # Find target count (use median or target)
    counts = [len(imgs) for imgs in balanced.values() if len(imgs) > 0]
    if not counts:
        return balanced
    
    target_count = max(TARGET_SAMPLES_PER_CLASS, int(np.median(counts)))
    print(f"   Target samples per class: {target_count}")
    
    for cls in TARGET_CLASSES:
        current_count = len(balanced[cls])
        if current_count == 0:
            print(f"   ⚠️ {cls}: No samples found!")
            continue
        
        if current_count < target_count:
            # Oversample by repeating images
            needed = target_count - current_count
            oversampled = random.choices(balanced[cls], k=needed)
            balanced[cls].extend(oversampled)
            print(f"   ✅ {cls}: {current_count} → {len(balanced[cls])} (+{needed} oversampled)")
        else:
            # Optionally undersample very large classes
            if current_count > target_count * 2:
                balanced[cls] = random.sample(balanced[cls], target_count)
                print(f"   📉 {cls}: {current_count} → {len(balanced[cls])} (undersampled)")
    
    return balanced


def copy_file(args):
    """Copy a single file (for parallel copying)."""
    src, dst = args
    try:
        shutil.copy2(src, dst)
        return True
    except Exception as e:
        return False


def create_combined_dataset(class_images: dict):
    """Create the combined dataset directory."""
    print("\n📦 Creating combined dataset...")
    
    # Remove old combined dataset
    if COMBINED_DIR.exists():
        print("   Removing old combined dataset...")
        shutil.rmtree(COMBINED_DIR)
    
    # Create directories
    for cls in TARGET_CLASSES:
        (COMBINED_DIR / cls).mkdir(parents=True, exist_ok=True)
    
    # Prepare copy tasks
    copy_tasks = []
    for cls in TARGET_CLASSES:
        for i, src_path in enumerate(class_images[cls]):
            # Generate unique filename
            suffix = src_path.suffix.lower()
            if suffix not in [".jpg", ".jpeg", ".png"]:
                suffix = ".jpg"
            dst_path = COMBINED_DIR / cls / f"{cls}_{i:05d}{suffix}"
            copy_tasks.append((src_path, dst_path))
    
    # Copy files in parallel with progress bar
    print(f"   Copying {len(copy_tasks)} files with {NUM_WORKERS} threads...")
    
    success_count = 0
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        futures = {executor.submit(copy_file, task): task for task in copy_tasks}
        with tqdm(total=len(copy_tasks), desc="   📁 Copying", unit="file") as pbar:
            for future in as_completed(futures):
                if future.result():
                    success_count += 1
                pbar.update(1)
    
    print(f"   ✅ Copied {success_count}/{len(copy_tasks)} files")


def create_data_generators():
    """Create train/val data generators with augmentation."""
    print("\n📚 Creating data generators...")
    
    # Data augmentation for training
    train_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
        rescale=1./255,
        rotation_range=30,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        vertical_flip=True,
        fill_mode='nearest',
        brightness_range=[0.7, 1.3],
        validation_split=0.15,  # 15% for validation
    )
    
    val_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
        rescale=1./255,
        validation_split=0.15,
    )
    
    train_gen = train_datagen.flow_from_directory(
        COMBINED_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        classes=TARGET_CLASSES,
        subset='training',
        shuffle=True,
    )
    
    val_gen = val_datagen.flow_from_directory(
        COMBINED_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        classes=TARGET_CLASSES,
        subset='validation',
        shuffle=False,
    )
    
    print(f"   Training samples: {train_gen.samples}")
    print(f"   Validation samples: {val_gen.samples}")
    print(f"   Classes: {train_gen.class_indices}")
    
    return train_gen, val_gen


def compute_class_weights(train_gen) -> dict:
    """Compute aggressive class weights for imbalanced data."""
    print("\n⚖️  Computing class weights...")
    
    # Count samples per class
    class_counts = np.bincount(train_gen.classes, minlength=len(TARGET_CLASSES))
    total = sum(class_counts)
    
    # Compute weights - inverse frequency with smoothing
    weights = {}
    for i, count in enumerate(class_counts):
        if count > 0:
            # More aggressive weighting for minority classes
            weight = total / (len(TARGET_CLASSES) * count)
            # Cap weights to prevent extreme values
            weight = min(weight, 10.0)
            weights[i] = weight
        else:
            weights[i] = 1.0
    
    # Boost nitrogen specifically (most important for our use case)
    n_idx = TARGET_CLASSES.index("nitrogen-N")
    weights[n_idx] *= 1.5  # Extra boost for nitrogen
    
    for i, cls in enumerate(TARGET_CLASSES):
        print(f"   {cls:15s}: weight = {weights[i]:.3f}")
    
    return weights


def build_model():
    """Build EfficientNetV2-S model with strong regularization."""
    print("\n🏗️  Building model...")
    
    # Load pretrained EfficientNetV2-S
    base_model = tf.keras.applications.EfficientNetV2S(
        include_top=False,
        weights='imagenet',
        input_shape=(*IMG_SIZE, 3),
        pooling='avg',
    )
    
    # Build model with strong regularization
    inputs = tf.keras.Input(shape=(*IMG_SIZE, 3))
    x = base_model(inputs, training=False)
    
    # Stronger regularization
    x = tf.keras.layers.Dropout(0.4)(x)
    x = tf.keras.layers.Dense(512, activation='relu', 
                               kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    x = tf.keras.layers.Dense(256, activation='relu',
                               kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)
    x = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(len(TARGET_CLASSES), activation='softmax')(x)
    
    model = tf.keras.Model(inputs, outputs)
    
    print(f"   Backbone: EfficientNetV2-S")
    print(f"   Total parameters: {model.count_params():,}")
    
    return model, base_model


def train_model(model, base_model, train_gen, val_gen, class_weights):
    """Train with 3-phase progressive unfreezing."""
    print("\n🚀 Starting training...")
    
    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            str(BASE_DIR / "plantvillage-npk-v3.h5"),
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1,
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor='val_accuracy',
            patience=8,
            restore_best_weights=True,
            verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1,
        ),
        tf.keras.callbacks.TensorBoard(
            log_dir=str(BASE_DIR / "logs"),
            histogram_freq=1,
        ),
    ]
    
    # Phase 1: Train head only
    print("\n" + "=" * 60)
    print("PHASE 1: Training Classification Head (30 epochs)")
    print("=" * 60)
    
    base_model.trainable = False
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss='categorical_crossentropy',
        metrics=['accuracy'],
    )
    
    history1 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=30,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=1,
    )
    
    # Phase 2: Fine-tune top 40% of backbone
    print("\n" + "=" * 60)
    print("PHASE 2: Fine-tuning Top 40% Backbone (25 epochs)")
    print("=" * 60)
    
    base_model.trainable = True
    num_layers = len(base_model.layers)
    freeze_until = int(num_layers * 0.6)
    
    for layer in base_model.layers[:freeze_until]:
        layer.trainable = False
    
    trainable_layers = sum(1 for l in base_model.layers if l.trainable)
    print(f"   Unfroze {trainable_layers}/{num_layers} backbone layers")
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss='categorical_crossentropy',
        metrics=['accuracy'],
    )
    
    history2 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=25,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=1,
    )
    
    # Phase 3: Full fine-tuning with very low LR
    print("\n" + "=" * 60)
    print("PHASE 3: Full Fine-tuning (20 epochs)")
    print("=" * 60)
    
    for layer in base_model.layers:
        layer.trainable = True
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss='categorical_crossentropy',
        metrics=['accuracy'],
    )
    
    history3 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=20,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=1,
    )
    
    return model


def evaluate_and_save(model, val_gen):
    """Evaluate model and save with accuracy in filename."""
    print("\n📊 Evaluating model...")
    
    # Evaluate
    loss, accuracy = model.evaluate(val_gen, verbose=1)
    print(f"\n   Validation Loss: {loss:.4f}")
    print(f"   Validation Accuracy: {accuracy*100:.1f}%")
    
    # Per-class accuracy
    print("\n   Per-class predictions:")
    predictions = model.predict(val_gen, verbose=1)
    y_pred = np.argmax(predictions, axis=1)
    y_true = val_gen.classes
    

    from sklearn.metrics import classification_report, confusion_matrix

    print("\n" + classification_report(y_true, y_pred, target_names=TARGET_CLASSES))

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    print("\n   Confusion Matrix:")
    print("   " + " ".join([f"{c[:3]:>5s}" for c in TARGET_CLASSES]))
    for i, row in enumerate(cm):
        print(f"   {TARGET_CLASSES[i][:3]:>3s} " + " ".join([f"{v:5d}" for v in row]))

    # --- Save confusion matrix as PNG ---
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=TARGET_CLASSES, yticklabels=TARGET_CLASSES)
    plt.xlabel('Predicted')
    plt.ylabel('True')
    plt.title('Confusion Matrix')
    cm_path = BASE_DIR / 'confusion_matrix.png'
    plt.tight_layout()
    plt.savefig(cm_path)
    plt.close()
    print(f"\n🖼️  Confusion matrix saved to: {cm_path}")
    
    # Save model with accuracy
    acc_str = f"{int(accuracy * 100)}"
    final_path = BASE_DIR / f"plantvillage-npk-v3-acc{acc_str}.h5"
    model.save(final_path)
    print(f"\n💾 Model saved to: {final_path}")
    
    # Also save as main model file
    main_path = BASE_DIR / "plantvillage-npk-v3.h5"
    model.save(main_path)
    print(f"   Also saved as: {main_path}")
    
    # Save class names
    class_names_path = BASE_DIR / "class_names_v3.txt"
    with open(class_names_path, 'w') as f:
        f.write('\n'.join(TARGET_CLASSES))
    print(f"   Class names saved to: {class_names_path}")
    
    return accuracy


def main():
    """Main training pipeline."""
    print("\n🌱 Starting FasalVaidya Balanced Model Training\n")
    
    # Step 1: Collect all images
    class_images = collect_all_images()
    print_class_stats(class_images, "Raw Dataset Statistics")
    
    # Step 2: Balance classes
    balanced_images = oversample_minority_classes(class_images)
    print_class_stats(balanced_images, "Balanced Dataset Statistics")
    
    # Step 3: Create combined dataset
    create_combined_dataset(balanced_images)
    
    # Step 4: Create data generators
    train_gen, val_gen = create_data_generators()
    
    # Step 5: Compute class weights
    class_weights = compute_class_weights(train_gen)
    
    # Step 6: Build model
    model, base_model = build_model()
    
    # Step 7: Train
    model = train_model(model, base_model, train_gen, val_gen, class_weights)
    
    # Step 8: Evaluate and save
    accuracy = evaluate_and_save(model, val_gen)
    
    print("\n" + "=" * 60)
    print("✅ TRAINING COMPLETE!")
    print("=" * 60)
    print(f"\n📈 Final Validation Accuracy: {accuracy*100:.1f}%")
    print(f"📁 Model saved to: {BASE_DIR / 'plantvillage-npk-v3.h5'}")
    print("\nTo use this model, update MODEL_PATH:")
    print(f"   MODEL_PATH={BASE_DIR / 'plantvillage-npk-v3.h5'}")


if __name__ == "__main__":
    main()
