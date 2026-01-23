# Device Auth Testing - Quick Reference

## 🚀 Quick Start (3 Steps)

### 1. Apply Migration
```sql
-- In Supabase SQL Editor
-- Copy/paste: supabase_schema/04_device_auth_migration.sql
```

### 2. Start App
```powershell
cd f:\FasalVaidya\frontend
npx expo start
```

### 3. Run Tests
- Open app on device
- Go to Settings
- Look for test results in console

---

## 🧪 Test Functions Available

```typescript
import { tests } from './src/utils/testDeviceAuth';

// Run all tests
await tests.runAll();

// Run individual tests
await tests.deviceIdGeneration();
await tests.deviceIdPersistence();
await tests.supabaseConnection();
await tests.userCreation();
await tests.userRetrieval();
await tests.phoneAntiHijack();
await tests.profileUpdate();
```

---

## 💻 PowerShell Commands

```powershell
# Load test functions
. .\test-device-auth.ps1

# Interactive menu
.\test-device-auth.ps1 -Menu

# Auto-run all setup
.\test-device-auth.ps1 -QuickStart

# Individual commands
Test-Prerequisites        # Check tools
Install-Dependencies      # Install packages
Test-SupabaseMigration   # Show migration steps
Start-DevServer          # Launch Expo
```

---

## 🔍 Verification SQL Queries

### Check User Created
```sql
SELECT id, device_id, name, phone, created_at 
FROM public.users 
WHERE device_id IS NOT NULL 
ORDER BY created_at DESC LIMIT 5;
```

### Check RLS Policies
```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('users', 'leaf_scans', 'diagnoses');
```

### Check RPC Functions
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%device%';
```

---

## ✅ Success Indicators

**Console logs:**
```
✅ [DeviceAuth] Authentication complete
✅ [DeviceAuth] Profile synced to server
✅ Device user ready: <uuid>
✅ Sync is now available
```

**In Supabase:**
- User record with `device_id` populated
- `auth_user_id` is NULL (device mode)
- Phone number (if set) is unique

**In App:**
- Settings shows Device ID (8 chars...4 chars)
- Profile saves without errors
- Scans appear in history

---

## ❌ Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| Network request failed | Migration not applied | Run migration SQL |
| User not found | RPC functions missing | Re-run migration |
| Phone already registered | Anti-hijack working | Expected behavior! |
| Sync not available | No device user | Check `ensureUserExists()` |

---

## 📊 Expected Test Results

```
Total Tests: 7
✅ Passed: 7
❌ Failed: 0
Success Rate: 100%
```

**If any fail:**
1. Check migration applied
2. Check Supabase credentials
3. Check internet connection
4. View detailed error in console

---

## 🔧 Debug Commands

### Check Device ID
```typescript
import { getDeviceId } from './src/utils/deviceId';
const id = await getDeviceId();
console.log('Device ID:', id);
```

### Force Sync
```typescript
import { useAuth } from './src/contexts/AuthContext';
const { syncToServer } = useAuth();
await syncToServer();
```

### View User Profile
```typescript
import { getRemoteUser } from './src/services/deviceUserService';
const user = await getRemoteUser();
console.log('User:', user);
```

---

## 📱 Testing on Device

### View Logs
1. Shake device
2. Tap "Show Dev Menu"
3. Tap "Debug Remote JS"
4. Open Chrome DevTools (http://localhost:8081/debugger-ui)

### Clear Device Storage
```
Settings → Clear Cache → Confirm
```

### Force Refresh
```
Shake → Reload
```

---

## 🎯 Test Scenarios

### ✅ Happy Path
1. Fresh install → Device ID created
2. Enter name/phone → Syncs to Supabase
3. Create scan → Appears in history
4. Close/reopen → Same identity

### ✅ Offline Mode
1. Disable Wi-Fi
2. Create scan
3. Enable Wi-Fi
4. Scan syncs automatically

### ✅ Phone Hijack Prevention
1. User A sets phone: +91 9876543210
2. User B tries same phone → Rejected
3. User A can update own phone → Success

---

## 📚 Documentation

- Full guide: `DEVICE_AUTH_TESTING_GUIDE.md`
- Architecture: `DEVICE_AUTH_README.md`
- Migration SQL: `supabase_schema/04_device_auth_migration.sql`
- Test suite: `frontend/src/utils/testDeviceAuth.ts`

---

## 🆘 Get Help

**Check logs in:**
- Metro bundler console
- Device debugger (Chrome DevTools)
- Supabase Dashboard → Logs

**Verify setup:**
```powershell
Test-Prerequisites  # All should be ✅
```

**Reset everything:**
```powershell
# Clear app
Settings → Clear Cache

# Fresh install
cd frontend
rm -rf node_modules
npm install
npx expo start --clear
```
