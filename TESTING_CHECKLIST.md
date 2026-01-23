# ✅ Offline-Sync Testing Checklist

## 📋 Pre-Deployment Testing

Use this checklist to verify the offline-sync implementation before production deployment.

---

## 🔧 Setup Verification

### Environment Configuration

- [ ] **Supabase credentials configured**
  - [ ] `EXPO_PUBLIC_SUPABASE_URL` set in `.env`
  - [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` set in `.env`
  - [ ] Values match Supabase project (Settings → API)

- [ ] **Dependencies installed**
  - [ ] `@supabase/supabase-js` installed (`npm list @supabase/supabase-js`)
  - [ ] `expo-sqlite` installed (`npm list expo-sqlite`)
  - [ ] No version conflicts

- [ ] **Database migrations run**
  - [ ] `01_remote_schema.sql` executed in Supabase
  - [ ] `02_rpc_functions.sql` executed in Supabase
  - [ ] Tables visible in Supabase dashboard
  - [ ] RLS policies enabled (check table settings)

---

## 🧪 Functional Testing

### Basic Operations

- [ ] **Sync initialization**
  ```typescript
  import { initializeSync } from './src/sync';
  await initializeSync();
  // Should complete without errors
  ```

- [ ] **Get sync status**
  ```typescript
  import { getSyncStatus } from './src/sync';
  const status = await getSyncStatus();
  console.log(status);
  // Should return: isAvailable, isEnabled, lastSync, etc.
  ```

- [ ] **Manual sync triggers**
  ```typescript
  import { performSync } from './src/sync';
  const result = await performSync();
  // Should return: success, pushedCount, pulledCount, duration
  ```

### Offline Mode

- [ ] **Create data offline**
  - [ ] Turn off WiFi and cellular data
  - [ ] Create a new scan
  - [ ] Verify scan saved to local SQLite
  - [ ] Check `sync_status = 'DIRTY_CREATE'`
  ```typescript
  import { localSyncDB } from './src/sync';
  const dirty = await localSyncDB.getDirtyRecords('leaf_scans');
  console.log('Dirty records:', dirty.length); // Should be > 0
  ```

- [ ] **Modify data offline**
  - [ ] Edit existing scan while offline
  - [ ] Verify `sync_status = 'DIRTY_UPDATE'`

- [ ] **Delete data offline (soft delete)**
  - [ ] Delete a scan while offline
  - [ ] Verify `deleted_at` is set
  - [ ] Verify `sync_status = 'DIRTY_DELETE'`

### Online Sync

- [ ] **Push local changes**
  - [ ] Turn WiFi back on
  - [ ] Trigger manual sync
  - [ ] Verify all dirty records synced
  - [ ] Check Supabase dashboard for new records
  - [ ] Verify `sync_status = 'CLEAN'` locally

- [ ] **Pull remote changes**
  - [ ] Create a record on Supabase (SQL Editor or another device)
  - [ ] Trigger sync on device
  - [ ] Verify new record appears in local database
  - [ ] Verify `sync_status = 'CLEAN'`

### Multi-Device Sync

- [ ] **Two devices scenario**
  - [ ] Device A: Create scan → Sync
  - [ ] Device B: Sync → Verify scan appears
  - [ ] Device B: Modify scan → Sync
  - [ ] Device A: Sync → Verify modification appears

- [ ] **Conflict detection**
  - [ ] Device A: Modify scan (offline)
  - [ ] Device B: Modify same scan (offline)
  - [ ] Device A: Sync (pushes change)
  - [ ] Device B: Sync (should detect conflict)
  - [ ] Verify conflict record created
  ```typescript
  import { getConflicts } from './src/sync';
  const conflicts = await getConflicts();
  console.log('Conflicts:', conflicts.length); // Should be > 0
  ```

- [ ] **Conflict resolution**
  - [ ] View conflict details
  - [ ] Resolve conflict (choose local or remote)
  ```typescript
  await resolveConflict(conflictId, 'use_local'); // or 'use_remote'
  ```
  - [ ] Verify conflict marked as resolved
  - [ ] Verify chosen version applied

---

## 🔐 Security Testing

### Row Level Security (RLS)

- [ ] **User A cannot see User B's data**
  - [ ] Create User A account in Supabase
  - [ ] Create User B account in Supabase
  - [ ] User A: Create scan → Sync
  - [ ] User B: Sync
  - [ ] Verify User B does NOT see User A's scan
  - [ ] Check via Supabase SQL:
  ```sql
  -- As User A
  SELECT COUNT(*) FROM leaf_scans; -- Should see own scans
  
  -- As User B
  SELECT COUNT(*) FROM leaf_scans; -- Should NOT see User A's scans
  ```

- [ ] **Unauthenticated requests blocked**
  - [ ] Sign out of Supabase
  - [ ] Try to sync
  - [ ] Verify sync fails with authentication error
  - [ ] Check: `isAvailable = false`

- [ ] **Invalid JWT rejected**
  - [ ] Manually edit JWT token in AsyncStorage
  - [ ] Try to sync
  - [ ] Verify 401 Unauthorized error

### Data Privacy

- [ ] **User data isolated**
  - [ ] Check `user_id` column in all tables
  - [ ] Verify all records have correct `user_id`
  - [ ] Verify RLS policies in Supabase dashboard

---

## ⚡ Performance Testing

### Batch Operations

- [ ] **Small batch (1-10 records)**
  - [ ] Create 5 scans offline
  - [ ] Trigger sync
  - [ ] Measure duration (should be <2s)
  - [ ] Check: `result.duration < 2000`

- [ ] **Medium batch (10-50 records)**
  - [ ] Create 25 scans offline
  - [ ] Trigger sync
  - [ ] Measure duration (should be <5s)
  - [ ] Verify no errors

- [ ] **Large batch (50-100 records)**
  - [ ] Create 75 scans offline
  - [ ] Trigger sync
  - [ ] Measure duration (should be <10s)
  - [ ] Verify all synced successfully

### Network Interruption

- [ ] **Sync during network loss**
  - [ ] Start sync
  - [ ] Turn off WiFi mid-sync
  - [ ] Verify graceful failure
  - [ ] Verify records can be retried
  - [ ] Turn WiFi back on → Retry sync
  - [ ] Verify recovery successful

- [ ] **Slow network**
  - [ ] Use network throttling (Chrome DevTools)
  - [ ] Throttle to "Slow 3G"
  - [ ] Trigger sync
  - [ ] Verify sync completes (may take longer)
  - [ ] No timeout errors (timeout set to 120s)

---

## 🧩 Edge Cases

### Conflict Scenarios

- [ ] **Same record modified twice offline**
  - [ ] Device A: Modify scan (offline)
  - [ ] Device A: Modify same scan again (offline)
  - [ ] Device A: Sync
  - [ ] Verify only latest version pushed

- [ ] **Delete on one device, modify on another**
  - [ ] Device A: Delete scan (offline)
  - [ ] Device B: Modify same scan (offline)
  - [ ] Both sync
  - [ ] Verify conflict detected
  - [ ] Verify resolution applies correctly

- [ ] **Create duplicate UUIDs (impossible but test)**
  - [ ] Manually create two scans with same UUID
  - [ ] Sync
  - [ ] Verify conflict or error handled

### Data Integrity

- [ ] **Soft delete propagation**
  - [ ] Delete scan on Device A
  - [ ] Sync Device A
  - [ ] Sync Device B
  - [ ] Verify scan NOT visible on Device B
  - [ ] Verify `deleted_at` set on Device B

- [ ] **Orphaned records**
  - [ ] Delete scan (soft delete)
  - [ ] Verify related diagnoses/recommendations still linked
  - [ ] Verify foreign key constraints working

- [ ] **Timestamp accuracy**
  - [ ] Create record with `updated_at`
  - [ ] Modify record
  - [ ] Verify `updated_at` changed
  - [ ] Verify timestamps consistent (local vs server)

---

## 🔍 Monitoring & Debugging

### Sync Metadata

- [ ] **Check local sync metadata**
  ```typescript
  import { getSyncStatistics } from './src/sync';
  const stats = await getSyncStatistics();
  console.log(stats);
  ```
  - [ ] Verify `last_sync_at` updates after sync
  - [ ] Verify `pending_push_count` accurate
  - [ ] Verify `sync_status` reflects current state

- [ ] **Check remote sync metadata**
  ```sql
  SELECT * FROM sync_metadata 
  WHERE user_id = 'current-user-uuid';
  ```
  - [ ] Verify records exist
  - [ ] Verify timestamps updating

### Error Logging

- [ ] **Console logs present**
  - [ ] Enable debug mode
  - [ ] Check console for sync logs
  - [ ] Verify no unexpected errors
  - [ ] Check log format readable

- [ ] **Error handling**
  - [ ] Force an error (invalid data)
  - [ ] Check error captured in `result.errors`
  - [ ] Verify error message descriptive

---

## 📱 UI/UX Testing

### Sync Status Display

- [ ] **Sync indicator visible**
  - [ ] Show sync status in UI
  - [ ] Verify updates during sync
  - [ ] Verify "last synced" timestamp updates

- [ ] **Pending changes count**
  - [ ] Display pending sync count
  - [ ] Create records offline
  - [ ] Verify count increases
  - [ ] Sync
  - [ ] Verify count resets to 0

### Sync Button

- [ ] **Manual sync button**
  - [ ] Button enabled when online
  - [ ] Button disabled when offline
  - [ ] Button shows loading state during sync
  - [ ] Button shows success/failure feedback

### Conflict Resolution UI

- [ ] **Conflict list**
  - [ ] Show list of conflicts
  - [ ] Display local vs remote data
  - [ ] Allow user to choose version

- [ ] **Conflict resolution**
  - [ ] Resolve conflict via UI
  - [ ] Verify conflict disappears
  - [ ] Verify chosen version applied

---

## 🚀 Production Readiness

### Configuration

- [ ] **Environment variables validated**
  - [ ] All required variables set
  - [ ] No hardcoded credentials in code
  - [ ] `.env` in `.gitignore`

- [ ] **Error handling comprehensive**
  - [ ] Network errors handled
  - [ ] Authentication errors handled
  - [ ] Data validation errors handled
  - [ ] Graceful degradation

### Documentation

- [ ] **User documentation**
  - [ ] How to enable sync
  - [ ] How to resolve conflicts
  - [ ] Troubleshooting guide

- [ ] **Developer documentation**
  - [ ] Setup instructions clear
  - [ ] API reference complete
  - [ ] Code examples provided

### Monitoring

- [ ] **Supabase dashboard**
  - [ ] Check database usage
  - [ ] Check API logs
  - [ ] Check RLS policies active
  - [ ] Check for errors

- [ ] **App analytics**
  - [ ] Track sync success rate
  - [ ] Track sync duration
  - [ ] Track conflict frequency
  - [ ] Track error types

---

## 📊 Test Results Summary

After completing all tests, fill in this summary:

### Overall Statistics

- **Tests Passed**: ___ / ___
- **Tests Failed**: ___
- **Tests Skipped**: ___
- **Critical Issues**: ___
- **Minor Issues**: ___

### Performance Metrics

- **Average sync duration**: ___ ms
- **Max sync duration**: ___ ms
- **Success rate**: ___ %
- **Conflict rate**: ___ %

### Issues Found

1. Issue: ___
   - Severity: ___
   - Status: ___

2. Issue: ___
   - Severity: ___
   - Status: ___

### Sign-Off

- [ ] **All critical tests passed**
- [ ] **Performance acceptable**
- [ ] **Security verified**
- [ ] **Documentation complete**
- [ ] **Ready for production**

**Tested by**: _______________  
**Date**: _______________  
**Version**: _______________  

---

## 🛠️ Troubleshooting Failed Tests

If tests fail, check:

1. **Environment**: Verify `.env` has correct values
2. **Migrations**: Re-run SQL migrations in Supabase
3. **Authentication**: Ensure user is authenticated
4. **Network**: Check internet connectivity
5. **Logs**: Check console and Supabase logs
6. **Dependencies**: Verify all packages installed
7. **Code**: Ensure latest code from sync branch

For detailed troubleshooting, see: [OFFLINE_SYNC_IMPLEMENTATION_GUIDE.md](OFFLINE_SYNC_IMPLEMENTATION_GUIDE.md) → Troubleshooting section

---

**Good luck with testing!** 🚀
