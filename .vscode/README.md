# 🛠️ VS Code Configuration

**Development Environment Setup for FasalVaidya**

This directory contains VS Code workspace configuration to streamline development with pre-configured tasks, keybindings, launch configurations, and workspace settings.

---

## 📋 Files Overview

| File | Purpose |
|------|---------|
| **tasks.json** | Pre-configured build and run tasks for backend/frontend |
| **launch.json** | Debug configurations for Python backend |
| **keybindings.json** | Custom keyboard shortcuts for common workflows |
| **settings.json** | Workspace-specific settings (Python interpreter, formatters, etc.) |

---

## ⌨️ Quick Start

### 🚀 Start All Services

Press **`Ctrl+Shift+B`** (or **`Cmd+Shift+B`** on Mac) to launch:
- ✅ Backend Flask API server
- ✅ Frontend Expo development server (tunnel mode)

Both services run in parallel background tasks.

### 🎯 Run Individual Tasks

1. Press **`Ctrl+Shift+P`** → `Tasks: Run Task`
2. Select from available tasks:

#### 🌱 Backend Tasks
- **🌱 Backend: Start Flask Server** - Start API server on port 5000
- **🧠 ML: Train NPK Model** - Train unified NPK deficiency model
- **🧠 ML: Train NPK Model (No Early Stop)** - Full 80-epoch training
- **🌾 ML: List Available Crops** - Show available crops for training
- **🌾 ML: Train Crop Model (Wheat/Rice/Tomato/Maize)** - Train crop-specific models
- **🌾 ML: Train All Crop Models** - Train all crop models sequentially
- **🧠 ML: Test Inference** - Test model loading and prediction
- **🌿 Transfer Learning: Prepare PlantVillage Dataset** - Download and preprocess PlantVillage data
- **🌿 Transfer Learning: Stage 1 - PlantVillage Training** - Pre-train on PlantVillage (30 epochs)
- **🌿 Transfer Learning: Stage 2 - NPK Fine-tuning** - Fine-tune on NPK data (50 epochs)
- **🌿 Transfer Learning: Full Pipeline (Both Stages)** - Complete transfer learning workflow

#### 📱 Frontend Tasks
- **📱 Frontend: Start Expo (Tunnel)** - Start mobile app in tunnel mode for remote access
- **🧪 Tests: Run API Tests** - Execute pytest suite for backend API
- **🧪 Tests: Batch Test with Dataset** - Test model inference with sample images (3 samples)

#### 📦 Setup Tasks
- **📦 Setup: Install Backend Dependencies** - Create venv and install Python packages
- **📦 Setup: Install Frontend Dependencies** - Install Node.js packages with npm
- **📦 Setup: Install All Dependencies** - Install both backend and frontend dependencies in parallel

#### 🚀 Combined Tasks
- **🚀 FasalVaidya: Start All** - Start both backend and frontend services (default build task)

---

## 🔧 Configuration Details

### Tasks Configuration (`tasks.json`)

All tasks use the virtual environment `.venv311` in the backend directory. Key features:

- **Automatic venv activation**: Tasks automatically activate Python virtual environment
- **Background processes**: Server tasks run in background without blocking terminal
- **Smart defaults**: Pre-configured with optimal settings (epochs, arguments, etc.)
- **Parallel execution**: Setup tasks run simultaneously for faster installation

### Example Task Structure

```json
{
  "label": "🌱 Backend: Start Flask Server",
  "type": "shell",
  "command": ".venv311\\Scripts\\Activate.ps1; python app.py",
  "options": {
    "cwd": "${workspaceFolder}/backend"
  },
  "isBackground": true,
  "problemMatcher": []
}
```

### Python Environment Setup

The workspace uses Python 3.11 in a dedicated virtual environment:

```bash
# Location: backend/.venv311/
# Activation:
#   Windows: .venv311\Scripts\Activate.ps1
#   Linux/Mac: source .venv311/bin/activate
```

### Workspace Settings (`settings.json`)

Key configurations:
- **Python Interpreter**: Automatically set to `.venv311`
- **Linting**: Pylint enabled for code quality
- **Formatting**: autopep8 for Python, Prettier for TypeScript/JSON
- **File Associations**: `.ipynb` → Jupyter, `.env` → Properties
- **Terminal**: Default shell is PowerShell on Windows

---

## 🧪 Testing & Development Workflow

### 1. Quick Testing Workflow

```bash
# 1. Start backend
Ctrl+Shift+P → "Tasks: Run Task" → "🌱 Backend: Start Flask Server"

# 2. Test API
Ctrl+Shift+P → "Tasks: Run Task" → "🧪 Tests: Run API Tests"

# 3. Start frontend
Ctrl+Shift+P → "Tasks: Run Task" → "📱 Frontend: Start Expo (Tunnel)"
```

### 2. ML Model Training Workflow

