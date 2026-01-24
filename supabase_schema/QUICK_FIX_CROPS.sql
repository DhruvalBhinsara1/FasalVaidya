-- ========================================
-- QUICK FIX FOR CROP ID MISMATCH
-- ========================================
-- Run this in Supabase SQL Editor
-- Takes ~5 seconds to execute
-- ========================================

BEGIN;

-- Step 1: Drop FK constraint temporarily
ALTER TABLE public.leaf_scans DROP CONSTRAINT IF EXISTS leaf_scans_crop_id_fkey;

-- Step 2: Update existing leaf_scans with new crop IDs
-- Map old IDs to new IDs to preserve existing data
UPDATE public.leaf_scans SET crop_id = 
    CASE crop_id
        WHEN 1 THEN 2  -- Rice: 1 → 2
        WHEN 2 THEN 1  -- Wheat: 2 → 1
        WHEN 4 THEN 5  -- Maize: 4 → 5
        WHEN 8 THEN 9  -- Eggplant: 8 → 9
        WHEN 9 THEN 13 -- Snakegourd: 9 → 13 (old) → skip for now
        WHEN 10 THEN 11 -- Bittergourd: 10 → 11
        ELSE crop_id
    END;

-- Special case: Handle old Snake Gourd (9) after other updates
UPDATE public.leaf_scans SET crop_id = 13 WHERE crop_id = 9;

-- Step 3: Delete old crops
DELETE FROM public.crops;

-- Step 4: Insert correct crops matching backend
INSERT INTO public.crops (id, name, name_hi, season, icon) VALUES
    (1, 'Wheat', 'गेहूँ', 'Rabi (Oct-Mar)', '🌾'),
    (2, 'Rice', 'चावल', 'Kharif (Jun-Sep)', '🌾'),
    (5, 'Maize', 'मक्का', 'Kharif/Rabi', '🌽'),
    (6, 'Banana', 'केला', 'Year-round', '🍌'),
    (7, 'Coffee', 'कॉफी', 'Year-round', '☕'),
    (9, 'Eggplant', 'बैंगन', 'Year-round', '🍆'),
    (10, 'Ash Gourd', 'पेठा', 'Kharif', '🎃'),
    (11, 'Bitter Gourd', 'करेला', 'Summer', '🥬'),
    (13, 'Snake Gourd', 'चिचिंडा', 'Summer', '🥬');

-- Step 5: Restore FK constraint
ALTER TABLE public.leaf_scans 
    ADD CONSTRAINT leaf_scans_crop_id_fkey 
    FOREIGN KEY (crop_id) REFERENCES public.crops(id);

COMMIT;

-- Verify the fix
SELECT 'Crops after fix:' as status;
SELECT id, name, icon FROM public.crops ORDER BY id;

SELECT 'Scan count by crop:' as status;
SELECT crop_id, COUNT(*) as count 
FROM public.leaf_scans 
WHERE deleted_at IS NULL
GROUP BY crop_id 
ORDER BY crop_id;
