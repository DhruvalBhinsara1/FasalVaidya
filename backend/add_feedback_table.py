"""
Add user_feedback table to existing database
"""
import sqlite3
from pathlib import Path

db_path = Path(__file__).parent / 'fasalvaidya.db'

print(f"Connecting to: {db_path}")
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# Check if table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_feedback'")
exists = cursor.fetchone()

if exists:
    print("✓ user_feedback table already exists")
else:
    print("Creating user_feedback table...")
    
    cursor.execute('''
        CREATE TABLE user_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            scan_id INTEGER NOT NULL,
            rating TEXT NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),
            ai_confidence REAL,
            detected_class TEXT,
            feedback_text TEXT,
            is_flagged BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (scan_id) REFERENCES leaf_scans(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    cursor.execute('CREATE INDEX idx_user_feedback_scan_id ON user_feedback(scan_id)')
    cursor.execute('CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id)')
    cursor.execute('CREATE INDEX idx_user_feedback_rating ON user_feedback(rating)')
    cursor.execute('CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at)')
    
    conn.commit()
    print("✅ user_feedback table created successfully!")

# Show all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print(f"\nAll tables in database: {', '.join(tables)}")

conn.close()