```bash
# Step 1: Install TensorFlow dependencies (if not already installed)
.venv311\Scripts\Activate.ps1
pip install tensorflow tqdm scikit-learn

# Step 2: Train NPK model
Ctrl+Shift+P → "Tasks: Run Task" → "🧠 ML: Train NPK Model"

# Step 3: Test inference
Ctrl+Shift+P → "Tasks: Run Task" → "🧠 ML: Test Inference"

# Step 4: Batch test with real images
Ctrl+Shift+P → "Tasks: Run Task" → "🧪 Tests: Batch Test with Dataset"
```

### 3. Transfer Learning Workflow (Advanced)

For production-grade models using PlantVillage pre-training:

```bash
# Stage 1: Download and prepare PlantVillage dataset
Task → "🌿 Transfer Learning: Prepare PlantVillage Dataset"

# Stage 2: Pre-train on PlantVillage (30 epochs)
Task → "🌿 Transfer Learning: Stage 1 - PlantVillage Training"

# Stage 3: Fine-tune on NPK data (50 epochs)
Task → "🌿 Transfer Learning: Stage 2 - NPK Fine-tuning"

# Or run complete pipeline in one go:
Task → "🌿 Transfer Learning: Full Pipeline (Both Stages)"
```

---

## 🎓 Training New Models

### Hierarchical Router-Specialist Architecture (Google Colab)

For advanced multi-crop training, use the Jupyter notebook:

**Notebook**: `FasalVaidya_Hierarchical_Router_Specialist.ipynb`

**Architecture**:
- **Router Model**: Classifies crops into 3 biological groups (Grasses, Vines, Broad Leaves)
- **3 Specialist Models**: Group-specific deficiency detectors

**Key Features**:
- ✅ Handles 9 crops with nested dataset structures (train/val/test folders)
- ✅ SSD optimization (10-50x I/O speedup on Colab)
- ✅ Industrial ML techniques (Focal Loss, GroupKFold, LR Scheduling)
- ✅ Optimized for Colab free tier (~45-60 min total training)

**Training Configuration**:
```python
IMG_SIZE = 224x224 (EfficientNetB0 native)
BATCH_SIZE = 64 (optimized for speed)
EPOCHS = 3+3 per model (Phase 1: frozen, Phase 2: unfrozen)
BASE_MODEL = EfficientNetB0 (5.3M parameters)
TOTAL_MODELS = 4 (1 router + 3 specialists)
```

**Usage**:
1. Open in Google Colab
2. Mount Google Drive with dataset
3. Run Cell 1 to copy data to local SSD (critical for speed!)
4. Run remaining cells sequentially
5. Download trained models to `backend/ml/models/`

### Crop-Specific Model Training (Local)

For training individual crop models locally:

```bash
# List available crops
Task → "🌾 ML: List Available Crops"

# Train specific crop (Wheat, Rice, Maize, Tomato)
Task → "🌾 ML: Train Crop Model (Wheat)"

# Or train all crops
Task → "🌾 ML: Train All Crop Models"
```

**Requirements**:
- GPU recommended (NVIDIA CUDA)
- ~10-20GB free disk space
- TensorFlow 2.15+
- 8GB+ RAM

---

## 🐛 Debugging

### Python Backend Debugging

**Launch Configuration** (`launch.json`):
- **Python: Flask** - Debug Flask application with breakpoints
- **Python: Current File** - Debug currently open Python file

**Steps**:
1. Set breakpoints in Python code (click left of line number)
2. Press `F5` or click "Run and Debug" → "Python: Flask"
3. Use Debug Console to inspect variables

### Common Issues

#### Task Not Found
- **Issue**: "Task 'XYZ' not found"
- **Fix**: Reload window (`Ctrl+Shift+P` → "Developer: Reload Window")

#### Python Import Errors
- **Issue**: `ModuleNotFoundError` when running tasks
- **Fix**: Ensure virtual environment is activated and dependencies installed:
  ```bash
  cd backend
  .venv311\Scripts\Activate.ps1
  pip install -r requirements.txt
  ```

#### Port Already in Use
- **Issue**: `OSError: [WinError 10048] Only one usage of each socket address`
- **Fix**: Kill existing process on port 5000:
  ```powershell
  # Windows PowerShell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process
  ```

#### Expo Tunnel Connection Failed
- **Issue**: Frontend can't connect to backend over tunnel
- **Fix**: Update `frontend/src/api/client.ts` with your computer's local IP:
  ```typescript
  export const API_BASE_URL = 'http://192.168.1.XXX:5000';
  ```

---

## 📚 Additional Resources

### Documentation

- **Main README**: [../README.md](../README.md) - Project overview
- **Frontend README**: [../frontend/README.md](../frontend/README.md) - Mobile app documentation
- **Quick Start Guide**: [../guidelines/QUICK_START_V2.md](../guidelines/QUICK_START_V2.md)
- **Training Guide**: [../guidelines/UNIFIED_V2_TRAINING_PLAN.md](../guidelines/UNIFIED_V2_TRAINING_PLAN.md)

### Training Notebooks

