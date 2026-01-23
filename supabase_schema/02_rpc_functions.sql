-- =================================================================
-- SUPABASE RPC FUNCTIONS FOR BATCH SYNC OPERATIONS
-- =================================================================
-- Purpose: Atomic batch upsert operations for efficient syncing
-- Strategy: Last-Write-Wins based on updated_at timestamp
-- =================================================================

-- =================================================================
-- FUNCTION: Batch Upsert Leaf Scans
-- =================================================================
CREATE OR REPLACE FUNCTION public.sync_leaf_scans_batch(
    scans_data JSONB
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
    -- Get or create current user's internal user_id
    -- First try to find by auth_user_id (current session)
    SELECT id INTO current_user_id
    FROM public.users
    WHERE auth_user_id = auth.uid();
    
    -- If not found, try to find by device_fingerprint (for anonymous users)
    -- This allows the same device to reuse the same user record across anonymous sessions
    IF current_user_id IS NULL THEN
        SELECT id INTO current_user_id
        FROM public.users
        WHERE device_fingerprint = 'sync-client'
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- Update the auth_user_id to the current session
        IF current_user_id IS NOT NULL THEN
            UPDATE public.users
            SET auth_user_id = auth.uid(),
                last_active = NOW()
            WHERE id = current_user_id;
        END IF;
    END IF;
    
    -- Still not found? Create new user
    IF current_user_id IS NULL THEN
        INSERT INTO public.users (auth_user_id, device_fingerprint, created_at, last_active)
        VALUES (auth.uid(), 'sync-client', NOW(), NOW())
        RETURNING id INTO current_user_id;
    END IF;

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
            
            -- Perform UPSERT
            INSERT INTO public.leaf_scans (
                id,
                scan_uuid,
                user_id,
                crop_id,
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
                image_path = EXCLUDED.image_path,
                image_filename = EXCLUDED.image_filename,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at;
            
            synced := synced + 1;
            
        EXCEPTION WHEN OTHERS THEN
            failed := failed + 1;
            error_list := error_list || jsonb_build_object(
                'scan_id', scan_record->>'id',
                'error', SQLERRM
            );
        END;
    END LOOP;

    -- Return results
    RETURN QUERY SELECT TRUE, synced, failed, error_list;
END;
$$;

-- =================================================================
-- FUNCTION: Batch Upsert Diagnoses
-- =================================================================
CREATE OR REPLACE FUNCTION public.sync_diagnoses_batch(
    diagnoses_data JSONB
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
    diagnosis_record JSONB;
    current_user_id UUID;
    synced INT := 0;
    failed INT := 0;
    error_list JSONB := '[]'::JSONB;
    diagnosis_exists BOOLEAN;
    server_updated_at TIMESTAMPTZ;
BEGIN
    -- Get or create current user's internal user_id
    -- First try to find by auth_user_id (current session)
    SELECT id INTO current_user_id
    FROM public.users
    WHERE auth_user_id = auth.uid();
    
    -- If not found, try to find by device_fingerprint (for anonymous users)
    IF current_user_id IS NULL THEN
        SELECT id INTO current_user_id
        FROM public.users
        WHERE device_fingerprint = 'sync-client'
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- Update the auth_user_id to the current session
        IF current_user_id IS NOT NULL THEN
            UPDATE public.users
            SET auth_user_id = auth.uid(),
                last_active = NOW()
            WHERE id = current_user_id;
        END IF;
    END IF;
    
    -- Still not found? Create new user
    IF current_user_id IS NULL THEN
        INSERT INTO public.users (auth_user_id, device_fingerprint, created_at, last_active)
        VALUES (auth.uid(), 'sync-client', NOW(), NOW())
        RETURNING id INTO current_user_id;
    END IF;

    -- Iterate through each diagnosis in the batch
    FOR diagnosis_record IN SELECT * FROM jsonb_array_elements(diagnoses_data)
    LOOP
        BEGIN
            -- Check if diagnosis exists and get server timestamp
            SELECT updated_at INTO server_updated_at
            FROM public.diagnoses
            WHERE id = (diagnosis_record->>'id')::UUID
                AND user_id = current_user_id;
            
            diagnosis_exists := FOUND;
            
            -- Server-wins conflict resolution
            IF diagnosis_exists AND server_updated_at > (diagnosis_record->>'updated_at')::TIMESTAMPTZ THEN
                synced := synced + 1;
                CONTINUE;
            END IF;
            
            -- Perform UPSERT
            INSERT INTO public.diagnoses (
                id,
                scan_id,
                user_id,
                n_score,
                p_score,
                k_score,
                mg_score,
                n_confidence,
                p_confidence,
                k_confidence,
                mg_confidence,
                n_severity,
                p_severity,
                k_severity,
                mg_severity,
                overall_status,
                detected_class,
                heatmap_path,
                created_at,
                updated_at,
                deleted_at
            ) VALUES (
                (diagnosis_record->>'id')::UUID,
                (diagnosis_record->>'scan_id')::UUID,
                current_user_id,
                (diagnosis_record->>'n_score')::REAL,
                (diagnosis_record->>'p_score')::REAL,
                (diagnosis_record->>'k_score')::REAL,
                (diagnosis_record->>'mg_score')::REAL,
                (diagnosis_record->>'n_confidence')::REAL,
                (diagnosis_record->>'p_confidence')::REAL,
                (diagnosis_record->>'k_confidence')::REAL,
                (diagnosis_record->>'mg_confidence')::REAL,
                diagnosis_record->>'n_severity',
                diagnosis_record->>'p_severity',
                diagnosis_record->>'k_severity',
                diagnosis_record->>'mg_severity',
                diagnosis_record->>'overall_status',
                diagnosis_record->>'detected_class',
                diagnosis_record->>'heatmap_path',
                COALESCE((diagnosis_record->>'created_at')::TIMESTAMPTZ, NOW()),
                COALESCE((diagnosis_record->>'updated_at')::TIMESTAMPTZ, NOW()),
                (diagnosis_record->>'deleted_at')::TIMESTAMPTZ
            )
            ON CONFLICT (id) DO UPDATE SET
                scan_id = EXCLUDED.scan_id,
                n_score = EXCLUDED.n_score,
                p_score = EXCLUDED.p_score,
                k_score = EXCLUDED.k_score,
                mg_score = EXCLUDED.mg_score,
                n_confidence = EXCLUDED.n_confidence,
                p_confidence = EXCLUDED.p_confidence,
                k_confidence = EXCLUDED.k_confidence,
                mg_confidence = EXCLUDED.mg_confidence,
                n_severity = EXCLUDED.n_severity,
                p_severity = EXCLUDED.p_severity,
                k_severity = EXCLUDED.k_severity,
                mg_severity = EXCLUDED.mg_severity,
                overall_status = EXCLUDED.overall_status,
                detected_class = EXCLUDED.detected_class,
                heatmap_path = EXCLUDED.heatmap_path,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at;
            
            synced := synced + 1;
            
        EXCEPTION WHEN OTHERS THEN
            failed := failed + 1;
            error_list := error_list || jsonb_build_object(
                'diagnosis_id', diagnosis_record->>'id',
                'error', SQLERRM
            );
        END;
    END LOOP;

    RETURN QUERY SELECT TRUE, synced, failed, error_list;
END;
$$;

-- =================================================================
-- FUNCTION: Batch Upsert Recommendations
-- =================================================================
CREATE OR REPLACE FUNCTION public.sync_recommendations_batch(
    recommendations_data JSONB
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
    rec_record JSONB;
    current_user_id UUID;
    synced INT := 0;
    failed INT := 0;
    error_list JSONB := '[]'::JSONB;
    rec_exists BOOLEAN;
    server_updated_at TIMESTAMPTZ;
BEGIN
    -- Get or create current user's internal user_id
    -- First try to find by auth_user_id (current session)
    SELECT id INTO current_user_id
    FROM public.users
    WHERE auth_user_id = auth.uid();
    
    -- If not found, try to find by device_fingerprint (for anonymous users)
    IF current_user_id IS NULL THEN
        SELECT id INTO current_user_id
        FROM public.users
        WHERE device_fingerprint = 'sync-client'
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- Update the auth_user_id to the current session
        IF current_user_id IS NOT NULL THEN
            UPDATE public.users
            SET auth_user_id = auth.uid(),
                last_active = NOW()
            WHERE id = current_user_id;
        END IF;
    END IF;
    
    -- Still not found? Create new user
    IF current_user_id IS NULL THEN
        INSERT INTO public.users (auth_user_id, device_fingerprint, created_at, last_active)
        VALUES (auth.uid(), 'sync-client', NOW(), NOW())
        RETURNING id INTO current_user_id;
    END IF;

    -- Iterate through each recommendation in the batch
    FOR rec_record IN SELECT * FROM jsonb_array_elements(recommendations_data)
    LOOP
        BEGIN
            -- Check if recommendation exists and get server timestamp
            SELECT updated_at INTO server_updated_at
            FROM public.recommendations
            WHERE id = (rec_record->>'id')::UUID
                AND user_id = current_user_id;
            
            rec_exists := FOUND;
            
            -- Server-wins conflict resolution
            IF rec_exists AND server_updated_at > (rec_record->>'updated_at')::TIMESTAMPTZ THEN
                synced := synced + 1;
                CONTINUE;
            END IF;
            
            -- Perform UPSERT
            INSERT INTO public.recommendations (
                id,
                scan_id,
                user_id,
                n_recommendation,
                p_recommendation,
                k_recommendation,
                mg_recommendation,
                n_recommendation_hi,
                p_recommendation_hi,
                k_recommendation_hi,
                mg_recommendation_hi,
                priority,
                created_at,
                updated_at,
                deleted_at
            ) VALUES (
                (rec_record->>'id')::UUID,
                (rec_record->>'scan_id')::UUID,
                current_user_id,
                rec_record->>'n_recommendation',
                rec_record->>'p_recommendation',
                rec_record->>'k_recommendation',
                rec_record->>'mg_recommendation',
                rec_record->>'n_recommendation_hi',
                rec_record->>'p_recommendation_hi',
                rec_record->>'k_recommendation_hi',
                rec_record->>'mg_recommendation_hi',
                rec_record->>'priority',
                COALESCE((rec_record->>'created_at')::TIMESTAMPTZ, NOW()),
                COALESCE((rec_record->>'updated_at')::TIMESTAMPTZ, NOW()),
                (rec_record->>'deleted_at')::TIMESTAMPTZ
            )
            ON CONFLICT (id) DO UPDATE SET
                scan_id = EXCLUDED.scan_id,
                n_recommendation = EXCLUDED.n_recommendation,
                p_recommendation = EXCLUDED.p_recommendation,
                k_recommendation = EXCLUDED.k_recommendation,
                mg_recommendation = EXCLUDED.mg_recommendation,
                n_recommendation_hi = EXCLUDED.n_recommendation_hi,
                p_recommendation_hi = EXCLUDED.p_recommendation_hi,
                k_recommendation_hi = EXCLUDED.k_recommendation_hi,
                mg_recommendation_hi = EXCLUDED.mg_recommendation_hi,
                priority = EXCLUDED.priority,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at;
            
            synced := synced + 1;
            
        EXCEPTION WHEN OTHERS THEN
            failed := failed + 1;
            error_list := error_list || jsonb_build_object(
                'recommendation_id', rec_record->>'id',
                'error', SQLERRM
            );
        END;
    END LOOP;

    RETURN QUERY SELECT TRUE, synced, failed, error_list;
END;
$$;

-- =================================================================
-- FUNCTION: Get Changes Since Last Sync (Pull)
-- =================================================================
CREATE OR REPLACE FUNCTION public.get_changes_since(
    table_name TEXT,
    since_timestamp TIMESTAMPTZ DEFAULT '1970-01-01'::TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    result JSONB;
BEGIN
    -- Get or create current user's internal user_id
    -- First try to find by auth_user_id (current session)
    SELECT id INTO current_user_id
    FROM public.users
    WHERE auth_user_id = auth.uid();
    
    -- If not found, try to find by device_fingerprint (for anonymous users)
    IF current_user_id IS NULL THEN
        SELECT id INTO current_user_id
        FROM public.users
        WHERE device_fingerprint = 'sync-client'
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- Update the auth_user_id to the current session
        IF current_user_id IS NOT NULL THEN
            UPDATE public.users
            SET auth_user_id = auth.uid(),
                last_active = NOW()
            WHERE id = current_user_id;
        END IF;
    END IF;
    
    -- Still not found? Create new user
    IF current_user_id IS NULL THEN
        INSERT INTO public.users (auth_user_id, device_fingerprint, created_at, last_active)
        VALUES (auth.uid(), 'sync-client', NOW(), NOW())
        RETURNING id INTO current_user_id;
    END IF;

    -- Fetch changes based on table name
    CASE table_name
        WHEN 'leaf_scans' THEN
            SELECT jsonb_agg(row_to_json(t.*)) INTO result
            FROM public.leaf_scans t
            WHERE t.user_id = current_user_id
                AND t.updated_at > since_timestamp;
                
        WHEN 'diagnoses' THEN
            SELECT jsonb_agg(row_to_json(t.*)) INTO result
            FROM public.diagnoses t
            WHERE t.user_id = current_user_id
                AND t.updated_at > since_timestamp;
                
        WHEN 'recommendations' THEN
            SELECT jsonb_agg(row_to_json(t.*)) INTO result
            FROM public.recommendations t
            WHERE t.user_id = current_user_id
                AND t.updated_at > since_timestamp;
                
        ELSE
            RETURN jsonb_build_object('error', 'Invalid table name');
    END CASE;

    -- Return empty array if no results
    IF result IS NULL THEN
        result := '[]'::JSONB;
    END IF;

    RETURN result;
END;
$$;

-- =================================================================
-- FUNCTION: Full Sync Status
-- =================================================================
CREATE OR REPLACE FUNCTION public.get_sync_status()
RETURNS TABLE (
    table_name TEXT,
    last_sync_at TIMESTAMPTZ,
    total_records INTEGER,
    deleted_records INTEGER,
    pending_changes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user's internal user_id
    SELECT id INTO current_user_id
    FROM public.users
    WHERE auth_user_id = auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Leaf scans stats
    RETURN QUERY
    SELECT 
        'leaf_scans'::TEXT,
        COALESCE(sm.last_sync_at, '1970-01-01'::TIMESTAMPTZ),
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE ls.deleted_at IS NOT NULL)::INTEGER,
        COUNT(*) FILTER (WHERE ls.updated_at > COALESCE(sm.last_sync_at, '1970-01-01'::TIMESTAMPTZ))::INTEGER
    FROM public.leaf_scans ls
    LEFT JOIN public.sync_metadata sm 
        ON sm.user_id = current_user_id AND sm.table_name = 'leaf_scans'
    WHERE ls.user_id = current_user_id;

    -- Diagnoses stats
    RETURN QUERY
    SELECT 
        'diagnoses'::TEXT,
        COALESCE(sm.last_sync_at, '1970-01-01'::TIMESTAMPTZ),
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE d.deleted_at IS NOT NULL)::INTEGER,
        COUNT(*) FILTER (WHERE d.updated_at > COALESCE(sm.last_sync_at, '1970-01-01'::TIMESTAMPTZ))::INTEGER
    FROM public.diagnoses d
    LEFT JOIN public.sync_metadata sm 
        ON sm.user_id = current_user_id AND sm.table_name = 'diagnoses'
    WHERE d.user_id = current_user_id;

    -- Recommendations stats
    RETURN QUERY
    SELECT 
        'recommendations'::TEXT,
        COALESCE(sm.last_sync_at, '1970-01-01'::TIMESTAMPTZ),
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE r.deleted_at IS NOT NULL)::INTEGER,
        COUNT(*) FILTER (WHERE r.updated_at > COALESCE(sm.last_sync_at, '1970-01-01'::TIMESTAMPTZ))::INTEGER
    FROM public.recommendations r
    LEFT JOIN public.sync_metadata sm 
        ON sm.user_id = current_user_id AND sm.table_name = 'recommendations'
    WHERE r.user_id = current_user_id;
END;
$$;

-- =================================================================
-- GRANT EXECUTE PERMISSIONS ON RPC FUNCTIONS
-- =================================================================
GRANT EXECUTE ON FUNCTION public.sync_leaf_scans_batch(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_diagnoses_batch(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_recommendations_batch(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_changes_since(TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sync_status() TO authenticated;
