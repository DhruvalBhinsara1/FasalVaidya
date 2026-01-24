-- =================================================================
-- DIAGNOSTIC: Check Device Auth State
-- =================================================================
-- Run this FIRST to understand why the upsert is failing
-- =================================================================

-- Check 1: Does this device_id exist at all?
SELECT 
    id,
    device_id,
    phone,
    name,
    profile_photo,
    deleted_at,
    created_at,
    last_active,
    CASE 
        WHEN deleted_at IS NOT NULL THEN '⚠️ SOFT DELETED'
        ELSE '✅ ACTIVE'
    END as status
FROM public.users 
WHERE device_id = 'c469b861-1673-4841-9148-f2a8f071a6c3'::uuid;

-- Check 2: Count all records for this device_id
SELECT COUNT(*) as total_records
FROM public.users 
WHERE device_id = 'c469b861-1673-4841-9148-f2a8f071a6c3'::uuid;

-- Check 3: Check if there are multiple records (shouldn't be possible with unique constraint)
SELECT 
    id,
    device_id,
    deleted_at,
    created_at
FROM public.users 
WHERE device_id = 'c469b861-1673-4841-9148-f2a8f071a6c3'::uuid
ORDER BY created_at DESC;

-- Check 4: Verify the unique constraint exists
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
    AND conname = 'users_device_id_key';
