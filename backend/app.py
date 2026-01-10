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
    return g.db


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
            crop_id INTEGER DEFAULT 1,
            image_path TEXT NOT NULL,
            image_filename TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (crop_id) REFERENCES crops(id)
        )
    ''')
    
    # Create diagnoses table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS diagnoses (
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
        )
    ''')
    
    # Create recommendations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendations (
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
        )
    ''')
    
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
    return jsonify({'crops': crops_list}), 200


@app.route('/api/scans', methods=['POST'])
def create_scan():
    """
    Upload leaf photo and get NPK diagnosis.
    
    Form Data:
        - image: The leaf image file
        - crop_id: Crop type ID (1=Wheat, 2=Rice, 3=Tomato, 4=Cotton)
    
    Returns:
        - Scan ID, NPK scores, severity levels, and recommendations
    """
    # Validate image file
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: jpg, jpeg, png, webp'}), 400
    
    # Get crop_id from form data
    crop_id = int(request.form.get('crop_id', 1))
    if crop_id not in CROPS:
        crop_id = 1
    
    # Get ML crop_id for model selection
    ml_crop_id = CROPS[crop_id].get('ml_crop_id')
    
    # Generate unique filename
    scan_uuid = str(uuid.uuid4())
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{scan_uuid}.{ext}"
    filepath = UPLOAD_FOLDER / filename
    
    # Save file
    file.save(str(filepath))

    fp = file_fingerprint(filepath)
    logger.info(
        "scan_upload_saved scan_uuid=%s crop_id=%s ml_crop_id=%s filename=%s size=%s sha256_1mb=%s",
        scan_uuid,
        crop_id,
        ml_crop_id,
        filename,
        fp.get('size'),
        fp.get('sha256_1mb'),
    )
    
    # Run ML inference using unified model
    try:
        # Try unified model first (supports rice, wheat, tomato, maize)
        from ml.unified_inference import predict_npk_unified, get_unified_metadata
        
        unified_meta = get_unified_metadata()
        supported_crops = unified_meta.get('supported_crops', [])
        
        if ml_crop_id and ml_crop_id.lower() in supported_crops:
            # Use unified model for supported crops
            prediction = predict_npk_unified(str(filepath), crop_id=ml_crop_id, generate_heatmap=True)
            heatmap_base64 = prediction.pop('heatmap', None)
            
            # Save heatmap to disk if generated
            heatmap_filename = None
            heatmap_url = None
            if heatmap_base64 and heatmap_base64.startswith('data:image'):
                try:
                    # Extract base64 data and decode
                    import base64
                    base64_data = heatmap_base64.split(',', 1)[1]
                    heatmap_bytes = base64.b64decode(base64_data)
                    
                    # Save to uploads folder
                    heatmap_filename = f"heatmap_{scan_uuid}.jpg"
                    heatmap_path = UPLOAD_FOLDER / heatmap_filename
                    with open(heatmap_path, 'wb') as f:
                        f.write(heatmap_bytes)
                    
                    heatmap_url = f"/api/images/{heatmap_filename}"
                    logger.info("heatmap_saved filename=%s", heatmap_filename)
                except Exception as e:
                    logger.warning("heatmap_save_failed error=%s", str(e))
                    heatmap_url = heatmap_base64  # Fallback to base64
            
            logger.info(
                "scan_inference_unified scan_uuid=%s ml_crop=%s method=%s scores=(n=%.4f,p=%.4f,k=%.4f) detected=%s overall=%s",
                scan_uuid,
                ml_crop_id,
                prediction.get('inference_method'),
                float(prediction.get('n_score', 0.0)),
                float(prediction.get('p_score', 0.0)),
                float(prediction.get('k_score', 0.0)),
                prediction.get('detected_class'),
                prediction.get('overall_status'),
            )
        else:
            # Fallback to old crop-specific model for other crops
            from ml.inference import predict_npk, generate_gradcam_heatmap
            prediction = predict_npk(str(filepath), crop_id=ml_crop_id)
            heatmap_base64 = generate_gradcam_heatmap(str(filepath), crop_id=ml_crop_id)
            
            # Save heatmap to disk if generated
            heatmap_filename = None
            heatmap_url = None
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
                    logger.info("heatmap_saved filename=%s", heatmap_filename)
                except Exception as e:
                    logger.warning("heatmap_save_failed error=%s", str(e))
                    heatmap_url = heatmap_base64
            
            logger.info(
                "scan_inference_legacy scan_uuid=%s ml_crop=%s method=%s scores=(n=%.4f,p=%.4f,k=%.4f) detected=%s overall=%s",
                scan_uuid,
                ml_crop_id,
                prediction.get('inference_method'),
                float(prediction.get('n_score', 0.0)),
                float(prediction.get('p_score', 0.0)),
                float(prediction.get('k_score', 0.0)),
                prediction.get('detected_class'),
                prediction.get('overall_status'),
            )
    
    except Exception as e:
        logger.exception("scan_inference_error scan_uuid=%s filename=%s", scan_uuid, filename)
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
            "scan_inference_fallback scan_uuid=%s ml_crop=%s method=%s scores=(n=%.4f,p=%.4f,k=%.4f)",
            scan_uuid,
            ml_crop_id,
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
    
    # Insert scan record
    cursor.execute('''
        INSERT INTO leaf_scans (scan_uuid, crop_id, image_path, image_filename, status)
        VALUES (?, ?, ?, ?, ?)
    ''', (scan_uuid, crop_id, str(filepath), filename, 'completed'))
    
    scan_id = cursor.lastrowid
    
    # Insert diagnosis record (include heatmap_path)
    cursor.execute('''
        INSERT INTO diagnoses (
            scan_id, n_score, p_score, k_score,
            n_confidence, p_confidence, k_confidence,
            n_severity, p_severity, k_severity,
            overall_status, detected_class, heatmap_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        scan_id,
        prediction['n_score'], prediction['p_score'], prediction['k_score'],
        prediction['n_confidence'], prediction['p_confidence'], prediction['k_confidence'],
        prediction['n_severity'], prediction['p_severity'], prediction['k_severity'],
        prediction['overall_status'], prediction['detected_class'], heatmap_filename
    ))
    
    # Insert recommendations
    cursor.execute('''
        INSERT INTO recommendations (
            scan_id, n_recommendation, p_recommendation, k_recommendation,
            n_recommendation_hi, p_recommendation_hi, k_recommendation_hi, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        scan_id,
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
        'n_confidence': round(prediction['n_confidence'] * 100, 1),
        'p_confidence': round(prediction['p_confidence'] * 100, 1),
        'k_confidence': round(prediction['k_confidence'] * 100, 1),
        
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


@app.route('/api/scans', methods=['GET'])
def get_scans():
    """Get scan history."""
    db = get_db()
    cursor = db.cursor()
    
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
    '''
    
    params = []
    if crop_id:
        query += ' WHERE s.crop_id = ?'
        params.append(crop_id)
    
    query += ' ORDER BY s.created_at DESC LIMIT ?'
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    scans = []
    for row in rows:
        scan = {
            'scan_id': row['id'],
            'scan_uuid': row['scan_uuid'],
            'crop_id': row['crop_id'],
            'crop_name': row['crop_name'],
            'crop_name_hi': row['crop_name_hi'],
            'crop_icon': row['crop_icon'],
            'image_url': f"/api/images/{row['image_filename']}" if row['image_filename'] else None,
            'status': row['status'],
            'n_score': round(row['n_score'] * 100, 1) if row['n_score'] else None,
            'p_score': round(row['p_score'] * 100, 1) if row['p_score'] else None,
            'k_score': round(row['k_score'] * 100, 1) if row['k_score'] else None,
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
    """Get single scan details with full recommendations."""
    db = get_db()
    cursor = db.cursor()
    
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
        WHERE s.id = ?
    ''', (scan_id,))
    
    row = cursor.fetchone()
    
    if not row:
        return jsonify({'error': 'Scan not found'}), 404
    
    scan = {
        'scan_id': row['id'],
        'scan_uuid': row['scan_uuid'],
        'crop_id': row['crop_id'],
        'crop_name': row['crop_name'],
        'crop_name_hi': row['crop_name_hi'],
        'crop_icon': row['crop_icon'],
        'image_url': f"/api/images/{row['image_filename']}" if row['image_filename'] else None,
        'status': row['status'],
        'n_score': round(row['n_score'] * 100, 1) if row['n_score'] else None,
        'p_score': round(row['p_score'] * 100, 1) if row['p_score'] else None,
        'k_score': round(row['k_score'] * 100, 1) if row['k_score'] else None,
        'n_confidence': round(row['n_confidence'] * 100, 1) if row['n_confidence'] else None,
        'p_confidence': round(row['p_confidence'] * 100, 1) if row['p_confidence'] else None,
        'k_confidence': round(row['k_confidence'] * 100, 1) if row['k_confidence'] else None,
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
    """Clear all scan history."""
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute('DELETE FROM recommendations')
    cursor.execute('DELETE FROM diagnoses')
    cursor.execute('DELETE FROM leaf_scans')
    
    db.commit()
    
    # Clear uploaded images
    for file in UPLOAD_FOLDER.glob('*'):
        if file.is_file():
            file.unlink()
    
    return jsonify({'message': 'All scans cleared successfully'}), 200


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
        
        # Call Ollama
        result = chat_with_ollama(
            message=message,
            chat_history=chat_history,
            context=context,
            image_base64=image_base64
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
    print("  GET  /api/health       - Health check")
    print("  GET  /api/crops        - List supported crops")
    print("  POST /api/scans        - Upload leaf photo & diagnose")
    print("  GET  /api/scans        - Get scan history")
    print("  GET  /api/scans/<id>   - Get single scan details")
    print("  DELETE /api/scans      - Clear all history")
    print("  GET  /api/model/info   - Get model information")
    print("  POST /api/chat         - AI chat with Ollama (vision)")
    print("  GET  /api/chat/status  - Check AI service status")
    print("")
    
    # Start server
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    
    print(f"🚀 Starting server on http://localhost:{port}")
    print(f"   Debug mode: {debug}")
    print("=" * 60 + "\n")
    
    app.run(debug=debug, host='0.0.0.0', port=port)
