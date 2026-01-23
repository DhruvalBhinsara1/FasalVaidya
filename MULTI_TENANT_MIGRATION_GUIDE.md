# 🚀 Multi-Tenant Migration Guide

**Complete implementation of user-specific scan isolation for FasalVaidya**

---

## 📋 Overview

This migration transforms FasalVaidya from a **single-tenant** (global scan history) to a **multi-tenant** architecture where each device/user has isolated scan data.

### Problem Solved
- ❌ **Before**: All users saw everyone's scans globally
- ✅ **After**: Each user only sees their own scans

### Approach
- **Device UUID**: Automatic identity generation without login
- **SQLite Migration**: Safe schema changes using Create-Copy-Drop-Rename pattern
- **Backend Filtering**: All queries filtered by `user_id`
- **Backward Compatible**: Legacy scans assigned to default user

---

## 📦 What Was Changed

### Frontend Changes
1. **`src/utils/deviceId.ts`** (NEW)
   - Generates UUID v4 on first app launch
   - Stores in AsyncStorage (persists across restarts)
   - Provides `getDeviceId()` utility

2. **`src/api/client.ts`** (MODIFIED)
   - Added request interceptor
   - Attaches `X-User-ID` header to **every** API call
   - Logs device ID (first 8 chars) for debugging

3. **`App.tsx`** (MODIFIED)
   - Calls `initializeDeviceId()` before any API requests
   - Ensures identity exists before app renders

4. **`package.json`** (MODIFIED)
   - Added `uuid` (^10.0.0)
   - Added `react-native-get-random-values` (~1.11.0)

### Backend Changes
1. **`app.py`** - Database Schema (MODIFIED)
   - Added `users` table with UUID primary key
   - Added `user_id` column to `leaf_scans`, `diagnoses`, `recommendations`
   - Added foreign key constraints with `ON DELETE CASCADE`
   - Created indexes: `idx_leaf_scans_user_id`, `idx_diagnoses_user_id`, etc.

2. **`app.py`** - API Logic (MODIFIED)
   - `get_user_id()`: Extracts `X-User-ID` from headers
   - `ensure_user_exists()`: Creates user record if not exists
   - **POST /api/scans**: Tags new scans with `user_id`
   - **GET /api/scans**: Filters by `WHERE user_id = ?`
   - **GET /api/scans/<id>**: Verifies ownership before returning
   - **DELETE /api/scans**: Only deletes current user's scans
   - **DELETE /api/scans/<id>**: Verifies ownership before deletion
   - **PATCH /api/scans/<id>**: Verifies ownership before update

3. **`migrations/`** (NEW)
   - `002_add_multi_tenant_support.sql`: Forward migration
   - `002_rollback_multi_tenant.sql`: Rollback script
   - `run_migration.py`: Safe migration runner with backups

---

## 🔧 Installation & Setup

### Step 1: Update Dependencies

```bash
cd frontend
npm install
```

This will install the new dependencies:
- `uuid` - UUID generation
- `react-native-get-random-values` - Crypto polyfill for React Native

### Step 2: Run Database Migration

⚠️ **CRITICAL: Backup your database first!**

```bash
cd backend
cp fasalvaidya.db fasalvaidya.db.backup
```

Run the migration:

```bash
python migrations/run_migration.py 002_add_multi_tenant_support.sql
```

The script will:
1. Create automatic backup
2. Show you what will change
3. Ask for confirmation
4. Execute migration in a transaction
5. Verify schema changes
6. Report success/failure

**Expected output:**
```
======================================================================
🚀 Running Migration: 002_add_multi_tenant_support.sql
======================================================================

📦 Creating backup: backups/fasalvaidya_20260123_143052.db.backup
✅ Backup created successfully

📖 Reading migration script...

⚠️  WARNING: This will modify your database
   Database: fasalvaidya.db
   Backup: backups/fasalvaidya_20260123_143052.db.backup

✋ Type 'yes' to proceed: yes

⚙️  Executing migration...
✅ Migration executed successfully

🔍 Verifying database integrity...
   Tables: crops, diagnoses, leaf_scans, recommendations, users
   Users: 1
   leaf_scans columns: id, scan_uuid, user_id, crop_id, image_path, image_filename, status, created_at
   Has user_id: ✅
   Total scans: 42
   Unique users: 1
   Foreign keys: ✅ ON
   Indexes: idx_diagnoses_scan_id, idx_diagnoses_user_id, ...
✅ Verification complete

======================================================================
🎉 Migration Complete!
======================================================================

💾 Backup saved at: backups/fasalvaidya_20260123_143052.db.backup
📝 To rollback, restore the backup:
   cp backups/fasalvaidya_20260123_143052.db.backup fasalvaidya.db
```

### Step 3: Restart Backend

```bash
cd backend
.venv311\Scripts\Activate.ps1
python app.py
```

Check logs for:
```
✅ Database initialized successfully
```

### Step 4: Restart Frontend

```bash
cd frontend
npx expo start --lan
```

Check logs for:
```
🆔 Generated new device ID: a3f5c9e7-1234-5678-...
✅ Device identity initialized: a3f5c9e7-1234-5678-...
```

