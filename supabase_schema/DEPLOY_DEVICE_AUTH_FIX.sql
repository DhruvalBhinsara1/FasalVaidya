-- =================================================================
-- EMERGENCY FIX: Device Authentication Duplicate Key Error
-- =================================================================
-- Issue: Mobile app getting "duplicate key value violates unique constraint"
-- Cause: upsert_device_user function not properly handling existing device_ids
-- Solution: Re-deploy function with correct upsert logic
-- 
-- Instructions:
-- 1. Go to: https://supabase.com/dashboard/project/jtefnnlcikvyswmuowxd/sql/new
-- 2. Copy-paste this entire file
-- 3. Click "Run" button
-- 4. Verify: SELECT * FROM upsert_device_user('test-uuid'::uuid);
-- 5. Test mobile app again
-- =================================================================

-- Drop and recreate function to ensure clean deployment
DROP FUNCTION IF EXISTS upsert_device_user(UUID, TEXT, TEXT, TEXT);

-- Recreate with proper upsert logic
CREATE OR REPLACE FUNCTION upsert_device_user(
    p_device_id UUID,
    p_phone TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_profile_photo TEXT DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    is_new BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_user_id UUID;
    v_is_new BOOLEAN := FALSE;
    v_existing_phone_user UUID;
BEGIN
    -- Bypass Row Level Security for this function
    -- This allows the function to see all users regardless of RLS policies
    SET LOCAL row_security = OFF;
    
    -- Check for phone hijack: prevent phone number being used by another device
    IF p_phone IS NOT NULL AND p_phone != '' THEN
        SELECT u.id INTO v_existing_phone_user
        FROM public.users u
        WHERE u.phone = p_phone
          AND u.deleted_at IS NULL
          AND u.device_id != p_device_id;
        
        IF v_existing_phone_user IS NOT NULL THEN
            RETURN QUERY SELECT 
                NULL::UUID, 
                FALSE, 
                'Phone number already registered to another user'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Try to find existing user by device_id (including soft-deleted)
    SELECT u.id INTO v_user_id
    FROM public.users u
    WHERE u.device_id = p_device_id
    ORDER BY deleted_at NULLS FIRST  -- Prefer active records
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        -- Create new user (device_id doesn't exist at all)
        INSERT INTO public.users (device_id, phone, name, profile_photo)
        VALUES (
            p_device_id, 
            NULLIF(p_phone, ''),  -- Convert empty string to NULL
            NULLIF(p_name, ''),   -- Convert empty string to NULL
            NULLIF(p_profile_photo, '')  -- Convert empty string to NULL
        )
        RETURNING id INTO v_user_id;
        
        v_is_new := TRUE;
        
        RAISE NOTICE 'Created new user % for device %', v_user_id, p_device_id;
    ELSE
        -- Update existing user (device_id already exists - this is the fix!)
        -- Also undelete if it was soft-deleted
        UPDATE public.users
        SET 
            phone = CASE 
                WHEN p_phone IS NOT NULL AND p_phone != '' THEN p_phone 
                WHEN p_phone = '' THEN NULL  -- Allow clearing
                ELSE phone 
            END,
            name = CASE 
                WHEN p_name IS NOT NULL AND p_name != '' THEN p_name 
                WHEN p_name = '' THEN NULL  -- Allow clearing
                ELSE name 
            END,
            profile_photo = CASE 
                WHEN p_profile_photo IS NOT NULL AND p_profile_photo != '' THEN p_profile_photo 
                WHEN p_profile_photo = '' THEN NULL  -- Allow clearing
                ELSE profile_photo 
            END,
            deleted_at = NULL,  -- Undelete if it was soft-deleted
            updated_at = NOW(),
            last_active = NOW()
        WHERE id = v_user_id;
        
        RAISE NOTICE 'Updated existing user % for device %', v_user_id, p_device_id;
    END IF;
    
    RETURN QUERY SELECT v_user_id, v_is_new, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function with your actual device_id
-- This should now return success instead of duplicate key error
SELECT * FROM upsert_device_user(
    'c469b861-1673-4841-9148-f2a8f071a6c3'::uuid,
    NULL,
    NULL,
    NULL
);

-- Expected output:
-- user_id                              | is_new | error_message
-- [some-uuid]                          | false  | null

-- Verification query: Check if device_id exists
SELECT id, device_id, phone, name, created_at, last_active 
FROM public.users 
WHERE device_id = 'c469b861-1673-4841-9148-f2a8f071a6c3'::uuid;
