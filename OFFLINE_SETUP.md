# FasalVaidya Offline Setup Guide

## 🎯 How Your Offline System Works

```
👨‍🌾 Farmer with Phone + Laptop in Field (No Internet)
         ↓
📱 Phone connects to Laptop via WiFi Hotspot
         ↓
💻 Laptop runs Flask + TensorFlow Model
         ↓
✅ Phone gets instant results
```

**Everything is local. No internet needed.**

---

## 📋 One-Time Setup

### 1. On Laptop

```powershell
# Navigate to project
cd E:\FasalVaidya\backend

# Activate environment
.\.venv311\Scripts\Activate.ps1

# Start Flask server (listens on all network interfaces)
python app.py
```

**Flask will show:**
```
* Running on http://127.0.0.1:5000
* Running on http://10.70.21.250:5000  ← Use this IP!
```

### 2. Create WiFi Hotspot

**Option A: Laptop as Hotspot**
1. Windows Settings → Network & Internet → Mobile hotspot
2. Turn ON
3. Note the WiFi name and password

**Option B: Phone as Hotspot**
1. Phone Settings → Hotspot & tethering
2. Turn ON WiFi hotspot
3. Connect laptop to this hotspot

### 3. Find Laptop's IP Address

```powershell
# On laptop, run:
ipconfig

# Look for "Wireless LAN adapter" or "Mobile Hotspot"
# Find line: IPv4 Address: 192.168.137.1  ← This is your IP
```

### 4. Configure Phone App

Create file: `frontend/.env`
```bash
# Replace with your laptop's IP
EXPO_PUBLIC_API_HOST=192.168.137.1
EXPO_PUBLIC_API_PORT=5000
```

---

## 🚀 Daily Field Usage

### Step 1: Start Laptop Server
```powershell
cd E:\FasalVaidya\backend
.\.venv311\Scripts\Activate.ps1
python app.py
```

### Step 2: Enable Hotspot
- Turn on laptop WiFi hotspot OR
- Turn on phone hotspot and connect laptop

### Step 3: Connect Phone
- Connect phone to the same WiFi network
- Phone automatically finds laptop at configured IP

### Step 4: Use App
- Open FasalVaidya app on phone
- Take leaf photos
- Get instant diagnosis (1-2 seconds)

**All processing happens on laptop. Phone just shows results.**

---

## 📐 Network Architecture

```
Phone App (React Native)
    ↓ WiFi (Local Network Only)
Laptop Flask Server (192.168.x.x:5000)
    ↓
TensorFlow Model (Local File)
    ↓ Results
Back to Phone
```

**No internet connection used at any point.**

---

## 🔧 Troubleshooting

### Phone can't connect to backend

**Check 1: Same WiFi?**
```
Phone WiFi Settings → Must show same network as laptop
```

**Check 2: Flask running?**
```powershell
# On laptop
curl http://localhost:5000/api/health
# Should show: {"status":"ok"}
```

**Check 3: Firewall?**
```powershell
# Allow Flask through Windows Firewall
netsh advfirewall firewall add rule name="Flask" dir=in action=allow protocol=TCP localport=5000
```

**Check 4: Correct IP in app?**
```bash
# frontend/.env
EXPO_PUBLIC_API_HOST=192.168.137.1  # Must match laptop IP
```

---

## 💡 Production Tips

### For Multiple Farmers
1. **One laptop** can serve **multiple phones** simultaneously
2. All phones connect to same laptop hotspot
3. Flask handles concurrent requests

### Battery Life
- **Laptop**: Bring charger or power bank (lasts 2-4 hours without charge)
- **Phone**: Minimal battery use (just camera + WiFi)

### Performance
- Each diagnosis: **1-2 seconds**
- No waiting for internet
- Works in remote areas with no coverage

---

## ✅ System Requirements

**Laptop (Field Server):**
- Windows 10/11
- 8GB RAM (minimum)
- Python 3.11+ installed
- Flask + TensorFlow installed
- WiFi capability

**Phone:**
- Android/iOS
- WiFi capability
- Camera
- FasalVaidya app installed

---

## 📦 What's on Laptop

```
E:\FasalVaidya\
├── backend\
│   ├── app.py                    # Flask server
│   ├── fasalvaidya.db           # Scan history
│   ├── ml\
│   │   ├── inference.py         # TensorFlow inference
│   │   └── models\
│   │       └── *.keras          # Trained models
│   └── uploads\                 # Scanned images
```

**Total size: ~200MB**  
**Can run on USB drive if needed!**

---

## 🎉 Benefits of This Setup

✅ **Truly Offline** - Works anywhere  
✅ **Fast** - 1-2 second results  
✅ **Scalable** - Multiple phones per laptop  
✅ **Portable** - Laptop + phones  
✅ **Private** - Data stays local  
✅ **Reliable** - No network issues  

---

## 📞 Quick Reference

**Start Server:**
```powershell
cd E:\FasalVaidya\backend
.\.venv311\Scripts\Activate.ps1
python app.py
```

**Find IP:**
```powershell
ipconfig | findstr IPv4
```

**Test Connection:**
```powershell
curl http://192.168.137.1:5000/api/health
```

---

**Your app is fully offline-capable right now!** 🎉
