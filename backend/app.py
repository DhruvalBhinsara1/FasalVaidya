"""
FasalVaidya Flask Backend Application
=====================================
Main entry point for the FasalVaidya API server.
Handles leaf photo uploads, NPK diagnosis, and scan history.
"""

import os
import sys
import json
import uuid
import sqlite3
import logging
import hashlib
from logging.handlers import RotatingFileHandler
from datetime import datetime
from pathlib import Path
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Add ML module to path
sys.path.insert(0, os.path.dirname(__file__))

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configuration
BASE_DIR = Path(__file__).parent
UPLOAD_FOLDER = BASE_DIR / 'uploads'
DEFAULT_DATABASE_PATH = BASE_DIR / 'fasalvaidya.db'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload folder exists
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

# ============================================
# LOGGING
# ============================================

LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)


def setup_logging():
    """Configure structured-ish logging to file + console."""
    log_level_name = os.getenv('FASALVAIDYA_LOG_LEVEL', 'INFO').upper()
    log_level = getattr(logging, log_level_name, logging.INFO)
    log_file = os.getenv('FASALVAIDYA_LOG_FILE', str(LOG_DIR / 'backend.log'))

    root = logging.getLogger()
    root.setLevel(log_level)

    # Avoid duplicate handlers on reload
    if root.handlers:
        return

    formatter = logging.Formatter(
        fmt='%(asctime)s %(levelname)s %(name)s %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )

    file_handler = RotatingFileHandler(log_file, maxBytes=5 * 1024 * 1024, backupCount=3, encoding='utf-8')
    file_handler.setLevel(log_level)
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    if os.getenv('FASALVAIDYA_LOG_CONSOLE', '1') != '0':
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        console_handler.setFormatter(formatter)
        root.addHandler(console_handler)


setup_logging()
logger = logging.getLogger('fasalvaidya.api')


def file_fingerprint(path: Path, max_bytes: int = 1024 * 1024) -> dict:
    """Return safe file fingerprint info (sha256 over first N bytes + full size)."""
    try:
        size = path.stat().st_size
        h = hashlib.sha256()
        with open(path, 'rb') as f:
            h.update(f.read(max_bytes))
        return {'size': size, 'sha256_1mb': h.hexdigest()}
    except Exception as e:
        return {'size': None, 'sha256_1mb': None, 'error': str(e)}

app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH


def get_database_path() -> Path:
    """Resolve database path (supports test overrides via app.config['DATABASE'])."""
    override = app.config.get('DATABASE') if isinstance(app.config, dict) else None
    return Path(override) if override else DEFAULT_DATABASE_PATH

# ============================================
# CROP DEFINITIONS (Multi-Crop Support)
# ============================================

# Crop IDs mapped to ML model crop_id strings
# crop_id strings match CROP_CONFIGS keys in train_crop_model.py
CROPS = {
    1: {
        'name': 'Wheat',
        'name_hi': 'गेहूँ',
        'season': 'Rabi (Oct-Mar)',
        'icon': '🌾',
        'ml_crop_id': 'wheat'
    },
    2: {
        'name': 'Rice',
        'name_hi': 'चावल',
        'season': 'Kharif (Jun-Sep)',
        'icon': '🌾',
        'ml_crop_id': 'rice'
    },
    5: {
        'name': 'Maize',
        'name_hi': 'मक्का',
        'season': 'Kharif/Rabi',
        'icon': '🌽',
        'ml_crop_id': 'maize'
    },
    6: {
        'name': 'Banana',
        'name_hi': 'केला',
        'season': 'Year-round',
        'icon': '🍌',
        'ml_crop_id': 'banana'
    },
    7: {
        'name': 'Coffee',
        'name_hi': 'कॉफी',
        'season': 'Year-round',
        'icon': '☕',
        'ml_crop_id': 'coffee'
    },
    9: {
        'name': 'Eggplant',
        'name_hi': 'बैंगन',
        'season': 'Year-round',
        'icon': '🍆',
        'ml_crop_id': 'eggplant'
    },
    10: {
        'name': 'Ash Gourd',
        'name_hi': 'पेठा',
        'season': 'Kharif',
        'icon': '🎃',
        'ml_crop_id': 'ashgourd'
    },
    11: {
        'name': 'Bitter Gourd',
        'name_hi': 'करेला',
        'season': 'Summer',
        'icon': '🥬',
        'ml_crop_id': 'bittergourd'
    },
    13: {
        'name': 'Snake Gourd',
        'name_hi': 'चिचिंडा',
        'season': 'Summer',
        'icon': '🥬',
        'ml_crop_id': 'snakegourd'
    }
}

# Crop-specific fertilizer recommendations
FERTILIZER_RECOMMENDATIONS = {
    1: {  # Wheat
        'n': {
            'en': 'Apply 50-70 kg Urea per acre. Split into 2-3 doses during growth stages.',
            'hi': 'प्रति एकड़ 50-70 किलो यूरिया डालें। विकास चरणों में 2-3 खुराक में बांटें।'
        },
        'p': {
            'en': 'Apply 25-35 kg DAP per acre at sowing time.',
            'hi': 'बुवाई के समय प्रति एकड़ 25-35 किलो डीएपी डालें।'
        },
        'k': {
            'en': 'Apply 20-30 kg MOP (Muriate of Potash) per acre.',
            'hi': 'प्रति एकड़ 20-30 किलो एमओपी (म्यूरेट ऑफ पोटाश) डालें।'
        }
    },
    2: {  # Rice
        'n': {
            'en': 'Apply 60-80 kg Urea per acre. Apply in 3 splits: basal, tillering, panicle initiation.',
            'hi': 'प्रति एकड़ 60-80 किलो यूरिया डालें। 3 बार में: बेसल, टिलरिंग, पैनिकल शुरुआत।'
        },
        'p': {
            'en': 'Apply 30-40 kg DAP per acre as basal dose before transplanting.',
            'hi': 'रोपाई से पहले बेसल खुराक के रूप में प्रति एकड़ 30-40 किलो डीएपी डालें।'
        },
        'k': {
            'en': 'Apply 25-35 kg MOP per acre in two splits.',
            'hi': 'प्रति एकड़ 25-35 किलो एमओपी दो बार में डालें।'
        }
    },
    3: {  # Tomato
        'n': {
            'en': 'Apply 15-20 kg Urea per 1000 sq.m. Apply in multiple doses throughout growth.',
            'hi': 'प्रति 1000 वर्ग मीटर 15-20 किलो यूरिया डालें। पूरी वृद्धि के दौरान कई खुराक में।'
        },
        'p': {
            'en': 'Apply 10-15 kg DAP per 1000 sq.m at transplanting.',
            'hi': 'रोपाई के समय प्रति 1000 वर्ग मीटर 10-15 किलो डीएपी डालें।'
        },
        'k': {
            'en': 'Apply 12-18 kg MOP per 1000 sq.m. Important for fruit quality.',
            'hi': 'प्रति 1000 वर्ग मीटर 12-18 किलो एमओपी डालें। फल की गुणवत्ता के लिए महत्वपूर्ण।'
        }
    },
    4: {  # Cotton
        'n': {
            'en': 'Apply 40-60 kg Urea per acre. Split into 3 doses during growth.',
            'hi': 'प्रति एकड़ 40-60 किलो यूरिया डालें। विकास के दौरान 3 खुराक में बांटें।'
        },
        'p': {
            'en': 'Apply 20-30 kg DAP per acre at sowing.',
            'hi': 'बुवाई के समय प्रति एकड़ 20-30 किलो डीएपी डालें।'
        },
        'k': {
            'en': 'Apply 18-25 kg MOP per acre. Essential for boll development.',
            'hi': 'प्रति एकड़ 18-25 किलो एमओपी डालें। गूलर विकास के लिए आवश्यक।'
        }
    },
    5: {  # Maize
        'n': {
            'en': 'Apply 60-80 kg Urea per acre. Split into 3 doses: at sowing, knee-high, and tasseling.',
            'hi': 'प्रति एकड़ 60-80 किलो यूरिया डालें। 3 बार में: बुवाई, घुटने तक ऊंचाई, और तसल निकलने पर।'
        },
        'p': {
            'en': 'Apply 25-35 kg DAP per acre as basal dose at sowing.',
            'hi': 'बुवाई के समय बेसल खुराक के रूप में प्रति एकड़ 25-35 किलो डीएपी डालें।'
        },
        'k': {
            'en': 'Apply 20-30 kg MOP per acre. Important for grain filling.',
            'hi': 'प्रति एकड़ 20-30 किलो एमओपी डालें। दाना भरने के लिए महत्वपूर्ण।'
        }
    },
    6: {  # Banana
        'n': {
            'en': 'Apply 200-250g Urea per plant per year in 4-5 splits.',
            'hi': 'प्रति पौधा प्रति वर्ष 200-250 ग्राम यूरिया 4-5 बार में डालें।'
        },
        'p': {
            'en': 'Apply 100-150g SSP per plant at planting and flowering.',
            'hi': 'रोपाई और फूल आने पर प्रति पौधा 100-150 ग्राम एसएसपी डालें।'
        },
        'k': {
            'en': 'Apply 250-300g MOP per plant per year in 3-4 splits. Critical for fruit quality.',
            'hi': 'प्रति पौधा प्रति वर्ष 250-300 ग्राम एमओपी 3-4 बार में डालें। फल गुणवत्ता के लिए महत्वपूर्ण।'
        }
    },
    7: {  # Coffee
        'n': {
            'en': 'Apply 40-60g Urea per plant in 2-3 splits during rainy season.',
            'hi': 'बारिश के मौसम में प्रति पौधा 40-60 ग्राम यूरिया 2-3 बार में डालें।'
        },
        'p': {
            'en': 'Apply 20-30g SSP per plant at start of monsoon.',
            'hi': 'मानसून की शुरुआत में प्रति पौधा 20-30 ग्राम एसएसपी डालें।'
        },
        'k': {
            'en': 'Apply 30-40g MOP per plant in 2 splits. Important for bean quality.',
            'hi': 'प्रति पौधा 30-40 ग्राम एमओपी 2 बार में डालें। बीन गुणवत्ता के लिए महत्वपूर्ण।'
        }
    },
    8: {  # Cucumber
        'n': {
            'en': 'Apply 10-15 kg Urea per 1000 sq.m in 3-4 splits during growth.',
            'hi': 'वृद्धि के दौरान प्रति 1000 वर्ग मीटर 10-15 किलो यूरिया 3-4 बार में डालें।'
        },
        'p': {
            'en': 'Apply 8-12 kg DAP per 1000 sq.m at transplanting.',
            'hi': 'रोपाई के समय प्रति 1000 वर्ग मीटर 8-12 किलो डीएपी डालें।'
        },
        'k': {
            'en': 'Apply 10-15 kg MOP per 1000 sq.m. Essential for fruit development.',
            'hi': 'प्रति 1000 वर्ग मीटर 10-15 किलो एमओपी डालें। फल विकास के लिए आवश्यक।'
        }
    },
    9: {  # Eggplant
        'n': {
            'en': 'Apply 12-18 kg Urea per 1000 sq.m in 4-5 splits.',
            'hi': 'प्रति 1000 वर्ग मीटर 12-18 किलो यूरिया 4-5 बार में डालें।'
        },
        'p': {
            'en': 'Apply 10-15 kg DAP per 1000 sq.m at transplanting.',
            'hi': 'रोपाई के समय प्रति 1000 वर्ग मीटर 10-15 किलो डीएपी डालें।'
        },
        'k': {
            'en': 'Apply 12-15 kg MOP per 1000 sq.m. Important for fruit quality and yield.',
            'hi': 'प्रति 1000 वर्ग मीटर 12-15 किलो एमओपी डालें। फल गुणवत्ता और उपज के लिए महत्वपूर्ण।'
        }
    },
    10: {  # Ash Gourd
        'n': {
            'en': 'Apply 8-12 kg Urea per 1000 sq.m in 3-4 splits during vine growth.',
            'hi': 'बेल वृद्धि के दौरान प्रति 1000 वर्ग मीटर 8-12 किलो यूरिया 3-4 बार में डालें।'
        },
        'p': {
            'en': 'Apply 6-10 kg DAP per 1000 sq.m at sowing/transplanting.',
            'hi': 'बुवाई/रोपाई के समय प्रति 1000 वर्ग मीटर 6-10 किलो डीएपी डालें।'
        },
        'k': {
            'en': 'Apply 10-14 kg MOP per 1000 sq.m. Important for fruit size.',
            'hi': 'प्रति 1000 वर्ग मीटर 10-14 किलो एमओपी डालें। फल आकार के लिए महत्वपूर्ण।'
        }
    },
    11: {  # Bitter Gourd
        'n': {
            'en': 'Apply 10-15 kg Urea per 1000 sq.m in 3-4 splits.',
            'hi': 'प्रति 1000 वर्ग मीटर 10-15 किलो यूरिया 3-4 बार में डालें।'
        },
        'p': {
            'en': 'Apply 8-12 kg DAP per 1000 sq.m at sowing.',
            'hi': 'बुवाई के समय प्रति 1000 वर्ग मीटर 8-12 किलो डीएपी डालें।'
        },
        'k': {
            'en': 'Apply 10-15 kg MOP per 1000 sq.m for better fruiting.',
            'hi': 'बेहतर फलन के लिए प्रति 1000 वर्ग मीटर 10-15 किलो एमओपी डालें।'
        }
    },
    12: {  # Ridge Gourd
        'n': {
            'en': 'Apply 8-12 kg Urea per 1000 sq.m in 3-4 splits during growth.',
            'hi': 'वृद्धि के दौरान प्रति 1000 वर्ग मीटर 8-12 किलो यूरिया 3-4 बार में डालें।'
        },
        'p': {
            'en': 'Apply 6-10 kg DAP per 1000 sq.m at sowing.',
            'hi': 'बुवाई के समय प्रति 1000 वर्ग मीटर 6-10 किलो डीएपी डालें।'
        },
        'k': {
            'en': 'Apply 8-12 kg MOP per 1000 sq.m for fruit quality.',
            'hi': 'फल गुणवत्ता के लिए प्रति 1000 वर्ग मीटर 8-12 किलो एमओपी डालें।'
        }
    },
    13: {  # Snake Gourd
        'n': {
            'en': 'Apply 10-14 kg Urea per 1000 sq.m in 3-4 splits.',
            'hi': 'प्रति 1000 वर्ग मीटर 10-14 किलो यूरिया 3-4 बार में डालें।'
        },
        'p': {
            'en': 'Apply 8-10 kg DAP per 1000 sq.m at sowing.',
            'hi': 'बुवाई के समय प्रति 1000 वर्ग मीटर 8-10 किलो डीएपी डालें।'
        },
        'k': {
            'en': 'Apply 10-12 kg MOP per 1000 sq.m. Important for long fruit development.',
            'hi': 'प्रति 1000 वर्ग मीटर 10-12 किलो एमओपी डालें। लंबे फल विकास के लिए महत्वपूर्ण।'
        }
    }
}


# ============================================
# DATABASE FUNCTIONS
# ============================================

def get_db():
    """Get database connection for current request."""
    if 'db' not in g:
        g.db = sqlite3.connect(str(get_database_path()))
        g.db.row_factory = sqlite3.Row
        # Enable foreign key constraints
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def get_user_id() -> str:
    """
    Extract user ID from X-User-ID header.
    This is the device UUID sent by the frontend.
    Returns legacy user ID if header is missing (for backward compatibility).
    """
    LEGACY_USER_ID = '00000000-0000-0000-0000-000000000000'
    user_id = request.headers.get('X-User-ID', LEGACY_USER_ID)
    
    # Validate UUID format (basic check)
    if not user_id or len(user_id) != 36:
        logger.warning(f"Invalid or missing X-User-ID header, using legacy ID")
        return LEGACY_USER_ID
    
    return user_id


def ensure_user_exists(user_id: str):
    """
    Ensure user exists in database.
    Creates user record if it doesn't exist.
    """
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute('SELECT id FROM users WHERE id = ?', (user_id,))
    if not cursor.fetchone():
        cursor.execute(
            'INSERT INTO users (id, device_fingerprint, last_active) VALUES (?, ?, ?)',
            (user_id, request.headers.get('User-Agent', 'unknown'), datetime.now())
        )
        db.commit()
        logger.info(f"Created new user: {user_id[:8]}...")


@app.teardown_appcontext
def close_db(exception):
    """Close database connection at end of request."""
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    """Initialize database with schema."""
    db_path = get_database_path()
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Create users table (for multi-tenant support)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            device_fingerprint TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create legacy user for backward compatibility
    cursor.execute('''
        INSERT OR IGNORE INTO users (id, device_fingerprint, created_at)
        VALUES ('00000000-0000-0000-0000-000000000000', 'legacy_migration', CURRENT_TIMESTAMP)
    ''')
    
    # Create crops table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS crops (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            name_hi TEXT,
            season TEXT,
            icon TEXT
        )
    ''')
    
    # Create leaf_scans table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leaf_scans (
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
        )
    ''')
    
    # Handle existing databases: Add user_id column if it doesn't exist
    cursor.execute("PRAGMA table_info(leaf_scans)")
    columns = [row[1] for row in cursor.fetchall()]
    if 'user_id' not in columns:
        logger.info("Migrating existing leaf_scans table - adding user_id column")
        cursor.execute('''
            ALTER TABLE leaf_scans 
            ADD COLUMN user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
        ''')
    
    # Create indexes for performance
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_leaf_scans_user_id ON leaf_scans(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_leaf_scans_created_at ON leaf_scans(created_at DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_leaf_scans_user_crop ON leaf_scans(user_id, crop_id)')
    
    # Create diagnoses table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS diagnoses (
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
        )
    ''')
    
    # Handle existing databases: Add user_id column if it doesn't exist
    cursor.execute("PRAGMA table_info(diagnoses)")
    columns = [row[1] for row in cursor.fetchall()]
    if 'user_id' not in columns:
        logger.info("Migrating existing diagnoses table - adding user_id column")
        cursor.execute('''
            ALTER TABLE diagnoses 
            ADD COLUMN user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
        ''')
    
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_diagnoses_user_id ON diagnoses(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_diagnoses_scan_id ON diagnoses(scan_id)')
    
    # Create recommendations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendations (
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
        )
    ''')
    
    # Handle existing databases: Add user_id column if it doesn't exist
    cursor.execute("PRAGMA table_info(recommendations)")
    columns = [row[1] for row in cursor.fetchall()]
    if 'user_id' not in columns:
        logger.info("Migrating existing recommendations table - adding user_id column")
        cursor.execute('''
            ALTER TABLE recommendations 
            ADD COLUMN user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
        ''')
    
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_recommendations_scan_id ON recommendations(scan_id)')
    
    # Insert or update default crops
    for crop_id, crop_data in CROPS.items():
        cursor.execute('''
            INSERT OR IGNORE INTO crops (id, name, name_hi, season, icon)
            VALUES (?, ?, ?, ?, ?)
        ''', (crop_id, crop_data['name'], crop_data['name_hi'], 
              crop_data['season'], crop_data['icon']))
        
        # Force update to ensure consistency (fixes ID 3 Maize -> Tomato)
        cursor.execute('''
            UPDATE crops 
            SET name=?, name_hi=?, season=?, icon=?
            WHERE id=?
        ''', (crop_data['name'], crop_data['name_hi'], 
              crop_data['season'], crop_data['icon'], crop_id))
    
    conn.commit()
    conn.close()
    print(f"✅ Database initialized successfully at {db_path}")


