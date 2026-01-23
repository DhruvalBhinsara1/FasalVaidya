# Sync Schema Fix - UUID Support

## Problem
The local SQLite schema was using `INTEGER` for `id` and `scan_id` columns, but Supabase sends UUIDs (text strings). This caused "datatype mismatch" errors during sync.

## Changes Made

### 1. Updated Table Schemas in `localSync.ts`

#### leaf_scans
- ✅ `id`: `INTEGER PRIMARY KEY AUTOINCREMENT` → `TEXT PRIMARY KEY`
- ✅ Added `updated_at`, `deleted_at`, `sync_status`, `last_synced_at` to CREATE TABLE

#### diagnoses  
- ✅ `id`: `INTEGER PRIMARY KEY AUTOINCREMENT` → `TEXT PRIMARY KEY`
- ✅ `scan_id`: `INTEGER UNIQUE` → `TEXT UNIQUE`
- ✅ Added magnesium fields: `mg_score`, `mg_confidence`, `mg_severity`
- ✅ Added `updated_at`, `deleted_at`, `sync_status`, `last_synced_at` to CREATE TABLE

#### recommendations
- ✅ `id`: `INTEGER PRIMARY KEY AUTOINCREMENT` → `TEXT PRIMARY KEY`
- ✅ `scan_id`: `INTEGER` → `TEXT`
- ✅ Added magnesium fields: `mg_recommendation`, `mg_recommendation_hi`
- ✅ Added `updated_at`, `deleted_at`, `sync_status`, `last_synced_at` to CREATE TABLE

### 2. Added ALTER TABLE statements for backward compatibility
- Added `mg_score`, `mg_confidence`, `mg_severity` to diagnoses
- Added `mg_recommendation`, `mg_recommendation_hi` to recommendations

## How to Apply

### Option 1: Clear App Data (Recommended)
The easiest way is to clear the app's local database:

**iOS Simulator:**
```bash
# Reset the app
xcrun simctl uninstall booted com.yourcompany.fasalvaidya
```

**Android Emulator:**
```bash
adb uninstall com.yourcompany.fasalvaidya
```

**Physical Device:**
- Uninstall and reinstall the app
- Or go to Settings → Apps → FasalVaidya → Storage → Clear Data

### Option 2: Database Migration (Advanced)
If you need to preserve existing data, you'll need to write a migration script that:
1. Creates new tables with correct schema
2. Converts existing INTEGER ids to TEXT (generate UUIDs)
3. Updates all foreign key references
4. Drops old tables

This is complex and not recommended unless you have critical local data.

## Testing

After applying the fix:

1. **Push test:**
   - Create a new scan
   - The push should succeed with UUID ids

2. **Pull test:**
   - Data from Supabase should now insert without datatype mismatch errors
   - Check that all UUID fields are properly stored as TEXT

3. **Verify logs:**
   ```
   ✅ Applied X records, 0 conflicts, 0 errors
   ```

## Verification

Run the sync and confirm:
- ✅ No "datatype mismatch" errors
- ✅ Records successfully pulled from server  
- ✅ `leaf_scans`, `diagnoses`, `recommendations` syncing correctly
- ✅ UUID values stored properly in local database

## Related Files
- [frontend/src/sync/localSync.ts](frontend/src/sync/localSync.ts) - Schema definitions
- [frontend/src/sync/supabaseSync.ts](frontend/src/sync/supabaseSync.ts) - Sync logic
