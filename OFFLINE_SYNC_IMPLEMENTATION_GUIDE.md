# 🔄 FasalVaidya Offline-Sync Implementation Guide

## 📋 Overview

This implementation provides a **robust offline-first sync engine** that connects your local SQLite database to a remote Supabase (PostgreSQL) backend. It enables:

- ✅ **Full offline functionality** - App works without internet
- 🔄 **Bidirectional sync** - Push local changes, pull remote updates
- 🔐 **User isolation** - Row Level Security (RLS) ensures data privacy
- ⚡ **Atomic batch operations** - Efficient sync via PostgreSQL RPC
- 🔀 **Conflict detection** - Automatic conflict resolution with manual fallback
- 🗑️ **Soft deletes** - Track deletions for proper sync
- 🆔 **UUID primary keys** - Prevent ID collisions across devices

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐      ┌─────────────────────────┐  │
│  │   Local SQLite      │      │   Supabase Client       │  │
│  │   (Offline DB)      │◄─────┤   (Sync Orchestrator)   │  │
│  │                     │      │                         │  │
│  │  • leaf_scans       │      │  • Push (batch RPC)     │  │
│  │  • diagnoses        │      │  • Pull (delta sync)    │  │
│  │  • recommendations  │      │  • Conflict resolution  │  │
│  │  • sync_metadata    │      └─────────────────────────┘  │
│  └─────────────────────┘                 │                  │
│                                           │                  │
└───────────────────────────────────────────┼──────────────────┘
                                            │
                                  HTTPS / Authentication
                                            │
┌───────────────────────────────────────────▼──────────────────┐
│                      Supabase Cloud                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐      ┌─────────────────────────┐  │
│  │  PostgreSQL + RLS   │      │   Supabase Auth         │  │
│  │                     │      │   (JWT Tokens)          │  │
│  │  • public.users     │◄─────┤                         │  │
│  │  • leaf_scans       │      │   Row Level Security:   │  │
│  │  • diagnoses        │      │   user_id = auth.uid()  │  │
│  │  • recommendations  │      └─────────────────────────┘  │
│  └─────────────────────┘                                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  RPC Functions (PL/pgSQL)                               ││
│  │  • sync_leaf_scans_batch()                              ││
│  │  • sync_diagnoses_batch()                               ││
│  │  • sync_recommendations_batch()                         ││
│  │  • get_changes_since()                                  ││
│  └─────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
FasalVaidya/
├── supabase_schema/
│   ├── 01_remote_schema.sql           # PostgreSQL schema with RLS
│   ├── 02_rpc_functions.sql           # Batch sync RPC functions
│   └── 03_local_sqlite_schema.sql     # Local SQLite migration
│
├── frontend/src/sync/
│   ├── index.ts                       # Main sync API (use this!)
│   ├── supabaseSync.ts                # Supabase client & remote sync
│   ├── localSync.ts                   # Local SQLite operations
│   └── README.md                      # This file
│
└── backend/sync/
    └── (Future: Optional backend sync helpers)
```

---

## 🚀 Setup Instructions

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Public Key**: `eyJhbG...` (from Settings → API)

### Step 2: Run Database Migrations

In Supabase SQL Editor, run these scripts **in order**:

```sql
-- 1. Create tables with RLS
-- Copy contents of: supabase_schema/01_remote_schema.sql

-- 2. Create RPC functions
-- Copy contents of: supabase_schema/02_rpc_functions.sql
```

**Verify migration:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Step 3: Configure Frontend Environment

Create/update `frontend/.env`:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your-key-here

# Existing backend config
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:5000
```

### Step 4: Install Dependencies

```bash
cd frontend
npm install @supabase/supabase-js expo-sqlite
```

Add to `package.json` if not present:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.4",
    "expo-sqlite": "~13.7.0"
  }
}
```

### Step 5: Migrate Local Database

Run this **once per device** to add sync columns:

```typescript
// In App.tsx or initialization code
import { initializeSync } from './src/sync';

// Inside your initialization function:
await initializeSync({
  autoSyncEnabled: true,
  syncIntervalMinutes: 5,
});
```

This will:
- Add `sync_status`, `updated_at`, `deleted_at` columns to existing tables
- Create `sync_metadata`, `sync_conflicts` tables
- Set up triggers for auto-tracking changes

---

## 💻 Usage Examples

### Basic Setup (App.tsx)

```typescript
import { useEffect } from 'react';
import { initializeSync, getSyncStatus } from './src/sync';

export default function App() {
  useEffect(() => {
    // Initialize sync after authentication
    const setupSync = async () => {
      // 1. Authenticate with Supabase first
      // await supabaseAuth.signIn(...);
      
      // 2. Initialize sync
      await initializeSync({
        autoSyncEnabled: true,
        syncIntervalMinutes: 5,
        retryFailedSyncs: true,
        maxRetries: 3,
      });
      
      // 3. Check status
      const status = await getSyncStatus();
      console.log('Sync Status:', status);
    };
    
    setupSync();
  }, []);
  
  return <YourApp />;
}
```

### Manual Sync Button

```typescript
import { performSync } from './src/sync';
import { Button } from 'react-native';

