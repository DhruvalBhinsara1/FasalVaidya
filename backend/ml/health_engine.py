"""
Crop Health Classification & Reporting Engine
==============================================
Provides health classification, historical comparison, and recommendation logic.
All thresholds are loaded from config/health_thresholds.json for consistency.
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

# Load configuration
CONFIG_PATH = Path(__file__).parent.parent / 'config' / 'health_thresholds.json'


def load_config() -> Dict:
    """Load health thresholds configuration from JSON file."""
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        # Fallback defaults if config file is missing
        return {
            "health_classification": {
                "thresholds": {
                    "critical": {"max_score": 49},
                    "attention": {"min_score": 50, "max_score": 79},
                    "healthy": {"min_score": 80}
                }
            },
            "rescan_intervals": {
                "critical": {"min_days": 7, "max_days": 10},
                "attention": {"min_days": 15, "max_days": 20},
                "healthy": {"min_days": 25, "max_days": 30}
            },
            "trend_analysis": {"epsilon": 5},
            "nutrient_thresholds": {
                "deficient": {"max_score": 40},
                "optimal": {"min_score": 41, "max_score": 80},
                "excess": {"min_score": 81}
            }
        }


# Cache config to avoid repeated file reads
_config_cache = None


def get_config() -> Dict:
    """Get cached configuration."""
    global _config_cache
    if _config_cache is None:
        _config_cache = load_config()
    return _config_cache


def reload_config() -> Dict:
    """Force reload configuration from file."""
    global _config_cache
    _config_cache = load_config()
    return _config_cache


# ============================================
# HEALTH CLASSIFICATION ENGINE
# ============================================

def classify_health(overall_score: float) -> Dict[str, Any]:
    """
    Classify crop health based on overall score.
    Master UI thresholds:
    - Healthy: ≥80 (Green)
    - Attention: 50-79 (Orange)
    - Critical: <50 (Red)
    
    Args:
        overall_score: Overall health score (0-100)
        
    Returns:
        Dict with status, label, color, severity, and rescan recommendation
    """
    config = get_config()
    thresholds = config["health_classification"]["thresholds"]
    rescan = config["rescan_intervals"]
    
    if overall_score < thresholds["attention"]["min_score"]:
        status = "critical"
        threshold_data = thresholds["critical"]
        rescan_data = rescan["critical"]
    elif overall_score < thresholds["healthy"]["min_score"]:
        status = "attention"
        threshold_data = thresholds["attention"]
        rescan_data = rescan["attention"]
    else:
        status = "healthy"
        threshold_data = thresholds["healthy"]
        rescan_data = rescan["healthy"]
    
    # Calculate recommended next scan date
    avg_days = (rescan_data["min_days"] + rescan_data["max_days"]) // 2
    next_scan_date = datetime.now() + timedelta(days=avg_days)
    
    return {
        "status": status,
        "label": threshold_data.get("label", status.title()),
        "label_hi": threshold_data.get("label_hi", status.title()),
        "color": threshold_data.get("color", "#6B7280"),
        "severity": threshold_data.get("severity", status),
        "rescan_interval": rescan_data.get("label", f"{avg_days} days"),
        "rescan_interval_hi": rescan_data.get("label_hi", f"{avg_days} दिन"),
        "recommended_next_scan": next_scan_date.strftime("%Y-%m-%d"),
        "recommended_next_scan_min": (datetime.now() + timedelta(days=rescan_data["min_days"])).strftime("%Y-%m-%d"),
        "recommended_next_scan_max": (datetime.now() + timedelta(days=rescan_data["max_days"])).strftime("%Y-%m-%d"),
    }


def classify_nutrient(score: float) -> Dict[str, Any]:
    """
    Classify individual nutrient status.
    
    Args:
        score: Nutrient score (0-100, where 100 = healthy, 0 = severely deficient)
        
    Returns:
        Dict with status, action recommendation, and labels
    """
    config = get_config()
    thresholds = config["nutrient_thresholds"]
    
    # Note: In our system, higher score = more deficient (inverse logic for display)
    # So we need to handle this correctly
    # score here is the "health" score, not deficiency score
    health_score = 100 - score  # Convert deficiency to health
    
    if health_score <= thresholds["deficient"]["max_score"]:
        return {
            "status": "deficient",
            "action": "recommend_fertilizer",
            "label": thresholds["deficient"].get("label", "Deficient"),
            "label_hi": thresholds["deficient"].get("label_hi", "कमी"),
            "needs_fertilizer": True
        }
    elif health_score <= thresholds["optimal"]["max_score"]:
        return {
            "status": "optimal",
            "action": "no_action",
            "label": thresholds["optimal"].get("label", "Optimal"),
            "label_hi": thresholds["optimal"].get("label_hi", "उचित"),
            "needs_fertilizer": False
        }
    else:
        return {
            "status": "excess",
            "action": "avoid_fertilization",
            "label": thresholds["excess"].get("label", "Excess"),
            "label_hi": thresholds["excess"].get("label_hi", "अधिक"),
            "needs_fertilizer": False,
            "warning": "Avoid additional fertilization"
        }


# ============================================
# HISTORICAL COMPARISON ENGINE
# ============================================

def calculate_trend(current: float, previous: float) -> Dict[str, Any]:
    """
    Calculate trend between current and previous values.
    
    Args:
        current: Current scan value
        previous: Previous scan value
        
    Returns:
        Dict with delta, direction, and significance
    """
    config = get_config()
    epsilon = config["trend_analysis"]["epsilon"]
    sig_increase = config["trend_analysis"].get("significant_increase", 10)
    sig_decrease = config["trend_analysis"].get("significant_decrease", -10)
    
    delta = current - previous
    abs_delta = abs(delta)
    
    if abs_delta <= epsilon:
        direction = "stable"
        significance = "no_change"
    elif delta > 0:
        direction = "increase"
        significance = "significant" if delta >= sig_increase else "minor"
    else:
        direction = "decrease"
        significance = "significant" if delta <= sig_decrease else "minor"
    
    return {
        "delta": round(delta, 2),
        "delta_percent": round((delta / previous * 100) if previous != 0 else 0, 2),
        "direction": direction,
        "significance": significance,
        "arrow": "↑" if delta > epsilon else "↓" if delta < -epsilon else "→"
    }


def compare_scans(current_scan: Dict, previous_scan: Optional[Dict], 
                  baseline_scan: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Compare current scan with previous and baseline scans.
    
    Args:
        current_scan: Current scan data with nutrient scores
        previous_scan: Immediately previous scan (can be None)
        baseline_scan: First scan for baseline comparison (can be None)
        
    Returns:
        Dict with comparison results for each nutrient
    """
    result = {
        "has_history": previous_scan is not None,
        "has_baseline": baseline_scan is not None,
        "comparisons": {}
    }
    
    nutrients = ['n', 'p', 'k']
    if 'mg_score' in current_scan:
        nutrients.append('mg')
    
    for nutrient in nutrients:
        score_key = f"{nutrient}_score"
        current_value = current_scan.get(score_key, 0)
        
        comparison = {
            "current": current_value,
            "vs_previous": None,
            "vs_baseline": None
        }
        
        if previous_scan and score_key in previous_scan:
            comparison["vs_previous"] = calculate_trend(
                current_value, 
                previous_scan[score_key]
            )
            comparison["previous_value"] = previous_scan[score_key]
            comparison["previous_date"] = previous_scan.get("created_at", "")
        
        if baseline_scan and score_key in baseline_scan:
            comparison["vs_baseline"] = calculate_trend(
                current_value,
                baseline_scan[score_key]
            )
            comparison["baseline_value"] = baseline_scan[score_key]
            comparison["baseline_date"] = baseline_scan.get("created_at", "")
        
        result["comparisons"][nutrient] = comparison
    
    # Overall health trend
    if previous_scan:
        current_overall = calculate_overall_score(current_scan)
        previous_overall = calculate_overall_score(previous_scan)
        result["overall_trend"] = calculate_trend(current_overall, previous_overall)
    
    return result


