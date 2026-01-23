# Multi-Tenant Migration - Quick Reference

## 🎯 What Was Done

Transformed FasalVaidya from global (single-tenant) to user-specific (multi-tenant) scan isolation.

## 📁 Files Changed

### Frontend (4 files)
- ✅ `src/utils/deviceId.ts` - **NEW**: UUID generation & storage
- ✅ `src/api/client.ts` - Added X-User-ID header interceptor
- ✅ `App.tsx` - Initialize device ID on app launch
- ✅ `package.json` - Added uuid & react-native-get-random-values

### Backend (1 file)
- ✅ `app.py` - Complete multi-tenant support:
  - Added `users` table
  - Added `user_id` to all scan-related tables
  - Added `get_user_id()` & `ensure_user_exists()` helpers
  - Updated all endpoints to filter by user_id
  - Added foreign key constraints & indexes

### Migration Scripts (3 files)
- ✅ `migrations/002_add_multi_tenant_support.sql` - Forward migration
- ✅ `migrations/002_rollback_multi_tenant.sql` - Rollback script
- ✅ `migrations/run_migration.py` - Safe migration runner

### Documentation (2 files)
- ✅ `MULTI_TENANT_MIGRATION_GUIDE.md` - Complete guide
- ✅ `MIGRATION_QUICK_REFERENCE.md` - This file

## ⚡ Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Run Migration
```bash
cd backend
cp fasalvaidya.db fasalvaidya.db.backup
python migrations/run_migration.py 002_add_multi_tenant_support.sql
```

### 3. Restart Backend
```bash
.venv311\Scripts\Activate.ps1
python app.py
```

### 4. Restart Frontend
```bash
cd frontend
npx expo start --lan
```

## ✅ Verification

### Check Device ID (Frontend)
Look for in logs:
```
🆔 Generated new device ID: a3f5c9e7-1234-5678-...
```

### Check Database (Backend)
```bash
sqlite3 fasalvaidya.db "SELECT user_id, COUNT(*) FROM leaf_scans GROUP BY user_id;"
```

### Test Isolation
1. Open app on Device A → Take scan
2. Open app on Device B → Should see empty history
3. Take scan on Device B → Only Device B's scan visible

## 🔄 Rollback

### Option 1: Restore Backup
```bash
cd backend
cp fasalvaidya.db.backup fasalvaidya.db
```

### Option 2: Run Rollback Script
```bash
python migrations/run_migration.py 002_rollback_multi_tenant.sql
```

## 🔑 Key Concepts

### Device UUID
- Generated automatically on first app launch
- Stored in AsyncStorage (persists across restarts)
- No login required

### Legacy User
- UUID: `00000000-0000-0000-0000-000000000000`
- All pre-migration scans assigned to this user
- Acts as fallback if X-User-ID header missing

### X-User-ID Header
- Attached to **every** API request
- Backend extracts via `get_user_id()`
- All queries filtered by this ID

## 🚨 Common Issues

### "Invalid or missing X-User-ID header"
- **Fix**: Clear app data, reinstall dependencies
```bash
cd frontend
rm -rf node_modules
npm install
npx expo start --clear
```

### "Scan not found or access denied"
- **Fix**: This is expected! Users can't access other users' scans

### Database locked
- **Fix**: Stop backend before running migration

## 📊 Database Schema Changes

```sql
-- Added table
CREATE TABLE users (id TEXT PRIMARY KEY, ...);

-- Modified tables (added user_id column)
ALTER TABLE leaf_scans ADD COLUMN user_id TEXT;
ALTER TABLE diagnoses ADD COLUMN user_id TEXT;
ALTER TABLE recommendations ADD COLUMN user_id TEXT;

-- Added indexes
CREATE INDEX idx_leaf_scans_user_id ON leaf_scans(user_id);
CREATE INDEX idx_diagnoses_user_id ON diagnoses(user_id);
CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
```

## 🎯 Next Steps (Optional)

1. Add user profile (name/phone)
2. Implement cloud sync (same user, multiple devices)
3. Add data export feature
4. Replace device UUID with OAuth/JWT

## 📞 Need Help?

Check: `MULTI_TENANT_MIGRATION_GUIDE.md` for complete documentation
