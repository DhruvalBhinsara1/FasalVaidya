"""Test Rice model predictions to verify they vary for different images (relative paths)."""
from pathlib import Path

import requests


BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_ROOT = BASE_DIR / 'Leaf Nutrient Data Sets' / 'Rice Nutrients'
url = 'http://127.0.0.1:5000/api/scans'

# Test different rice images (relative to repo root)
images = [
    (DATASET_ROOT / 'Nitrogen(N)' / 'untitled-1.JPG', 'N deficient 1'),
    (DATASET_ROOT / 'Nitrogen(N)' / 'untitled-5.JPG', 'N deficient 2'),
    (DATASET_ROOT / 'Nitrogen(N)' / 'untitled-10.JPG', 'N deficient 3'),
    (DATASET_ROOT / 'Phosphorus(P)' / 'IMG_3784.JPG', 'P deficient 1'),
    (DATASET_ROOT / 'Phosphorus(P)' / 'IMG_3800.JPG', 'P deficient 2'),
    (DATASET_ROOT / 'Potassium(K)' / 'untitled-1.JPG', 'K deficient 1'),
    (DATASET_ROOT / 'Potassium(K)' / 'untitled-20.JPG', 'K deficient 2'),
]

def main():
    print("Rice Model Test Results")
    print("=" * 60)

    for img_path, desc in images:
        try:
            with open(img_path, 'rb') as f:
                files = {'image': ('test.jpg', f, 'image/jpeg')}
                data = {'crop_id': '2'}
                r = requests.post(url, data=data, files=files)
                result = r.json()
                print(f"{desc:15} -> N={result['n_score']:5.1f}, P={result['p_score']:5.1f}, K={result['k_score']:5.1f}")
        except FileNotFoundError:
            print(f"{desc:15} -> FILE NOT FOUND: {img_path}")
        except Exception as e:
            print(f"{desc:15} -> ERROR: {e}")


if __name__ == '__main__':
    main()
