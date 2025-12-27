# Backend quick start

## Run API (PowerShell)
- From `E:/FasalVaidya/backend`:
  - `$env:MODEL_PATH="E:/FasalVaidya/backend/ml/models/plantvillage-npk.h5"`
  - `./.venv311/Scripts/python.exe app.py`
- Or in VS Code: use the existing `run-backend` task (loads the same MODEL_PATH).

## Quick sanity check
- `./.venv311/Scripts/python.exe test_batch_scans.py`
  - Hits `http://127.0.0.1:5000/api/scans` with sample images and prints N/P/K scores plus farmer-facing guidance.

## Notes
- MODEL_PATH must point to the latest `plantvillage-npk.h5`; restart the backend after replacing the model file.
- Python 3.11 virtual env lives at `backend/.venv311` (already provisioned).
