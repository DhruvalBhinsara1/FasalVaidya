/**
 * Local SQLite Sync Manager for FasalVaidya
 * ==========================================
 * Handles local database operations for offline-first sync
 * 
 * Uses expo-sqlite (v16+) for SQLite database access
 * Implements sync tracking and conflict detection
 */

import * as SQLite from 'expo-sqlite';

// =================================================================
// TYPES
// =================================================================

export type SyncStatus = 'CLEAN' | 'DIRTY_CREATE' | 'DIRTY_UPDATE' | 'DIRTY_DELETE';

export interface SyncableRecord {
  id: string | number;
  sync_status: SyncStatus;
  updated_at: string;
  deleted_at: string | null;
  last_synced_at: string | null;
  [key: string]: any;
}

export interface ConflictRecord {
  id: number;
  table_name: string;
  record_id: string;
  local_data: string;
  remote_data: string;
  conflict_type: 'update_conflict' | 'delete_conflict';
  resolved: boolean;
  resolution: 'use_local' | 'use_remote' | 'manual' | null;
  created_at: string;
}

// =================================================================
// DATABASE CLASS
// =================================================================

class LocalSyncDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName: string;

  constructor(dbName: string = 'fasalvaidya.db') {
    this.dbName = dbName;
  }

  /**
   * Initialize database connection (async)
   */
  async getDB(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      this.db = await SQLite.openDatabaseAsync(this.dbName);
    }
    return this.db;
  }

  /**
   * Execute SQL query (async API)
   */
  private async executeSQL<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<T[]> {
    try {
      const db = await this.getDB();
      const result = await db.getAllAsync<T>(sql, params);
      return result;
    } catch (error) {
      console.error('SQL Error:', sql, error);
      throw error;
    }
  }

  /**
   * Execute SQL without result (INSERT, UPDATE, DELETE)
   */
  private async executeSQLNoResult(
    sql: string,
    params: any[] = []
  ): Promise<SQLite.SQLiteRunResult> {
    try {
      const db = await this.getDB();
      const result = await db.runAsync(sql, params);
      return result;
    } catch (error: any) {
      // Suppress "duplicate column" errors (expected during migration re-runs)
      if (error?.message?.includes('duplicate column name')) {
        // Silently ignore - column already exists
        return { changes: 0, lastInsertRowId: 0 };
      }
      console.error('SQL Error:', sql, error);
      throw error;
    }
  }

  // =================================================================
  // MIGRATION: Add sync columns to existing database
  // =================================================================

  async migrateDatabaseForSync(): Promise<void> {
    console.log('📦 Migrating database for sync support...');

    const migrations = [
      // Create tables if they don't exist (mobile-first approach)
      {
        sql: `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          device_fingerprint TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        ignoreError: false,
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS leaf_scans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          scan_uuid TEXT UNIQUE NOT NULL,
          user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
          crop_id INTEGER DEFAULT 1,
          image_path TEXT NOT NULL,
          image_filename TEXT,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        ignoreError: false,
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS diagnoses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          scan_id INTEGER UNIQUE NOT NULL,
          user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
          n_score REAL,
          p_score REAL,
          k_score REAL,
          n_confidence REAL,
          p_confidence REAL,
          k_confidence REAL,
          n_severity TEXT,
          p_severity TEXT,
          k_severity TEXT,
          overall_status TEXT,
          detected_class TEXT,
          heatmap_path TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        ignoreError: false,
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS recommendations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          scan_id INTEGER NOT NULL,
          user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
          n_recommendation TEXT,
          p_recommendation TEXT,
          k_recommendation TEXT,
          n_recommendation_hi TEXT,
          p_recommendation_hi TEXT,
          k_recommendation_hi TEXT,
          priority TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        ignoreError: false,
      },

      // Add sync columns to users table
      {
        sql: 'ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        ignoreError: true, // Column might already exist
      },
      {
        sql: 'ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL',
        ignoreError: true,
      },
      {
        sql: "ALTER TABLE users ADD COLUMN sync_status TEXT DEFAULT 'DIRTY_CREATE'",
        ignoreError: true,
      },
      {
        sql: 'ALTER TABLE users ADD COLUMN last_synced_at TIMESTAMP NULL',
        ignoreError: true,
      },

      // Add sync columns to leaf_scans table
      {
        sql: 'ALTER TABLE leaf_scans ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        ignoreError: true,
      },
      {
        sql: 'ALTER TABLE leaf_scans ADD COLUMN deleted_at TIMESTAMP NULL',
        ignoreError: true,
      },
      {
        sql: "ALTER TABLE leaf_scans ADD COLUMN sync_status TEXT DEFAULT 'DIRTY_CREATE'",
        ignoreError: true,
      },
      {
        sql: 'ALTER TABLE leaf_scans ADD COLUMN last_synced_at TIMESTAMP NULL',
        ignoreError: true,
      },

      // Add sync columns to diagnoses table
      {
        sql: 'ALTER TABLE diagnoses ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        ignoreError: true,
      },
      {
        sql: 'ALTER TABLE diagnoses ADD COLUMN deleted_at TIMESTAMP NULL',
        ignoreError: true,
      },
      {
        sql: "ALTER TABLE diagnoses ADD COLUMN sync_status TEXT DEFAULT 'DIRTY_CREATE'",
        ignoreError: true,
      },
      {
        sql: 'ALTER TABLE diagnoses ADD COLUMN last_synced_at TIMESTAMP NULL',
        ignoreError: true,
      },

      // Add sync columns to recommendations table
      {
        sql: 'ALTER TABLE recommendations ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        ignoreError: true,
      },
      {
        sql: 'ALTER TABLE recommendations ADD COLUMN deleted_at TIMESTAMP NULL',
        ignoreError: true,
      },
      {
        sql: "ALTER TABLE recommendations ADD COLUMN sync_status TEXT DEFAULT 'DIRTY_CREATE'",
        ignoreError: true,
      },
      {
        sql: 'ALTER TABLE recommendations ADD COLUMN last_synced_at TIMESTAMP NULL',
        ignoreError: true,
      },

      // Create sync_metadata table
      {
        sql: `CREATE TABLE IF NOT EXISTS sync_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT UNIQUE NOT NULL,
          last_sync_at TIMESTAMP NULL,
          last_pull_at TIMESTAMP NULL,
          last_push_at TIMESTAMP NULL,
          sync_status TEXT DEFAULT 'idle',
          error_message TEXT NULL,
          pending_push_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        ignoreError: false,
      },

      // Create sync_conflicts table
      {
        sql: `CREATE TABLE IF NOT EXISTS sync_conflicts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          local_data TEXT NOT NULL,
          remote_data TEXT NOT NULL,
          conflict_type TEXT NOT NULL,
          resolved BOOLEAN DEFAULT 0,
          resolution TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP NULL
        )`,
        ignoreError: false,
      },

      // Create sync_queue table
      {
        sql: `CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          payload TEXT NOT NULL,
          retry_count INTEGER DEFAULT 0,
          max_retries INTEGER DEFAULT 3,
          status TEXT DEFAULT 'pending',
          error_message TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          synced_at TIMESTAMP NULL
        )`,
        ignoreError: false,
      },
    ];

    for (const migration of migrations) {
      try {
        await this.executeSQLNoResult(migration.sql);
      } catch (error) {
        if (!migration.ignoreError) {
          console.error('Migration failed:', migration.sql, error);
          throw error;
        }
        // Silently ignore errors for ALTER TABLE (column might exist)
      }
    }

    // Initialize sync metadata
    await this.executeSQLNoResult(
      "INSERT OR IGNORE INTO sync_metadata (table_name) VALUES (?), (?), (?)",
      ['leaf_scans', 'diagnoses', 'recommendations']
    );

    console.log('✅ Database migration completed');
  }

  // =================================================================
  // SYNC OPERATIONS: Get Dirty Records
  // =================================================================

  async getDirtyRecords(tableName: string): Promise<SyncableRecord[]> {
    const sql = `
      SELECT * FROM ${tableName}
      WHERE sync_status IN ('DIRTY_CREATE', 'DIRTY_UPDATE', 'DIRTY_DELETE')
      ORDER BY updated_at ASC
    `;
    return await this.executeSQL<SyncableRecord>(sql);
  }

  async getDirtyRecordCount(tableName: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count FROM ${tableName}
      WHERE sync_status IN ('DIRTY_CREATE', 'DIRTY_UPDATE', 'DIRTY_DELETE')
    `;
    const result = await this.executeSQL<{ count: number }>(sql);
    return result[0]?.count || 0;
  }

  async getAllDirtyRecordCounts(): Promise<{ [tableName: string]: number }> {
    const tables = ['leaf_scans', 'diagnoses', 'recommendations'];
    const counts: { [tableName: string]: number } = {};

    for (const table of tables) {
      counts[table] = await this.getDirtyRecordCount(table);
    }

    return counts;
  }

  // =================================================================
  // SYNC OPERATIONS: Mark Records as Clean/Dirty
  // =================================================================

  async markRecordsAsClean(tableName: string, recordIds: string[]): Promise<void> {
    if (recordIds.length === 0) return;

    const placeholders = recordIds.map(() => '?').join(',');
    const sql = `
      UPDATE ${tableName}
      SET sync_status = 'CLEAN',
          last_synced_at = datetime('now')
      WHERE id IN (${placeholders})
    `;

    await this.executeSQLNoResult(sql, recordIds);
  }

  async markRecordAsDirty(
    tableName: string,
    recordId: string,
    status: 'DIRTY_UPDATE' | 'DIRTY_DELETE' = 'DIRTY_UPDATE'
  ): Promise<void> {
    const sql = `
      UPDATE ${tableName}
      SET sync_status = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `;

    await this.executeSQLNoResult(sql, [status, recordId]);
  }

  // =================================================================
  // SYNC OPERATIONS: Apply Remote Changes
  // =================================================================

  async applyRemoteChanges(
    tableName: string,
    remoteRecords: any[]
  ): Promise<{
    syncedCount: number;
    conflictCount: number;
    errors: any[];
  }> {
    let syncedCount = 0;
    let conflictCount = 0;
    const errors: any[] = [];

    console.log(`   🔄 Applying ${remoteRecords.length} remote changes to ${tableName}...`);

    for (const remoteRecord of remoteRecords) {
      try {
        console.log(`      Processing record:`, remoteRecord.id);
        
        // Check if local record exists and its sync status
        const localRecords = await this.executeSQL<SyncableRecord>(
          `SELECT * FROM ${tableName} WHERE id = ?`,
          [remoteRecord.id]
        );

        const localRecord = localRecords[0];

        // If local record is dirty, we have a conflict
        if (
          localRecord &&
          localRecord.sync_status !== 'CLEAN' &&
          localRecord.updated_at > remoteRecord.updated_at
        ) {
          // Local changes are newer - create conflict
          console.log(`      ⚠️ Conflict detected for ${remoteRecord.id}`);
          await this.createConflict(tableName, remoteRecord.id, localRecord, remoteRecord);
          conflictCount++;
          continue;
        }

        // Apply remote change (upsert)
        await this.upsertRemoteRecord(tableName, remoteRecord);
        syncedCount++;
        console.log(`      ✅ Applied record ${remoteRecord.id}`);

      } catch (error) {
        console.error(`      ❌ Error applying remote change for ${tableName}:`, error);
        console.error(`         Record:`, remoteRecord);
        console.error(`         Error stack:`, error instanceof Error ? error.stack : String(error));
        errors.push({
          record_id: remoteRecord.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(`   📊 Applied ${syncedCount} records, ${conflictCount} conflicts, ${errors.length} errors`);
    return { syncedCount, conflictCount, errors };
  }

  private async upsertRemoteRecord(tableName: string, record: any): Promise<void> {
    // Get column names from record
    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(',');
    const updateSetters = columns.map((col) => `${col} = excluded.${col}`).join(',');

    const sql = `
      INSERT INTO ${tableName} (${columns.join(',')})
      VALUES (${placeholders})
      ON CONFLICT(id) DO UPDATE SET ${updateSetters}
    `;

    const values = columns.map((col) => record[col]);

    await this.executeSQLNoResult(sql, values);

    // Mark as clean after upsert
    await this.markRecordsAsClean(tableName, [record.id]);
  }

  // =================================================================
  // CONFLICT MANAGEMENT
  // =================================================================

  private async createConflict(
    tableName: string,
    recordId: string,
    localData: any,
    remoteData: any
  ): Promise<void> {
    const sql = `
      INSERT INTO sync_conflicts 
        (table_name, record_id, local_data, remote_data, conflict_type)
      VALUES (?, ?, ?, ?, 'update_conflict')
    `;

    await this.executeSQLNoResult(sql, [
      tableName,
      recordId,
      JSON.stringify(localData),
      JSON.stringify(remoteData),
    ]);

    console.warn(`⚠️ Conflict detected for ${tableName}:${recordId}`);
  }

  async getUnresolvedConflicts(): Promise<ConflictRecord[]> {
    const sql = `
      SELECT * FROM sync_conflicts
      WHERE resolved = 0
      ORDER BY created_at DESC
    `;
    return await this.executeSQL<ConflictRecord>(sql);
  }

  async resolveConflict(
    conflictId: number,
    resolution: 'use_local' | 'use_remote'
  ): Promise<void> {
    // Get conflict details
    const conflicts = await this.executeSQL<ConflictRecord>(
      'SELECT * FROM sync_conflicts WHERE id = ?',
      [conflictId]
    );

    if (conflicts.length === 0) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    const conflict = conflicts[0];
    const chosenData = resolution === 'use_local' 
      ? JSON.parse(conflict.local_data)
      : JSON.parse(conflict.remote_data);

    // Apply chosen version
    await this.upsertRemoteRecord(conflict.table_name, chosenData);

    // Mark conflict as resolved
    await this.executeSQLNoResult(
      `UPDATE sync_conflicts 
       SET resolved = 1, resolution = ?, resolved_at = datetime('now')
       WHERE id = ?`,
      [resolution, conflictId]
    );

    console.log(`✅ Conflict ${conflictId} resolved: ${resolution}`);
  }

  // =================================================================
  // SOFT DELETE SUPPORT
  // =================================================================

  async softDelete(tableName: string, recordId: string): Promise<void> {
    const sql = `
      UPDATE ${tableName}
      SET deleted_at = datetime('now'),
          sync_status = 'DIRTY_DELETE',
          updated_at = datetime('now')
      WHERE id = ?
    `;

    await this.executeSQLNoResult(sql, [recordId]);
  }

  async getActiveRecords(tableName: string): Promise<any[]> {
    const sql = `SELECT * FROM ${tableName} WHERE deleted_at IS NULL`;
    return await this.executeSQL(sql);
  }

  // =================================================================
  // SYNC STATISTICS
  // =================================================================

  async getSyncStatistics(): Promise<{
    table_name: string;
    total_records: number;
    clean_records: number;
    pending_creates: number;
    pending_updates: number;
    pending_deletes: number;
    soft_deleted: number;
  }[]> {
    const sql = `
      SELECT 
        table_name,
        COUNT(*) as total_records,
        SUM(CASE WHEN sync_status = 'CLEAN' THEN 1 ELSE 0 END) as clean_records,
        SUM(CASE WHEN sync_status = 'DIRTY_CREATE' THEN 1 ELSE 0 END) as pending_creates,
        SUM(CASE WHEN sync_status = 'DIRTY_UPDATE' THEN 1 ELSE 0 END) as pending_updates,
        SUM(CASE WHEN sync_status = 'DIRTY_DELETE' THEN 1 ELSE 0 END) as pending_deletes,
        SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as soft_deleted
      FROM (
        SELECT 'leaf_scans' as table_name, sync_status, deleted_at FROM leaf_scans
        UNION ALL
        SELECT 'diagnoses', sync_status, deleted_at FROM diagnoses
        UNION ALL
        SELECT 'recommendations', sync_status, deleted_at FROM recommendations
      )
      GROUP BY table_name
    `;

    return await this.executeSQL(sql);
  }
}

// =================================================================
// SINGLETON INSTANCE
// =================================================================

export const localSyncDB = new LocalSyncDatabase();

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Initialize local database for sync (run on app startup)
 */
export async function initializeLocalSync(): Promise<void> {
  try {
    await localSyncDB.migrateDatabaseForSync();
    console.log('✅ Local sync database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize local sync database:', error);
    throw error;
  }
}

/**
 * Get sync statistics for UI display
 */
export async function getLocalSyncStats() {
  const stats = await localSyncDB.getSyncStatistics();
  const dirtyCounts = await localSyncDB.getAllDirtyRecordCounts();
  const conflicts = await localSyncDB.getUnresolvedConflicts();

  return {
    statistics: stats,
    pendingSync: dirtyCounts,
    unresolvedConflicts: conflicts.length,
  };
}

// =================================================================
// SCAN DATA PERSISTENCE (For Sync)
// =================================================================

/**
 * Save scan result from API to local database for syncing to Supabase
 * This should be called after successfully uploading a scan to the Flask API
 */
export async function saveScanResultLocally(scanResult: any): Promise<void> {
  try {
    const db = await localSyncDB.getDB();
    
    // 1. Insert/Update leaf_scan record
    await db.runAsync(
      `INSERT OR REPLACE INTO leaf_scans 
        (id, scan_uuid, user_id, crop_id, image_path, image_filename, status, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'DIRTY_CREATE')`,
      [
        scanResult.scan_id,
        scanResult.scan_uuid,
        scanResult.user_id || '00000000-0000-0000-0000-000000000000',
        scanResult.crop_id,
        scanResult.image_url || '',
        scanResult.scan_uuid + '.jpg',
        scanResult.status,
        scanResult.created_at || new Date().toISOString(),
      ]
    );

    // 2. Insert/Update diagnosis record
    await db.runAsync(
      `INSERT OR REPLACE INTO diagnoses 
        (id, scan_id, user_id, n_score, p_score, k_score, 
         n_confidence, p_confidence, k_confidence,
         n_severity, p_severity, k_severity, overall_status,
         detected_class, heatmap_path, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'DIRTY_CREATE')`,
      [
        scanResult.scan_id, // Use scan_id as diagnosis id
        scanResult.scan_id,
        scanResult.user_id || '00000000-0000-0000-0000-000000000000',
        scanResult.n_score,
        scanResult.p_score,
        scanResult.k_score,
        scanResult.n_confidence,
        scanResult.p_confidence,
        scanResult.k_confidence,
        scanResult.n_severity,
        scanResult.p_severity,
        scanResult.k_severity,
        scanResult.overall_status,
        scanResult.detected_class,
        scanResult.heatmap_url || scanResult.heatmap || '',
        scanResult.created_at || new Date().toISOString(),
      ]
    );

    // 3. Insert/Update recommendation record
    await db.runAsync(
      `INSERT OR REPLACE INTO recommendations 
        (id, scan_id, user_id, 
         n_recommendation, p_recommendation, k_recommendation,
         n_recommendation_hi, p_recommendation_hi, k_recommendation_hi,
         priority, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'DIRTY_CREATE')`,
      [
        scanResult.scan_id, // Use scan_id as recommendation id
        scanResult.scan_id,
        scanResult.user_id || '00000000-0000-0000-0000-000000000000',
        scanResult.recommendations?.n?.en || '',
        scanResult.recommendations?.p?.en || '',
        scanResult.recommendations?.k?.en || '',
        scanResult.recommendations?.n?.hi || '',
        scanResult.recommendations?.p?.hi || '',
        scanResult.recommendations?.k?.hi || '',
        scanResult.priority,
        scanResult.created_at || new Date().toISOString(),
      ]
    );

    console.log(`✅ Scan ${scanResult.scan_id} saved to local database (marked as DIRTY for sync)`);
  } catch (error) {
    console.error('❌ Failed to save scan result locally:', error);
    throw error;
  }
}