# ============================================
# HELPER FUNCTIONS
# ============================================

def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def generate_recommendations(crop_id, n_score, p_score, k_score):
    """Generate crop-specific fertilizer recommendations based on deficiency scores."""
    crop_recs = FERTILIZER_RECOMMENDATIONS.get(crop_id, FERTILIZER_RECOMMENDATIONS[1])
    
    recommendations = {
        'n': {'en': '', 'hi': '', 'needed': False},
        'p': {'en': '', 'hi': '', 'needed': False},
        'k': {'en': '', 'hi': '', 'needed': False},
    }
    
    # Nitrogen recommendation
    if n_score >= 0.4:  # Attention or Critical
        recommendations['n'] = {
            'en': crop_recs['n']['en'],
            'hi': crop_recs['n']['hi'],
            'needed': True,
            'urgency': 'high' if n_score >= 0.7 else 'medium'
        }
    
    # Phosphorus recommendation
    if p_score >= 0.4:
        recommendations['p'] = {
            'en': crop_recs['p']['en'],
            'hi': crop_recs['p']['hi'],
            'needed': True,
            'urgency': 'high' if p_score >= 0.7 else 'medium'
        }
    
    # Potassium recommendation
    if k_score >= 0.4:
        recommendations['k'] = {
            'en': crop_recs['k']['en'],
            'hi': crop_recs['k']['hi'],
            'needed': True,
            'urgency': 'high' if k_score >= 0.7 else 'medium'
        }
    
    # Determine priority
    max_score = max(n_score, p_score, k_score)
    if max_score >= 0.7:
        priority = 'critical'
    elif max_score >= 0.4:
        priority = 'attention'
    else:
        priority = 'healthy'
    
    return recommendations, priority


