-- =================================================================
-- ROLLBACK MIGRATION v2: Remove Multi-Tenant Support
-- =================================================================
-- Purpose: Revert to single-tenant architecture
-- Use this if migration causes issues
--
-- BEFORE RUNNING:
-- 1. BACKUP YOUR DATABASE: cp fasalvaidya.db fasalvaidya.db.backup
-- 2. Understand that user isolation will be lost
-- =================================================================

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- -----------------------------------------------------------------
-- STEP 1: Rollback leaf_scans Table
-- -----------------------------------------------------------------
CREATE TABLE leaf_scans_old (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_uuid TEXT UNIQUE NOT NULL,
    crop_id INTEGER DEFAULT 1,
    image_path TEXT NOT NULL,
    image_filename TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (crop_id) REFERENCES crops(id)
);

-- Copy data (drop user_id column)
INSERT INTO leaf_scans_old (
    id, scan_uuid, crop_id, image_path, 
    image_filename, status, created_at
)
SELECT 
    id, scan_uuid, crop_id, image_path,
    image_filename, status, created_at
FROM leaf_scans;

DROP TABLE leaf_scans;
ALTER TABLE leaf_scans_old RENAME TO leaf_scans;

-- -----------------------------------------------------------------
-- STEP 2: Rollback diagnoses Table
-- -----------------------------------------------------------------
CREATE TABLE diagnoses_old (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER UNIQUE NOT NULL,
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
    FOREIGN KEY (scan_id) REFERENCES leaf_scans(id)
);

INSERT INTO diagnoses_old SELECT 
    id, scan_id, n_score, p_score, k_score,
    n_confidence, p_confidence, k_confidence,
    n_severity, p_severity, k_severity,
    overall_status, detected_class, heatmap_path, created_at
FROM diagnoses;

DROP TABLE diagnoses;
ALTER TABLE diagnoses_old RENAME TO diagnoses;

-- -----------------------------------------------------------------
-- STEP 3: Rollback recommendations Table
-- -----------------------------------------------------------------
CREATE TABLE recommendations_old (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    n_recommendation TEXT,
    p_recommendation TEXT,
    k_recommendation TEXT,
    n_recommendation_hi TEXT,
    p_recommendation_hi TEXT,
    k_recommendation_hi TEXT,
    priority TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES leaf_scans(id)
);

INSERT INTO recommendations_old SELECT 
    id, scan_id, n_recommendation, p_recommendation, k_recommendation,
    n_recommendation_hi, p_recommendation_hi, k_recommendation_hi,
    priority, created_at
FROM recommendations;

DROP TABLE recommendations;
ALTER TABLE recommendations_old RENAME TO recommendations;

-- -----------------------------------------------------------------
-- STEP 4: Drop users Table
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS users;

COMMIT;

PRAGMA foreign_keys = ON;

-- =================================================================
-- Rollback Complete
-- =================================================================
-- You are now back to single-tenant architecture.
-- All scans are visible globally (no user isolation).
-- =================================================================
