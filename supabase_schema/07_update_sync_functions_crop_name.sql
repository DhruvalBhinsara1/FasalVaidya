-- =================================================================
-- UPDATE SYNC FUNCTIONS TO HANDLE CROP_NAME
-- =================================================================
-- Purpose: Update batch sync functions to store crop_name
-- Run this AFTER running 06_add_crop_name_to_leaf_scans.sql
-- =================================================================

-- =================================================================
-- UPDATED: Batch Upsert Leaf Scans (with crop_name)
-- =================================================================
CREATE OR REPLACE FUNCTION public.sync_leaf_scans_batch(
    scans_data JSONB,
    p_device_id UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    synced_count INTEGER,
    failed_count INTEGER,
    errors JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    scan_record JSONB;
    current_user_id UUID;
    synced INT := 0;
    failed INT := 0;
    error_list JSONB := '[]'::JSONB;
    scan_exists BOOLEAN;
    server_updated_at TIMESTAMPTZ;
BEGIN
    -- DEVICE-BOUND AUTH: Find user by device_id
    IF p_device_id IS NOT NULL THEN
        SELECT id INTO current_user_id
        FROM public.users
        WHERE device_id = p_device_id
          AND deleted_at IS NULL;
    END IF;
    
    -- Fallback to auth session (for backward compatibility)
    IF current_user_id IS NULL THEN
        SELECT id INTO current_user_id
        FROM public.users
        WHERE auth_user_id = auth.uid()
          AND deleted_at IS NULL;
    END IF;
    
    -- If still not found, return error
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE, 
            0::INTEGER, 
            jsonb_array_length(scans_data)::INTEGER,
            jsonb_build_array(jsonb_build_object(
                'error', 'User not found. Call upsert_device_user first.'
            ));
        RETURN;
    END IF;

    -- Update last_active timestamp
    UPDATE public.users
    SET last_active = NOW()
    WHERE id = current_user_id;

    -- Iterate through each scan in the batch
    FOR scan_record IN SELECT * FROM jsonb_array_elements(scans_data)
    LOOP
        BEGIN
            -- Check if scan exists and get server timestamp
            SELECT updated_at INTO server_updated_at
            FROM public.leaf_scans
            WHERE id = (scan_record->>'id')::UUID
                AND user_id = current_user_id;
            
            scan_exists := FOUND;
            
            -- Server-wins conflict resolution: Only update if client is newer
            IF scan_exists AND server_updated_at > (scan_record->>'updated_at')::TIMESTAMPTZ THEN
                -- Server has newer version, skip this update
                synced := synced + 1;  -- Count as synced (no conflict)
                CONTINUE;
            END IF;
            
            -- Perform UPSERT (crop_name will be auto-populated by trigger)
            INSERT INTO public.leaf_scans (
                id,
                scan_uuid,
                user_id,
                crop_id,
                crop_name,
                image_path,
                image_filename,
                status,
                created_at,
                updated_at,
                deleted_at
            ) VALUES (
                (scan_record->>'id')::UUID,
                scan_record->>'scan_uuid',
                current_user_id,
                (scan_record->>'crop_id')::INTEGER,
                scan_record->>'crop_name',  -- Accept from client (or trigger will set it)
                scan_record->>'image_path',
                scan_record->>'image_filename',
                scan_record->>'status',
                COALESCE((scan_record->>'created_at')::TIMESTAMPTZ, NOW()),
                COALESCE((scan_record->>'updated_at')::TIMESTAMPTZ, NOW()),
                (scan_record->>'deleted_at')::TIMESTAMPTZ
            )
            ON CONFLICT (id) DO UPDATE SET
                scan_uuid = EXCLUDED.scan_uuid,
                crop_id = EXCLUDED.crop_id,
                crop_name = EXCLUDED.crop_name,
                image_path = EXCLUDED.image_path,
                image_filename = EXCLUDED.image_filename,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at;
            
            synced := synced + 1;
            
        EXCEPTION WHEN OTHERS THEN
            failed := failed + 1;
            error_list := error_list || jsonb_build_object(
                'id', scan_record->>'id',
                'error', SQLERRM
            );
        END;
    END LOOP;

    -- Return summary
    RETURN QUERY SELECT 
        TRUE,
        synced::INTEGER,
        failed::INTEGER,
        error_list;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.sync_leaf_scans_batch(JSONB, UUID) TO authenticated, anon;

-- Test query to verify crop_name is populated
-- SELECT id, scan_uuid, crop_id, crop_name, status, created_at 
-- FROM public.leaf_scans 
-- ORDER BY created_at DESC 
-- LIMIT 10;