# ============================================
# API ROUTES
# ============================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'message': 'FasalVaidya API is running',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    }), 200


@app.route('/api/crops', methods=['GET'])
def get_crops():
    """Get list of supported crops."""
    logger.info("🌾 [GET /api/crops] Request received")
    logger.info(f"🌾 Headers: {dict(request.headers)}")
    logger.info(f"🌾 CROPS dict has {len(CROPS)} items")
    
    crops_list = [
        {
            'id': crop_id,
            'name': crop_data['name'],
            'name_hi': crop_data['name_hi'],
            'season': crop_data['season'],
            'icon': crop_data['icon']
        }
        for crop_id, crop_data in CROPS.items()
    ]
    
    logger.info(f"🌾 Generated {len(crops_list)} crops:")
    for crop in crops_list:
        logger.info(f"  - {crop['id']}: {crop['name']} {crop['icon']}")
    
    response = {'crops': crops_list}
    logger.info(f"🌾 Returning response: {response}")
    return jsonify(response), 200


@app.route('/api/models', methods=['GET'])
def get_models():
    """Return list of available ML models from config."""
    try:
        models_path = BASE_DIR / 'config' / 'models.json'
        if not models_path.exists():
            logger.error("api_get_models_error reason=file_not_found path=%s", models_path)
            return jsonify(error="Model configuration not found on server."), 500
        
        with open(models_path, 'r') as f:
            models = json.load(f)
        return jsonify(models)
    except Exception as e:
        logger.error("api_get_models_error reason=read_error error=%s", str(e))
        return jsonify(error="Failed to load model configuration."), 500