def calculate_overall_score(scan: Dict) -> float:
    """Calculate overall health score from nutrient scores."""
    import logging
    logger = logging.getLogger('fasalvaidya.health_engine')
    
    # Database stores scores as 0.0-1.0 (decimal), convert to 0-100 percentage
    n_raw = scan.get("n_score", 0)
    p_raw = scan.get("p_score", 0)
    k_raw = scan.get("k_score", 0)
    mg_raw = scan.get("mg_score")
    
    # If scores are in 0-1 range, convert to 0-100
    n = n_raw * 100 if n_raw <= 1 else n_raw
    p = p_raw * 100 if p_raw <= 1 else p_raw
    k = k_raw * 100 if k_raw <= 1 else k_raw
    mg = mg_raw * 100 if mg_raw is not None and mg_raw <= 1 else mg_raw
    
    logger.info(
        "calculate_overall_score raw_scores=(n=%.4f,p=%.4f,k=%.4f,mg=%s) converted=(n=%.2f,p=%.2f,k=%.2f)",
        n_raw, p_raw, k_raw, mg_raw, n, p, k
    )
    
    # Convert deficiency scores to health scores (100 - deficiency)
    health_n = 100 - n
    health_p = 100 - p
    health_k = 100 - k
    
    logger.info(
        "calculate_overall_score health_scores=(n=%.2f,p=%.2f,k=%.2f)",
        health_n, health_p, health_k
    )
    
    if mg is not None:
        health_mg = 100 - mg
        overall = (health_n + health_p + health_k + health_mg) / 4
        logger.info("calculate_overall_score with_mg overall=%.2f", overall)
        return overall
    
    overall = (health_n + health_p + health_k) / 3
    logger.info("calculate_overall_score without_mg overall=%.2f", overall)
    return overall


