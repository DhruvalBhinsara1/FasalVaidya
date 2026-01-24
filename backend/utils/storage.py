"""
Supabase Storage Utilities
===========================
Helper functions for uploading and managing images in Supabase Storage
"""

import logging
from pathlib import Path
from typing import Optional, Tuple
from supabase import create_client, Client
from config.storage_config import get_storage_config

logger = logging.getLogger('fasalvaidya.storage')

# Initialize Supabase client
_supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    """Get or create Supabase client with service role key"""
    global _supabase_client
    
    if _supabase_client is None:
        config = get_storage_config()
        
        if not config['supabase_url'] or not config['service_role_key']:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file"
            )
        
        _supabase_client = create_client(
            config['supabase_url'],
            config['service_role_key']
        )
        logger.info("Supabase client initialized")
    
    return _supabase_client


def upload_leaf_image(
    file_path: Path,
    scan_uuid: str,
    user_id: str
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Upload leaf image to Supabase Storage
    
    Args:
        file_path: Local path to the image file
        scan_uuid: Unique scan identifier
        user_id: User ID for organizing uploads
        
    Returns:
        Tuple of (success, public_url, error_message)
    """
    try:
        supabase = get_supabase_client()
        config = get_storage_config()
        bucket = config['leaf_images_bucket']
        
        # Read file content
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        # Construct storage path: user_id/scan_uuid.ext
        file_ext = file_path.suffix
        storage_path = f"{user_id}/{scan_uuid}{file_ext}"
        
        # Upload to Supabase Storage
        logger.info(f"Uploading leaf image: {storage_path} ({len(file_content)} bytes)")
        
        result = supabase.storage.from_(bucket).upload(
            path=storage_path,
            file=file_content,
            file_options={
                "content-type": f"image/{file_ext.lstrip('.')}",
                "upsert": "true"  # Allow overwrite if exists
            }
        )
        
        # Get public URL
        public_url = supabase.storage.from_(bucket).get_public_url(storage_path)
        
        logger.info(f"Successfully uploaded leaf image: {public_url}")
        return True, public_url, None
        
    except Exception as e:
        error_msg = f"Failed to upload leaf image: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, None, error_msg


def upload_heatmap(
    file_path: Path,
    scan_uuid: str,
    user_id: str
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Upload heatmap image to Supabase Storage
    
    Args:
        file_path: Local path to the heatmap file
        scan_uuid: Unique scan identifier
        user_id: User ID for organizing uploads
        
    Returns:
        Tuple of (success, public_url, error_message)
    """
    try:
        supabase = get_supabase_client()
        config = get_storage_config()
        bucket = config['heatmaps_bucket']
        
        # Read file content
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        # Construct storage path: user_id/heatmap_scan_uuid.jpg
        storage_path = f"{user_id}/heatmap_{scan_uuid}.jpg"
        
        # Upload to Supabase Storage
        logger.info(f"Uploading heatmap: {storage_path} ({len(file_content)} bytes)")
        
        result = supabase.storage.from_(bucket).upload(
            path=storage_path,
            file=file_content,
            file_options={
                "content-type": "image/jpeg",
                "upsert": "true"
            }
        )
        
        # Get public URL
        public_url = supabase.storage.from_(bucket).get_public_url(storage_path)
        
        logger.info(f"Successfully uploaded heatmap: {public_url}")
        return True, public_url, None
        
    except Exception as e:
        error_msg = f"Failed to upload heatmap: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, None, error_msg


def delete_leaf_image(image_url: str, user_id: str) -> Tuple[bool, Optional[str]]:
    """
    Delete leaf image from Supabase Storage
    
    Args:
        image_url: Public URL or storage path of the image
        user_id: User ID for validation
        
    Returns:
        Tuple of (success, error_message)
    """
    try:
        supabase = get_supabase_client()
        config = get_storage_config()
        bucket = config['leaf_images_bucket']
        
        # Extract storage path from URL if needed
        if image_url.startswith('http'):
            # Parse path from URL: .../storage/v1/object/public/bucket/path
            parts = image_url.split(f'/{bucket}/')
            if len(parts) > 1:
                storage_path = parts[1]
            else:
                return False, "Invalid image URL format"
        else:
            storage_path = image_url
        
        # Verify path starts with user_id for security
        if not storage_path.startswith(f"{user_id}/"):
            return False, "Unauthorized: Cannot delete other user's images"
        
        logger.info(f"Deleting leaf image: {storage_path}")
        
        supabase.storage.from_(bucket).remove([storage_path])
        
        logger.info(f"Successfully deleted leaf image: {storage_path}")
        return True, None
        
    except Exception as e:
        error_msg = f"Failed to delete leaf image: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, error_msg


def delete_heatmap(heatmap_url: str, user_id: str) -> Tuple[bool, Optional[str]]:
    """
    Delete heatmap from Supabase Storage
    
    Args:
        heatmap_url: Public URL or storage path of the heatmap
        user_id: User ID for validation
        
    Returns:
        Tuple of (success, error_message)
    """
    try:
        supabase = get_supabase_client()
        config = get_storage_config()
        bucket = config['heatmaps_bucket']
        
        # Extract storage path from URL if needed
        if heatmap_url.startswith('http'):
            parts = heatmap_url.split(f'/{bucket}/')
            if len(parts) > 1:
                storage_path = parts[1]
            else:
                return False, "Invalid heatmap URL format"
        else:
            storage_path = heatmap_url
        
        # Verify path starts with user_id for security
        if not storage_path.startswith(f"{user_id}/"):
            return False, "Unauthorized: Cannot delete other user's heatmaps"
        
        logger.info(f"Deleting heatmap: {storage_path}")
        
        supabase.storage.from_(bucket).remove([storage_path])
        
        logger.info(f"Successfully deleted heatmap: {storage_path}")
        return True, None
        
    except Exception as e:
        error_msg = f"Failed to delete heatmap: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, error_msg


def ensure_buckets_exist():
    """
    Ensure required storage buckets exist
    Should be called during app initialization
    """
    try:
        supabase = get_supabase_client()
        config = get_storage_config()
        
        # List existing buckets
        buckets_response = supabase.storage.list_buckets()
        # Handle both list and dict responses from supabase
        if isinstance(buckets_response, list):
            bucket_names = [b.get('name') if isinstance(b, dict) else b.name for b in buckets_response]
        else:
            bucket_names = []
        
        # Create leaf-images bucket if not exists
        if config['leaf_images_bucket'] not in bucket_names:
            logger.info(f"Creating bucket: {config['leaf_images_bucket']}")
            supabase.storage.create_bucket(
                config['leaf_images_bucket'],
                options={
                    "public": True,
                    "fileSizeLimit": config['max_size']
                }
            )
        
        # Create heatmaps bucket if not exists
        if config['heatmaps_bucket'] not in bucket_names:
            logger.info(f"Creating bucket: {config['heatmaps_bucket']}")
            supabase.storage.create_bucket(
                config['heatmaps_bucket'],
                options={
                    "public": True,
                    "fileSizeLimit": config['max_size']
                }
            )
        
        logger.info("Storage buckets verified/created")
        return True
        
    except Exception as e:
        logger.warning(f"Could not verify/create buckets: {e}")
        # Don't fail app startup if buckets already exist
        return False
