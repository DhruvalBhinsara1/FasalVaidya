-- =================================================================
-- DEVICE-BOUND IDENTITY MIGRATION FOR FASALVAIDYA
-- =================================================================
-- Purpose: Enable device-based authentication for development/hackathon
-- This bypasses Supabase Auth rate limits while maintaining user identity
-- 
-- MIGRATION PATH TO PRODUCTION:
-- 1. When OTP rate limits are resolved, enable real auth
-- 2. Map device_id → auth.users.id
-- 3. Zero data loss migration
-- =================================================================

-- =================================================================
-- STEP 1: Add device_id and phone columns to users table
-- =================================================================

-- Add device_id column (client-generated UUID - primary identity in dev mode)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS device_id UUID UNIQUE;

-- Add phone number column (optional user attribute, NOT identity)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add name column for user profile
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add profile_photo column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS profile_photo TEXT;

-- Make auth_user_id nullable (for device-bound auth mode)
ALTER TABLE public.users 
ALTER COLUMN auth_user_id DROP NOT NULL;

-- =================================================================
-- STEP 2: Create unique constraint for phone (anti-hijack)
-- =================================================================
-- Phone must be unique - prevents different users from claiming same phone

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique 
ON public.users(phone) 
WHERE phone IS NOT NULL AND deleted_at IS NULL;

-- =================================================================
-- STEP 3: Create index for device_id lookup
-- =================================================================

CREATE INDEX IF NOT EXISTS idx_users_device_id 
ON public.users(device_id) 
WHERE device_id IS NOT NULL;

-- =================================================================
-- STEP 4: Drop existing RLS policies that require auth.uid()
-- =================================================================
-- We'll create new policies that work with both auth and device modes

DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

-- =================================================================
-- STEP 5: Create new RLS policies for device-bound auth
-- =================================================================

-- DEVELOPMENT MODE: Allow any authenticated or anonymous access
-- In production, tighten these policies

-- Allow anyone to view users by device_id (for development)
CREATE POLICY "Users can view by device_id"
    ON public.users FOR SELECT
    USING (
        -- Traditional auth: match auth.uid()
        auth_user_id = auth.uid()
        OR
        -- Device auth: allow select for matching device_id (checked in app layer)
        device_id IS NOT NULL
    );

-- Allow insert with device_id
CREATE POLICY "Users can insert with device_id"
    ON public.users FOR INSERT
    WITH CHECK (
        -- Traditional auth
        auth_user_id = auth.uid()
        OR
        -- Device auth: allow insert if device_id is provided
        device_id IS NOT NULL
    );

-- Allow update by device_id or auth_user_id
CREATE POLICY "Users can update by device_id"
    ON public.users FOR UPDATE
    USING (
        auth_user_id = auth.uid()
        OR
        device_id IS NOT NULL
    )
    WITH CHECK (
        auth_user_id = auth.uid()
        OR
        device_id IS NOT NULL
    );

-- =================================================================
-- STEP 6: Create function to check phone anti-hijack
-- =================================================================

CREATE OR REPLACE FUNCTION check_phone_hijack(
    p_device_id UUID,
    p_phone TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    existing_user UUID;
BEGIN
    -- If no phone provided, no hijack possible
    IF p_phone IS NULL OR p_phone = '' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if phone exists with a different user
    SELECT device_id INTO existing_user
    FROM public.users
    WHERE phone = p_phone
      AND deleted_at IS NULL
      AND device_id != p_device_id;
    
    -- If found, this is a hijack attempt
    IF existing_user IS NOT NULL THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- STEP 7: Create upsert function for device-bound users
-- =================================================================

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
    IF p_phone IS NOT NULL THEN
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
        VALUES (p_device_id, p_phone, p_name, p_profile_photo)
        RETURNING id INTO v_user_id;
        
        v_is_new := TRUE;
    ELSE
        -- Update existing user
        -- If parameter is provided (not NULL), update the field
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

-- =================================================================
-- STEP 8: Create function to get user by device_id
-- =================================================================

CREATE OR REPLACE FUNCTION get_user_by_device_id(p_device_id UUID)
RETURNS TABLE (
    id UUID,
    device_id UUID,
    phone TEXT,
    name TEXT,
    profile_photo TEXT,
    created_at TIMESTAMPTZ,
    last_active TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.device_id,
        u.phone,
        u.name,
        u.profile_photo,
        u.created_at,
        u.last_active
    FROM public.users u
    WHERE u.device_id = p_device_id
      AND u.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- STEP 9: Update leaf_scans RLS for device-bound auth
-- =================================================================

DROP POLICY IF EXISTS "Users can view own scans" ON public.leaf_scans;
DROP POLICY IF EXISTS "Users can insert own scans" ON public.leaf_scans;
DROP POLICY IF EXISTS "Users can update own scans" ON public.leaf_scans;

-- New policies that work with device_id
CREATE POLICY "Scans viewable by user"
    ON public.leaf_scans FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid() 
               OR device_id IS NOT NULL
        )
    );

CREATE POLICY "Scans insertable by user"
    ON public.leaf_scans FOR INSERT
    WITH CHECK (
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid() 
               OR device_id IS NOT NULL
        )
    );

CREATE POLICY "Scans updatable by user"
    ON public.leaf_scans FOR UPDATE
    USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid() 
               OR device_id IS NOT NULL
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid() 
               OR device_id IS NOT NULL
        )
    );

-- =================================================================
-- STEP 10: Update diagnoses RLS for device-bound auth
-- =================================================================

DROP POLICY IF EXISTS "Users can view own diagnoses" ON public.diagnoses;
DROP POLICY IF EXISTS "Users can insert own diagnoses" ON public.diagnoses;
DROP POLICY IF EXISTS "Users can update own diagnoses" ON public.diagnoses;

CREATE POLICY "Diagnoses viewable by user"
    ON public.diagnoses FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid() 
               OR device_id IS NOT NULL
        )
    );

CREATE POLICY "Diagnoses insertable by user"
    ON public.diagnoses FOR INSERT
    WITH CHECK (
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid() 
               OR device_id IS NOT NULL
        )
    );

CREATE POLICY "Diagnoses updatable by user"
    ON public.diagnoses FOR UPDATE
    USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid() 
               OR device_id IS NOT NULL
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid() 
               OR device_id IS NOT NULL
        )
    );

-- =================================================================
-- GRANT EXECUTE PERMISSIONS
-- =================================================================

GRANT EXECUTE ON FUNCTION check_phone_hijack(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_device_user(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_device_id(UUID) TO anon, authenticated;

-- =================================================================
-- DOCUMENTATION
-- =================================================================
COMMENT ON COLUMN public.users.device_id IS 
    'Client-generated UUID for device-bound authentication. Primary identity in dev mode.';

COMMENT ON COLUMN public.users.phone IS 
    'User phone number. Optional attribute, NOT identity. Must be unique to prevent hijacking.';

COMMENT ON FUNCTION upsert_device_user(UUID, TEXT, TEXT, TEXT) IS 
    'Create or update user by device_id. Anti-hijack: rejects if phone exists with different device_id.';

COMMENT ON FUNCTION get_user_by_device_id(UUID) IS 
    'Get user profile by device_id for device-bound authentication.';
