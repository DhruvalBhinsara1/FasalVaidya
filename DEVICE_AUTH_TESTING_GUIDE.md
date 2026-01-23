# Device-Bound Authentication Testing Guide

## Quick Start

### Option 1: Interactive Menu
```powershell
cd f:\FasalVaidya
.\test-device-auth.ps1 -Menu
```

### Option 2: Automated Quick Start
```powershell
cd f:\FasalVaidya
.\test-device-auth.ps1 -QuickStart
```

### Option 3: Manual Commands
```powershell
cd f:\FasalVaidya
. .\test-device-auth.ps1

# Run individual commands
Test-Prerequisites
Install-Dependencies
Test-SupabaseMigration
Start-DevServer
```

---

## Step-by-Step Testing

### 1. Apply Database Migration

**Open Supabase Dashboard:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID
```

**Go to SQL Editor** and run:
```sql
-- Copy entire content from:
supabase_schema/04_device_auth_migration.sql
```

**Verify migration:**
```sql
-- Check users table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('device_id', 'phone', 'name', 'profile_photo');

-- Should return 4 rows
```

---

### 2. Start Mobile App

```powershell
cd frontend
npx expo start
```

**Scan QR code** with Expo Go app on your device.

---

### 3. Run In-App Tests

Once the app loads:

1. **Go to Settings** (from Home screen)
2. **Look for "Device Auth Tests"** menu item (may need to add to navigation)
3. **Tap "Run All Tests"**

You should see:
- ✅ Device ID Generation
- ✅ Device ID Persistence
- ✅ Supabase Connection
- ✅ User Creation
- ✅ User Retrieval
- ✅ Phone Anti-Hijack
- ✅ Profile Update

---

### 4. Verify in Supabase

**Check users table:**
```sql
SELECT 
  id,
  device_id,
  name,
  phone,
  created_at,
  last_active
FROM public.users
ORDER BY created_at DESC
LIMIT 10;
```

You should see your device's user record.

---

### 5. Test Profile Sync

In the app:

1. **Go to Settings**
2. **Tap "Edit Profile"**
3. **Enter name** (e.g., "Test Farmer")
4. **Enter phone** (e.g., "+91 9876543210")
5. **Tap "Save"**

**Verify in Supabase:**
```sql
SELECT * FROM public.users WHERE phone = '+91 9876543210';
```

---

### 6. Test Anti-Hijack Protection

**Try to use same phone with different device:**

Since you can't easily test with a second device, you can test with RPC function:

```sql
-- This should fail (hijack attempt)
SELECT check_phone_hijack(
  'different-device-uuid'::uuid,
  '+91 9876543210'
);
-- Should return: true

-- This should succeed (same device)
SELECT check_phone_hijack(
  'your-actual-device-uuid'::uuid,
  '+91 9876543210'
);
-- Should return: false
```

---

### 7. Test Data Sync

**Create a scan in the app:**

1. **Go to Home**
2. **Select a crop** (e.g., Tomato)
3. **Take/Upload a photo**
4. **Wait for diagnosis**

**Verify in Supabase:**
```sql
-- Check leaf_scans
SELECT 
  id,
  user_id,
  crop_id,
  status,
  created_at
FROM public.leaf_scans
ORDER BY created_at DESC
LIMIT 5;

-- Check diagnoses
SELECT 
  id,
  scan_id,
  user_id,
  overall_status,
  created_at
FROM public.diagnoses
ORDER BY created_at DESC
LIMIT 5;
```

---

## Troubleshooting

### Error: "Network request failed"

**Symptom:**
```
ERROR     Error details: {
  "message": "TypeError: Network request failed"
}
```

**Causes:**
1. Migration not applied
2. RLS policies blocking access
3. No internet connection
4. Wrong Supabase URL/key

**Fix:**
```sql
-- 1. Verify migration applied
SELECT * FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'device_id';

-- 2. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('users', 'leaf_scans', 'diagnoses');

-- 3. Test direct access (should work)
SELECT * FROM public.users LIMIT 1;
```

---

### Error: "Phone already registered to another user"

**This is expected behavior!** The anti-hijack protection is working.

To test:
```sql
-- Clear phone to test again
UPDATE public.users 
SET phone = NULL 
WHERE device_id = 'your-device-uuid'::uuid;
```

---

### Error: "User not found in Supabase"

**Symptom:** User creation test fails

**Fix:**
```sql
-- Check if RPC functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'upsert_device_user',
    'get_user_by_device_id',
    'check_phone_hijack'
  );
