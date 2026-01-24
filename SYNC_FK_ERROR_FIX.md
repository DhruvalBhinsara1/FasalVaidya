# Sync Foreign Key Error Fix

## Problem
Sync was failing with foreign key constraint violations:
```
leaf_scans_crop_id_fkey: crop_id doesn't exist
diagnoses_scan_id_fkey: scan doesn't exist (cascade from above)
recommendations_scan_id_fkey: scan doesn't exist (cascade from above)
```

## Root Cause
**Crop ID Mismatch** between Backend and Supabase:

### Backend (app.py) Crop IDs:
- 1 = Wheat
- 2 = Rice
- 5 = Maize
- 6 = Banana
- 7 = Coffee
- 9 = Eggplant
- 10 = Ash Gourd
- 11 = Bitter Gourd
- 13 = Snake Gourd

### Old Supabase Crop IDs (WRONG):
- 1 = Rice ❌
- 2 = Wheat ❌
- 3 = Tomato ❌ (removed)
- 4 = Maize ❌ (wrong ID)
- 5 = Banana ❌ (wrong ID)
- 6 = Coffee ❌ (wrong ID)
- 7 = Ashgourd ❌ (wrong ID)
- 8 = Eggplant ❌ (wrong ID)
- 9 = Snakegourd ❌ (wrong ID)
- 10 = Bittergourd ❌ (wrong ID)

When the mobile app sent crop_id=11 or 13, Supabase rejected it because those IDs didn't exist.

## Solution

### Step 1: Run the Migration SQL
Execute `supabase_schema/FIX_CROP_IDS.sql` in your Supabase SQL Editor:

```bash
# Or use Supabase CLI
supabase db push
```

This will:
1. Update existing leaf_scans to use correct crop_ids
2. Delete and recreate crops table with correct IDs
3. Re-enable foreign key constraints

### Step 2: Verify the Fix
Run this query in Supabase SQL Editor:
```sql
SELECT id, name, name_hi, icon FROM public.crops ORDER BY id;
```

Expected output:
```
 id |     name     | name_hi  | icon
----+--------------+----------+------
  1 | Wheat        | गेहूँ    | 🌾
  2 | Rice         | चावल     | 🌾
  5 | Maize        | मक्का    | 🌽
  6 | Banana       | केला     | 🍌
  7 | Coffee       | कॉफी     | ☕
  9 | Eggplant     | बैंगन    | 🍆
 10 | Ash Gourd    | पेठा     | 🎃
 11 | Bitter Gourd | करेला    | 🥬
 13 | Snake Gourd  | चिचिंडा  | 🥬
```

### Step 3: Test Sync Again
1. Clear any failed scans from local database (or just wait for retry)
2. Trigger a new scan from the mobile app
3. Watch the sync logs - should see:
   ```
   ✅ Sync completed in XXXXms: {"pushedCount": X, "pulledCount": X, "success": true}
   ```

## Prevention
The `01_remote_schema.sql` has been updated to include the correct crop IDs with a comment:
```sql
-- Insert default crops (MUST MATCH backend/app.py CROPS dictionary IDs)
```

Future deployments will automatically have the correct IDs.

## Affected Tables
- `public.crops` - Fixed with correct IDs
- `public.leaf_scans` - Existing records updated with correct crop_ids
- `public.diagnoses` - No changes (references leaf_scans)
- `public.recommendations` - No changes (references leaf_scans)

## Status
✅ Schema file updated: `supabase_schema/01_remote_schema.sql`
✅ Migration file created: `supabase_schema/FIX_CROP_IDS.sql`
⏳ **ACTION REQUIRED**: Run the migration SQL in Supabase
