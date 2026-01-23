# 🔍 Sync Debugging Guide

## Issue: Scans not appearing in Supabase

### Step 1: Verify SQL Migration Applied

1. Go to Supabase Dashboard → SQL Editor
2. Run this query to check if functions exist:

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%sync%'
ORDER BY routine_name;
```

**Expected output:**
- `sync_leaf_scans_batch` (function)
- `sync_diagnoses_batch` (function)
- `sync_recommendations_batch` (function)
- `get_changes_since` (function)
- `upsert_device_user` (function)

**If missing → Run [fix_sync_functions_device_id.sql](supabase_schema/fix_sync_functions_device_id.sql)**

### Step 2: Check User Record

```sql
SELECT 
  id,
  device_id,
  device_fingerprint,
  name,
  phone,
  created_at,
  last_active
FROM public.users
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- ONE user with `device_id` populated (your device UUID)
- `device_fingerprint` should be NULL
- If you see users with `device_fingerprint: 'sync-client'` → **Run cleanup**

**Cleanup duplicate users:**
```sql
DELETE FROM public.users 
WHERE device_fingerprint = 'sync-client' 
  AND device_id IS NULL;
```

###Step 3: Check if Scans Are in Local Database

In app console, run:
```typescript
import { localSyncDB } from './src/sync/localSync';

const db = await localSyncDB.getDB();
const scans = await db.getAllAsync('SELECT * FROM leaf_scans LIMIT 5');
console.log('📊 Local scans:', scans);

const dirty = await db.getAllAsync(
  'SELECT * FROM leaf_scans WHERE sync_status != "CLEAN" LIMIT 5'
);
console.log('🔴 Dirty scans (need sync):', dirty);
```

**Expected:**
- Scans should exist with `sync_status = 'DIRTY_CREATE'`
- `user_id` should match Supabase `users.id` (not device_id!)

### Step 4: Manual Sync Test

After taking a scan, check console logs. You should see:

```
📦 Scan saved locally for sync
🔄 Triggering sync after scan...
🔐 Checking sync with device ID: 57f6eb71-...
✅ Device user ready: 9159e63b-... <- This is the Supabase users.id
✅ Sync is now available
📤 [DETAILED] Pushing local changes to server...
📤 Found X dirty leaf_scans records
   📞 Calling RPC: sync_leaf_scans_batch with param: scans_data
   💾 Saving scan locally:
      - Scan ID: 123
      - Flask user_id (device_id): 57f6eb71-...
      - Supabase user.id: 9159e63b-... <- IMPORTANT: These should match in local DB
   📥 RPC Response - data: ...
✅ Scan synced to Supabase
```

**If you see errors:**

1. **"Network request failed"** → Already fixed, ignore
2. **"User not found. Call upsert_device_user first"** → SQL migration not applied
3. **"0 dirty records"** → Scan not saved locally (check Step 3)
4. **RPC error** → Check Supabase logs

### Step 5: Verify in Supabase

```sql
-- Check scans table
SELECT 
  ls.id,
  ls.scan_uuid,
  ls.user_id,
  ls.crop_id,
  ls.created_at,
  u.device_id,
  u.name
FROM public.leaf_scans ls
JOIN public.users u ON ls.user_id = u.id
ORDER BY ls.created_at DESC
LIMIT 10;
```

**Expected:**
- `ls.user_id` = `u.id` (Supabase user ID, not device_id)
- `u.device_id` = your device UUID

### Step 6: Test Sync Manually

In Settings screen, tap "Sync Now" button and watch console logs.

Or run in code:
```typescript
import { performSync } from './src/sync';

const result = await performSync();
console.log('Sync result:', result);
```

### Common Issues & Fixes:

| Issue | Cause | Fix |
|-------|-------|-----|
| Scans not syncing | SQL migration not applied | Run [fix_sync_functions_device_id.sql](supabase_schema/fix_sync_functions_device_id.sql) |
| Duplicate users | Old sync code creating users | Delete users with `device_fingerprint: 'sync-client'` |
| Wrong `user_id` in local DB | Using device_id instead of Supabase users.id | Backend now returns `user_id`, frontend uses it |
| Sync not triggered | Auto-sync disabled | Check Settings → Enable Auto Sync |

### Debug Checklist:

- [ ] SQL migration applied (Step 1)
- [ ] Only ONE user per device (Step 2)
- [ ] Scans saved locally with `DIRTY_CREATE` status (Step 3)
- [ ] Console shows sync triggered after upload (Step 4)
- [ ] Scans appear in Supabase (Step 5)
- [ ] Manual sync works (Step 6)

---

**Still not working?**

Share these logs:
1. Console logs from taking a scan
2. Output from Step 1 query (functions)
3. Output from Step 2 query (users)
4. Output from Step 3 (local scans)
5. Output from Step 5 query (Supabase scans)
