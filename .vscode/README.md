# 🛠️ VS Code Configuration

VS Code workspace configuration and development automation for the FasalVaidya project.

---

## ⌨️ Keyboard Shortcuts

### Quick Start
- **Ctrl+Shift+B**: Start both Backend + Frontend (Build task)
- **Ctrl+Shift+F5**: Start Backend Flask Server only
- **Ctrl+Shift+F6**: Start Frontend Expo only
- **Ctrl+Shift+T**: Run API Tests

### Debugging
- **F5**: Start debugging (launches "Backend: Flask Server" configuration)
- **Shift+F5**: Stop debugging

---

## 📋 Available Tasks

Access via `Terminal > Run Task...` (Ctrl+Shift+P → "Run Task") or use keyboard shortcuts:

### 🚀 Development Tasks

#### **🌱 Backend: Start Flask Server**
```bash
.venv311\Scripts\Activate.ps1; python app.py
```
- Starts Flask API server on `http://0.0.0.0:5000`
- Auto-reloads on code changes (debug mode)
- Logs to console and `backend/logs/backend.log`

#### **📱 Frontend: Start Expo (Tunnel)**
```bash
npx expo start --tunnel
```
- Starts Expo dev server with ngrok tunnel
- Accessible from any network via QR code
- Opens browser with Expo DevTools

#### **🚀 FasalVaidya: Start All** (Default Build Task - Ctrl+Shift+B)
- Runs backend + frontend in parallel
- One-command full-stack development

---

### 🧪 Testing Tasks

#### **🧪 Tests: Run API Tests**
```bash
.venv311\Scripts\Activate.ps1; python -m pytest tests/test_api.py -v
```
- Runs pytest test suite for Flask API
- Tests all 25+ endpoints
- Validates request/response schemas

#### **🧪 Tests: Batch Test with Dataset**
```bash
.venv311\Scripts\Activate.ps1; python tests/batch_test_scans.py --samples 3
```
- Tests ML inference on real leaf images
- Validates model predictions
- Configurable sample count

---

### 📦 Setup Tasks

#### **📦 Setup: Install Backend Dependencies**
```bash
python -m venv .venv311; .venv311\Scripts\Activate.ps1; pip install -r requirements.txt pytest pillow
```
- Creates Python 3.11 virtual environment
- Installs Flask, TensorFlow, scikit-learn, etc.
- Adds test dependencies

#### **📦 Setup: Install Frontend Dependencies**
```bash
npm install
```
- Installs React Native, Expo, and all dependencies
- Run from `frontend/` directory

#### **📦 Setup: Install All Dependencies**
- Runs backend + frontend setup in parallel
- One-command project initialization

---

### 🧠 Machine Learning Tasks

#### **🧠 ML: Train NPK Model**
```bash
.venv311\Scripts\Activate.ps1; pip install tensorflow tqdm scikit-learn; python ml/train_npk_model.py
```
- Trains EfficientNetB0 on Unified v2 dataset (43 classes)
- Uses transfer learning with ImageNet weights
- Early stopping + learning rate reduction
- Saves best model to `ml/models/unified_v2_nutrient_best.keras`

#### **🧠 ML: Train NPK Model (No Early Stop)**
```bash
python ml/train_npk_model.py --epochs 80 --unfreeze-last 80 --disable-early-stopping
```
- Full 80-epoch training without early stopping
- For maximum accuracy when overfitting is not a concern

#### **🧠 ML: Test Inference**
```bash
python -c "from ml.inference import NPKPredictor; p = NPKPredictor(); print('✅ Model loaded!' if p.model else '⚠️ Using mock mode'); print(p.predict_npk('test.jpg'))"
```
- Quick test of model loading and prediction
- Validates TFLite model file

---

### 🌾 Crop-Specific Training Tasks

#### **🌾 ML: List Available Crops**
```bash
python ml/train_crop_model.py --list
```
- Lists all 9 supported crops and their deficiency classes

#### **🌾 ML: Train Crop Model (Wheat/Rice/Tomato/Maize)**
```bash
python ml/train_crop_model.py --crop wheat --epochs 50
```
- Trains crop-specific model for targeted accuracy
- Available crops: wheat, rice, tomato, maize, banana, cotton, chili, eggplant, potato

#### **🌾 ML: Train All Crop Models**
```bash
python ml/train_crop_model.py --crop all --epochs 50
```
- Trains individual models for all 9 crops sequentially
- Takes several hours to complete

---

### 🌿 Transfer Learning Tasks

#### **🌿 Transfer Learning: Prepare PlantVillage Dataset**
```bash
.venv311\Scripts\Activate.ps1; pip install kaggle pillow; python ml/prepare_plantvillage_data.py --all
```
- Downloads PlantVillage dataset from Kaggle (requires API key)
- Preprocesses 87K images across 38 plant disease classes
- Prepares data for Stage 1 training