function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  
  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await performSync();
      
      if (result.success) {
        alert(`✅ Synced: ${result.pushedCount} pushed, ${result.pulledCount} pulled`);
      } else {
        alert(`⚠️ Sync completed with ${result.failedCount} errors`);
      }
    } catch (error) {
      alert(`❌ Sync failed: ${error}`);
    } finally {
      setSyncing(false);
    }
  };
  
  return (
    <Button
      title={syncing ? 'Syncing...' : 'Sync Now'}
      onPress={handleSync}
      disabled={syncing}
    />
  );
}
```

### Sync Status Display

```typescript
import { getSyncStatus, getSyncStatistics } from './src/sync';

function SyncStatusScreen() {
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    const loadStatus = async () => {
      const syncStatus = await getSyncStatus();
      const stats = await getSyncStatistics();
      setStatus({ ...syncStatus, stats });
    };
    
    loadStatus();
  }, []);
  
  if (!status) return <Loading />;
  
  return (
    <View>
      <Text>Sync Available: {status.isAvailable ? '✅' : '❌'}</Text>
      <Text>Sync Enabled: {status.isEnabled ? '✅' : '❌'}</Text>
      <Text>Last Sync: {status.lastSync.lastSyncAt || 'Never'}</Text>
      
      <Text>Pending Changes:</Text>
      {Object.entries(status.localStats.pendingPush).map(([table, count]) => (
        <Text key={table}>  • {table}: {count}</Text>
      ))}
      
      {status.localStats.unresolvedConflicts > 0 && (
        <Text style={{ color: 'red' }}>
          ⚠️ {status.localStats.unresolvedConflicts} conflicts need resolution
        </Text>
      )}
    </View>
  );
}
```

### Conflict Resolution

```typescript
import { getConflicts, resolveConflict } from './src/sync';

function ConflictResolutionScreen() {
  const [conflicts, setConflicts] = useState([]);
  
  useEffect(() => {
    const loadConflicts = async () => {
      const conflicts = await getConflicts();
      setConflicts(conflicts);
    };
    loadConflicts();
  }, []);
  
  const handleResolve = async (conflictId, resolution) => {
    await resolveConflict(conflictId, resolution);
    // Reload conflicts
    const updated = await getConflicts();
    setConflicts(updated);
  };
  
  return (
    <View>
      {conflicts.map((conflict) => (
        <View key={conflict.id}>
          <Text>Conflict in {conflict.table_name}</Text>
          <Text>Local: {conflict.local_data}</Text>
          <Text>Remote: {conflict.remote_data}</Text>
          
          <Button
            title="Keep Local"
            onPress={() => handleResolve(conflict.id, 'use_local')}
          />
          <Button
            title="Keep Remote"
            onPress={() => handleResolve(conflict.id, 'use_remote')}
          />
        </View>
      ))}
    </View>
  );
}
```

### Enable/Disable Sync

```typescript
import { toggleSync } from './src/sync';
import { Switch } from 'react-native';

function SyncSettings() {
  const [syncEnabled, setSyncEnabled] = useState(false);
  
  useEffect(() => {
    const loadSetting = async () => {
      const status = await getSyncStatus();
      setSyncEnabled(status.isEnabled);
    };
    loadSetting();
  }, []);
  
  const handleToggle = async (value) => {
    setSyncEnabled(value);
    await toggleSync(value);
  };
  
  return (
    <View>
      <Text>Auto-Sync</Text>
      <Switch value={syncEnabled} onValueChange={handleToggle} />
    </View>
  );
}
```

---

## 🔍 How It Works

### Push Process (Local → Server)

1. **Detect Dirty Records**: Query local SQLite for records with `sync_status IN ('DIRTY_CREATE', 'DIRTY_UPDATE', 'DIRTY_DELETE')`
2. **Batch by Table**: Group by table name (leaf_scans, diagnoses, recommendations)
3. **Call RPC**: Send JSON batch to `sync_{table}_batch()` function
4. **Handle Response**: Mark successful records as `CLEAN`, retry failed ones
5. **Update Metadata**: Store `last_push_at` timestamp

### Pull Process (Server → Local)

1. **Get Last Pull Time**: Read `last_pull_at` from sync metadata
2. **Query Changes**: Call `get_changes_since(table, timestamp)` RPC
3. **Detect Conflicts**: Check if local record is dirty AND newer than remote
4. **Apply Changes**: 
   - If conflict: Create conflict record for manual resolution
   - If clean: Upsert and mark as `CLEAN`
5. **Update Metadata**: Store `last_pull_at` timestamp

### Conflict Resolution

- **Server-Wins**: If local is `CLEAN`, remote change always wins
- **Last-Write-Wins**: If both dirty, compare `updated_at` timestamps
- **Manual**: If ambiguous, store in `sync_conflicts` table for user decision

### Soft Delete Strategy

- **Never hard delete** - Set `deleted_at` timestamp instead
- **Sync deletes** - Propagate to other devices
- **Filter in UI** - `WHERE deleted_at IS NULL`
- **Cleanup** - Periodically purge old soft-deleted records (optional)

---

## 🔐 Security

### Row Level Security (RLS)

Every table has policies ensuring:
```sql
-- Users can only see their own data
CREATE POLICY "Users can view own data"
    ON public.{table} FOR SELECT
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
```

### Authentication Flow

1. User signs in with Supabase Auth
2. JWT token stored in AsyncStorage
3. Supabase client auto-includes token in headers
4. PostgreSQL checks `auth.uid()` matches `user_id`

### Data Privacy

- ✅ Users **cannot** access other users' data
- ✅ RLS enforced at database level (not just app logic)
- ✅ Admin access via service role (for support/debugging)

---

## 🐛 Troubleshooting

### Sync Not Starting

```typescript
// Check sync availability
const status = await getSyncStatus();
console.log('Available:', status.isAvailable);
console.log('Enabled:', status.isEnabled);

