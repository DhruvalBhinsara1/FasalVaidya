#!/usr/bin/env python3
"""
Database Migration Runner for FasalVaidya
==========================================
Safely applies SQLite migration scripts with backup and verification.

Usage:
    python run_migration.py 002_add_multi_tenant_support.sql
    python run_migration.py 002_rollback_multi_tenant.sql
"""

import os
import sys
import sqlite3
import shutil
from datetime import datetime
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.parent
DB_PATH = BASE_DIR / 'fasalvaidya.db'
MIGRATIONS_DIR = BASE_DIR / 'migrations'
BACKUP_DIR = BASE_DIR / 'backups'


def create_backup(db_path: Path) -> Path:
    """Create timestamped database backup."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = BACKUP_DIR / f'fasalvaidya_{timestamp}.db.backup'
    
    print(f"📦 Creating backup: {backup_path}")
    shutil.copy2(db_path, backup_path)
    print(f"✅ Backup created successfully")
    
    return backup_path


def verify_database(conn: sqlite3.Connection):
    """Verify database integrity after migration."""
    cursor = conn.cursor()
    
    print("\n🔍 Verifying database integrity...")
    
    # Check table existence
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"   Tables: {', '.join(tables)}")
    
    # Check users table
    if 'users' in tables:
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"   Users: {user_count}")
    
    # Check leaf_scans
    if 'leaf_scans' in tables:
        cursor.execute("PRAGMA table_info(leaf_scans)")
        columns = [row[1] for row in cursor.fetchall()]
        has_user_id = 'user_id' in columns
        print(f"   leaf_scans columns: {', '.join(columns)}")
        print(f"   Has user_id: {'✅' if has_user_id else '❌'}")
        
        cursor.execute("SELECT COUNT(*) FROM leaf_scans")
        scan_count = cursor.fetchone()[0]
        print(f"   Total scans: {scan_count}")
        
        if has_user_id:
            cursor.execute("SELECT COUNT(DISTINCT user_id) FROM leaf_scans")
            unique_users = cursor.fetchone()[0]
            print(f"   Unique users: {unique_users}")
    
    # Check foreign keys
    cursor.execute("PRAGMA foreign_keys")
    fk_status = cursor.fetchone()[0]
    print(f"   Foreign keys: {'✅ ON' if fk_status else '❌ OFF'}")
    
    # Check indexes
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL")
    indexes = [row[0] for row in cursor.fetchall()]
    print(f"   Indexes: {', '.join(indexes) if indexes else 'None'}")
    
    print("✅ Verification complete\n")


def run_migration(migration_file: str):
    """Run migration script with safety checks."""
    migration_path = MIGRATIONS_DIR / migration_file
    
    if not migration_path.exists():
        print(f"❌ Migration file not found: {migration_path}")
        sys.exit(1)
    
    if not DB_PATH.exists():
        print(f"❌ Database not found: {DB_PATH}")
        print("💡 Run the Flask app first to create the database")
        sys.exit(1)
    
    print(f"\n{'='*70}")
    print(f"🚀 Running Migration: {migration_file}")
    print(f"{'='*70}\n")
    
    # Create backup
    backup_path = create_backup(DB_PATH)
    
    # Read migration SQL
    print(f"📖 Reading migration script...")
    with open(migration_path, 'r', encoding='utf-8') as f:
        sql_script = f.read()
    
    # Confirm with user
    print(f"\n⚠️  WARNING: This will modify your database")
    print(f"   Database: {DB_PATH}")
    print(f"   Backup: {backup_path}")
    
    response = input("\n✋ Type 'yes' to proceed: ").strip().lower()
    if response != 'yes':
        print("❌ Migration cancelled")
        sys.exit(0)
    
    # Execute migration
    try:
        print(f"\n⚙️  Executing migration...")
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        
        # Execute the entire script
        cursor = conn.cursor()
        cursor.executescript(sql_script)
        conn.commit()
        
        print(f"✅ Migration executed successfully\n")
        
        # Verify
        verify_database(conn)
        
        conn.close()
        
        print(f"{'='*70}")
        print(f"🎉 Migration Complete!")
        print(f"{'='*70}")
        print(f"\n💾 Backup saved at: {backup_path}")
        print(f"📝 To rollback, restore the backup:")
        print(f"   cp {backup_path} {DB_PATH}")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print(f"\n🔄 Restoring from backup...")
        shutil.copy2(backup_path, DB_PATH)
        print(f"✅ Database restored from backup")
        sys.exit(1)


def main():
    if len(sys.argv) != 2:
        print("Usage: python run_migration.py <migration_file.sql>")
        print("\nAvailable migrations:")
        if MIGRATIONS_DIR.exists():
            for file in sorted(MIGRATIONS_DIR.glob('*.sql')):
                print(f"  - {file.name}")
        else:
            print("  No migrations found")
        sys.exit(1)
    
    migration_file = sys.argv[1]
    run_migration(migration_file)


if __name__ == '__main__':
    main()