-- Should return 3 rows

-- If missing, re-run migration
```

---

## Console Logs to Look For

### Success Logs:
```
🔐 [DeviceAuth] Initializing device-bound identity...
🆔 [DeviceAuth] Device ID: abc12345-1234-1234-1234-xyz123456789
👤 [DeviceAuth] Created new user profile
✅ [DeviceAuth] Authentication complete
☁️ [DeviceAuth] Syncing profile to server...
✅ [DeviceAuth] Profile synced to server
```

### Error Logs:
```
❌ [DeviceAuth] Initialization error: ...
❌ [DeviceUser] Upsert failed: ...
⚠️ [DeviceUser] Supabase not configured
```

---

## Testing Checklist

- [ ] Database migration applied
- [ ] App starts without errors
- [ ] Device ID generated and persists
- [ ] User created in Supabase
- [ ] Profile updates sync to server
- [ ] Phone number saves correctly
- [ ] Anti-hijack protection works
- [ ] Scans sync to Supabase
- [ ] Can view scan history
- [ ] Settings screen shows Device ID

---

## Advanced Testing

### Test Device ID Persistence

1. **Note your Device ID** (Settings → Device ID)
2. **Close the app completely**
3. **Reopen the app**
4. **Check Device ID again** - should be the same

### Test Cache Clear (New Identity)

1. **Settings → Clear Cache**
2. **Restart app**
3. **Check Device ID** - should be different
4. **Check Supabase** - should have new user record

### Test Offline → Online Sync

1. **Turn off Wi-Fi**
2. **Create a scan** (will save locally)
3. **Turn on Wi-Fi**
4. **Wait for auto-sync** (or trigger manual sync)
5. **Check Supabase** - scan should appear

---

## SQL Queries for Verification

### Check All Device Users
```sql
SELECT 
  id,
  device_id,
  name,
  phone,
  created_at,
  last_active,
  auth_user_id -- Should be NULL in device-bound mode
FROM public.users
WHERE device_id IS NOT NULL
ORDER BY created_at DESC;
```

### Check User's Scans
```sql
SELECT 
  ls.id,
  ls.scan_uuid,
  ls.image_filename,
  ls.status,
  ls.created_at,
  c.name as crop_name
FROM public.leaf_scans ls
LEFT JOIN public.crops c ON ls.crop_id = c.id
WHERE ls.user_id = 'your-user-uuid'
ORDER BY ls.created_at DESC;
```

### Check Sync Health
```sql
-- Count records by user
SELECT 
  u.device_id,
  u.name,
  COUNT(DISTINCT ls.id) as scans,
  COUNT(DISTINCT d.id) as diagnoses,
  MAX(ls.created_at) as last_scan
FROM public.users u
LEFT JOIN public.leaf_scans ls ON ls.user_id = u.id
LEFT JOIN public.diagnoses d ON d.user_id = u.id
WHERE u.device_id IS NOT NULL
GROUP BY u.id, u.device_id, u.name
ORDER BY last_scan DESC;
```

---

## Performance Testing

### Measure Sync Time

Add console logs to track:
```typescript
const start = Date.now();
await syncToServer();
console.log(`Sync took ${Date.now() - start}ms`);
```

**Expected times:**
- First sync (user creation): 500-1500ms
- Profile update: 200-800ms
- Scan sync: 300-1000ms per scan

---

## Integration Testing

### Full User Flow Test

1. **Install fresh** (clear app data)
2. **Launch app** → Device ID created
3. **Select language**
4. **View home screen**
5. **Go to Settings** → Enter name + phone
6. **Select crop** → Take photo
7. **View diagnosis**
8. **Check Supabase** → All data present
9. **Close app completely**
10. **Reopen app** → Same device ID, data persists

---

## Automated Testing Script

Create a test file:

```typescript
// frontend/tests/deviceAuth.test.ts
import { runAllTests } from '../src/utils/testDeviceAuth';

describe('Device-Bound Authentication', () => {
  it('should pass all tests', async () => {
    await runAllTests();
    // Check results array
  });
});
```

Run with:
```bash
npm test
```

---

## Need Help?

Check the logs in:
- **Metro bundler** console (where you ran `npx expo start`)
- **Device console** (shake device → Show Dev Menu → Debug Remote JS)
- **Supabase Dashboard** → Logs
