import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from services.ml_inference import run_model

load_dotenv()
app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"
DB_PATH = BASE_DIR / "app.db"

UPLOAD_FOLDER.mkdir(exist_ok=True)

# Crop definitions
CROPS: Dict[int, Dict[str, Any]] = {
    1: {"name": "Wheat", "name_hi": "Gehun"},
    2: {"name": "Rice", "name_hi": "Chawal"},
    3: {"name": "Tomato", "name_hi": "Tamatar"},
    4: {"name": "Cotton", "name_hi": "Kapas"},
}

# Crop-specific fertilizer dose ranges (low, high, unit)
DOSE_TABLE: Dict[int, Dict[str, tuple]] = {
    1: {
        "n": (50, 70, "kg Urea per acre"),
        "p": (25, 35, "kg DAP per acre"),
        "k": (20, 30, "kg MOP per acre"),
    },
    2: {
        "n": (60, 80, "kg Urea per acre"),
        "p": (30, 40, "kg DAP per acre"),
        "k": (25, 35, "kg MOP per acre"),
    },
    3: {
        "n": (15, 20, "kg Urea per 1000m2"),
        "p": (10, 15, "kg DAP per 1000m2"),
        "k": (12, 18, "kg MOP per 1000m2"),
    },
    4: {
        "n": (40, 60, "kg Urea per acre"),
        "p": (20, 30, "kg DAP per acre"),
        "k": (18, 25, "kg MOP per acre"),
    },
}


def severity_tier(score: float) -> str:
    if score < 0.3:
        return "healthy"
    if score < 0.6:
        return "attention"
    return "critical"


def format_nutrient_rec(crop_id: int, nutrient: str, score: float) -> str:
    low, high, unit = DOSE_TABLE[crop_id][nutrient]
    tier = severity_tier(score)
    if tier == "healthy":
        amt = low
        prefix = "Healthy"
        action = "Maintain; no extra input, stay near"
    elif tier == "attention":
        amt = round((low + high) / 2)
        prefix = "Attention"
        action = "Moderate deficiency; target"
    else:
        amt = high
        prefix = "Critical"
        action = "High deficiency; apply"
    return f"{prefix}: {action} {amt} {unit}"


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS crops (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            name_hi TEXT NOT NULL
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS leaf_scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            crop_id INTEGER NOT NULL,
            image_path TEXT NOT NULL,
            created_at TEXT NOT NULL,
            status TEXT NOT NULL,
            FOREIGN KEY (crop_id) REFERENCES crops(id)
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS diagnoses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id INTEGER NOT NULL,
            n_score REAL NOT NULL,
            p_score REAL NOT NULL,
            k_score REAL NOT NULL,
            n_confidence REAL NOT NULL,
            p_confidence REAL NOT NULL,
            k_confidence REAL NOT NULL,
            recommendation TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (scan_id) REFERENCES leaf_scans(id)
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id INTEGER NOT NULL,
            n_text TEXT,
            p_text TEXT,
            k_text TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (scan_id) REFERENCES leaf_scans(id)
        );
        """
    )

    # Seed crops table
    for cid, cdata in CROPS.items():
        cur.execute(
            "INSERT OR IGNORE INTO crops (id, name, name_hi) VALUES (?, ?, ?)",
            (cid, cdata["name"], cdata["name_hi"]),
        )

    conn.commit()
    conn.close()


init_db()


@app.route("/api/health", methods=["GET"])
def health():
    return {"status": "ok", "message": "FasalVaidya backend running (multi-crop)"}, 200


@app.route("/api/crops", methods=["GET"])
def get_crops():
    crops = [{"id": cid, **cdata} for cid, cdata in CROPS.items()]
    return {"crops": crops}, 200


def save_image(file_storage, suffix: str) -> Path:
    ext = os.path.splitext(file_storage.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}_{suffix}{ext}"
    save_path = UPLOAD_FOLDER / filename
    file_storage.save(save_path)
    return save_path


@app.route("/api/scans", methods=["POST"])
def create_scan():
    file = request.files.get("image")
    crop_id = request.form.get("crop_id")
    if not file or not crop_id:
        return jsonify({"error": "image and crop_id are required"}), 400

    try:
        crop_id_int = int(crop_id)
    except ValueError:
        return jsonify({"error": "crop_id must be an integer"}), 400

    if crop_id_int not in CROPS:
        return jsonify({"error": "unsupported crop"}), 400

    image_path = save_image(file, suffix=str(crop_id_int))
    
    # Validate image is not black/empty
    try:
        import cv2
        img = cv2.imread(str(image_path))
        if img is not None:
            mean_brightness = img.mean()
            print(f"Image brightness check: {mean_brightness:.1f}")
            if mean_brightness < 10:
                return jsonify({
                    "error": "Image appears to be black or too dark. Please ensure good lighting or use Gallery to select an image."
                }), 400
    except Exception as e:
        print(f"Image validation error: {e}")
    
    created_at = datetime.utcnow().isoformat()

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO leaf_scans (crop_id, image_path, created_at, status) VALUES (?, ?, ?, ?)",
        (crop_id_int, str(image_path), created_at, "Processing"),
    )
    scan_id = cur.lastrowid
    conn.commit()

    # Run inference with crop-specific model
    scores = run_model(str(image_path), crop_id=crop_id_int)

    n_score = scores["n_score"]
    p_score = scores["p_score"]
    k_score = scores["k_score"]
    n_conf = scores.get("n_confidence", 0.85)
    p_conf = scores.get("p_confidence", 0.85)
    k_conf = scores.get("k_confidence", 0.85)

    n_text = format_nutrient_rec(crop_id_int, "n", n_score)
    p_text = format_nutrient_rec(crop_id_int, "p", p_score)
    k_text = format_nutrient_rec(crop_id_int, "k", k_score)
    recommendation_text = f"N: {n_text} | P: {p_text} | K: {k_text}"

    cur.execute(
        """
        INSERT INTO diagnoses (
            scan_id, n_score, p_score, k_score, n_confidence, p_confidence, k_confidence, recommendation, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            scan_id,
            n_score,
            p_score,
            k_score,
            n_conf,
            p_conf,
            k_conf,
            recommendation_text,
            created_at,
        ),
    )

    cur.execute(
        "INSERT INTO recommendations (scan_id, n_text, p_text, k_text, created_at) VALUES (?, ?, ?, ?, ?)",
        (scan_id, n_text, p_text, k_text, created_at),
    )

    cur.execute(
        "UPDATE leaf_scans SET status = ? WHERE id = ?",
        ("Complete", scan_id),
    )

    conn.commit()
    conn.close()

    response = {
        "scan_id": scan_id,
        "crop_id": crop_id_int,
        "crop_name": CROPS[crop_id_int]["name"],
        "model_used": scores.get("model_used", "General"),
        "n_score": n_score,
        "p_score": p_score,
        "k_score": k_score,
        "n_confidence": n_conf,
        "p_confidence": p_conf,
        "k_confidence": k_conf,
        "n_rec": n_text,
        "p_rec": p_text,
        "k_rec": k_text,
        "heatmap": scores.get("heatmap", ""),
        "status": "Complete",
    }
    return jsonify(response), 201


