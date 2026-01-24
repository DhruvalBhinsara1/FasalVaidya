-- =================================================================
-- FIX CROP IDS TO MATCH BACKEND
-- =================================================================
-- Problem: Backend uses IDs 1,2,5,6,7,9,10,11,13
--          Supabase had IDs 1,2,3,4,5,6,7,8,9,10 (wrong mapping)
-- Solution: Update crops table to match backend IDs exactly
-- =================================================================

-- Step 1: Disable FK constraints temporarily (for data migration)
ALTER TABLE public.leaf_scans DROP CONSTRAINT IF EXISTS leaf_scans_crop_id_fkey;

-- Step 2: Delete old/wrong crops
DELETE FROM public.crops WHERE id IN (3, 4, 8);

-- Step 3: Update existing crop data to match backend
-- Rice: 1 → 2 (backend has Rice as 2)
UPDATE public.crops SET id = 2, name = 'Rice', name_hi = 'चावल', season = 'Kharif (Jun-Sep)', icon = '🌾' WHERE id = 1;
-- Wheat: 2 → 1 (backend has Wheat as 1)
UPDATE public.crops SET id = 1, name = 'Wheat', name_hi = 'गेहूँ', season = 'Rabi (Oct-Mar)', icon = '🌾' WHERE id = 2;

-- Step 4: Update existing IDs that are changing
-- Maize: 4 → 5 (backend has Maize as 5)
UPDATE public.leaf_scans SET crop_id = 5 WHERE crop_id = 4;
-- Eggplant: 8 → 9 (backend has Eggplant as 9)
UPDATE public.leaf_scans SET crop_id = 9 WHERE crop_id = 8;
-- Snakegourd: 9 → 13 (backend has Snake Gourd as 13)
UPDATE public.leaf_scans SET crop_id = 13 WHERE crop_id = 9;
-- Bittergourd: 10 → 11 (backend has Bitter Gourd as 11)
UPDATE public.leaf_scans SET crop_id = 11 WHERE crop_id = 10;

-- Step 5: Delete and recreate crops with correct IDs
DELETE FROM public.crops;

-- Step 6: Insert crops with correct IDs matching backend
INSERT INTO public.crops (id, name, name_hi, season, icon) VALUES
    (1, 'Wheat', 'गेहूँ', 'Rabi (Oct-Mar)', '🌾'),
    (2, 'Rice', 'चावल', 'Kharif (Jun-Sep)', '🌾'),
    (5, 'Maize', 'मक्का', 'Kharif/Rabi', '🌽'),
    (6, 'Banana', 'केला', 'Year-round', '🍌'),
    (7, 'Coffee', 'कॉफी', 'Year-round', '☕'),
    (9, 'Eggplant', 'बैंगन', 'Year-round', '🍆'),
    (10, 'Ash Gourd', 'पेठा', 'Kharif', '🎃'),
    (11, 'Bitter Gourd', 'करेला', 'Summer', '🥬'),
    (13, 'Snake Gourd', 'चिचिंडा', 'Summer', '🥬')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_hi = EXCLUDED.name_hi,
    season = EXCLUDED.season,
    icon = EXCLUDED.icon,
    updated_at = NOW();

-- Step 7: Re-enable FK constraint
ALTER TABLE public.leaf_scans 
    ADD CONSTRAINT leaf_scans_crop_id_fkey 
    FOREIGN KEY (crop_id) REFERENCES public.crops(id);

-- Step 8: Verify the fix
SELECT id, name, name_hi, icon FROM public.crops ORDER BY id;

-- Expected output:
-- 1  | Wheat        | गेहूँ     | 🌾
-- 2  | Rice         | चावल      | 🌾
-- 5  | Maize        | मक्का     | 🌽
-- 6  | Banana       | केला      | 🍌
-- 7  | Coffee       | कॉफी      | ☕
-- 9  | Eggplant     | बैंगन     | 🍆
-- 10 | Ash Gourd    | पेठा      | 🎃
-- 11 | Bitter Gourd | करेला     | 🥬
-- 13 | Snake Gourd  | चिचिंडा   | 🥬
