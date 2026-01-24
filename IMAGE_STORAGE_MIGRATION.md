# Image Storage Migration to Supabase Storage
## Overview
The system has been updated to upload images to Supabase Storage instead of storing only local file paths. This ensures images are accessible from anywhere and properly synchronized across devices.

## Changes Made

### 1. Backend Changes

#### New Files
- `backend/config/storage_config.py` - Supabase Storage configuration
- `backend/utils/storage.py` - Helper functions for uploading/deleting images

#### Modified Files
- `backend/app.py`:
  - Added import for storage utilities
  - Updated `upload_scan()` to upload images to Supabase Storage
  - Updated image URLs in response to use public Supabase URLs
  - Updated `delete_scan()` to delete from Supabase Storage
  - Added storage initialization on app startup
  
- `backend/requirements.txt`:
  - Added `supabase>=2.3.0` dependency

### 2. Database Schema Changes

#### Current Schema
The `leaf_scans` table already has the correct fields:
- `image_path TEXT NOT NULL` - Now stores public Supabase Storage URL
- `image_filename TEXT` - Original filename for reference

The `diagnoses` table has:
- `heatmap_path TEXT` - Now stores public Supabase Storage URL for heatmaps

**No database migration required** - existing fields are reused with new URL format.

### 3. Storage Buckets

Two new Supabase Storage buckets are created:
- `leaf-images` - Stores original leaf scan images
- `heatmaps` - Stores Grad-CAM heatmap visualizations

Both buckets are:
- Public (images can be accessed via public URL)
- 16MB file size limit
- Organized by user_id folders

## Setup Instructions

### 1. Update Environment Variables

Add to `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important**: Use the **service role key**, not the anon key, for backend operations.

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install the `supabase` Python package.

### 3. Create Storage Buckets (Optional)

The backend will attempt to create buckets automatically on startup. Alternatively, create them manually in Supabase Dashboard:

1. Go to Storage section
2. Create bucket: `leaf-images`
   - Public: Yes
   - File size limit: 16 MB
3. Create bucket: `heatmaps`
   - Public: Yes
   - File size limit: 16 MB

### 4. Set Storage Policies (Optional)

For better security, configure Row Level Security policies:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'leaf-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'leaf-images');

-- Similar policies for heatmaps bucket
CREATE POLICY "Users can upload heatmaps to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'heatmaps' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read heatmaps"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'heatmaps');
```

## Migration Process

### For New Installations
No action needed - just follow setup instructions above.

### For Existing Installations

#### Option 1: Fresh Start (Recommended for Development)
1. Update environment variables
2. Install new dependencies
3. Clear local database
4. All new scans will use Supabase Storage

#### Option 2: Migrate Existing Images
If you have existing scans with local file paths:

```python
# Run this migration script
from pathlib import Path
from utils.storage import upload_leaf_image, get_supabase_client
import sqlite3

def migrate_images():
    db = sqlite3.connect('fasalvaidya.db')
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    
    # Get all scans with local paths
    cursor.execute('''
        SELECT id, scan_uuid, user_id, image_path, image_filename
        FROM leaf_scans
        WHERE image_path NOT LIKE 'http%'
    ''')
    
    scans = cursor.fetchall()
    print(f"Found {len(scans)} scans to migrate")
    
    for scan in scans:
        # Check if local file exists
        local_path = Path(scan['image_path'])
        if not local_path.exists():
            print(f"⚠️  File not found: {scan['image_path']}")
            continue
        
        # Upload to Supabase Storage
        success, public_url, error = upload_leaf_image(
            local_path,
            scan['scan_uuid'],
            scan['user_id']
        )
        
        if success:
            # Update database with new URL
            cursor.execute(
                'UPDATE leaf_scans SET image_path = ? WHERE id = ?',
                (public_url, scan['id'])
            )
            print(f"✓ Migrated: {scan['scan_uuid']}")
        else:
            print(f"✗ Failed: {scan['scan_uuid']} - {error}")
    
    db.commit()
    db.close()
    print("Migration complete!")

if __name__ == '__main__':
    migrate_images()
```

Save this as `backend/scripts/migrate_images.py` and run:
```bash
python scripts/migrate_images.py
```

## Testing

### 1. Test Image Upload
```bash
curl -X POST http://localhost:5000/api/scans \
  -F "image=@test_leaf.jpg" \
  -F "crop_id=1" \
  -F "model_id=unified_v2"
```

Check response for:
- `image_url` should start with `https://` (Supabase URL)
- `heatmap` should start with `https://` (if heatmap generated)

### 2. Verify in Supabase Dashboard
1. Go to Storage → leaf-images
2. Should see folders organized by user_id
3. Images should be accessible via public URL

### 3. Test Image Deletion
```bash
curl -X DELETE http://localhost:5000/api/scans/{scan_id}
```

Verify image is removed from Supabase Storage bucket.

## Fallback Behavior

The system includes fallback mechanisms:

1. **Storage Upload Fails**: Falls back to local file serving via `/api/images/{filename}`
2. **Bucket Creation Fails**: App continues with warning, uses local storage
3. **Missing Credentials**: Gracefully degrades to local file storage

This ensures the app continues working even if Supabase Storage is unavailable.

## Troubleshooting

### Images Not Uploading to Storage
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Verify service role key (not anon key) is used
- Check backend logs for error messages

### "Bucket not found" Errors
- Manually create buckets in Supabase Dashboard
- Ensure bucket names match: `leaf-images` and `heatmaps`

### "Permission denied" Errors
- Verify buckets are set to public
- Check storage policies allow uploads
- Ensure service role key has proper permissions

### Images Still Using Local Paths
- Check backend logs for upload failures
- Verify `.env` is loaded correctly
- Restart Flask server after updating `.env`

## Benefits

✅ **Centralized Storage**: Images accessible from any device  
✅ **Better Sync**: Mobile apps can access images directly via URLs  
✅ **Scalability**: Supabase handles image hosting and CDN  
✅ **Reliability**: Automatic backups and redundancy  
✅ **Admin Dashboard**: Can display images without local file access  

## Next Steps

1. Update frontend to handle new image URL format
2. Test mobile app sync with new storage URLs
3. Consider adding image optimization/resizing
4. Implement automatic cleanup of old images