# ============================================
# RECOMMENDATION ENGINE
# ============================================

def generate_rescan_recommendation(health_status: str, 
                                   last_scan_date: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Generate rescan interval recommendation based on health status.
    
    Args:
        health_status: 'unhealthy', 'average', or 'good'
        last_scan_date: Date of last scan (defaults to now)
        
    Returns:
        Dict with rescan recommendation details
    """
    config = get_config()
    rescan_config = config["rescan_intervals"]
    
    # Map severity to rescan config key
    status_map = {
        "unhealthy": "critical",
        "critical": "critical",
        "average": "attention",
        "attention": "attention",
        "good": "healthy",
        "healthy": "healthy"
    }
    
    config_key = status_map.get(health_status.lower(), "attention")
    interval = rescan_config.get(config_key, rescan_config["attention"])
    
    base_date = last_scan_date or datetime.now()
    
    return {
        "interval_label": interval.get("label", "15-20 days"),
        "interval_label_hi": interval.get("label_hi", "15-20 दिन"),
        "min_date": (base_date + timedelta(days=interval["min_days"])).strftime("%Y-%m-%d"),
        "max_date": (base_date + timedelta(days=interval["max_days"])).strftime("%Y-%m-%d"),
        "recommended_date": (base_date + timedelta(days=(interval["min_days"] + interval["max_days"]) // 2)).strftime("%Y-%m-%d"),
        "urgency": "high" if config_key == "critical" else "medium" if config_key == "attention" else "low"
    }


def generate_fertilizer_recommendations(scan_data: Dict, crop_id: int) -> List[Dict[str, Any]]:
    """
    Generate fertilizer recommendations based on nutrient deficiencies.
    
    Args:
        scan_data: Scan data with nutrient scores
        crop_id: Crop ID for crop-specific recommendations
        
    Returns:
        List of fertilizer recommendations
    """
    recommendations = []
    
    nutrients = [
        ("n", "Nitrogen", "नाइट्रोजन"),
        ("p", "Phosphorus", "फॉस्फोरस"),
        ("k", "Potassium", "पोटेशियम"),
    ]
    
    if "mg_score" in scan_data:
        nutrients.append(("mg", "Magnesium", "मैग्नीशियम"))
    
    for nutrient_key, name_en, name_hi in nutrients:
        score = scan_data.get(f"{nutrient_key}_score", 0)
        severity = scan_data.get(f"{nutrient_key}_severity", "healthy")
        
        # Determine if fertilizer is needed
        nutrient_status = classify_nutrient(score)
        
        if nutrient_status["needs_fertilizer"] or severity in ["attention", "critical"]:
            recommendations.append({
                "nutrient": nutrient_key.upper(),
                "nutrient_name": name_en,
                "nutrient_name_hi": name_hi,
                "score": score,
                "severity": severity,
                "action": "apply_fertilizer",
                "action_label": f"Apply {name_en} fertilizer",
                "action_label_hi": f"{name_hi} उर्वरक डालें",
                "priority": "high" if severity == "critical" else "medium"
            })
        elif nutrient_status.get("status") == "excess":
            recommendations.append({
                "nutrient": nutrient_key.upper(),
                "nutrient_name": name_en,
                "nutrient_name_hi": name_hi,
                "score": score,
                "severity": "excess",
                "action": "avoid_fertilization",
                "action_label": f"Avoid {name_en} fertilization",
                "action_label_hi": f"{name_hi} उर्वरक न डालें",
                "priority": "low"
            })
    
    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(key=lambda x: priority_order.get(x["priority"], 1))
    
    return recommendations


# ============================================
# REPORT DATA AGGREGATION
# ============================================

def generate_report_data(scan_data: Dict, crop_data: Dict,
                         previous_scan: Optional[Dict] = None,
                         baseline_scan: Optional[Dict] = None,
                         farmer_info: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Generate comprehensive report data for a scan.
    
    Args:
        scan_data: Current scan data
        crop_data: Crop information
        previous_scan: Previous scan for comparison
        baseline_scan: First scan for baseline
        farmer_info: Optional farmer information
        
    Returns:
        Complete report data structure
    """
    import logging
    logger = logging.getLogger('fasalvaidya.health_engine')
    
    logger.info(
        "generate_report_data raw_scan_data=(n=%.4f,p=%.4f,k=%.4f)",
        scan_data.get('n_score', 0),
        scan_data.get('p_score', 0),
        scan_data.get('k_score', 0)
    )
    
    # Helper to convert 0-1 to 0-100 if needed
    def to_percent(val):
        if val is None:
            return 0
        return val * 100 if val <= 1 else val
    
    # Convert scores to percentages for display
    n_pct = to_percent(scan_data.get("n_score", 0))
    p_pct = to_percent(scan_data.get("p_score", 0))
    k_pct = to_percent(scan_data.get("k_score", 0))
    
    logger.info("generate_report_data converted_pct=(n=%.2f,p=%.2f,k=%.2f)", n_pct, p_pct, k_pct)
    
    # Calculate overall health score
    overall_score = calculate_overall_score(scan_data)
    logger.info("generate_report_data calculated_overall_score=%.2f", overall_score)
    
    # Get health classification
    health_class = classify_health(overall_score)
    
    # Get historical comparison
    comparison = compare_scans(scan_data, previous_scan, baseline_scan)
    
    # Get rescan recommendation
    rescan_rec = generate_rescan_recommendation(
        health_class["status"],
        datetime.fromisoformat(scan_data["created_at"]) if "created_at" in scan_data else None
    )
    
    # Get fertilizer recommendations
    fertilizer_recs = generate_fertilizer_recommendations(scan_data, crop_data.get("id", 1))
    
    report = {
        "generated_at": datetime.now().isoformat(),
        "report_version": "1.0",
        
        # Farmer & Field Summary (Section 1)
        "farmer_info": farmer_info or {
            "farmer_id": None,
            "name": "Guest User",
            "contact_info": None,
            "location": None
        },
        
        "field_info": {
            "crop_id": crop_data.get("id"),
            "crop_name": crop_data.get("name"),
            "crop_name_hi": crop_data.get("name_hi"),
            "crop_icon": crop_data.get("icon"),
            "season": crop_data.get("season")
        },
        
        # Current Scan Metrics (Section 2)
        "current_scan": {
            "scan_id": scan_data.get("scan_id") or scan_data.get("id"),
            "scan_uuid": scan_data.get("scan_uuid"),
            "scan_date": scan_data.get("created_at"),
            "nutrients": {
                "nitrogen": {
                    "score": round(n_pct, 1),
                    "confidence": scan_data.get("n_confidence", 0),
                    "severity": scan_data.get("n_severity", "healthy"),
                    "health_score": round(100 - n_pct, 1)
                },
                "phosphorus": {
                    "score": round(p_pct, 1),
                    "confidence": scan_data.get("p_confidence", 0),
                    "severity": scan_data.get("p_severity", "healthy"),
                    "health_score": round(100 - p_pct, 1)
                },
                "potassium": {
                    "score": round(k_pct, 1),
                    "confidence": scan_data.get("k_confidence", 0),
                    "severity": scan_data.get("k_severity", "healthy"),
                    "health_score": round(100 - k_pct, 1)
                }
            }
        },
        
        # Health Status Classification (Section 3)
        "health_classification": {
            "overall_score": round(overall_score, 1),
            **health_class
        },
        
        # Historical Comparison (Section 5)
        "historical_comparison": comparison,
        
        # Recommendations (Section 6)
        "recommendations": {
            "rescan": rescan_rec,
            "fertilizer": fertilizer_recs,
            "summary": {
                "total_issues": len([r for r in fertilizer_recs if r["action"] == "apply_fertilizer"]),
                "critical_nutrients": [r["nutrient"] for r in fertilizer_recs if r["priority"] == "high"],
                "attention_nutrients": [r["nutrient"] for r in fertilizer_recs if r["priority"] == "medium"]
            }
        }
    }
    
    # Add magnesium if available
    if "mg_score" in scan_data:
        report["current_scan"]["nutrients"]["magnesium"] = {
            "score": scan_data.get("mg_score", 0),
            "confidence": scan_data.get("mg_confidence", 0),
            "severity": scan_data.get("mg_severity", "healthy"),
            "health_score": 100 - scan_data.get("mg_score", 0)
        }
    
    return report


# ============================================
# GRAPH DATA GENERATION
# ============================================

def generate_graph_data(scans: List[Dict], graph_type: str = "line") -> Dict[str, Any]:
    """
    Generate data formatted for chart rendering.
    
    IMPORTANT: Scores are displayed as HEALTH SCORES (0-100, higher is healthier)
    Raw n_score/p_score/k_score from DB are DEFICIENCY scores (0-100, higher is worse)
    We convert: health_score = 100 - deficiency_score
    
    Args:
        scans: List of scan data sorted by date
        graph_type: 'line', 'bar', or 'radar'
        
    Returns:
        Chart-ready data structure with health scores (0-100, higher = healthier)
    """
    config = get_config()
    colors = config.get("graph_colors", {})
    
    if graph_type == "line":
        # Line chart: Nutrient health trend over time
        return {
            "type": "line",
            "labels": [s.get("created_at", "")[:10] for s in scans],
            "datasets": [
                {
                    "label": "Nitrogen Health",
                    "data": [100 - s.get("n_score", 0) for s in scans],
                    "color": colors.get("nitrogen", "#E53935")
                },
                {
                    "label": "Phosphorus Health",
                    "data": [100 - s.get("p_score", 0) for s in scans],
                    "color": colors.get("phosphorus", "#FB8C00")
                },
                {
                    "label": "Potassium Health",
                    "data": [100 - s.get("k_score", 0) for s in scans],
                    "color": colors.get("potassium", "#43A047")
                }
            ]
        }
    
    elif graph_type == "bar":
        # Bar chart: Current vs Previous health comparison
        if len(scans) < 2:
            return {"type": "bar", "error": "Need at least 2 scans for comparison"}
        
        current = scans[-1]
        previous = scans[-2]
        
        # Convert deficiency scores to health scores for clear visualization
        prev_n_health = 100 - previous.get("n_score", 0)
        prev_p_health = 100 - previous.get("p_score", 0)
        prev_k_health = 100 - previous.get("k_score", 0)
        
        curr_n_health = 100 - current.get("n_score", 0)
        curr_p_health = 100 - current.get("p_score", 0)
        curr_k_health = 100 - current.get("k_score", 0)
        
        return {
            "type": "bar",
            "labels": ["Nitrogen", "Phosphorus", "Potassium"],
            "datasets": [
                {
                    "label": "Previous",
                    "data": [
                        round(prev_n_health, 1),
                        round(prev_p_health, 1),
                        round(prev_k_health, 1)
                    ],
                    "color": "#9CA3AF"
                },
                {
                    "label": "Current",
                    "data": [
                        round(curr_n_health, 1),
                        round(curr_p_health, 1),
                        round(curr_k_health, 1)
                    ],
                    "color": colors.get("healthy_zone", "#4C763B")
                }
            ],
            "metadata": {
                "score_type": "health",
                "scale": "0-100 (higher is healthier)",
                "changes": {
                    "nitrogen": round(curr_n_health - prev_n_health, 1),
                    "phosphorus": round(curr_p_health - prev_p_health, 1),
                    "potassium": round(curr_k_health - prev_k_health, 1)
                }
            }
        }
    
    elif graph_type == "radar":
        # Radar chart: Overall soil nutrient health profile
        if not scans:
            return {"type": "radar", "error": "No scan data available"}
        
        latest = scans[-1]
        
        n_health = 100 - latest.get("n_score", 0)
        p_health = 100 - latest.get("p_score", 0)
        k_health = 100 - latest.get("k_score", 0)
        
        return {
            "type": "radar",
            "labels": ["Nitrogen", "Phosphorus", "Potassium"],
            "datasets": [
                {
                    "label": "Nutrient Health",
                    "data": [
                        round(n_health, 1),
                        round(p_health, 1),
                        round(k_health, 1)
                    ],
                    "color": colors.get("healthy_zone", "#4C763B")
                }
            ],
            "zones": {
                "healthy": {"min": 70, "color": colors.get("healthy_zone", "#4C763B")},
                "attention": {"min": 50, "max": 70, "color": colors.get("attention_zone", "#FA8112")},
                "critical": {"max": 50, "color": colors.get("critical_zone", "#FF6363")}
            }
        }
    
    return {"type": graph_type, "error": f"Unknown graph type: {graph_type}"}
