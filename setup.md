# Setup Guide (FasalVaidya)

## 1) Prerequisites
- Python 3.11 (recommended to match the existing `.venv311`).
- Git, pip.
- (Optional) CUDA + GPU drivers if you plan to retrain models.

## 2) Clone & environment
```bash
# from your workspace root
python -m venv .venv
# Windows
.\.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

## 3) Data layout (relative paths)
Place datasets inside the repo root so all scripts remain portable:
- `Leaf Nutrient Data Sets/<Crop Name>/...` (per-crop inference/tests)
- `CoLeaf DATASET/...` (for the generic NPK trainer)

Example (Rice):
```
Leaf Nutrient Data Sets/
  Rice Nutrients/
    Nitrogen(N)/...
    Phosphorus(P)/...
    Potassium(K)/...
```

## 4) Running the API
```bash
cd backend
python app.py
# API at http://127.0.0.1:5000
```
Uploads go to `backend/uploads`. Models are read from `backend/ml/models/*`.

## 5) Smoke tests
- Quick API smoke: `python test_api.py`
- Rice variation check: `python test_rice.py`
- Pytest suite: `cd backend && pytest`

## 6) Training models (auto registry update)
```bash
cd backend/ml
# Train a single crop (uses crop-specific overrides; maize uses EfficientNet-B2 + longer training)
python train_crop_model.py --crop maize --quality high

# Train all crops
python train_crop_model.py --crop all --quality balanced
```
Notes:
- After training, `crop_registry.json` is rewritten with **relative paths** and inference auto-loads the newest `.keras` file per crop if the registry path is stale.
- Models are saved under `backend/ml/models/<crop>/` (best.keras, model.tflite, metadata.json).

## 7) Inference helpers
- Use `/api/scans` with `multipart/form-data` field `image` and `crop_id`.
- Example local call:
```bash
curl -F "image=@path/to/leaf.jpg" -F "crop_id=2" http://127.0.0.1:5000/api/scans
```
- Grad-CAM overlays are generated when OpenCV is available; otherwise a simple overlay is returned.

## 8) Common issues
- If a path error appears, verify datasets are under the repo root; all scripts resolve paths relative to the project.
- When retraining, no manual edits to `ml/inference.py` are needed—new models are picked up automatically.

## 9) Cleaning/refreshing
- To clear uploads/logs: remove files inside `backend/uploads` and `backend/logs` (keep folders).
- To reset cache, restart the API process; model cache auto-invalidates if files change.