---

## ✅ Verification

### Test User Isolation

1. **Device A (Primary):**
   - Open app, take a scan
   - Note the device ID in logs
   - Verify scan appears in history

2. **Device B (Secondary):**
   - Open app on different device
   - Different device ID should be generated
   - History should be **empty** (not seeing Device A's scans)

3. **Take Scan on Device B:**
   - Should only see Device B's scan
   - Device A still only sees its own scans

### Check Database

```bash
sqlite3 fasalvaidya.db
```

```sql
-- Check users table
SELECT id, created_at FROM users;

-- Check scans per user
SELECT user_id, COUNT(*) as scan_count 
FROM leaf_scans 
GROUP BY user_id;

-- Verify legacy user
SELECT * FROM users WHERE id = '00000000-0000-0000-0000-000000000000';
```

### Check API Logs

Look for these entries:
```
🆔 Request with User ID: a3f5c9e7...
INFO fasalvaidya.api Created new user: a3f5c9e7...
```

---

## 🔄 Rollback (If Needed)

If the migration causes issues:

### Option 1: Restore from Backup
```bash
cd backend
cp backups/fasalvaidya_20260123_143052.db.backup fasalvaidya.db
```

### Option 2: Run Rollback Script
```bash
python migrations/run_migration.py 002_rollback_multi_tenant.sql
```

**⚠️ WARNING**: Rollback removes user isolation. All scans become global again.

---

## 🐛 Troubleshooting

### Issue: "Invalid or missing X-User-ID header"

**Cause**: Frontend not sending UUID header

**Fix**:
1. Check `App.tsx` calls `initializeDeviceId()`
2. Verify API client imports `getDeviceId`
3. Clear app data and restart

```bash
# Clear React Native cache
cd frontend
rm -rf node_modules
npm install
npx expo start --clear
```

### Issue: "Scan not found or access denied"

**Cause**: Trying to access another user's scan

**Fix**: This is expected behavior! Each user only sees their own scans.

### Issue: Database locked error

**Cause**: Migration running while app is active

**Fix**:
1. Stop backend server
2. Close any SQLite connections
3. Run migration again

### Issue: Frontend doesn't generate UUID

**Cause**: Missing dependencies

**Fix**:
```bash
cd frontend
npm install uuid react-native-get-random-values
```

---

## 📊 Performance Impact

### Database Indexes
Added indexes improve query performance:
- `idx_leaf_scans_user_id`: O(log n) user lookup
- `idx_leaf_scans_user_crop`: Fast crop filtering per user
- `idx_diagnoses_user_id`: Quick diagnosis queries

### Expected Performance:
- ✅ **Queries**: 10-20ms (with indexes)
- ✅ **Migration**: <1 second for 1000 scans
- ✅ **App Startup**: +50ms (UUID generation)

---

## 🔐 Security Considerations

### Current Implementation (Device UUID)
- ✅ **Pros**: Frictionless, no login required
- ⚠️ **Cons**: Clearing app data = lose scans
- ⚠️ **Cons**: No recovery mechanism

### Future: Add Authentication
This migration makes it easy to add proper auth later:

```typescript
// Future: Replace deviceId with actual user token
export const getUserToken = async (): Promise<string> => {
  const token = await getAuthToken(); // From auth provider
  if (token) return token;
  return getDeviceId(); // Fallback to device UUID
};
```

Backend already supports any UUID format in `X-User-ID` header.

---

## 📝 Database Schema (After Migration)

```sql
-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,                      -- UUID v4
    device_fingerprint TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- leaf_scans table (with user_id)
CREATE TABLE leaf_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_uuid TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    crop_id INTEGER DEFAULT 1,
    image_path TEXT NOT NULL,
    image_filename TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (crop_id) REFERENCES crops(id)
);

-- Indexes for performance
CREATE INDEX idx_leaf_scans_user_id ON leaf_scans(user_id);
CREATE INDEX idx_leaf_scans_created_at ON leaf_scans(created_at DESC);
CREATE INDEX idx_leaf_scans_user_crop ON leaf_scans(user_id, crop_id);
```

---

## 🎯 Next Steps

### Recommended Enhancements

1. **Add User Profile**: Store name/phone with device UUID
2. **Cloud Sync**: Backend API to sync scans across devices (same user)
3. **Data Export**: Allow users to export their scan history
4. **Analytics**: Track unique users, retention, scans per user
5. **Admin Panel**: View all users, usage stats

### Optional: Add Authentication

Replace device UUID with OAuth/JWT:

```typescript
// frontend/src/utils/auth.ts
export const getUserId = async (): Promise<string> => {
  const session = await getSession(); // Firebase/Supabase/Auth0
  if (session?.user?.id) return session.user.id;
  return getDeviceId(); // Fallback to device UUID
};
```

No backend changes needed - just send different UUID in `X-User-ID` header!

---

## 📞 Support

If you encounter issues:

1. **Check logs**: `backend/logs/backend.log`
2. **Verify schema**: Run verification SQL queries above
3. **Restore backup**: Use automatic backup created by migration script

---

**Migration Complete! 🎉**

Your app now has full multi-tenant support with user-specific scan isolation.
