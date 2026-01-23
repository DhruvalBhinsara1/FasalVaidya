# 🚀 Quick Start: Offline Sync Setup

## ⏱️ 5-Minute Setup Checklist

### 1️⃣ Supabase Setup (2 min)

```bash
# Go to: https://supabase.com
# Click: "New Project"
# Save these values:
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-key
```

### 2️⃣ Database Migration (1 min)

In Supabase SQL Editor → New Query:

```sql
-- Copy/paste ENTIRE file: supabase_schema/01_remote_schema.sql
-- Click: RUN

-- Copy/paste ENTIRE file: supabase_schema/02_rpc_functions.sql
-- Click: RUN
```

**Verify:**
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- Should show: users, leaf_scans, diagnoses, recommendations
```

### 3️⃣ Frontend Setup (1 min)

```bash
cd frontend
npm install @supabase/supabase-js expo-sqlite
```

Create `frontend/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:5000
```

### 4️⃣ App Integration (1 min)

In `frontend/App.tsx`:

```typescript
import { initializeSync } from './src/sync';

// Inside your App component's useEffect:
useEffect(() => {
  const setup = async () => {
    await initializeDeviceId(); // Existing code
    
    // NEW: Initialize sync
    await initializeSync({
      autoSyncEnabled: true,
      syncIntervalMinutes: 5,
    });
    
    const lang = await loadLanguage(); // Existing code
    // ... rest of initialization
  };
  setup();
}, []);
```

### ✅ Done!

Your app now:
- ✅ Works fully offline
- 🔄 Syncs automatically every 5 minutes
- 🔐 Isolates user data (RLS)
- 🔀 Handles conflicts

---

## 🧪 Testing

### Test Offline Mode

```typescript
// 1. Create a scan while offline
// 2. Check pending sync:
import { getSyncStatus } from './src/sync';

const status = await getSyncStatus();
console.log('Pending push:', status.localStats.pendingPush);
// Should show: { leaf_scans: 1, diagnoses: 1, recommendations: 1 }

// 3. Go online and trigger sync:
import { performSync } from './src/sync';
const result = await performSync();
console.log('Synced:', result.pushedCount, 'records');
```

### Test Sync Status

```typescript
import { getSyncStatus } from './src/sync';

const status = await getSyncStatus();
console.log('Is Available:', status.isAvailable);  // true if authenticated
console.log('Is Enabled:', status.isEnabled);      // true if sync enabled
console.log('Last Sync:', status.lastSync.lastSyncAt);
console.log('Pending:', status.localStats.pendingPush);
```

### Test Manual Sync

```typescript
import { performSync } from './src/sync';

const result = await performSync();
console.log('Success:', result.success);
console.log('Pushed:', result.pushedCount);
console.log('Pulled:', result.pulledCount);
console.log('Failed:', result.failedCount);
console.log('Duration:', result.duration, 'ms');
```

---

## 🔧 Common Commands

### Enable/Disable Sync

```typescript
import { toggleSync } from './src/sync';

await toggleSync(true);   // Enable
await toggleSync(false);  // Disable
```

### Change Sync Interval

```typescript
import { startAutoSync, stopAutoSync } from './src/sync';

stopAutoSync();                 // Stop current schedule
await startAutoSync(10);        // Sync every 10 minutes
```

### View Conflicts

```typescript
import { getConflicts, resolveConflict } from './src/sync';

const conflicts = await getConflicts();
console.log('Conflicts:', conflicts.length);

// Resolve first conflict (keep local version)
if (conflicts.length > 0) {
  await resolveConflict(conflicts[0].id, 'use_local');
}
```

### Get Statistics

```typescript
import { getSyncStatistics } from './src/sync';

