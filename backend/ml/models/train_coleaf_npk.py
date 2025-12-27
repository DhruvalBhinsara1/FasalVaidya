import os
import tensorflow as tf
from tensorflow.keras import layers, models

DATA_DIR = r"E:\FasalVaidya\backend\ml\models\CoLeaf DATASET"
IMG_SIZE = (224, 224)
BATCH = 32
EPOCHS = 20
CLASSES = ["healthy", "nitrogen-N", "phosphorus-P", "potasium-K"]


def compute_class_weights():
    counts = []
    for name in CLASSES:
        class_dir = os.path.join(DATA_DIR, "train", name)
        counts.append(len(os.listdir(class_dir)))
    max_count = max(counts)
    weights = {i: max_count / c for i, c in enumerate(counts) if c > 0}
    # Soften nitrogen weight slightly to reduce over-prediction seen in confusion matrix
    for i, name in enumerate(CLASSES):
        if name == "nitrogen-N":
            weights[i] *= 0.8
    return weights

def make_ds(split):
    ds = tf.keras.preprocessing.image_dataset_from_directory(
        os.path.join(DATA_DIR, split),
        labels="inferred",
        label_mode="int",
        class_names=None,  # infer all folders present
        image_size=IMG_SIZE,
        batch_size=BATCH,
        shuffle=True,
    )

    source_class_names = ds.class_names
    keep_src_ids = [source_class_names.index(name) for name in CLASSES if name in source_class_names]
    target_ids = list(range(len(keep_src_ids)))

    table = tf.lookup.StaticHashTable(
        tf.lookup.KeyValueTensorInitializer(keep_src_ids, target_ids),
        default_value=-1,
    )

    def _remap(img, label):
        new_label = table.lookup(label)
        return img, new_label

    ds = ds.unbatch()
    ds = ds.map(_remap)
    ds = ds.filter(lambda img, lbl: tf.greater_equal(lbl, 0))
    ds = ds.map(lambda x, y: (x, tf.one_hot(tf.cast(y, tf.int32), len(CLASSES))))
    ds = ds.batch(BATCH)
    return ds

train_ds = make_ds("train")
val_ds = make_ds("val")
test_ds = make_ds("test")

class_weights = compute_class_weights()

# Prefetch for speed
train_ds = train_ds.prefetch(tf.data.AUTOTUNE)
val_ds = val_ds.prefetch(tf.data.AUTOTUNE)
test_ds = test_ds.prefetch(tf.data.AUTOTUNE)

data_augment = tf.keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.05),
    layers.RandomZoom(0.15),
    layers.RandomTranslation(0.05, 0.05),
    layers.RandomBrightness(0.15),
    layers.RandomContrast(0.15),
    layers.GaussianNoise(0.02),
])

base = tf.keras.applications.EfficientNetB0(
    include_top=False, weights="imagenet", input_shape=(*IMG_SIZE, 3), pooling="avg"
)
base.trainable = False  # start frozen

inputs = layers.Input(shape=(*IMG_SIZE, 3))
x = data_augment(inputs)
x = tf.keras.applications.efficientnet.preprocess_input(x)
x = base(x, training=False)
x = layers.Dropout(0.3)(x)
outputs = layers.Dense(len(CLASSES), activation="softmax")(x)
model = models.Model(inputs, outputs)

def focal_loss(gamma=1.75, class_weights=None):
    if class_weights is None:
        alpha_vec = None
    else:
        alpha_list = [class_weights.get(i, 1.0) for i in range(len(CLASSES))]
        total = sum(alpha_list)
        alpha_vec = [a / total for a in alpha_list]
    fl = tf.keras.losses.CategoricalFocalCrossentropy(
        gamma=gamma,
        alpha=alpha_vec,
    )
    return fl


model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-3),
    loss=focal_loss(gamma=1.75, class_weights=class_weights),
    metrics=["accuracy"],
)

cb = [
    tf.keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True),
    tf.keras.callbacks.ModelCheckpoint("plantvillage-npk.h5", save_best_only=True),
]

# Phase 1: train top head
model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS, callbacks=cb, class_weight=class_weights)

# Phase 2: light fine-tune top of backbone
base.trainable = True
for layer in base.layers[:-140]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.experimental.AdamW(learning_rate=2e-5, weight_decay=1e-4),
    loss=focal_loss(gamma=1.75, class_weights=class_weights),
    metrics=["accuracy"],
)

cb_ft = [
    tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True),
    tf.keras.callbacks.ModelCheckpoint("plantvillage-npk.h5", save_best_only=True),
]

model.fit(train_ds, validation_data=val_ds, epochs=12, callbacks=cb_ft, class_weight=class_weights)

# Phase 3: deeper fine-tune (full backbone) at very low LR
base.trainable = True
model.compile(
    optimizer=tf.keras.optimizers.experimental.AdamW(learning_rate=1e-5, weight_decay=1e-4),
    loss=focal_loss(gamma=1.75, class_weights=class_weights),
    metrics=["accuracy"],
)

cb_ft2 = [
    tf.keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True),
    tf.keras.callbacks.ModelCheckpoint("plantvillage-npk.h5", save_best_only=True),
]

model.fit(train_ds, validation_data=val_ds, epochs=6, callbacks=cb_ft2, class_weight=class_weights)

print("Test eval:", model.evaluate(test_ds))