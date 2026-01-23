-- =================================================================
-- MIGRATION v2: Multi-Tenant User Isolation
-- =================================================================
-- Purpose: Add user_id to all tables for per-user data isolation
-- Safety: Uses SQLite-safe Create-Copy-Drop-Rename pattern
-- 
-- BEFORE RUNNING:
-- 1. BACKUP YOUR DATABASE: cp fasalvaidya.db fasalvaidya.db.backup
-- 2. Test on a copy first
-- 3. Ensure app is not running
--
-- ROLLBACK: See rollback_v2.sql
-- =================================================================

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- -----------------------------------------------------------------
-- STEP 1: Create Users Table
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,  -- UUID v4 format
    device_fingerprint TEXT,  -- Optional: device info for security
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create legacy user for existing data
INSERT OR IGNORE INTO users (id, device_fingerprint, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'legacy_migration',
    CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------
-- STEP 2: Migrate leaf_scans Table
-- -----------------------------------------------------------------
-- Create new table with user_id column and foreign key
CREATE TABLE leaf_scans_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_uuid TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    crop_id INTEGER DEFAULT 1,
    image_path TEXT NOT NULL,
    image_filename TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (crop_id) REFERENCES crops(id)
);

-- Copy existing data (all scans assigned to legacy user)
INSERT INTO leaf_scans_new (
    id, scan_uuid, user_id, crop_id, image_path, 
    image_filename, status, created_at
)
SELECT 
    id, scan_uuid, '00000000-0000-0000-0000-000000000000' as user_id,
    crop_id, image_path, image_filename, status, created_at
FROM leaf_scans;

-- Drop old table
DROP TABLE leaf_scans;

-- Rename new table
ALTER TABLE leaf_scans_new RENAME TO leaf_scans;

-- Create indexes for performance
CREATE INDEX idx_leaf_scans_user_id ON leaf_scans(user_id);
CREATE INDEX idx_leaf_scans_created_at ON leaf_scans(created_at DESC);
CREATE INDEX idx_leaf_scans_user_crop ON leaf_scans(user_id, crop_id);

-- -----------------------------------------------------------------
-- STEP 3: Migrate diagnoses Table (add user_id for faster queries)
-- -----------------------------------------------------------------
CREATE TABLE diagnoses_new (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES leaf_scans(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy existing data
INSERT INTO diagnoses_new (
    id, scan_id, user_id, n_score, p_score, k_score,
    n_confidence, p_confidence, k_confidence,
    n_severity, p_severity, k_severity,
    overall_status, detected_class, heatmap_path, created_at
)
SELECT 
    d.id, d.scan_id, '00000000-0000-0000-0000-000000000000' as user_id,
    d.n_score, d.p_score, d.k_score,
    d.n_confidence, d.p_confidence, d.k_confidence,
    d.n_severity, d.p_severity, d.k_severity,
    d.overall_status, d.detected_class, d.heatmap_path, d.created_at
FROM diagnoses d;

DROP TABLE diagnoses;
ALTER TABLE diagnoses_new RENAME TO diagnoses;

CREATE INDEX idx_diagnoses_user_id ON diagnoses(user_id);
CREATE INDEX idx_diagnoses_scan_id ON diagnoses(scan_id);

-- -----------------------------------------------------------------
-- STEP 4: Migrate recommendations Table
-- -----------------------------------------------------------------
CREATE TABLE recommendations_new (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES leaf_scans(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy existing data
INSERT INTO recommendations_new (
    id, scan_id, user_id, n_recommendation, p_recommendation, k_recommendation,
    n_recommendation_hi, p_recommendation_hi, k_recommendation_hi,
    priority, created_at
)
SELECT 
    r.id, r.scan_id, '00000000-0000-0000-0000-000000000000' as user_id,
    r.n_recommendation, r.p_recommendation, r.k_recommendation,
    r.n_recommendation_hi, r.p_recommendation_hi, r.k_recommendation_hi,
    r.priority, r.created_at
FROM recommendations r;

DROP TABLE recommendations;
ALTER TABLE recommendations_new RENAME TO recommendations;

CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_recommendations_scan_id ON recommendations(scan_id);

-- -----------------------------------------------------------------
-- STEP 5: Verify Migration
-- -----------------------------------------------------------------
-- Check that all scans have valid user_id
SELECT 
    COUNT(*) as total_scans,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(CASE WHEN user_id = '00000000-0000-0000-0000-000000000000' THEN 1 ELSE 0 END) as legacy_scans
FROM leaf_scans;

COMMIT;

PRAGMA foreign_keys = ON;

-- =================================================================
-- Migration Complete
-- =================================================================
-- Next steps:
-- 1. Update backend API to extract X-User-ID header
-- 2. Filter all queries with WHERE user_id = ?
-- 3. Test with frontend (new device IDs should create separate scans)
-- =================================================================
