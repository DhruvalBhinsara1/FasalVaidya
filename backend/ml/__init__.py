"""
FasalVaidya ML Package
======================
NPK deficiency detection using deep learning.
"""

from .inference import (
    predict_npk,
    generate_gradcam_heatmap,
    get_model_info,
    get_severity,
    get_severity_color,
    preprocess_image
)

__all__ = [
    'predict_npk',
    'generate_gradcam_heatmap',
    'get_model_info',
    'get_severity',
    'get_severity_color',
    'preprocess_image'
]

__version__ = '1.0.0'
