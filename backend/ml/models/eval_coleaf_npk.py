import os
import tensorflow as tf
from sklearn.metrics import confusion_matrix, classification_report
import numpy as np

DATA_DIR = r"E:\FasalVaidya\backend\ml\models\CoLeaf DATASET"
IMG_SIZE = (224, 224)
BATCH = 32
CLASSES = ["healthy", "nitrogen-N", "phosphorus-P", "potasium-K", "boron-B", "calcium-Ca", "iron-Fe", "magnesium-Mg", "manganese-Mn"]
MODEL_PATH = os.getenv("MODEL_PATH", r"E:\FasalVaidya\backend\ml\models\plantvillage-npk-v2.h5")


def make_ds(split):
    ds = tf.keras.preprocessing.image_dataset_from_directory(
        os.path.join(DATA_DIR, split),
        labels="inferred",
        label_mode="int",
        class_names=None,
        image_size=IMG_SIZE,
        batch_size=BATCH,
        shuffle=False,
    )
    source_class_names = ds.class_names
    keep_src_ids = [source_class_names.index(name) for name in CLASSES if name in source_class_names]
    target_ids = list(range(len(keep_src_ids)))
    table = tf.lookup.StaticHashTable(
        tf.lookup.KeyValueTensorInitializer(keep_src_ids, target_ids),
        default_value=-1,
    )
    ds = ds.unbatch()
    ds = ds.map(lambda img, label: (img, table.lookup(label)))
    ds = ds.filter(lambda img, lbl: tf.greater_equal(lbl, 0))
    ds = ds.map(lambda x, y: (x, tf.one_hot(tf.cast(y, tf.int32), len(CLASSES))))
    ds = ds.batch(BATCH)
    return ds


def main():
    test_ds = make_ds("test")
    model = tf.keras.models.load_model(MODEL_PATH)
    logits = model.predict(test_ds)
    y_true = []
    for _x, y in test_ds.unbatch():
        y_true.append(tf.argmax(y).numpy())
    y_true = np.array(y_true)
    y_pred = np.argmax(logits, axis=1)
    print("Confusion matrix (rows=true, cols=pred):\n", confusion_matrix(y_true, y_pred))
    print("\nClassification report:\n", classification_report(y_true, y_pred, target_names=CLASSES))


if __name__ == "__main__":
    main()
