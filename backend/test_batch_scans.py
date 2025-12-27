import argparse
import glob
import os
import sys
from pathlib import Path

import requests


def main():
    script_dir = Path(__file__).resolve().parent
    default_dir = script_dir / "test_images"  # backend/test_images

    parser = argparse.ArgumentParser(description="Batch test scan uploads")
    parser.add_argument("--dir", default=str(default_dir), help="Folder with images to send")
    parser.add_argument("--pattern", default="test_leaf*.jpg", help="Glob pattern inside the folder")
    parser.add_argument("--crop-id", type=int, default=1, help="Crop ID to send with each request")
    parser.add_argument("--url", default="http://127.0.0.1:5000/api/scans", help="Backend scans endpoint")
    args = parser.parse_args()

    img_dir = os.path.abspath(args.dir)
    pattern = os.path.join(img_dir, args.pattern)
    files = sorted(glob.glob(pattern))
    if not files:
        print(f"No files found for pattern: {pattern}")
        sys.exit(1)

    print(f"Sending {len(files)} files to {args.url} (crop_id={args.crop_id})\n")
    for path in files:
        with open(path, "rb") as fh:
            files_payload = {"image": (os.path.basename(path), fh, "image/jpeg")}
            data = {"crop_id": str(args.crop_id)}
            try:
                resp = requests.post(args.url, files=files_payload, data=data, timeout=30)
                resp.raise_for_status()
                js = resp.json()
                n = js.get("n_score")
                p = js.get("p_score")
                k = js.get("k_score")
                rec = js.get("recommendation")
                print(f"{os.path.basename(path)} | n={n:.2f} p={p:.2f} k={k:.2f}\n  {rec}\n")
            except Exception as exc:
                print(f"{os.path.basename(path)} -> FAILED: {exc}")


if __name__ == "__main__":
    main()
