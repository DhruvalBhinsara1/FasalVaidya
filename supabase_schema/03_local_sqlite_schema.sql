-- =================================================================
-- LOCAL SQLITE SCHEMA WITH SYNC SUPPORT
-- =================================================================
-- Purpose: Enhanced local SQLite schema for offline-first sync
-- Strategy: Add sync tracking columns to existing schema
-- Migration: Safe migration from existing schema
-- =================================================================

PRAGMA foreign_keys = ON;

-- =================================================================
-- SYNC TRACKING COLUMNS (To be added to existing tables)
-- =================================================================
-- Each synced table needs:
--   - sync_status: 'CLEAN', 'DIRTY_CREATE', 'DIRTY_UPDATE', 'DIRTY_DELETE'
--   - last_synced_at: Timestamp of last successful sync
--   - updated_at: Timestamp of last modification (local or remote)
--   - deleted_at: Soft delete timestamp (NULL if not deleted)

-- =================================================================
-- MIGRATION SCRIPT FOR EXISTING DATABASES
-- =================================================================

BEGIN TRANSACTION;

-- -----------------------------------------------------------------
-- Add sync columns to users table
-- -----------------------------------------------------------------
-- Check if columns exist first (SQLite doesn't have IF NOT EXISTS for ALTER COLUMN)
-- updated_at: Track when record was last modified
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- deleted_at: Soft delete support
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;

-- sync_status: CLEAN, DIRTY_CREATE, DIRTY_UPDATE, DIRTY_DELETE
ALTER TABLE users ADD COLUMN sync_status TEXT DEFAULT 'DIRTY_CREATE';

-- last_synced_at: When this record was last synced to server
ALTER TABLE users ADD COLUMN last_synced_at TIMESTAMP NULL;

-- -----------------------------------------------------------------
-- Add sync columns to leaf_scans table
-- -----------------------------------------------------------------
ALTER TABLE leaf_scans ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE leaf_scans ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE leaf_scans ADD COLUMN sync_status TEXT DEFAULT 'DIRTY_CREATE';
ALTER TABLE leaf_scans ADD COLUMN last_synced_at TIMESTAMP NULL;

-- -----------------------------------------------------------------
-- Add sync columns to diagnoses table
-- -----------------------------------------------------------------
ALTER TABLE diagnoses ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE diagnoses ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE diagnoses ADD COLUMN sync_status TEXT DEFAULT 'DIRTY_CREATE';
ALTER TABLE diagnoses ADD COLUMN last_synced_at TIMESTAMP NULL;

-- -----------------------------------------------------------------
-- Add sync columns to recommendations table
-- -----------------------------------------------------------------
ALTER TABLE recommendations ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE recommendations ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE recommendations ADD COLUMN sync_status TEXT DEFAULT 'DIRTY_CREATE';
ALTER TABLE recommendations ADD COLUMN last_synced_at TIMESTAMP NULL;

-- -----------------------------------------------------------------
-- Create triggers to auto-update updated_at and sync_status
-- -----------------------------------------------------------------

-- Users table triggers
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users 
    SET updated_at = CURRENT_TIMESTAMP,
        sync_status = CASE 
            WHEN OLD.sync_status = 'CLEAN' THEN 'DIRTY_UPDATE'
            ELSE OLD.sync_status
        END
    WHERE id = NEW.id;
END;

-- Leaf scans table triggers
CREATE TRIGGER IF NOT EXISTS update_leaf_scans_timestamp
AFTER UPDATE ON leaf_scans
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at  -- Only if not manually set
BEGIN
    UPDATE leaf_scans 
    SET updated_at = CURRENT_TIMESTAMP,
        sync_status = CASE 
            WHEN OLD.sync_status = 'CLEAN' THEN 'DIRTY_UPDATE'
            ELSE OLD.sync_status
        END
    WHERE id = NEW.id;
END;

-- Diagnoses table triggers
CREATE TRIGGER IF NOT EXISTS update_diagnoses_timestamp
AFTER UPDATE ON diagnoses
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE diagnoses 
    SET updated_at = CURRENT_TIMESTAMP,
        sync_status = CASE 
            WHEN OLD.sync_status = 'CLEAN' THEN 'DIRTY_UPDATE'
            ELSE OLD.sync_status
        END
    WHERE id = NEW.id;
END;

-- Recommendations table triggers
CREATE TRIGGER IF NOT EXISTS update_recommendations_timestamp
AFTER UPDATE ON recommendations
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE recommendations 
    SET updated_at = CURRENT_TIMESTAMP,
        sync_status = CASE 
            WHEN OLD.sync_status = 'CLEAN' THEN 'DIRTY_UPDATE'
            ELSE OLD.sync_status
        END
    WHERE id = NEW.id;
END;

-- -----------------------------------------------------------------
-- Create sync metadata table
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT UNIQUE NOT NULL,
    last_sync_at TIMESTAMP NULL,
    last_pull_at TIMESTAMP NULL,
    last_push_at TIMESTAMP NULL,
    sync_status TEXT DEFAULT 'idle',  -- idle, syncing, failed
    error_message TEXT NULL,
    pending_push_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial sync metadata
INSERT OR IGNORE INTO sync_metadata (table_name) VALUES ('leaf_scans');
INSERT OR IGNORE INTO sync_metadata (table_name) VALUES ('diagnoses');
INSERT OR IGNORE INTO sync_metadata (table_name) VALUES ('recommendations');

-- -----------------------------------------------------------------
-- Create sync conflicts table (for manual conflict resolution)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,  -- UUID of the conflicting record
    local_data TEXT NOT NULL,  -- JSON of local version
    remote_data TEXT NOT NULL, -- JSON of remote version
    conflict_type TEXT NOT NULL,  -- 'update_conflict', 'delete_conflict'
    resolved BOOLEAN DEFAULT 0,
    resolution TEXT NULL,  -- 'use_local', 'use_remote', 'manual'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_unresolved 
ON sync_conflicts(resolved, created_at) WHERE resolved = 0;

-- -----------------------------------------------------------------
-- Create sync queue table (for reliable push operations)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,  -- UUID of record to sync
    operation TEXT NOT NULL,  -- 'create', 'update', 'delete'
    payload TEXT NOT NULL,  -- JSON of record data
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status TEXT DEFAULT 'pending',  -- pending, syncing, failed, success
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_pending 
ON sync_queue(status, created_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_sync_queue_table_record 
ON sync_queue(table_name, record_id);

-- -----------------------------------------------------------------
-- Helper views for sync operations
-- -----------------------------------------------------------------

-- View: Get all dirty (unsynced) records across tables
CREATE VIEW IF NOT EXISTS v_dirty_records AS
SELECT 'leaf_scans' as table_name, 
       CAST(id AS TEXT) as record_id, 
       sync_status, 
       updated_at 
FROM leaf_scans 
WHERE sync_status IN ('DIRTY_CREATE', 'DIRTY_UPDATE', 'DIRTY_DELETE')
UNION ALL
SELECT 'diagnoses', 
       CAST(id AS TEXT), 
       sync_status, 
       updated_at 
FROM diagnoses 
WHERE sync_status IN ('DIRTY_CREATE', 'DIRTY_UPDATE', 'DIRTY_DELETE')
UNION ALL
SELECT 'recommendations', 
       CAST(id AS TEXT), 
       sync_status, 
       updated_at 
FROM recommendations 
WHERE sync_status IN ('DIRTY_CREATE', 'DIRTY_UPDATE', 'DIRTY_DELETE');

-- View: Sync statistics
CREATE VIEW IF NOT EXISTS v_sync_stats AS
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
GROUP BY table_name;

COMMIT;

-- -----------------------------------------------------------------
-- Stored Procedures (SQLite doesn't have them, use application logic)
-- -----------------------------------------------------------------

-- The following operations should be implemented in application code:
--
-- 1. mark_as_clean(table_name, record_id)
--    UPDATE {table_name} 
--    SET sync_status = 'CLEAN', last_synced_at = CURRENT_TIMESTAMP
--    WHERE id = record_id
--
-- 2. mark_as_dirty_update(table_name, record_id)
--    UPDATE {table_name} 
--    SET sync_status = 'DIRTY_UPDATE', updated_at = CURRENT_TIMESTAMP
--    WHERE id = record_id AND sync_status = 'CLEAN'
--
-- 3. soft_delete(table_name, record_id)
--    UPDATE {table_name}
--    SET deleted_at = CURRENT_TIMESTAMP, 
--        sync_status = 'DIRTY_DELETE', 
--        updated_at = CURRENT_TIMESTAMP
--    WHERE id = record_id
--
-- 4. get_dirty_records(table_name)
--    SELECT * FROM {table_name}
--    WHERE sync_status IN ('DIRTY_CREATE', 'DIRTY_UPDATE', 'DIRTY_DELETE')
--    ORDER BY updated_at ASC
--
-- 5. apply_remote_changes(table_name, records[])
--    For each record:
--      - Check if local version is dirty
--      - If dirty, create conflict record
--      - If clean, upsert and mark as CLEAN
