-- =================================================================
-- IMAGE STORAGE UPDATE - RPC Functions
-- =================================================================
-- Updates RPC functions to handle both local paths and Supabase Storage URLs
-- No schema changes needed - image_path field already supports URLs
-- =================================================================

-- Helper function to check if path is a URL
CREATE OR REPLACE FUNCTION is_storage_url(path TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN path LIKE 'http%';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Updated function to get scan with proper image URL handling
CREATE OR REPLACE FUNCTION get_scan_with_images(p_scan_id UUID)
RETURNS TABLE (
    scan_id UUID,
    scan_uuid TEXT,
    user_id UUID,
    crop_id INTEGER,
    crop_name TEXT,
    image_url TEXT,
    image_filename TEXT,
    heatmap_url TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    n_score NUMERIC,
    p_score NUMERIC,
    k_score NUMERIC,
    overall_status TEXT,
    detected_class TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ls.id as scan_id,
        ls.scan_uuid,
        ls.user_id,
        ls.crop_id,
        c.name as crop_name,
        ls.image_path as image_url,  -- Already contains full URL from Supabase Storage
        ls.image_filename,
        d.heatmap_path as heatmap_url,  -- Already contains full URL
        ls.status,
        ls.created_at,
        d.n_score,
        d.p_score,
        d.k_score,
        d.overall_status,
        d.detected_class
    FROM public.leaf_scans ls
    LEFT JOIN public.crops c ON ls.crop_id = c.id
    LEFT JOIN public.diagnoses d ON ls.id = d.scan_id
    WHERE ls.id = p_scan_id
    AND ls.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment explaining the storage approach
COMMENT ON FUNCTION get_scan_with_images IS 
'Returns scan with image URLs. The image_path and heatmap_path fields now store full Supabase Storage public URLs instead of local file paths.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_scan_with_images TO authenticated;
GRANT EXECUTE ON FUNCTION is_storage_url TO authenticated;
