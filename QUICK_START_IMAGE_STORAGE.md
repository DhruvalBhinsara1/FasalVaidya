# Quick Start: Image Storage with Supabase

## What Changed?
Images are now uploaded to Supabase Storage instead of being stored only locally. This allows:
- ✅ Images accessible from anywhere (mobile app, admin dashboard, etc.)
- ✅ Proper synchronization across devices
- ✅ Centralized cloud storage with CDN
- ✅ No local file serving needed

## Setup (5 minutes)

### 1. Install Dependencies
```bash
cd backend
pip install supabase
```

### 2. Configure Environment
Create `backend/.env` file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Get your keys from**: Supabase Dashboard → Settings → API

### 3. Create Storage Buckets

#### Option A: Automatic (Recommended)
Just start the server - buckets are created automatically:
```bash
python app.py
```

#### Option B: Manual
In Supabase Dashboard → Storage:
1. Create bucket: `leaf-images` (Public, 16MB limit)
2. Create bucket: `heatmaps` (Public, 16MB limit)

### 4. Test It
```bash
# Upload a test image
curl -X POST http://localhost:5000/api/scans \
  -F "image=@test_leaf.jpg" \
  -F "crop_id=1"

# Response will contain:
# "image_url": "https://...supabase.co/storage/v1/object/public/leaf-images/..."
# "heatmap": "https://...supabase.co/storage/v1/object/public/heatmaps/..."
```

## File Organization

Images are organized by user:
```
leaf-images/
  └── {user_id}/
       ├── {scan_uuid}.jpg
       ├── {scan_uuid}.png
       └── ...

heatmaps/
  └── {user_id}/
       ├── heatmap_{scan_uuid}.jpg
       └── ...
```

## Backward Compatibility

The system automatically falls back to local storage if:
- Supabase credentials are missing
- Storage upload fails
- Buckets don't exist

No breaking changes - existing code continues to work!

## Next Steps

1. ✅ Backend updated (done)
2. ⏳ Update frontend to use new image URLs
3. ⏳ Test mobile app sync
4. ⏳ Update admin dashboard to display remote images

See `IMAGE_STORAGE_MIGRATION.md` for detailed documentation.
