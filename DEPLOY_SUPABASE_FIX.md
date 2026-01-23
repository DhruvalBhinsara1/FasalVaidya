# 🚀 Deploy Updated Supabase Functions

## Issue Fixed
The RPC functions were failing with "User not found" because they expected users to be pre-registered in the `users` table. Now they auto-create users on first sync.

## Deployment Steps

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase project**: https://supabase.com/dashboard/project/jtefnnlcikvyswmuowxd

2. **Open SQL Editor**:
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Deploy the updated RPC functions**:
   - Copy all content from `supabase_schema/02_rpc_functions.sql`
   - Paste into the SQL editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify deployment**:
   ```sql
   -- Run this to verify functions exist:
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name LIKE 'sync_%';
   ```

### Option 2: Using Supabase CLI (Advanced)

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Link to your project
supabase link --project-ref jtefnnlcikvyswmuowxd

# Run migration
supabase db push
```

## Test After Deployment

Run the test script to verify everything works:

```bash
cd frontend
node test-supabase-sync.js
```

You should now see:
- ✅ All RPC functions callable
- ✅ No "User not found" errors
- ✅ Test data pushed successfully

## Next Steps

After deployment, restart your Expo app and take a new scan. Check the logs for:

```
📤 Pushing X records...
✅ Sync completed: {"pushed": X, "pulled": 0, ...}
```

Then verify data in Supabase:
1. Go to Table Editor
2. Check `leaf_scans`, `diagnoses`, `recommendations` tables
3. You should see your scan data!
