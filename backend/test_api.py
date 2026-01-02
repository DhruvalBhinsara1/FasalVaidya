"""Quick API smoke test using relative dataset paths."""
import os
from pathlib import Path

import requests


BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_ROOT = BASE_DIR / 'Leaf Nutrient Data Sets'
url = 'http://127.0.0.1:5000/api/scans'


def pick_first(folder: Path) -> Path:
    entries = sorted(folder.iterdir())
    if not entries:
        raise FileNotFoundError(f"No images found in {folder}")
    return entries[0]


def main():
    print("=" * 50)
    print("Testing Rice Model (crop_id=2)")
    print("=" * 50)

    rice_base = DATASET_ROOT / 'Rice Nutrients'

    for folder_name, label in [
        ('Nitrogen(N)', 'N'),
        ('Phosphorus(P)', 'P'),
        ('Potassium(K)', 'K'),
    ]:
        folder = rice_base / folder_name
        img = pick_first(folder)
        with open(img, 'rb') as f:
            r = requests.post(url, data={'crop_id': 2}, files={'image': ('test.jpg', f, 'image/jpeg')})
            s = r.json()
            print(f"Rice {label}-folder: N={s['n_score']*100:.1f}%, P={s['p_score']*100:.1f}%, K={s['k_score']*100:.1f}%")

    print("\n" + "=" * 50)
    print("Testing Tomato Model (crop_id=1)")
    print("=" * 50)

    tomato_base = DATASET_ROOT / 'Tomato Nutrients'
    for folder in ['tomato__N', 'tomato__K', 'tomato__healthy']:
        folder_path = tomato_base / folder
        if folder_path.exists():
            img = pick_first(folder_path)
            with open(img, 'rb') as f:
                r = requests.post(url, data={'crop_id': 1}, files={'image': ('test.jpg', f, 'image/jpeg')})
                s = r.json()
                print(f"Tomato {folder}: N={s['n_score']*100:.1f}%, P={s['p_score']*100:.1f}%, K={s['k_score']*100:.1f}%")

    print("\n✅ Test complete - predictions should VARY between images!")


if __name__ == '__main__':
    main()