// Common issues:
// 1. Not authenticated with Supabase
// 2. SUPABASE_URL or ANON_KEY missing in .env
// 3. Network connectivity issues
```

### Conflicts Not Resolving

```typescript
// List all conflicts
const conflicts = await getConflicts();
console.log('Unresolved conflicts:', conflicts.length);

// Check conflict details
conflicts.forEach(c => {
  console.log(`Table: ${c.table_name}, Record: ${c.record_id}`);
  console.log('Local:', JSON.parse(c.local_data));
  console.log('Remote:', JSON.parse(c.remote_data));
});
```

### Database Migration Errors

```bash
# If ALTER TABLE fails with "column already exists"
# This is normal! The migration script handles it gracefully.
# SQLite doesn't have IF NOT EXISTS for ALTER COLUMN.
```

### Performance Issues

```sql
-- Check indexes exist
SELECT name FROM sqlite_master 
WHERE type='index' AND tbl_name='leaf_scans';

-- Rebuild indexes if needed
REINDEX leaf_scans;
REINDEX diagnoses;
REINDEX recommendations;
```

---

## 📊 Monitoring & Debugging

### Check Sync Statistics

```typescript
import { getSyncStatistics } from './src/sync';

const stats = await getSyncStatistics();
stats.forEach(table => {
  console.log(`${table.table_name}:`);
  console.log(`  Total: ${table.total_records}`);
  console.log(`  Clean: ${table.clean_records}`);
  console.log(`  Pending creates: ${table.pending_creates}`);
  console.log(`  Pending updates: ${table.pending_updates}`);
  console.log(`  Pending deletes: ${table.pending_deletes}`);
  console.log(`  Soft deleted: ${table.soft_deleted}`);
});
```

### Enable Debug Logging

```typescript
// In supabaseSync.ts, add:
const DEBUG = true;

if (DEBUG) {
  console.log('[SYNC] Pushing changes...', dirtyRecords);
  console.log('[SYNC] Server response:', data);
}
```

### Server-Side Monitoring

```sql
-- Check sync metadata
SELECT * FROM public.sync_metadata WHERE user_id = 'YOUR_USER_ID';

-- Count records per user
SELECT user_id, COUNT(*) as count 
FROM public.leaf_scans 
GROUP BY user_id;

-- Find stale syncs (not synced in 24 hours)
SELECT user_id, table_name, last_sync_at
FROM public.sync_metadata
WHERE last_sync_at < NOW() - INTERVAL '24 hours';
```

---

## 🚧 Future Enhancements

### Planned Features

- [ ] **Image sync**: Upload leaf images to Supabase Storage
- [ ] **Delta compression**: Only sync changed fields
- [ ] **Batch size tuning**: Adaptive batch size based on network
- [ ] **Retry queue**: Persistent queue for failed syncs
- [ ] **Conflict UI**: Built-in conflict resolution screen
- [ ] **Sync indicators**: Real-time sync status in UI
- [ ] **Offline mode**: Detect network and disable sync gracefully
- [ ] **Background sync**: iOS/Android background tasks

### Optional Integrations

- **Push notifications**: Notify users of server changes
- **Webhooks**: Trigger external systems on sync events
- **Analytics**: Track sync performance and patterns
- **Backup**: Automated cloud backups

---

## 📞 Support

If you encounter issues:

1. Check this README
2. Review console logs for errors
3. Verify Supabase project settings
4. Check RLS policies in Supabase dashboard
5. Test with Supabase SQL Editor

---

## 📄 License

Same as FasalVaidya project.

---

**✅ Implementation Complete!**

You now have a production-ready offline-sync system. The app works fully offline, and syncs automatically when online. Start building amazing features! 🚀