@app.route('/api/scans', methods=['POST'])
def upload_scan():
    """Handle leaf photo upload and trigger diagnosis."""
    if 'image' not in request.files:
        return jsonify(error='No image file provided'), 400

    file = request.files['image']
    crop_id = int(request.form.get('crop_id', 1))
    model_id = request.form.get('model_id', 'unified_v2')  # Default to unified v2 model

    if file.filename == '':
        return jsonify(error='No selected file'), 400

    if not allowed_file(file.filename):
        return jsonify(error='Invalid file type. Allowed: jpg, jpeg, png, webp'), 400

    # Get ML crop_id for model selection
    ml_crop_id = CROPS.get(crop_id, {}).get('ml_crop_id')

    # Generate unique filename
    scan_uuid = str(uuid.uuid4())
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{scan_uuid}.{ext}"
    filepath = UPLOAD_FOLDER / filename

    # Save file
    file.save(str(filepath))

    fp = file_fingerprint(filepath)
    logger.info(
        "scan_upload_saved scan_uuid=%s crop_id=%s ml_crop_id=%s model_id=%s filename=%s size=%s sha256_1mb=%s",
        scan_uuid,
        crop_id,
        ml_crop_id,
        model_id,
        filename,
        fp.get('size'),
        fp.get('sha256_1mb'),
    )

    # Initialize variables
    prediction = None
    heatmap_url = None
    heatmap_filename = None

    try:
        # Run ML inference based on selected model
        if model_id in ('unified_v2', 'v2_enhanced', 'efficientnet_b0', 'yolov8_cls'):
            # Try unified model first for supported crops
            from ml.unified_inference import predict_npk_unified, get_unified_metadata
            unified_meta = get_unified_metadata()
            # Check both 'supported_crops' (v2 format) and 'crops' (EnhancedModel3 format)
            supported_crops = unified_meta.get('supported_crops', unified_meta.get('crops', []))
            
            if ml_crop_id and ml_crop_id.lower() in [c.lower() for c in supported_crops]:
                prediction = predict_npk_unified(str(filepath), crop_id=ml_crop_id, generate_heatmap=True)
                heatmap_base64 = prediction.pop('heatmap', None)
                
                # Save heatmap to disk if generated
                if heatmap_base64 and heatmap_base64.startswith('data:image'):
                    try:
                        import base64
                        base64_data = heatmap_base64.split(',', 1)[1]
                        heatmap_bytes = base64.b64decode(base64_data)
                        
                        heatmap_filename = f"heatmap_{scan_uuid}.jpg"
                        heatmap_path = UPLOAD_FOLDER / heatmap_filename
                        with open(heatmap_path, 'wb') as f:
                            f.write(heatmap_bytes)
                        
                        heatmap_url = f"/api/images/{heatmap_filename}"
                        logger.info("heatmap_saved filename=%s", heatmap_filename)
                    except Exception as e:
                        logger.warning("heatmap_save_failed error=%s", str(e))
                        heatmap_url = heatmap_base64
                
                logger.info(
                    "scan_inference_unified scan_uuid=%s model_id=%s ml_crop=%s scores=(n=%.4f,p=%.4f,k=%.4f) detected=%s",
                    scan_uuid, model_id, ml_crop_id,
                    float(prediction.get('n_score', 0.0)),
                    float(prediction.get('p_score', 0.0)),
                    float(prediction.get('k_score', 0.0)),
                    prediction.get('detected_class'),
                )
            else:
                # Fallback to legacy inference
                from ml.inference import predict_npk, generate_gradcam_heatmap
                prediction = predict_npk(str(filepath), crop_id=ml_crop_id)
                heatmap_base64 = generate_gradcam_heatmap(str(filepath), crop_id=ml_crop_id)
                
                if heatmap_base64 and isinstance(heatmap_base64, str) and heatmap_base64.startswith('data:image'):
                    try:
                        import base64
                        base64_data = heatmap_base64.split(',', 1)[1]
                        heatmap_bytes = base64.b64decode(base64_data)
                        
                        heatmap_filename = f"heatmap_{scan_uuid}.jpg"
                        heatmap_path_file = UPLOAD_FOLDER / heatmap_filename
                        with open(heatmap_path_file, 'wb') as f:
                            f.write(heatmap_bytes)
                        
                        heatmap_url = f"/api/images/{heatmap_filename}"
                    except Exception as e:
                        logger.warning("heatmap_save_failed error=%s", str(e))
                        heatmap_url = heatmap_base64
                
                logger.info(
                    "scan_inference_legacy scan_uuid=%s model_id=%s ml_crop=%s scores=(n=%.4f,p=%.4f,k=%.4f)",
                    scan_uuid, model_id, ml_crop_id,
                    float(prediction.get('n_score', 0.0)),
                    float(prediction.get('p_score', 0.0)),
                    float(prediction.get('k_score', 0.0)),
                )
        else:
            # Legacy model
            from ml.inference import predict_npk, generate_gradcam_heatmap
            prediction = predict_npk(str(filepath), crop_id=ml_crop_id)
            heatmap_base64 = generate_gradcam_heatmap(str(filepath), crop_id=ml_crop_id)
            
            if heatmap_base64 and isinstance(heatmap_base64, str) and heatmap_base64.startswith('data:image'):
                try:
                    import base64
                    base64_data = heatmap_base64.split(',', 1)[1]
                    heatmap_bytes = base64.b64decode(base64_data)
                    
                    heatmap_filename = f"heatmap_{scan_uuid}.jpg"
                    heatmap_path_file = UPLOAD_FOLDER / heatmap_filename
                    with open(heatmap_path_file, 'wb') as f:
                        f.write(heatmap_bytes)
                    
                    heatmap_url = f"/api/images/{heatmap_filename}"
                except Exception as e:
                    logger.warning("heatmap_save_failed error=%s", str(e))
            
            logger.info(
                "scan_inference_legacy scan_uuid=%s model_id=%s scores=(n=%.4f,p=%.4f,k=%.4f)",
                scan_uuid, model_id,
                float(prediction.get('n_score', 0.0)),
                float(prediction.get('p_score', 0.0)),
                float(prediction.get('k_score', 0.0)),
            )

    except Exception as e:
        logger.exception("scan_inference_error scan_uuid=%s filename=%s error=%s", scan_uuid, filename, str(e))
        # Fallback to mock predictions
        import random
        prediction = {
            'n_score': random.uniform(0.2, 0.9),
            'p_score': random.uniform(0.2, 0.9),
            'k_score': random.uniform(0.2, 0.9),
            'n_confidence': random.uniform(0.75, 0.95),
            'p_confidence': random.uniform(0.75, 0.95),
            'k_confidence': random.uniform(0.75, 0.95),
            'n_severity': 'attention',
            'p_severity': 'healthy',
            'k_severity': 'attention',
            'overall_status': 'attention',
            'detected_class': 'nitrogen_deficiency',
            'inference_method': 'app_fallback_random'
        }
        heatmap_url = None
        heatmap_filename = None

        logger.warning(
            "scan_inference_fallback scan_uuid=%s model_id=%s method=%s scores=(n=%.4f,p=%.4f,k=%.4f)",
            scan_uuid,
            model_id,
            prediction.get('inference_method'),
            float(prediction.get('n_score', 0.0)),
            float(prediction.get('p_score', 0.0)),
            float(prediction.get('k_score', 0.0)),
        )

    # Get recommendations
    recommendations, priority = generate_recommendations(
        crop_id,
        prediction['n_score'],
        prediction['p_score'],
        prediction['k_score']
    )

    # Save to database
    db = get_db()
    cursor = db.cursor()
    
    # Get user ID and ensure user exists
    user_id = get_user_id()
    ensure_user_exists(user_id)

    # Insert scan record
    cursor.execute('''
        INSERT INTO leaf_scans (scan_uuid, user_id, crop_id, image_path, image_filename, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (scan_uuid, user_id, crop_id, str(filepath), filename, 'completed'))

    scan_id = cursor.lastrowid

    # Insert diagnosis record (include heatmap_path and user_id)
    cursor.execute('''
        INSERT INTO diagnoses (
            scan_id, user_id, n_score, p_score, k_score,
            n_confidence, p_confidence, k_confidence,
            n_severity, p_severity, k_severity,
            overall_status, detected_class, heatmap_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        scan_id,
        user_id,
        prediction['n_score'],
        prediction['p_score'],
        prediction['k_score'],
        prediction.get('n_confidence', 0.8),
        prediction.get('p_confidence', 0.8),
        prediction.get('k_confidence', 0.8),
        prediction['n_severity'],
        prediction['p_severity'],
        prediction['k_severity'],
        prediction['overall_status'],
        prediction['detected_class'],
        heatmap_filename
    ))

    # Insert recommendations
    cursor.execute('''
        INSERT INTO recommendations (
            scan_id, user_id, n_recommendation, p_recommendation, k_recommendation,
            n_recommendation_hi, p_recommendation_hi, k_recommendation_hi, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        scan_id,
        user_id,
        recommendations['n'].get('en', ''),
        recommendations['p'].get('en', ''),
        recommendations['k'].get('en', ''),
        recommendations['n'].get('hi', ''),
        recommendations['p'].get('hi', ''),
        recommendations['k'].get('hi', ''),
        priority
    ))

    db.commit()

    # Build response
    crop = CROPS[crop_id]
    response = {
        'scan_id': scan_id,
        'scan_uuid': scan_uuid,
        'user_id': user_id,  # Include user_id for sync
        'status': 'completed',

        # Crop info
        'crop_id': crop_id,
        'crop_name': crop['name'],
        'crop_name_hi': crop['name_hi'],
        'crop_icon': crop['icon'],

        # NPK Scores (0-100%)
        'n_score': round(prediction['n_score'] * 100, 1),
        'p_score': round(prediction['p_score'] * 100, 1),
        'k_score': round(prediction['k_score'] * 100, 1),

        # Confidence (0-100%)
        'n_confidence': round(prediction.get('n_confidence', 0.8) * 100, 1),
        'p_confidence': round(prediction.get('p_confidence', 0.8) * 100, 1),
        'k_confidence': round(prediction.get('k_confidence', 0.8) * 100, 1),

        # Severity levels
        'n_severity': prediction['n_severity'],
        'p_severity': prediction['p_severity'],
        'k_severity': prediction['k_severity'],
        'overall_status': prediction['overall_status'],

        # Detected class
        'detected_class': prediction['detected_class'],

        # Recommendations
        'recommendations': recommendations,
        'priority': priority,

        # Image URLs
        'image_url': f"/api/images/{filename}",
        'original_image_url': f"/api/images/{filename}",
        'heatmap': heatmap_url,

        # Timestamp
        'created_at': datetime.now().isoformat()
    }

    return jsonify(response), 201


def safe_float_convert(value):
    """Safely convert a score value to float, handling binary data.
    
    SQLite sometimes stores float values as BLOB (binary data).
    This function handles both regular float/int values and binary-encoded floats.
    """
    if value is None:
        return None
    
    # If it's already a number, return it
    if isinstance(value, (int, float)):
        return float(value)
    
    # If it's binary data (bytes), unpack as float
    if isinstance(value, bytes):
        import struct
        if len(value) == 4:
            # 4-byte float (IEEE 754 single precision)
            return struct.unpack('<f', value)[0]
        elif len(value) == 8:
            # 8-byte double
            return struct.unpack('<d', value)[0]
    
    # If it's a string, try to convert
    try:
        return float(value)
    except (ValueError, TypeError):
        app.logger.warning(f"Could not convert value to float: {value}")
        return None


@app.route('/api/scans', methods=['GET'])
def get_scans():
    """Get scan history for current user."""
    db = get_db()
    cursor = db.cursor()
    
    # Get user ID from header
    user_id = get_user_id()
    
    # Get optional filters
    crop_id = request.args.get('crop_id', type=int)
    limit = request.args.get('limit', 50, type=int)
    
    query = '''
        SELECT 
            s.id, s.scan_uuid, s.crop_id, s.image_filename, s.status, s.created_at,
            c.name as crop_name, c.name_hi as crop_name_hi, c.icon as crop_icon,
            d.n_score, d.p_score, d.k_score,
            d.n_confidence, d.p_confidence, d.k_confidence,
            d.n_severity, d.p_severity, d.k_severity,
            d.overall_status, d.detected_class
        FROM leaf_scans s
        LEFT JOIN crops c ON s.crop_id = c.id
        LEFT JOIN diagnoses d ON s.id = d.scan_id
        WHERE s.user_id = ?
    '''
    
    params = [user_id]
    if crop_id:
        query += ' AND s.crop_id = ?'
        params.append(crop_id)
    
    query += ' ORDER BY s.created_at DESC LIMIT ?'
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    scans = []
    for row in rows:
        # Database stores health scores (0-1 range, where 1 = healthy)
        # Convert to percentage (0-100%) directly, no inversion needed
        n_score_raw = safe_float_convert(row['n_score'])
        p_score_raw = safe_float_convert(row['p_score'])
        k_score_raw = safe_float_convert(row['k_score'])
        
        n_health = round(n_score_raw * 100, 1) if n_score_raw is not None else None
        p_health = round(p_score_raw * 100, 1) if p_score_raw is not None else None
        k_health = round(k_score_raw * 100, 1) if k_score_raw is not None else None
        
        scan = {
            'scan_id': row['id'],
            'scan_uuid': row['scan_uuid'],
            'crop_id': row['crop_id'],
            'crop_name': row['crop_name'],
            'crop_name_hi': row['crop_name_hi'],
            'crop_icon': row['crop_icon'],
            'image_url': f"/api/images/{row['image_filename']}" if row['image_filename'] else None,
            'status': row['status'],
            'n_score': n_health,
            'p_score': p_health,
            'k_score': k_health,
            'n_severity': row['n_severity'],
            'p_severity': row['p_severity'],
            'k_severity': row['k_severity'],
            'overall_status': row['overall_status'],
            'detected_class': row['detected_class'],
            'created_at': row['created_at']
        }
        scans.append(scan)
    
    return jsonify({'scans': scans, 'count': len(scans)}), 200


@app.route('/api/scans/<int:scan_id>', methods=['GET'])
def get_scan(scan_id):
    """Get single scan details with full recommendations for current user."""
    db = get_db()
    cursor = db.cursor()
    
    # Get user ID for authorization
    user_id = get_user_id()
    
    cursor.execute('''
        SELECT 
            s.id, s.scan_uuid, s.crop_id, s.image_filename, s.status, s.created_at,
            c.name as crop_name, c.name_hi as crop_name_hi, c.icon as crop_icon,
            d.n_score, d.p_score, d.k_score,
            d.n_confidence, d.p_confidence, d.k_confidence,
            d.n_severity, d.p_severity, d.k_severity,
            d.overall_status, d.detected_class, d.heatmap_path,
            r.n_recommendation, r.p_recommendation, r.k_recommendation,
            r.n_recommendation_hi, r.p_recommendation_hi, r.k_recommendation_hi,
            r.priority
        FROM leaf_scans s
        LEFT JOIN crops c ON s.crop_id = c.id
        LEFT JOIN diagnoses d ON s.id = d.scan_id
        LEFT JOIN recommendations r ON s.id = r.scan_id
        WHERE s.id = ? AND s.user_id = ?
    ''', (scan_id, user_id))
    
    row = cursor.fetchone()
    
    if not row:
        return jsonify({'error': 'Scan not found or access denied'}), 404
    
    # Database stores health scores (0-1 range, where 1 = healthy)
    # Convert to percentage (0-100%) directly, no inversion needed
    # Use safe_float_convert to handle potential binary data
    n_score_raw = safe_float_convert(row['n_score'])
    p_score_raw = safe_float_convert(row['p_score'])
    k_score_raw = safe_float_convert(row['k_score'])
    n_conf_raw = safe_float_convert(row['n_confidence'])
    p_conf_raw = safe_float_convert(row['p_confidence'])
    k_conf_raw = safe_float_convert(row['k_confidence'])
    
    n_health = round(n_score_raw * 100, 1) if n_score_raw is not None else None
    p_health = round(p_score_raw * 100, 1) if p_score_raw is not None else None
    k_health = round(k_score_raw * 100, 1) if k_score_raw is not None else None
    
    scan = {
        'scan_id': row['id'],
        'scan_uuid': row['scan_uuid'],
        'crop_id': row['crop_id'],
        'crop_name': row['crop_name'],
        'crop_name_hi': row['crop_name_hi'],
        'crop_icon': row['crop_icon'],
        'image_url': f"/api/images/{row['image_filename']}" if row['image_filename'] else None,
        'status': row['status'],
        'n_score': n_health,
        'p_score': p_health,
        'k_score': k_health,
        'n_confidence': round(n_conf_raw * 100, 1) if n_conf_raw is not None else None,
        'p_confidence': round(p_conf_raw * 100, 1) if p_conf_raw is not None else None,
        'k_confidence': round(k_conf_raw * 100, 1) if k_conf_raw is not None else None,
        'n_severity': row['n_severity'],
        'p_severity': row['p_severity'],
        'k_severity': row['k_severity'],
        'overall_status': row['overall_status'],
        'detected_class': row['detected_class'],
        'heatmap': f"/api/images/{row['heatmap_path']}" if row['heatmap_path'] else None,
        'original_image_url': f"/api/images/{row['image_filename']}" if row['image_filename'] else None,
        'recommendations': {
            'n': {
                'en': row['n_recommendation'] or '',
                'hi': row['n_recommendation_hi'] or ''
            },
            'p': {
                'en': row['p_recommendation'] or '',
                'hi': row['p_recommendation_hi'] or ''
            },
            'k': {
                'en': row['k_recommendation'] or '',
                'hi': row['k_recommendation_hi'] or ''
            }
        },
        'priority': row['priority'],
        'created_at': row['created_at']
    }
    
    return jsonify(scan), 200


@app.route('/api/scans', methods=['DELETE'])
def clear_scans():
    """Clear all scan history for current user."""
    db = get_db()
    cursor = db.cursor()
    
    # Get user ID for isolation
    user_id = get_user_id()
    
    # Get all scan IDs for this user
    cursor.execute('SELECT id FROM leaf_scans WHERE user_id = ?', (user_id,))
    scan_ids = [row['id'] for row in cursor.fetchall()]
    
    # Explicitly delete child records first for each scan
    for scan_id in scan_ids:
        cursor.execute('DELETE FROM recommendations WHERE scan_id = ?', (scan_id,))
        cursor.execute('DELETE FROM diagnoses WHERE scan_id = ?', (scan_id,))
    
    # Now delete all scans for this user
    cursor.execute('DELETE FROM leaf_scans WHERE user_id = ?', (user_id,))
    
    db.commit()
    
    # Note: We don't clear ALL uploaded images since other users may have scans
    # Image cleanup should be done via a separate maintenance task
    
    return jsonify({'message': 'Your scans cleared successfully'}), 200


@app.route('/api/scans/<scan_id>', methods=['DELETE'])
def delete_scan(scan_id):
    """Delete a specific scan by ID for current user."""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Get user ID for authorization
        user_id = get_user_id()
        
        # First get the scan to verify ownership and find the image file
        cursor.execute('SELECT image_path FROM leaf_scans WHERE id = ? AND user_id = ?', (scan_id, user_id))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({'error': 'Scan not found or access denied'}), 404
        
        # Explicitly delete child records first (CASCADE might not work reliably)
        cursor.execute('DELETE FROM recommendations WHERE scan_id = ?', (scan_id,))
        cursor.execute('DELETE FROM diagnoses WHERE scan_id = ?', (scan_id,))
        
        # Now delete the scan itself
        cursor.execute('DELETE FROM leaf_scans WHERE id = ? AND user_id = ?', (scan_id, user_id))
        db.commit()
        
        # Delete the image file if it exists
        if row['image_path']:
            image_file = UPLOAD_FOLDER / Path(row['image_path']).name
            if image_file.exists():
                image_file.unlink()
        
        logger.info(f"Deleted scan: {scan_id} for user: {user_id[:8]}...")
        return jsonify({'message': 'Scan deleted successfully', 'scan_id': scan_id}), 200
        
    except Exception as e:
        logger.exception(f"Error deleting scan {scan_id}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/scans/<scan_id>', methods=['PATCH'])
def update_scan(scan_id):
    """Update a scan's metadata (e.g., rename crop) for current user."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No update data provided'}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        # Get user ID for authorization
        user_id = get_user_id()
        
        # Verify ownership first
        cursor.execute('SELECT * FROM leaf_scans WHERE id = ? AND user_id = ?', (scan_id, user_id))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({'error': 'Scan not found or access denied'}), 404
        
        # Build update query dynamically for allowed fields
        allowed_fields = ['crop_id', 'overall_status', 'confidence']
        update_parts = []
        values = []
        
        for field in allowed_fields:
            if field in data:
                update_parts.append(f'{field} = ?')
                values.append(data[field])
        
        if not update_parts:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        values.append(scan_id)
        query = f"UPDATE leaf_scans SET {', '.join(update_parts)} WHERE id = ?"
        cursor.execute(query, values)
        db.commit()
        
        # Fetch and return updated scan
        cursor.execute('''
            SELECT ls.*, d.n_score, d.p_score, d.k_score, d.mg_score,
                   d.n_severity, d.p_severity, d.k_severity, d.mg_severity
            FROM leaf_scans ls
            LEFT JOIN diagnoses d ON ls.id = d.scan_id
            WHERE ls.id = ?
        ''', (scan_id,))
        updated_row = cursor.fetchone()
        
        # Get crop info
        crop_id = updated_row['crop_id']
        crop = CROPS.get(crop_id, CROPS.get(1))
        
        scan_result = {
            'scan_id': updated_row['id'],
            'crop_id': crop_id,
            'crop_name': crop['ml_crop_id'],
            'overall_status': updated_row['overall_status'],
            'confidence': updated_row['confidence'],
            'n_score': updated_row['n_score'],
            'p_score': updated_row['p_score'],
            'k_score': updated_row['k_score'],
            'mg_score': updated_row['mg_score'],
            'n_severity': updated_row['n_severity'],
            'p_severity': updated_row['p_severity'],
            'k_severity': updated_row['k_severity'],
            'mg_severity': updated_row['mg_severity'],
            'image_url': updated_row['image_path'],
            'created_at': updated_row['created_at'],
        }
        
        logger.info(f"Updated scan: {scan_id}, fields: {list(data.keys())}")
        return jsonify(scan_result), 200
        
    except Exception as e:
        logger.exception(f"Error updating scan {scan_id}")
        return jsonify({'error': str(e)}), 500


# ============================================
# RESULTS API (Crop-Specific Scan Comparison)
# ============================================

@app.route('/api/results/latest', methods=['GET'])
def get_latest_scan():
    """
    Get latest scan for a specific crop.
    Query params: crop_id (required)
    """
    try:
        crop_id = request.args.get('crop_id', type=int)
        if not crop_id:
            return jsonify({'error': 'crop_id is required'}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        # Get latest scan for this crop
        cursor.execute('''
            SELECT ls.*, d.n_score, d.p_score, d.k_score, d.mg_score,
                   d.n_severity, d.p_severity, d.k_severity, d.mg_severity
            FROM leaf_scans ls
            LEFT JOIN diagnoses d ON ls.id = d.scan_id
            WHERE ls.crop_id = ?
            ORDER BY ls.created_at DESC
            LIMIT 1
        ''', (crop_id,))
        
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'No scans found for this crop'}), 404
        
        crop = CROPS.get(crop_id, CROPS.get(1))
        
        result = {
            'scan_id': row['id'],
            'crop_id': crop_id,
            'crop_name': crop['ml_crop_id'],
            'scan_date': row['created_at'],
            'nutrients': {
                'nitrogen': {
                    'value': row['n_score'],
                    'unit': '%',
                    'severity': row['n_severity']
                },
                'phosphorus': {
                    'value': row['p_score'],
                    'unit': '%',
                    'severity': row['p_severity']
                },
                'potassium': {
                    'value': row['k_score'],
                    'unit': '%',
                    'severity': row['k_severity']
                }
            },
            'overall_status': row['overall_status'],
            'confidence': row['confidence'],
            'image_url': row['image_path']
        }
        
        if row['mg_score'] is not None:
            result['nutrients']['magnesium'] = {
                'value': row['mg_score'],
                'unit': '%',
                'severity': row['mg_severity']
            }
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.exception("Error fetching latest scan")
        return jsonify({'error': str(e)}), 500


@app.route('/api/results/history', methods=['GET'])
def get_scan_history_for_results():
    """
    Get scan history for a specific crop (for comparison).
    Query params: 
      - crop_id (required)
      - limit (optional, default=2) - number of scans to return
    Returns scans in descending chronological order (latest first)
    """
    try:
        crop_id = request.args.get('crop_id', type=int)
        limit = request.args.get('limit', type=int, default=2)
        
        if not crop_id:
            return jsonify({'error': 'crop_id is required'}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        # Get recent scans for this crop
        cursor.execute('''
            SELECT ls.*, d.n_score, d.p_score, d.k_score, d.mg_score,
                   d.n_severity, d.p_severity, d.k_severity, d.mg_severity
            FROM leaf_scans ls
            LEFT JOIN diagnoses d ON ls.id = d.scan_id
            WHERE ls.crop_id = ?
            ORDER BY ls.created_at DESC
            LIMIT ?
        ''', (crop_id, limit))
        
        rows = cursor.fetchall()
        crop = CROPS.get(crop_id, CROPS.get(1))
        
        scans = []
        for row in rows:
            scan = {
                'scan_id': row['id'],
                'crop_id': crop_id,
                'crop_name': crop['ml_crop_id'],
                'scan_date': row['created_at'],
                'nutrients': {
                    'nitrogen': {
                        'value': row['n_score'],
                        'unit': '%',
                        'severity': row['n_severity']
                    },
                    'phosphorus': {
                        'value': row['p_score'],
                        'unit': '%',
                        'severity': row['p_severity']
                    },
                    'potassium': {
                        'value': row['k_score'],
                        'unit': '%',
                        'severity': row['k_severity']
                    }
                },
                'overall_status': row['overall_status'],
                'confidence': row['confidence'],
                'image_url': row['image_path']
            }
            
            if row['mg_score'] is not None:
                scan['nutrients']['magnesium'] = {
                    'value': row['mg_score'],
                    'unit': '%',
                    'severity': row['mg_severity']
                }
            
            scans.append(scan)
        
        return jsonify({'scans': scans, 'total': len(scans)}), 200
        
    except Exception as e:
        logger.exception("Error fetching scan history")
        return jsonify({'error': str(e)}), 500


@app.route('/api/images/<filename>')
def serve_image(filename):
    """Serve uploaded images."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/api/model/info', methods=['GET'])
def get_model_info():
    """Get ML model information."""
    try:
        from ml.inference import get_model_info as ml_model_info
        info = ml_model_info()
    except Exception as e:
        info = {
            'model_name': 'FasalVaidya NPK Detector',
            'version': '1.0.0',
            'status': 'mock_mode',
            'error': str(e)
        }
    
    return jsonify(info), 200


# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400


# ============================================
# AI CHAT ENDPOINT
# ============================================

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    AI chat endpoint using Ollama with vision support.
    
    Request body:
        message: str - User's message
        history: list - Previous chat messages [{'role': 'user'/'assistant', 'content': '...'}]
        context: dict - Scan data context (optional)
        image: str - Base64 encoded image for vision analysis (optional)
        
    Returns:
        response: str - AI response
        success: bool
        error: str (if failed)
        needs_connection: bool (if Ollama unavailable)
    """
    try:
        from ml.ollama_client import chat_with_ollama, check_ollama_available
        
        data = request.json or {}
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({'error': 'Message is required', 'success': False}), 400
        
        # Get optional parameters
        chat_history = data.get('history', [])
        context = data.get('context')
        image_base64 = data.get('image')
        
        logger.info("chat_request message_length=%d history_count=%d has_context=%s has_image=%s",
                   len(message), len(chat_history), bool(context), bool(image_base64))
        
        # Extract optional language preference sent by frontend (e.g., 'hi', 'en')
        language = data.get('language')

        # Call Ollama
        result = chat_with_ollama(
            message=message,
            chat_history=chat_history,
            context=context,
            image_base64=image_base64,
            language=language
        )
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'response': result['response'],
                'model': result.get('model')
            }), 200
        else:
            # Check if it's a connection issue
            if result.get('needs_connection'):
                return jsonify({
                    'success': False,
                    'error': result.get('error', 'AI service unavailable'),
                    'needs_connection': True,
                    'message': 'Need an active internet connection to use AI analysis. Please ensure Ollama is running on your computer.'
                }), 503
            else:
                return jsonify({
                    'success': False,
                    'error': result.get('error', 'Unknown error')
                }), 500
                
    except ImportError as e:
        logger.error("ollama_import_failed error=%s", str(e))
        return jsonify({
            'success': False,
            'error': 'AI module not available',
            'needs_connection': True
        }), 503
    except Exception as e:
        logger.exception("chat_error")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/chat/status', methods=['GET'])
def chat_status():
    """Check if AI chat service (Ollama) is available."""
    try:
        from ml.ollama_client import check_ollama_available
        
        status = check_ollama_available()
        
        if status['available']:
            return jsonify({
                'available': True,
                'models': status.get('models', []),
                'has_vision_model': status.get('has_vision_model', False),
                'recommended_model': status.get('recommended_model')
            }), 200
        else:
            return jsonify({
                'available': False,
                'error': status.get('error', 'Ollama not available'),
                'message': 'Need an active internet connection to use AI analysis. Please ensure Ollama is running.'
            }), 503
            
    except ImportError:
        return jsonify({
            'available': False,
            'error': 'AI module not installed'
        }), 503
    except Exception as e:
        logger.exception("chat_status_error")
        return jsonify({
            'available': False,
            'error': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(413)
def file_too_large(error):
    return jsonify({'error': 'File too large. Maximum size is 16MB'}), 413


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


# ============================================
# REPORT & EXPORT ENDPOINTS
# ============================================

@app.route('/api/reports/preview', methods=['GET'])
def preview_report():
    """
    Generate report preview for a scan.
    
    Query Params:
        - scan_id: The scan ID to generate report for
        
    Returns:
        - Complete report data with health classification, comparisons, and recommendations
    """
    scan_id = request.args.get('scan_id', type=int)
    
    if not scan_id:
        return jsonify({'error': 'scan_id is required'}), 400
    
    try:
        from ml.health_engine import generate_report_data, get_config
        
        db = get_db()
        
        # Get current scan
        current = db.execute('''
            SELECT 
                ls.id as scan_id, ls.scan_uuid, ls.crop_id, ls.created_at,
                d.n_score, d.p_score, d.k_score, 
                d.n_confidence, d.p_confidence, d.k_confidence,
                d.n_severity, d.p_severity, d.k_severity,
                d.overall_status, d.detected_class
            FROM leaf_scans ls
            JOIN diagnoses d ON d.scan_id = ls.id
            WHERE ls.id = ?
        ''', (scan_id,)).fetchone()
        
        if not current:
            return jsonify({'error': 'Scan not found'}), 404
        
        scan_data = dict(current)
        crop_id = scan_data['crop_id']
        crop_data = CROPS.get(crop_id, CROPS[1])
        
        logger.info(
            "report_preview_db_data scan_id=%s raw_db=(n=%.4f,p=%.4f,k=%.4f) crop_id=%s",
            scan_id,
            scan_data.get('n_score', 0),
            scan_data.get('p_score', 0),
            scan_data.get('k_score', 0),
            crop_id
        )
        
        # Get previous scan for comparison
        previous = db.execute('''
            SELECT 
                ls.id as scan_id, ls.scan_uuid, ls.crop_id, ls.created_at,
                d.n_score, d.p_score, d.k_score,
                d.n_severity, d.p_severity, d.k_severity,
                d.overall_status
            FROM leaf_scans ls
            JOIN diagnoses d ON d.scan_id = ls.id
            WHERE ls.crop_id = ? AND ls.id < ?
            ORDER BY ls.id DESC
            LIMIT 1
        ''', (crop_id, scan_id)).fetchone()
        
        # Get baseline (first) scan
        baseline = db.execute('''
            SELECT 
                ls.id as scan_id, ls.scan_uuid, ls.crop_id, ls.created_at,
                d.n_score, d.p_score, d.k_score,
                d.n_severity, d.p_severity, d.k_severity,
                d.overall_status
            FROM leaf_scans ls
            JOIN diagnoses d ON d.scan_id = ls.id
            WHERE ls.crop_id = ?
            ORDER BY ls.id ASC
            LIMIT 1
        ''', (crop_id,)).fetchone()
        
        previous_data = dict(previous) if previous and previous['scan_id'] != scan_id else None
        baseline_data = dict(baseline) if baseline and baseline['scan_id'] != scan_id else None
        
        logger.info(
            "report_preview_comparison scan_id=%s has_previous=%s has_baseline=%s",
            scan_id,
            previous_data is not None,
            baseline_data is not None
        )
        
        logger.info(
            "report_preview_generating scan_id=%s crop_id=%s scan_data=%s",
            scan_id, crop_id, 
            {k: v for k, v in scan_data.items() if k not in ['image_path', 'image_filename']}
        )
        
        # Generate report
        report = generate_report_data(
            scan_data=scan_data,
            crop_data={'id': crop_id, **crop_data},
            previous_scan=previous_data,
            baseline_scan=baseline_data
        )
        
        # Flatten for frontend compatibility
        flattened_report = {
            **report,
            # Flatten top-level scan fields for easy access
            'scan_id': report['current_scan']['scan_id'],
            'scan_date': report['current_scan']['scan_date'],
            'scan_uuid': report['current_scan']['scan_uuid'],
            'crop_name': report['field_info']['crop_name'],
            'crop_name_hi': report['field_info']['crop_name_hi'],
            'crop_icon': report['field_info']['crop_icon'],
            # Flatten NPK scores (convert to 0-100 percentages)
            'n_score': round(report['current_scan']['nutrients']['nitrogen']['health_score'], 1),
            'p_score': round(report['current_scan']['nutrients']['phosphorus']['health_score'], 1),
            'k_score': round(report['current_scan']['nutrients']['potassium']['health_score'], 1),
            'n_severity': report['current_scan']['nutrients']['nitrogen']['severity'],
            'p_severity': report['current_scan']['nutrients']['phosphorus']['severity'],
            'k_severity': report['current_scan']['nutrients']['potassium']['severity'],
            'overall_score': report['health_classification']['overall_score'],
        }
        
        # Add rescan_date to health_classification for compatibility
        if 'recommended_next_scan' in report['health_classification']:
            flattened_report['health_classification']['rescan_date'] = report['health_classification']['recommended_next_scan']
        
        # Build comparison object for frontend (only if there's actual historical data)
        hist = report.get('historical_comparison', {})
        has_real_history = hist.get('has_history', False) and previous_data is not None
        has_real_baseline = hist.get('has_baseline', False) and baseline_data is not None
        
        logger.info(
            "report_preview_history has_real_history=%s has_real_baseline=%s",
            has_real_history, has_real_baseline
        )
        
        if has_real_history or has_real_baseline:
            comparisons = hist.get('comparisons', {})
            
            # Determine overall trend
            overall_trend = hist.get('overall_trend', {})
            trend_direction = overall_trend.get('direction', 'stable')
            trend_label = {
                'increase': 'Improving' if overall_trend.get('delta', 0) > 0 else 'Needs Attention',
                'decrease': 'Declining',
                'stable': 'Stable'
            }.get(trend_direction, 'Stable')
            
            # Calculate changes (convert from deficiency delta to health delta)
            n_comp = comparisons.get('n', {}).get('vs_previous') or comparisons.get('n', {}).get('vs_baseline')
            p_comp = comparisons.get('p', {}).get('vs_previous') or comparisons.get('p', {}).get('vs_baseline')
            k_comp = comparisons.get('k', {}).get('vs_previous') or comparisons.get('k', {}).get('vs_baseline')
            
            # Since lower deficiency = improvement, negate the delta for health display
            n_change = round(-n_comp.get('delta', 0) * 100, 1) if n_comp else 0
            p_change = round(-p_comp.get('delta', 0) * 100, 1) if p_comp else 0
            k_change = round(-k_comp.get('delta', 0) * 100, 1) if k_comp else 0
            
            # Get baseline date from first nutrient that has it
            baseline_date = None
            for nutrient in ['n', 'p', 'k']:
                comp = comparisons.get(nutrient, {})
                if comp.get('baseline_date'):
                    baseline_date = comp['baseline_date']
                    break
                if comp.get('previous_date'):
                    baseline_date = comp['previous_date']
                    break
            
            flattened_report['comparison'] = {
                'trend': trend_direction,
                'trend_label': trend_label,
                'changes': {
                    'n_change': n_change,
                    'p_change': p_change,
                    'k_change': k_change
                },
                'baseline_date': baseline_date or report['current_scan']['scan_date']
            }
        
        # Flatten recommendations array for frontend compatibility
        fertilizer_recs = report.get('recommendations', {}).get('fertilizer', [])
        flattened_report['recommendations'] = fertilizer_recs
        
        # Generate graph data for frontend charts
        from ml.health_engine import generate_graph_data
        
        # Build list of scans for graph generation (previous + current)
        scans_for_graph = []
        if previous_data:
            scans_for_graph.append(previous_data)
        scans_for_graph.append(scan_data)
        
        # Generate bar chart data (current vs previous comparison)
        if len(scans_for_graph) >= 2:
            bar_chart = generate_graph_data(scans_for_graph, "bar")
        else:
            bar_chart = {"type": "bar", "error": "Need previous scan for comparison"}
        
        # Generate radar chart data
        radar_chart = generate_graph_data(scans_for_graph, "radar")
        
        flattened_report['graph_data'] = {
            'bar_chart': bar_chart,
            'radar_chart': radar_chart,
            'has_comparison': len(scans_for_graph) >= 2
        }
        
        logger.info(
            "report_preview_response scan_id=%s flattened_scores=(n=%.1f,p=%.1f,k=%.1f) overall=%.1f status=%s has_comparison=%s has_graph=%s",
            scan_id,
            flattened_report.get('n_score', 0),
            flattened_report.get('p_score', 0),
            flattened_report.get('k_score', 0),
            flattened_report.get('overall_score', 0),
            flattened_report.get('health_classification', {}).get('status'),
            'comparison' in flattened_report,
            flattened_report.get('graph_data', {}).get('has_comparison', False)
        )
        
        return jsonify(flattened_report), 200
        
    except Exception as e:
        logger.exception("report_preview_error")
        return jsonify({'error': str(e)}), 500


@app.route('/api/reports/export', methods=['POST'])
def export_reports():
    """
    Export reports in specified format.
    
    JSON Body:
        - scan_ids: List of scan IDs to export (optional, exports all if not provided)
        - format: 'pdf', 'xlsx', or 'csv'
        
    Returns:
        - File download
    """
    data = request.get_json() or {}
    scan_ids = data.get('scan_ids', [])
    export_format = data.get('format', 'csv').lower()
    
    if export_format not in ['pdf', 'xlsx', 'csv']:
        return jsonify({'error': 'Invalid format. Supported: pdf, xlsx, csv'}), 400
    
    try:
        from ml.health_engine import generate_report_data
        from ml.report_export import export_to_csv, export_to_excel, export_to_pdf, export_bulk_to_pdf
        
        db = get_db()
        
        # Build query
        if scan_ids:
            placeholders = ','.join('?' * len(scan_ids))
            query = f'''
                SELECT 
                    ls.id as scan_id, ls.scan_uuid, ls.crop_id, ls.created_at,
                    d.n_score, d.p_score, d.k_score, 
                    d.n_confidence, d.p_confidence, d.k_confidence,
                    d.n_severity, d.p_severity, d.k_severity,
                    d.overall_status, d.detected_class
                FROM leaf_scans ls
                JOIN diagnoses d ON d.scan_id = ls.id
                WHERE ls.id IN ({placeholders})
                ORDER BY ls.created_at DESC
            '''
            scans = db.execute(query, scan_ids).fetchall()
        else:
            scans = db.execute('''
                SELECT 
                    ls.id as scan_id, ls.scan_uuid, ls.crop_id, ls.created_at,
                    d.n_score, d.p_score, d.k_score, 
                    d.n_confidence, d.p_confidence, d.k_confidence,
                    d.n_severity, d.p_severity, d.k_severity,
                    d.overall_status, d.detected_class
                FROM leaf_scans ls
                JOIN diagnoses d ON d.scan_id = ls.id
                ORDER BY ls.created_at DESC
                LIMIT 100
            ''').fetchall()
        
        if not scans:
            return jsonify({'error': 'No scans found'}), 404
        
        # Generate reports
        reports = []
        for scan in scans:
            scan_data = dict(scan)
            crop_id = scan_data['crop_id']
            crop_data = CROPS.get(crop_id, CROPS[1])
            
            report = generate_report_data(
                scan_data=scan_data,
                crop_data={'id': crop_id, **crop_data}
            )
            reports.append(report)
        
        # Export based on format
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if export_format == 'csv':
            content = export_to_csv(reports)
            return app.response_class(
                response=content,
                status=200,
                mimetype='text/csv',
                headers={'Content-Disposition': f'attachment; filename=fasalvaidya_report_{timestamp}.csv'}
            )
        
        elif export_format == 'xlsx':
            content = export_to_excel(reports)
            return app.response_class(
                response=content,
                status=200,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                headers={'Content-Disposition': f'attachment; filename=fasalvaidya_report_{timestamp}.xlsx'}
            )
        
        elif export_format == 'pdf':
            if len(reports) == 1:
                content = export_to_pdf(reports[0])
            else:
                content = export_bulk_to_pdf(reports)
            
            return app.response_class(
                response=content,
                status=200,
                mimetype='application/pdf',
                headers={'Content-Disposition': f'attachment; filename=fasalvaidya_report_{timestamp}.pdf'}
            )
        
    except ImportError as e:
        logger.error("export_missing_dependency: %s", str(e))
        return jsonify({'error': f'Missing dependency: {str(e)}'}), 500
    except Exception as e:
        logger.exception("export_error")
        return jsonify({'error': str(e)}), 500


@app.route('/api/scans/history', methods=['GET'])
def get_scan_history_detailed():
    """
    Get detailed scan history with trend analysis.
    
    Query Params:
        - crop_id: Filter by crop (optional)
        - limit: Maximum records (default 50)
        
    Returns:
        - List of scans with health classification and trends
    """
    crop_id = request.args.get('crop_id', type=int)
    limit = request.args.get('limit', 50, type=int)
    
    try:
        from ml.health_engine import classify_health, calculate_overall_score, compare_scans
        
        db = get_db()
        
        if crop_id:
            scans = db.execute('''
                SELECT 
                    ls.id as scan_id, ls.scan_uuid, ls.crop_id, ls.created_at,
                    d.n_score, d.p_score, d.k_score,
                    d.n_severity, d.p_severity, d.k_severity,
                    d.overall_status
                FROM leaf_scans ls
                JOIN diagnoses d ON d.scan_id = ls.id
                WHERE ls.crop_id = ?
                ORDER BY ls.created_at DESC
                LIMIT ?
            ''', (crop_id, limit)).fetchall()
        else:
            scans = db.execute('''
                SELECT 
                    ls.id as scan_id, ls.scan_uuid, ls.crop_id, ls.created_at,
                    d.n_score, d.p_score, d.k_score,
                    d.n_severity, d.p_severity, d.k_severity,
                    d.overall_status
                FROM leaf_scans ls
                JOIN diagnoses d ON d.scan_id = ls.id
                ORDER BY ls.created_at DESC
                LIMIT ?
            ''', (limit,)).fetchall()
        
        result = []
        prev_scan = None
        
        for scan in reversed(scans):  # Process in chronological order for trends
            scan_data = dict(scan)
            overall_score = calculate_overall_score(scan_data)
            health = classify_health(overall_score)
            
            item = {
                'scan_id': scan_data['scan_id'],
                'scan_uuid': scan_data['scan_uuid'],
                'crop_id': scan_data['crop_id'],
                'crop_name': CROPS.get(scan_data['crop_id'], {}).get('name', 'Unknown'),
                'created_at': scan_data['created_at'],
                'n_score': scan_data['n_score'],
                'p_score': scan_data['p_score'],
                'k_score': scan_data['k_score'],
                'overall_score': round(overall_score, 1),
                'health_status': health['status'],
                'health_label': health['label'],
                'health_color': health['color']
            }
            
            # Add trend if we have previous scan
            if prev_scan:
                comparison = compare_scans(scan_data, prev_scan)
                if 'overall_trend' in comparison:
                    item['trend'] = comparison['overall_trend']
            
            result.append(item)
            prev_scan = scan_data
        
        # Reverse back to newest first
        result.reverse()
        
        return jsonify({
            'scans': result,
            'total': len(result)
        }), 200
        
    except Exception as e:
        logger.exception("scan_history_error")
        return jsonify({'error': str(e)}), 500


@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    """
    Get recommendations for a scan or latest scan.
    
    Query Params:
        - scan_id: Specific scan ID (optional, uses latest if not provided)
        - crop_id: Filter by crop when getting latest (optional)
        
    Returns:
        - Rescan and fertilizer recommendations
    """
    scan_id = request.args.get('scan_id', type=int)
    crop_id = request.args.get('crop_id', type=int)
    
    try:
        from ml.health_engine import (
            generate_rescan_recommendation, 
            generate_fertilizer_recommendations,
            classify_health,
            calculate_overall_score
        )
        
        db = get_db()
        
        if scan_id:
            scan = db.execute('''
                SELECT 
                    ls.id as scan_id, ls.crop_id, ls.created_at,
                    d.n_score, d.p_score, d.k_score,
                    d.n_severity, d.p_severity, d.k_severity,
                    d.overall_status
                FROM leaf_scans ls
                JOIN diagnoses d ON d.scan_id = ls.id
                WHERE ls.id = ?
            ''', (scan_id,)).fetchone()
        else:
            # Get latest scan
            query = '''
                SELECT 
                    ls.id as scan_id, ls.crop_id, ls.created_at,
                    d.n_score, d.p_score, d.k_score,
                    d.n_severity, d.p_severity, d.k_severity,
                    d.overall_status
                FROM leaf_scans ls
                JOIN diagnoses d ON d.scan_id = ls.id
            '''
            if crop_id:
                query += ' WHERE ls.crop_id = ?'
                query += ' ORDER BY ls.created_at DESC LIMIT 1'
                scan = db.execute(query, (crop_id,)).fetchone()
            else:
                query += ' ORDER BY ls.created_at DESC LIMIT 1'
                scan = db.execute(query).fetchone()
        
        if not scan:
            return jsonify({'error': 'No scans found'}), 404
        
        scan_data = dict(scan)
        overall_score = calculate_overall_score(scan_data)
        health = classify_health(overall_score)
        
        # Parse created_at date
        try:
            scan_date = datetime.fromisoformat(scan_data['created_at'].replace('Z', '+00:00'))
        except:
            scan_date = None
        
        rescan_rec = generate_rescan_recommendation(health['status'], scan_date)
        fertilizer_recs = generate_fertilizer_recommendations(scan_data, scan_data['crop_id'])
        
        return jsonify({
            'scan_id': scan_data['scan_id'],
            'crop_id': scan_data['crop_id'],
            'crop_name': CROPS.get(scan_data['crop_id'], {}).get('name', 'Unknown'),
            'overall_score': round(overall_score, 1),
            'health_status': health['status'],
            'health_label': health['label'],
            'rescan': rescan_rec,
            'fertilizer': fertilizer_recs,
            'summary': {
                'needs_action': len([r for r in fertilizer_recs if r['action'] == 'apply_fertilizer']) > 0,
                'critical_count': len([r for r in fertilizer_recs if r['priority'] == 'high']),
                'attention_count': len([r for r in fertilizer_recs if r['priority'] == 'medium'])
            }
        }), 200
        
    except Exception as e:
        logger.exception("recommendations_error")
        return jsonify({'error': str(e)}), 500


@app.route('/api/config/thresholds', methods=['GET'])
def get_health_thresholds():
    """Get current health classification thresholds."""
    try:
        from ml.health_engine import get_config
        config = get_config()
        return jsonify(config), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# MAIN ENTRY POINT
# ============================================

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("🌱 FasalVaidya API Server")
    print("=" * 60)
    
    # Initialize database
    init_db()
    
    # Print available routes
    print("\n📡 Available Endpoints:")
    print("  GET  /api/health            - Health check")
    print("  GET  /api/crops             - List supported crops")
    print("  POST /api/scans             - Upload leaf photo & diagnose")
    print("  GET  /api/scans             - Get scan history")
    print("  GET  /api/scans/<id>        - Get single scan details")
    print("  DELETE /api/scans           - Clear all history")
    print("  DELETE /api/scans/<id>      - Delete specific scan")
    print("  PATCH /api/scans/<id>       - Update scan metadata")
    print("  GET  /api/model/info        - Get model information")
    print("  POST /api/chat              - AI chat with Ollama (vision)")
    print("  GET  /api/chat/status       - Check AI service status")
    print("")
    print("📊 Results & Comparison Endpoints:")
    print("  GET  /api/results/latest    - Get latest scan for crop (crop_id)")
    print("  GET  /api/results/history   - Get scan history for comparison")
    print("")
    print("📊 Report & Export Endpoints:")
    print("  GET  /api/reports/preview   - Preview report for a scan")
    print("  POST /api/reports/export    - Export reports (PDF/Excel/CSV)")
    print("  GET  /api/scans/history     - Detailed history with trends")
    print("  GET  /api/recommendations   - Get recommendations for scan")
    print("  GET  /api/config/thresholds - Get health thresholds config")
    print("")
    
    # Start server
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    
    print(f"🚀 Starting server on http://localhost:{port}")
    print(f"   Debug mode: {debug}")
    print("=" * 60 + "\n")
    
    app.run(debug=debug, host='0.0.0.0', port=port)