| Notebook | Purpose | Status |
|----------|---------|--------|
| `FasalVaidya_Hierarchical_Router_Specialist.ipynb` | **🌟 PRODUCTION** - Hierarchical 4-model architecture | ✅ Ready |
| `FasalVaidya_Enhanced_V2.ipynb` | Enhanced model v2 with leaf validation | ✅ Ready |
| `FasalVaidya_Enhanced_Transfer_Learning.ipynb` | Transfer learning from PlantVillage | ✅ Ready |
| `FasalVaidya_EfficientNetB0_Training.ipynb` | EfficientNet-B0 baseline | ✅ Ready |
| `FasalVaidya_YOLOv8_Training.ipynb` | YOLOv8 classification (experimental) | ⚠️ Experimental |

### VS Code Extensions (Recommended)

Install these extensions for optimal development experience:

- **Python** (`ms-python.python`) - Python language support
- **Pylance** (`ms-python.vscode-pylance`) - Fast Python language server
- **Jupyter** (`ms-toolsai.jupyter`) - Notebook support
- **Expo Tools** (`expo.vscode-expo-tools`) - Expo development tools
- **React Native Tools** (`msjsdiag.vscode-react-native`) - React Native debugging
- **ESLint** (`dbaeumer.vscode-eslint`) - JavaScript/TypeScript linting
- **Prettier** (`esbenp.prettier-vscode`) - Code formatting

---

## 🎯 Keyboard Shortcuts

Custom keybindings configured in `keybindings.json`:

| Shortcut | Action | Context |
|----------|--------|---------|
| **Ctrl+Shift+B** | Run default build task (Start All) | Global |
| **F5** | Start debugging | Python files |
| **Shift+F5** | Stop debugging | Debug active |
| **Ctrl+`** | Toggle integrated terminal | Global |
| **Ctrl+Shift+`** | Create new terminal | Global |

---

## 🚀 Quick Command Reference

### Backend Development

```bash
# Activate virtual environment
cd backend
.venv311\Scripts\Activate.ps1

# Run Flask server
python app.py

# Run tests
pytest tests/ -v

# Train model
python ml/train_npk_model.py

# Test inference
python -c "from ml.inference import NPKPredictor; p = NPKPredictor(); print(p.predict_npk('test.jpg'))"
```

### Frontend Development

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Clear cache
npx expo start -c
```

### Database Management

```bash
# View database
cd backend
sqlite3 fasalvaidya.db

# Export scans
sqlite3 fasalvaidya.db ".mode csv" ".output scans.csv" "SELECT * FROM leaf_scans;"

# Reset database (delete and restart app.py to recreate)
rm fasalvaidya.db
python app.py
```

---

## 💡 Tips & Best Practices

### 1. Use Virtual Environment

Always activate the virtual environment before running Python commands:
```bash
.venv311\Scripts\Activate.ps1  # Windows
source .venv311/bin/activate   # Linux/Mac
```

### 2. Check Task Output

View task output in the terminal panel:
- **View** → **Terminal** (or `Ctrl+``)
- Select task from dropdown in terminal panel

### 3. Stop Background Tasks

To stop background tasks (servers):
- Click trash icon in terminal panel, or
- **Terminal: Kill All Tasks** command (`Ctrl+Shift+P`)

### 4. Update Backend URL

When testing on physical device, update the API base URL:
```typescript
// frontend/src/api/client.ts
export const API_BASE_URL = 'http://YOUR_LOCAL_IP:5000';
```

Find your IP:
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

### 5. Faster Model Training

For faster training iterations:
- Use smaller dataset (reduce images per class)
- Reduce epochs (e.g., 10 instead of 50)
- Use smaller batch size if GPU memory limited
- Use mixed precision training (`tf.keras.mixed_precision`)

### 6. Monitor Training Progress

Watch training logs in real-time:
```bash
# Terminal 1 - Run training task
# Terminal 2 - Tail logs
Get-Content backend/logs/app.log -Wait  # PowerShell
tail -f backend/logs/app.log            # Linux/Mac
```

---

## 🔄 Version Control Integration

### Git Configuration

Workspace includes `.gitignore` for:
- Python virtual environments (`.venv311/`)
- Node modules (`node_modules/`)
- Database files (`*.db`)
- Uploaded images (`uploads/`)
- Model files (`*.keras`, `*.h5` - large files)
- Logs (`logs/`)

### Recommended Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-crop-support

# 2. Make changes and commit
git add .
git commit -m "feat: add potato crop support"

# 3. Push to remote
git push origin feature/new-crop-support

# 4. Create Pull Request on GitHub
```

---

## 📞 Support & Contribution

For issues, questions, or contributions:

1. **Check Documentation**: Review [README.md](../README.md) and [guidelines/](../guidelines/)
2. **Search Issues**: Check existing GitHub issues
3. **Create Issue**: Open new issue with detailed description
4. **Submit PR**: Follow contribution guidelines

---

## 📝 Notes

- All tasks use PowerShell syntax (Windows). For Linux/Mac, modify commands in `tasks.json`
- Virtual environment must be created before running tasks: `python -m venv backend/.venv311`
- TensorFlow requires CUDA for GPU training (optional but recommended)
- Expo tunnel mode may be slow; use LAN mode for better performance during development

---

**Happy Coding! 🚀🌾**

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
