/**
 * Supabase Sync Client for FasalVaidya
 * =====================================
 * Handles bidirectional sync between local SQLite and remote Supabase
 * 
 * Strategy:
 * - Push: Send dirty (modified) local records to server via batch RPC
 * - Pull: Fetch server changes since last sync timestamp
 * - Conflict Resolution: Server-wins (last-write-wins by updated_at)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { localSyncDB } from './localSync';

// =================================================================
// CONFIGURATION
// =================================================================

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase credentials not found in environment variables');
  console.warn('💡 Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env');
}

// Storage keys for sync metadata
const SYNC_METADATA_KEY = '@fasalvaidya:sync_metadata';
const LAST_SYNC_KEY = '@fasalvaidya:last_sync';
const SYNC_ENABLED_KEY = '@fasalvaidya:sync_enabled';

// =================================================================
// TYPES
// =================================================================

export interface SyncConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // milliseconds
  batchSize: number;
  maxRetries: number;
}

export interface SyncMetadata {
  lastSyncAt: string | null;
  lastPullAt: string | null;
  lastPushAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'failed';
  errorMessage: string | null;
  pendingPushCount: number;
}

export interface SyncResult {
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  failedCount: number;
  errors: any[];
  duration: number; // milliseconds
}

export interface SyncRecord {
  id: string;
  table_name: string;
  sync_status: 'CLEAN' | 'DIRTY_CREATE' | 'DIRTY_UPDATE' | 'DIRTY_DELETE';
  updated_at: string;
  deleted_at: string | null;
  data: any;
}

// =================================================================
// SUPABASE CLIENT
// =================================================================

class SupabaseSyncClient {
  private client: SupabaseClient | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;

  constructor() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });
    }
  }

  /**
   * Check if sync is available (Supabase configured and user authenticated)
   */
  async isSyncAvailable(): Promise<boolean> {
    if (!this.client) return false;

    try {
      // Check for existing session
      const { data: { session } } = await this.client.auth.getSession();
      
      if (session) {
        return true;
      }
      
      // No session - try anonymous sign-in
      console.log('🔐 No Supabase session, attempting anonymous sign-in...');
      const { data: { session: anonSession }, error } = await this.client.auth.signInAnonymously();
      
      if (error) {
        console.error('❌ Anonymous sign-in failed:', error.message);
        return false;
      }
      
      if (anonSession) {
        console.log('✅ Anonymous sign-in successful, user ID:', anonSession.user.id);
        console.log('✅ Sync is now available');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking sync availability:', error);
      return false;
    }
  }

  /**
   * Ensure user exists in database
   */
  private async ensureUserExists(authUserId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('users')
        .upsert({
          auth_user_id: authUserId,
          device_fingerprint: 'anonymous',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'auth_user_id'
        });
      
      if (error) {
        console.error('❌ Failed to create user record:', error.message);
      } else {
        console.log('✅ User record ensured in Supabase');
      }
    } catch (error) {
      console.error('❌ Error ensuring user exists:', error);
    }
  }

  /**
   * Enable or disable sync
   */
  async setSyncEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(SYNC_ENABLED_KEY, enabled ? '1' : '0');
    
    if (enabled) {
      await this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  /**
   * Check if sync is enabled
   */
  async isSyncEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(SYNC_ENABLED_KEY);
      return value === '1';
    } catch {
      return false;
    }
  }

  /**
   * Get sync metadata
   */
  async getSyncMetadata(): Promise<SyncMetadata> {
    try {
      const json = await AsyncStorage.getItem(SYNC_METADATA_KEY);
      if (json) {
        return JSON.parse(json);
      }
    } catch (error) {
      console.error('Error reading sync metadata:', error);
    }

    return {
      lastSyncAt: null,
      lastPullAt: null,
      lastPushAt: null,
      syncStatus: 'idle',
      errorMessage: null,
      pendingPushCount: 0,
    };
  }

  /**
   * Update sync metadata
   */
  private async updateSyncMetadata(updates: Partial<SyncMetadata>): Promise<void> {
    const current = await this.getSyncMetadata();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(updated));
  }

  /**
   * Start automatic background sync
   */
  async startAutoSync(intervalMinutes: number = 5): Promise<void> {
    // Clear any existing interval first
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Initial sync
    await this.performSync();

    // Schedule recurring sync
    this.syncInterval = setInterval(async () => {
      if (!this.isSyncing) {
        await this.performSync();
      }
    }, intervalMs);

    console.log(`✅ Auto-sync started (every ${intervalMinutes} minutes)`);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Auto-sync stopped');
    }
    // Silently do nothing if already stopped
  }

  /**
   * Perform full bidirectional sync
   */
  async performSync(): Promise<SyncResult> {
    if (!await this.isSyncAvailable()) {
      return {
        success: false,
        pushedCount: 0,
        pulledCount: 0,
        failedCount: 0,
        errors: [{ error: 'Sync not available - check authentication' }],
        duration: 0,
      };
    }

    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return {
        success: false,
        pushedCount: 0,
        pulledCount: 0,
        failedCount: 0,
        errors: [{ error: 'Sync already in progress' }],
        duration: 0,
      };
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      await this.updateSyncMetadata({ syncStatus: 'syncing', errorMessage: null });

      // Step 1: Push local changes to server
      const pushResult = await this.pushChanges();

      // Step 2: Pull server changes to local
      const pullResult = await this.pullChanges();

      const duration = Date.now() - startTime;
      const result: SyncResult = {
        success: pushResult.success && pullResult.success,
        pushedCount: pushResult.syncedCount,
        pulledCount: pullResult.syncedCount,
        failedCount: pushResult.failedCount + pullResult.failedCount,
        errors: [...pushResult.errors, ...pullResult.errors],
        duration,
      };

      await this.updateSyncMetadata({
        lastSyncAt: new Date().toISOString(),
        syncStatus: result.success ? 'idle' : 'failed',
        errorMessage: result.success ? null : 'Sync completed with errors',
        pendingPushCount: pushResult.failedCount,
      });

      console.log(`✅ Sync completed in ${duration}ms:`, result);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ Sync failed:', error);

      await this.updateSyncMetadata({
        syncStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        pushedCount: 0,
        pulledCount: 0,
        failedCount: 0,
        errors: [{ error: String(error) }],
        duration,
      };

    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Push local changes to server (BATCH UPSERT)
   */
  private async pushChanges(): Promise<{
    success: boolean;
    syncedCount: number;
    failedCount: number;
    errors: any[];
  }> {
    if (!this.client) {
      return { success: false, syncedCount: 0, failedCount: 0, errors: [] };
    }

    console.log('📤 [DETAILED] Pushing local changes to server...');
    console.log('📤 [VERSION] Using enhanced sync code with detailed logging');

    const tables = ['leaf_scans', 'diagnoses', 'recommendations'];
    let totalSynced = 0;
    let totalFailed = 0;
    const allErrors: any[] = [];

    for (const tableName of tables) {
      try {
        // Get dirty records from local DB
        // This would call your local SQLite database
        const dirtyRecords = await this.getLocalDirtyRecords(tableName);

        if (dirtyRecords.length === 0) {
          continue;
        }

        console.log(`📤 Pushing ${dirtyRecords.length} ${tableName} records...`);
        
        // Transform records for Supabase (integers to UUIDs)
        const transformedRecords = await Promise.all(
          dirtyRecords.map(record => this.transformRecordForSupabase(tableName, record))
        );
        console.log(`   🔍 Transformed records:`, JSON.stringify(transformedRecords, null, 2));

        // Call Supabase RPC function for batch upsert
        const rpcFunction = `sync_${tableName}_batch`;
        
        // Map table names to correct RPC parameter names
        const paramNameMap: { [key: string]: string } = {
          'leaf_scans': 'scans_data',
          'diagnoses': 'diagnoses_data',
          'recommendations': 'recommendations_data',
        };
        const paramKey = paramNameMap[tableName];
        
        console.log(`   📞 Calling RPC: ${rpcFunction} with param: ${paramKey}`);
        
        const { data, error } = await this.client.rpc(rpcFunction, {
          [paramKey]: transformedRecords,
        });

        console.log(`   📥 RPC Response - data:`, data, `error:`, error);

        if (error) {
          console.error(`❌ Error pushing ${tableName}:`, error);
          console.error(`   Error details:`, JSON.stringify(error, null, 2));
          allErrors.push({ table: tableName, error: error.message, details: error });
          totalFailed += dirtyRecords.length;
          continue;
        }

        if (data && data.length > 0) {
          const result = data[0];
          console.log(`   ✅ Sync result for ${tableName}:`, result);
          totalSynced += result.synced_count || 0;
          totalFailed += result.failed_count || 0;

          if (result.errors && result.errors.length > 0) {
            console.error(`   ⚠️ Sync errors:`, result.errors);
            allErrors.push(...result.errors);
          }

          // Mark successfully synced records as CLEAN
          if (result.synced_count > 0) {
            await this.markRecordsAsClean(tableName, dirtyRecords.map(r => r.id));
            console.log(`   🧹 Marked ${result.synced_count} records as CLEAN`);
          }
        } else {
          console.warn(`   ⚠️ No data returned from RPC call for ${tableName}`);
          console.warn(`   This might indicate the RPC function doesn't exist or returned null`);
          totalFailed += dirtyRecords.length;
          allErrors.push({ 
            table: tableName, 
            error: 'No data returned from RPC call',
            hint: 'Check if the RPC function exists in Supabase'
          });
        }

      } catch (error) {
        console.error(`Exception pushing ${tableName}:`, error);
        allErrors.push({ table: tableName, error: String(error) });
      }
    }

    await this.updateSyncMetadata({
      lastPushAt: new Date().toISOString(),
    });

    return {
      success: totalFailed === 0,
      syncedCount: totalSynced,
      failedCount: totalFailed,
      errors: allErrors,
    };
  }

  /**
   * Pull server changes to local (DELTA SYNC)
   */
  private async pullChanges(): Promise<{
    success: boolean;
    syncedCount: number;
    failedCount: number;
    errors: any[];
  }> {
    if (!this.client) {
      return { success: false, syncedCount: 0, failedCount: 0, errors: [] };
    }

    console.log('📥 Pulling changes from server...');

    const metadata = await this.getSyncMetadata();
    const sinceTimestamp = metadata.lastPullAt || '1970-01-01T00:00:00Z';

    const tables = ['leaf_scans', 'diagnoses', 'recommendations'];
    let totalSynced = 0;
    let totalFailed = 0;
    const allErrors: any[] = [];

    for (const tableName of tables) {
      try {
        // Call Supabase RPC to get changes since last pull
        console.log(`   📥 Pulling ${tableName} changes...`);
        
        const { data, error } = await this.client.rpc('get_changes_since', {
          table_name: tableName,
          since_timestamp: sinceTimestamp,
        });

        if (error) {
          console.error(`❌ Error pulling ${tableName}:`, error);
          console.error(`   Error details:`, JSON.stringify(error, null, 2));
          allErrors.push({ table: tableName, error: error.message });
          continue;
        }

        if (data && Array.isArray(data)) {
          console.log(`   📥 Received ${data.length} ${tableName} updates from server`);

          // Apply changes to local database
          const applied = await this.applyRemoteChanges(tableName, data);
          totalSynced += applied.syncedCount;
          totalFailed += applied.failedCount;
          allErrors.push(...applied.errors);
        } else {
          console.log(`   ℹ️ No remote changes for ${tableName}`);
        }

      } catch (error) {
        console.error(`❌ Exception pulling ${tableName}:`, error);
        console.error(`   Exception details:`, error instanceof Error ? error.stack : String(error));
        allErrors.push({ table: tableName, error: String(error) });
      }
    }

    await this.updateSyncMetadata({
      lastPullAt: new Date().toISOString(),
    });

    return {
      success: totalFailed === 0,
      syncedCount: totalSynced,
      failedCount: totalFailed,
      errors: allErrors,
    };
  }

  // =================================================================
  // RECORD TRANSFORMATION
  // =================================================================
  
  /**
   * Transform local SQLite record (with integer IDs) to Supabase format (with UUIDs)
   */
  private async transformRecordForSupabase(tableName: string, record: any): Promise<any> {
    const transformed = { ...record };
    
    // Generate deterministic UUIDs from scan_uuid
    if (tableName === 'leaf_scans') {
      // Use scan_uuid as base for UUID generation
      transformed.id = this.generateUUIDFromString(record.scan_uuid || `scan-${record.id}`);
    } else if (tableName === 'diagnoses' || tableName === 'recommendations') {
      // Need to get scan_uuid from leaf_scans table
      const scanRecords = await this.getLocalScanForId(record.scan_id);
      const scanUuid = scanRecords?.[0]?.scan_uuid || `scan-${record.scan_id}`;
      
      // Generate UUIDs based on scan_uuid
      if (tableName === 'diagnoses') {
        transformed.id = this.generateUUIDFromString(`diagnosis-${scanUuid}`);
        transformed.scan_id = this.generateUUIDFromString(scanUuid);
      } else {
        transformed.id = this.generateUUIDFromString(`recommendation-${scanUuid}`);
        transformed.scan_id = this.generateUUIDFromString(scanUuid);
      }
    }
    
    // Remove local-only fields and let server set user_id
    delete transformed.sync_status;
    delete transformed.last_synced_at;
    delete transformed.user_id; // Server will set this from auth.uid()
    
    return transformed;
  }
  
  /**
   * Generate deterministic UUID v5 from string
   */
  private generateUUIDFromString(str: string): string {
    // Simple deterministic UUID generation (UUID v5 namespace)
    // Using a fixed namespace for consistency
    const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace
    
    // For now, use a simple hash-based approach
    // In production, use proper UUID v5 library
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex.substring(0, 8)}-${hex.substring(0, 4)}-4${hex.substring(1, 4)}-8${hex.substring(0, 3)}-${hex}${hex.substring(0, 4)}`;
  }

  // =================================================================
  // LOCAL DATABASE INTERFACE (TO BE IMPLEMENTED)
  // =================================================================
  // These methods need to be implemented to interface with your
  // local SQLite database. The implementation will depend on your
  // chosen SQLite library (expo-sqlite, react-native-sqlite-storage, etc.)

  private async getLocalDirtyRecords(tableName: string): Promise<any[]> {
    // Query local SQLite database for dirty records
    try {
      const records = await localSyncDB.getDirtyRecords(tableName);
      console.log(`📤 Found ${records.length} dirty ${tableName} records`);
      return records;
    } catch (error) {
      console.error(`❌ Error fetching dirty records from ${tableName}:`, error);
      return [];
    }
  }
  
  /**
   * Get scan record by integer ID to retrieve scan_uuid
   */
  private async getLocalScanForId(scanId: number): Promise<any[]> {
    try {
      const db = await (localSyncDB as any).getDB();
      const result = await db.getAllAsync('SELECT scan_uuid FROM leaf_scans WHERE id = ?', [scanId]);
      return result;
    } catch (error) {
      console.error(`❌ Error fetching scan for id ${scanId}:`, error);
      return [];
    }
  }

  private async markRecordsAsClean(tableName: string, recordIds: string[]): Promise<void> {
    // Update local SQLite database to mark records as synced
    try {
      await localSyncDB.markRecordsAsClean(tableName, recordIds);
      console.log(`✅ Marked ${recordIds.length} ${tableName} records as CLEAN`);
    } catch (error) {
      console.error(`❌ Error marking ${tableName} records as clean:`, error);
    }
  }

  private async applyRemoteChanges(
    tableName: string,
    remoteRecords: any[]
  ): Promise<{
    syncedCount: number;
    failedCount: number;
    errors: any[];
  }> {
    // Apply remote changes to local SQLite database with conflict detection
    try {
      const result = await localSyncDB.applyRemoteChanges(tableName, remoteRecords);
      console.log(`✅ Applied ${result.syncedCount} ${tableName} updates (${result.conflictCount} conflicts)`);
      return {
        syncedCount: result.syncedCount,
        failedCount: result.errors.length,
        errors: result.errors,
      };
    } catch (error) {
      console.error(`❌ Error applying remote changes to ${tableName}:`, error);
      return { syncedCount: 0, failedCount: remoteRecords.length, errors: [error] };
    }
  }
}

// =================================================================
// SINGLETON INSTANCE
// =================================================================

export const supabaseSyncClient = new SupabaseSyncClient();

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Initialize sync (call on app startup after authentication)
 */
export async function initializeSync(autoStart: boolean = true): Promise<void> {
  const isAvailable = await supabaseSyncClient.isSyncAvailable();
  const isEnabled = await supabaseSyncClient.isSyncEnabled();

  if (isAvailable && isEnabled && autoStart) {
    await supabaseSyncClient.startAutoSync();
  }
}

/**
 * Trigger manual sync
 */
export async function syncNow(): Promise<SyncResult> {
  return await supabaseSyncClient.performSync();
}

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<SyncMetadata> {
  return await supabaseSyncClient.getSyncMetadata();
}

/**
 * Enable/disable sync
 */
export async function toggleSync(enabled: boolean): Promise<void> {
  await supabaseSyncClient.setSyncEnabled(enabled);
}