const stats = await getSyncStatistics();
stats.forEach(table => {
  console.log(`${table.table_name}:`);
  console.log(`  Total: ${table.total_records}`);
  console.log(`  Pending: ${table.pending_creates + table.pending_updates}`);
});
```

---

## 🐛 Troubleshooting

### "Sync not available"

**Check authentication:**
```typescript
import { supabaseSyncClient } from './src/sync';
const available = await supabaseSyncClient.isSyncAvailable();
console.log('Available:', available);  // Should be true
```

**If false:**
- Check `.env` has correct `SUPABASE_URL` and `ANON_KEY`
- Verify user is authenticated with Supabase
- Check network connectivity

### "Column already exists" errors

**This is normal!** The migration handles existing columns gracefully.

### RPC function not found

**Run migrations again:**
```sql
-- In Supabase SQL Editor
\df public.sync_*
-- Should list: sync_leaf_scans_batch, sync_diagnoses_batch, etc.
```

If missing, re-run `supabase_schema/02_rpc_functions.sql`

### Sync stuck "syncing"

```typescript
// Force reset sync status
import { supabaseSyncClient } from './src/sync';
const metadata = await supabaseSyncClient.getSyncMetadata();
console.log('Status:', metadata.syncStatus);

// If stuck, restart app or call:
await supabaseSyncClient.setSyncEnabled(false);
await supabaseSyncClient.setSyncEnabled(true);
```

---

## 📱 UI Components (Optional)

### Sync Status Badge

```typescript
function SyncBadge() {
  const [status, setStatus] = useState('idle');
  
  useEffect(() => {
    const checkStatus = async () => {
      const s = await getSyncStatus();
      setStatus(s.isSyncing ? 'syncing' : 'idle');
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <View>
      {status === 'syncing' ? (
        <ActivityIndicator size="small" />
      ) : (
        <Text>✓ Synced</Text>
      )}
    </View>
  );
}
```

### Sync Settings Screen

```typescript
function SyncSettings() {
  const [enabled, setEnabled] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [pending, setPending] = useState(0);
  
  useEffect(() => {
    const load = async () => {
      const status = await getSyncStatus();
      setEnabled(status.isEnabled);
      setLastSync(status.lastSync.lastSyncAt);
      const total = Object.values(status.localStats.pendingPush)
        .reduce((sum, count) => sum + count, 0);
      setPending(total);
    };
    load();
  }, []);
  
  return (
    <View>
      <Switch 
        value={enabled} 
        onValueChange={async (v) => {
          setEnabled(v);
          await toggleSync(v);
        }}
      />
      <Text>Last Sync: {lastSync || 'Never'}</Text>
      <Text>Pending Changes: {pending}</Text>
      <Button title="Sync Now" onPress={async () => {
        await performSync();
        // Reload status
      }} />
    </View>
  );
}
```

---

## 📊 Monitoring Dashboard (Optional)

```typescript
function SyncDashboard() {
  const [stats, setStats] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  
  useEffect(() => {
    const load = async () => {
      const s = await getSyncStatistics();
      const c = await getConflicts();
      setStats(s);
      setConflicts(c);
    };
    load();
  }, []);
  
  return (
    <ScrollView>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Sync Statistics</Text>
      
      {stats.map(table => (
        <View key={table.table_name} style={{ marginVertical: 10 }}>
          <Text style={{ fontWeight: 'bold' }}>{table.table_name}</Text>
          <Text>Total: {table.total_records}</Text>
          <Text>Clean: {table.clean_records}</Text>
          <Text>Pending Creates: {table.pending_creates}</Text>
          <Text>Pending Updates: {table.pending_updates}</Text>
          <Text>Pending Deletes: {table.pending_deletes}</Text>
        </View>
      ))}
      
      {conflicts.length > 0 && (
        <View style={{ marginTop: 20, backgroundColor: '#fee', padding: 10 }}>
          <Text style={{ color: 'red', fontWeight: 'bold' }}>
            ⚠️ {conflicts.length} Unresolved Conflicts
          </Text>
          <Button 
            title="Resolve Conflicts" 
            onPress={() => navigation.navigate('ConflictResolution')}
          />
        </View>
      )}
    </ScrollView>
  );
}
```

---

## 🎯 Next Steps

1. **Test thoroughly** - Try offline mode, multi-device sync
2. **Monitor** - Check Supabase dashboard for activity
3. **Customize** - Adjust sync interval, conflict resolution
4. **Add features** - Image sync, push notifications
5. **Deploy** - Build and release your app!

---

**🎉 Congratulations!** You now have a production-ready offline-sync system!

For detailed documentation, see: `OFFLINE_SYNC_IMPLEMENTATION_GUIDE.md`
