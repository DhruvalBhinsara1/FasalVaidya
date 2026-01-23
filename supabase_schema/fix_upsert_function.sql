-- Quick Fix: Re-create upsert_device_user function with better NULL handling
-- Run this in Supabase SQL Editor to fix the name/phone not updating issue

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
    -- Check for phone hijack
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
    
    -- Try to find existing user by device_id
    SELECT u.id INTO v_user_id
    FROM public.users u
    WHERE u.device_id = p_device_id
      AND u.deleted_at IS NULL;
    
    IF v_user_id IS NULL THEN
        -- Create new user
        INSERT INTO public.users (device_id, phone, name, profile_photo)
        VALUES (
            p_device_id, 
            NULLIF(p_phone, ''),  -- Convert empty string to NULL
            NULLIF(p_name, ''),   -- Convert empty string to NULL
            NULLIF(p_profile_photo, '')  -- Convert empty string to NULL
        )
        RETURNING id INTO v_user_id;
        
        v_is_new := TRUE;
    ELSE
        -- Update existing user
        -- If parameter is provided (not NULL and not empty), update the field
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
            updated_at = NOW(),
            last_active = NOW()
        WHERE id = v_user_id;
    END IF;
    
    RETURN QUERY SELECT v_user_id, v_is_new, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT * FROM upsert_device_user(
    '57f6eb71-8b12-40c6-bf76-a7654d34a559'::uuid,
    '+91 9876543210',
    'Test Farmer',
    NULL
);

-- Verify the update
SELECT id, device_id, name, phone FROM public.users 
WHERE device_id = '57f6eb71-8b12-40c6-bf76-a7654d34a559'::uuid;