@app.route("/api/scans", methods=["GET"])
def get_scans():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """
        SELECT ls.id as scan_id, ls.crop_id, ls.image_path, ls.created_at, ls.status,
               d.n_score, d.p_score, d.k_score,
               d.n_confidence, d.p_confidence, d.k_confidence,
               d.recommendation
        FROM leaf_scans ls
        LEFT JOIN diagnoses d ON d.scan_id = ls.id
        ORDER BY ls.id DESC
        LIMIT 50;
        """
    )
    rows = cur.fetchall()
    conn.close()

    scans = []
    for row in rows:
        scans.append({
            "scan_id": row["scan_id"],
            "crop_id": row["crop_id"],
            "crop_name": CROPS.get(row["crop_id"], {}).get("name"),
            "image_path": row["image_path"],
            "created_at": row["created_at"],
            "status": row["status"],
            "n_score": row["n_score"],
            "p_score": row["p_score"],
            "k_score": row["k_score"],
            "n_confidence": row["n_confidence"],
            "p_confidence": row["p_confidence"],
            "k_confidence": row["k_confidence"],
            "recommendation": row["recommendation"],
        })

    return jsonify({"scans": scans}), 200


@app.route("/api/scans", methods=["DELETE"])
def clear_scans():
    """Clear all scan history and associated data."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Get image paths before deleting
    cur.execute("SELECT image_path FROM leaf_scans")
    image_paths = [row[0] for row in cur.fetchall()]
    
    # Delete in correct order due to foreign keys
    cur.execute("DELETE FROM recommendations")
    cur.execute("DELETE FROM diagnoses")
    cur.execute("DELETE FROM leaf_scans")
    
    # Reset auto-increment counters so scan IDs start from 1 again
    cur.execute("DELETE FROM sqlite_sequence WHERE name IN ('leaf_scans', 'diagnoses', 'recommendations')")
    
    conn.commit()
    conn.close()
    
    # Clean up image files
    deleted_files = 0
    for path in image_paths:
        try:
            if path and Path(path).exists():
                Path(path).unlink()
                deleted_files += 1
        except Exception as e:
            print(f"Failed to delete {path}: {e}")
    
    return jsonify({
        "message": "History cleared",
        "deleted_scans": len(image_paths),
        "deleted_files": deleted_files
    }), 200


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, host="0.0.0.0", port=5000)
