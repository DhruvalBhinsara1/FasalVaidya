# Adding Crop Name to Leaf Scans

## Problem
When viewing data in Supabase, the `leaf_scans` table only shows `crop_id` (e.g., 5, 6) which is confusing. You need to join with the `crops` table to see the actual crop name.

## Solution
Add a `crop_name` column to the `leaf_scans` table for better readability.

## Implementation

### 1. Update Supabase Schema

Run these SQL files in Supabase SQL Editor (in order):

#### Step 1: Add crop_name column
```sql
-- File: 06_add_crop_name_to_leaf_scans.sql
```
This will:
- Add `crop_name TEXT` column to `leaf_scans`
- Create a trigger to auto-populate crop_name from crop_id
- Update existing records with crop names

#### Step 2: Update sync functions
```sql
-- File: 07_update_sync_functions_crop_name.sql
```
This will:
- Update `sync_leaf_scans_batch()` to accept and store crop_name
- Ensure new synced records have crop names

### 2. Local Database Changes

Already implemented in `localSync.ts`:
- ✅ Added `crop_name TEXT` column to CREATE TABLE
- ✅ Added ALTER TABLE for existing databases
- ✅ Added crop ID to name mapping in `saveScanLocally()`
- ✅ Insert statement now includes crop_name

### 3. Crop ID Mapping

```typescript
const cropNames: Record<number, string> = {
  1: 'wheat',
  2: 'rice',
  3: 'tomato',
  4: 'maize',
  5: 'banana',
  6: 'coffee',
  7: 'ashgourd',
  8: 'eggplant',
  9: 'snakegourd',
  10: 'bittergourd'
};
```

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and run `06_add_crop_name_to_leaf_scans.sql`
4. Copy and run `07_update_sync_functions_crop_name.sql`
5. Verify with:
   ```sql
   SELECT id, crop_id, crop_name, status, created_at 
   FROM leaf_scans 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

### Option 2: Supabase CLI
```bash
supabase db push
```

## Benefits

✅ **Better Readability**: View crop names directly in Supabase
```
crop_id | crop_name | status
--------|-----------|----------
5       | maize     | completed
6       | coffee    | completed
2       | rice      | completed
```

✅ **No Joins Needed**: Query leaf_scans without joining crops table

✅ **Backwards Compatible**: 
- Trigger auto-populates crop_name for old records
- Mobile app includes crop_name in new syncs

✅ **Auto-Sync**: Trigger ensures crop_name is always in sync with crop_id

## Testing

After applying:

1. **Create a new scan** on mobile app
2. **Sync to Supabase**
3. **Check Supabase**:
   ```sql
   SELECT crop_id, crop_name, status FROM leaf_scans 
   ORDER BY created_at DESC LIMIT 1;
   ```
   Should show both `crop_id` and `crop_name`

4. **Verify trigger**:
   ```sql
   UPDATE leaf_scans 
   SET crop_id = 2 
   WHERE id = 'some-uuid';
   
   -- crop_name should automatically change to 'rice'
   ```

## Rollback

If needed:
```sql
ALTER TABLE public.leaf_scans DROP COLUMN IF EXISTS crop_name;
DROP TRIGGER IF EXISTS set_leaf_scan_crop_name ON public.leaf_scans;
DROP FUNCTION IF EXISTS public.set_crop_name();
```
