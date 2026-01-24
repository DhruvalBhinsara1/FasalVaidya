"""
Supabase Storage Configuration
================================
Configuration for uploading images to Supabase Storage bucket
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

# Storage bucket names
LEAF_IMAGES_BUCKET = 'leaf-images'
HEATMAPS_BUCKET = 'heatmaps'

# Image upload settings
MAX_IMAGE_SIZE = 16 * 1024 * 1024  # 16MB
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

def get_storage_config():
    """Get storage configuration dictionary"""
    return {
        'supabase_url': SUPABASE_URL,
        'service_role_key': SUPABASE_SERVICE_ROLE_KEY,
        'leaf_images_bucket': LEAF_IMAGES_BUCKET,
        'heatmaps_bucket': HEATMAPS_BUCKET,
        'max_size': MAX_IMAGE_SIZE,
        'allowed_extensions': ALLOWED_EXTENSIONS
    }