#### **🌿 Transfer Learning: Stage 1 - PlantVillage Training**
```bash
python ml/train_npk_model_transfer.py --stage plantvillage --plantvillage-epochs 30
```
- Pre-trains model on large-scale PlantVillage dataset
- Learns general plant disease features
- Saves weights to `ml/models/stage1_plantvillage.keras`

#### **🌿 Transfer Learning: Stage 2 - NPK Fine-tuning**
```bash
python ml/train_npk_model_transfer.py --stage npk --npk-epochs 50
```
- Fine-tunes Stage 1 model on FasalVaidya NPK dataset
- Adapts to specific nutrient deficiency patterns
- Produces final production model

#### **🌿 Transfer Learning: Full Pipeline (Both Stages)**
```bash
python ml/train_npk_model_transfer.py --stage both
```
- Runs complete transfer learning workflow
- Stage 1: PlantVillage pre-training
- Stage 2: NPK fine-tuning
- Recommended for best model performance

---

## 🐛 Debug Configurations

Available in Debug panel (Ctrl+Shift+D) or via `launch.json`:

### **Backend: Flask Server**
```json
{
  "name": "Backend: Flask Server",
  "type": "python",
  "request": "launch",
  "module": "flask",
  "env": {
    "FLASK_APP": "app.py",
    "FLASK_DEBUG": "1"
  },
  "args": ["run", "--host=0.0.0.0", "--port=5000"],
  "cwd": "${workspaceFolder}/backend"
}
```
- Launches Flask with Python debugger attached
- Set breakpoints in `app.py`, `unified_inference.py`, etc.
- Inspect variables, step through code

### **Tests: Run API Tests**
```json
{
  "name": "Tests: Run API Tests",
  "type": "python",
  "request": "launch",
  "module": "pytest",
  "args": ["tests/test_api.py", "-v"],
  "cwd": "${workspaceFolder}/backend"
}
```
- Debug pytest tests with breakpoints
- Inspect test failures

### **Full Stack: Backend + Frontend**
- Launches backend debugger + frontend Expo server
- Compound configuration for simultaneous development

---

## 📂 Configuration Files

### `tasks.json`
- Defines 20+ automation tasks
- Handles PowerShell activation, environment setup
- Configures parallel task execution

### `launch.json`
- Debug configurations for backend, tests, and full stack
- Python debugger settings
- Environment variables for Flask

### `settings.json`
- Python interpreter path: `.venv311\Scripts\python.exe`
- Linting and formatting rules
- File exclusions for performance

### `keybindings.json`
- Custom workspace keyboard shortcuts
- Task execution shortcuts (Ctrl+Shift+F5/F6/T)
- Debug shortcuts (F5, Shift+F5)

---

## 💡 Quick Start Guide

### First Time Setup
1. **Install dependencies**: Run task `📦 Setup: Install All Dependencies`
2. **Verify Python environment**: Check `.venv311` folder created
3. **Test backend**: Press **Ctrl+Shift+F5**
4. **Test frontend**: Press **Ctrl+Shift+F6**

### Daily Development
1. **Start full stack**: Press **Ctrl+Shift+B**
2. **Make code changes**: Backend auto-reloads, frontend hot-reloads
3. **Run tests**: Press **Ctrl+Shift+T**
4. **Debug issues**: Press **F5** and set breakpoints

### Training New Models
1. **Train NPK model**: Run task `🧠 ML: Train NPK Model`
2. **Monitor progress**: Watch TensorBoard logs
3. **Convert to TFLite**: Run conversion script
4. **Test inference**: Run task `🧠 ML: Test Inference`

---

## 🚀 Pro Tips

1. **Quick full-stack start**: Just press **Ctrl+Shift+B** and start coding!
2. **Terminal panel**: View multiple task outputs in split terminals
3. **Task status**: Running tasks show in status bar (bottom left)
4. **Stop tasks**: Click trash icon in terminal panel
5. **Command Palette**: **Ctrl+Shift+P** → Type "Tasks: Run Task" for full list
6. **Background tasks**: Backend/frontend run in background (isBackground: true)
7. **Task output**: Use `get_task_output` tool to retrieve task logs

---

## 🔧 Troubleshooting

### Task Fails with "Cannot activate virtualenv"
- Ensure `.venv311` exists: Run `📦 Setup: Install Backend Dependencies`
- Check Python 3.11 installed: `python --version`

### Frontend Won't Start
- Install Node.js 18+
- Run `npm install` in `frontend/` directory
- Check port 19000/19001 not in use

### Backend 500 Errors
- Check `backend/logs/backend.log`
- Verify models exist in `ml/models/`
- Test inference: Run `🧠 ML: Test Inference`

---

## 📚 Related Documentation

- [Main README](../README.md) - Full project overview
- [Backend README](../backend/README.md) - API documentation
- [Frontend README](../frontend/README.md) - Mobile app guide

---

**Streamlined development for FasalVaidya 🌾**
