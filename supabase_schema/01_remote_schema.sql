-- =================================================================
-- SUPABASE REMOTE SCHEMA FOR FASALVAIDYA
-- =================================================================
-- Purpose: Remote PostgreSQL schema with Row Level Security (RLS)
-- Strategy: UUID-based primary keys, soft deletes, delta sync
-- Auth: Supabase Auth integration (auth.users)
-- =================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================
-- USERS TABLE (linked to Supabase Auth)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL  -- Soft delete
);

-- Create indexes
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX idx_users_updated_at ON public.users(updated_at);
CREATE INDEX idx_users_deleted_at ON public.users(deleted_at) WHERE deleted_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own data"
    ON public.users FOR SELECT
    USING (auth_user_id = auth.uid());

CREATE POLICY "Users can insert own data"
    ON public.users FOR INSERT
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Users can update own data"
    ON public.users FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- CROPS TABLE (Reference data - no RLS needed)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.crops (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    name_hi TEXT,
    season TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default crops (MUST MATCH backend/app.py CROPS dictionary IDs)
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

-- =================================================================
-- LEAF_SCANS TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS public.leaf_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_uuid TEXT UNIQUE NOT NULL,  -- Keep for backward compatibility
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    crop_id INTEGER REFERENCES public.crops(id),
    image_path TEXT NOT NULL,
    image_filename TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL  -- Soft delete
);

-- Create indexes
CREATE INDEX idx_leaf_scans_user_id ON public.leaf_scans(user_id);
CREATE INDEX idx_leaf_scans_updated_at ON public.leaf_scans(updated_at);
CREATE INDEX idx_leaf_scans_deleted_at ON public.leaf_scans(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_leaf_scans_user_crop ON public.leaf_scans(user_id, crop_id);
CREATE INDEX idx_leaf_scans_scan_uuid ON public.leaf_scans(scan_uuid);

-- Enable Row Level Security
ALTER TABLE public.leaf_scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own scans"
    ON public.leaf_scans FOR SELECT
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own scans"
    ON public.leaf_scans FOR INSERT
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own scans"
    ON public.leaf_scans FOR UPDATE
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_leaf_scans_updated_at
    BEFORE UPDATE ON public.leaf_scans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- DIAGNOSES TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS public.diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES public.leaf_scans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    n_score REAL,
    p_score REAL,
    k_score REAL,
    mg_score REAL,
    n_confidence REAL,
    p_confidence REAL,
    k_confidence REAL,
    mg_confidence REAL,
    n_severity TEXT,
    p_severity TEXT,
    k_severity TEXT,
    mg_severity TEXT,
    overall_status TEXT,
    detected_class TEXT,
    heatmap_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL  -- Soft delete
);

-- Create indexes
CREATE INDEX idx_diagnoses_user_id ON public.diagnoses(user_id);
CREATE INDEX idx_diagnoses_scan_id ON public.diagnoses(scan_id);
CREATE INDEX idx_diagnoses_updated_at ON public.diagnoses(updated_at);
CREATE INDEX idx_diagnoses_deleted_at ON public.diagnoses(deleted_at) WHERE deleted_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own diagnoses"
    ON public.diagnoses FOR SELECT
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own diagnoses"
    ON public.diagnoses FOR INSERT
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own diagnoses"
    ON public.diagnoses FOR UPDATE
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_diagnoses_updated_at
    BEFORE UPDATE ON public.diagnoses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- RECOMMENDATIONS TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES public.leaf_scans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    n_recommendation TEXT,
    p_recommendation TEXT,
    k_recommendation TEXT,
    mg_recommendation TEXT,
    n_recommendation_hi TEXT,
    p_recommendation_hi TEXT,
    k_recommendation_hi TEXT,
    mg_recommendation_hi TEXT,
    priority TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL  -- Soft delete
);

-- Create indexes
CREATE INDEX idx_recommendations_user_id ON public.recommendations(user_id);
CREATE INDEX idx_recommendations_scan_id ON public.recommendations(scan_id);
CREATE INDEX idx_recommendations_updated_at ON public.recommendations(updated_at);
CREATE INDEX idx_recommendations_deleted_at ON public.recommendations(deleted_at) WHERE deleted_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own recommendations"
    ON public.recommendations FOR SELECT
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own recommendations"
    ON public.recommendations FOR INSERT
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own recommendations"
    ON public.recommendations FOR UPDATE
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_recommendations_updated_at
    BEFORE UPDATE ON public.recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- SYNC METADATA TABLE (Track sync state per client)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.sync_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status TEXT DEFAULT 'idle',  -- idle, syncing, failed
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, table_name)
);

-- Create indexes
CREATE INDEX idx_sync_metadata_user_id ON public.sync_metadata(user_id);
CREATE INDEX idx_sync_metadata_table_name ON public.sync_metadata(table_name);

-- Enable Row Level Security
ALTER TABLE public.sync_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own sync metadata"
    ON public.sync_metadata FOR ALL
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_sync_metadata_updated_at
    BEFORE UPDATE ON public.sync_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- HELPER VIEWS (Optional - for easier querying)
-- =================================================================

-- View: Active (non-deleted) leaf scans
CREATE OR REPLACE VIEW public.active_leaf_scans AS
SELECT * FROM public.leaf_scans
WHERE deleted_at IS NULL;

-- View: Active diagnoses
CREATE OR REPLACE VIEW public.active_diagnoses AS
SELECT * FROM public.diagnoses
WHERE deleted_at IS NULL;

-- View: Active recommendations
CREATE OR REPLACE VIEW public.active_recommendations AS
SELECT * FROM public.recommendations
WHERE deleted_at IS NULL;

-- =================================================================
-- GRANT PERMISSIONS
-- =================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant access to service role (for admin operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
