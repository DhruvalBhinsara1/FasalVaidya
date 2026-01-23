-- =================================================================
-- ADD CROP_NAME TO LEAF_SCANS TABLE
-- =================================================================
-- Purpose: Add crop_name column for better readability in Supabase
-- This avoids needing to join with crops table every time
-- =================================================================

-- Add crop_name column to leaf_scans
ALTER TABLE public.leaf_scans 
ADD COLUMN IF NOT EXISTS crop_name TEXT;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_leaf_scans_crop_name 
ON public.leaf_scans(crop_name);

-- Update existing records with crop names based on crop_id
UPDATE public.leaf_scans ls
SET crop_name = c.name
FROM public.crops c
WHERE ls.crop_id = c.id
  AND ls.crop_name IS NULL;

-- Create a trigger to automatically populate crop_name when crop_id changes
CREATE OR REPLACE FUNCTION public.set_crop_name()
RETURNS TRIGGER AS $$
BEGIN
    -- If crop_id is set, populate crop_name from crops table
    IF NEW.crop_id IS NOT NULL THEN
        SELECT name INTO NEW.crop_name
        FROM public.crops
        WHERE id = NEW.crop_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for re-running this script)
DROP TRIGGER IF EXISTS set_leaf_scan_crop_name ON public.leaf_scans;

-- Create trigger on INSERT and UPDATE
CREATE TRIGGER set_leaf_scan_crop_name
    BEFORE INSERT OR UPDATE OF crop_id ON public.leaf_scans
    FOR EACH ROW
    EXECUTE FUNCTION public.set_crop_name();

-- Verify the changes
DO $$
DECLARE
    crop_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO crop_count
    FROM public.leaf_scans
    WHERE crop_name IS NOT NULL;
    
    RAISE NOTICE 'Updated % leaf_scans records with crop_name', crop_count;
END $$;
