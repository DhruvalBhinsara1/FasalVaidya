# VS Code Configuration

This folder contains VS Code workspace configurations for FasalVaidya development.

## Keyboard Shortcuts

### Quick Start
- **Ctrl+Shift+B**: Start both Backend + Frontend (Build task)
- **Ctrl+Shift+F5**: Start Backend Flask Server only
- **Ctrl+Shift+F6**: Start Frontend Expo only
- **Ctrl+Shift+T**: Run API Tests

### Debugging
- **F5**: Start debugging (launches "Backend: Flask Server" configuration)
- **Shift+F5**: Stop debugging

## Available Tasks

Access via `Terminal > Run Task...` or use the shortcuts above:

### Development
- 🌱 Backend: Start Flask Server
- 📱 Frontend: Start Expo (Tunnel)
- 🚀 FasalVaidya: Start All (Backend + Frontend) - **Default build task**

### Testing
- 🧪 Tests: Run API Tests
- 🧪 Tests: Batch Test with Dataset

### Setup
- 📦 Setup: Install Backend Dependencies
- 📦 Setup: Install Frontend Dependencies
- 📦 Setup: Install All Dependencies

### Machine Learning
- 🧠 ML: Train NPK Model
- 🧠 ML: Train NPK Model (No Early Stop)
- 🌾 ML: List Available Crops
- 🌾 ML: Train Crop Model (Wheat)
- 🌾 ML: Train Crop Model (Rice)
- 🌾 ML: Train Crop Model (Tomato)
- 🌾 ML: Train Crop Model (Maize)
- 🌾 ML: Train All Crop Models
- 🧠 ML: Test Inference

### Transfer Learning
- 🌿 Transfer Learning: Prepare PlantVillage Dataset
- 🌿 Transfer Learning: Stage 1 - PlantVillage Training
- 🌿 Transfer Learning: Stage 2 - NPK Fine-tuning
- 🌿 Transfer Learning: Full Pipeline (Both Stages)

## Debug Configurations

Available in the Debug panel (Ctrl+Shift+D):

1. **Backend: Flask Server** - Debug the Flask backend with breakpoints
2. **Tests: Run API Tests** - Debug pytest tests
3. **Full Stack: Backend + Frontend** - Launch backend debugger + frontend server

## Files

- `launch.json` - Debug configurations
- `tasks.json` - Task definitions for building, testing, and running
- `settings.json` - Workspace-specific VS Code settings
- `keybindings.json` - Custom keyboard shortcuts (workspace-scoped)

## Tips

1. Use **Ctrl+Shift+B** for quick full-stack development
2. Set breakpoints in Python files and press **F5** to debug
3. View running tasks in the Terminal panel
4. Access Command Palette with **Ctrl+Shift+P** and type "Tasks" to see all available tasks
