-- =================================================================
-- ADMIN DASHBOARD SCHEMA EXTENSIONS
-- =================================================================
-- Purpose: Additional tables and functions for AdminDashboard
-- Extends: 01_remote_schema.sql
-- =================================================================

-- =================================================================
-- ADMIN USERS TABLE (Separate from mobile users)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'admin', 'viewer')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can access admin_users table
CREATE POLICY "Admins can view all admin users"
    ON public.admin_users FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.admin_users WHERE role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "Super admins can manage admin users"
    ON public.admin_users FOR ALL
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.admin_users WHERE role = 'super_admin'
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- USER FEEDBACK TABLE (Mobile app feedback loop)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES public.leaf_scans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating TEXT NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),
    ai_confidence REAL,  -- Snapshot of AI confidence at time of feedback
    detected_class TEXT, -- Snapshot of detected class at time of feedback
    feedback_text TEXT,
    is_flagged BOOLEAN DEFAULT FALSE, -- Flagged for review if high confidence + negative feedback
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_scan_id ON public.user_feedback(scan_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_rating ON public.user_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_user_feedback_flagged ON public.user_feedback(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own feedback"
    ON public.user_feedback FOR SELECT
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own feedback"
    ON public.user_feedback FOR INSERT
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Admin access via service role key (bypasses RLS)

-- =================================================================
-- FUNCTION: Submit Feedback from Mobile App
-- =================================================================
CREATE OR REPLACE FUNCTION public.submit_feedback(
    p_scan_id UUID,
    p_rating TEXT,
    p_feedback_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    v_ai_confidence REAL;
    v_detected_class TEXT;
    v_is_flagged BOOLEAN := FALSE;
    v_feedback_id UUID;
BEGIN
    -- Get current user's internal user_id
    SELECT id INTO current_user_id
    FROM public.users
    WHERE auth_user_id = auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Get diagnosis info for this scan
    SELECT 
        GREATEST(n_confidence, p_confidence, k_confidence, mg_confidence),
        detected_class
    INTO v_ai_confidence, v_detected_class
    FROM public.diagnoses
    WHERE scan_id = p_scan_id
    LIMIT 1;

    -- Flag if high confidence + negative feedback (potential model issue)
    IF p_rating = 'thumbs_down' AND v_ai_confidence > 0.8 THEN
        v_is_flagged := TRUE;
    END IF;

    -- Insert feedback
    INSERT INTO public.user_feedback (
        scan_id,
        user_id,
        rating,
        ai_confidence,
        detected_class,
        feedback_text,
        is_flagged
    ) VALUES (
        p_scan_id,
        current_user_id,
        p_rating,
        v_ai_confidence,
        v_detected_class,
        p_feedback_text,
        v_is_flagged
    )
    RETURNING id INTO v_feedback_id;

    RETURN jsonb_build_object(
        'success', true,
        'feedback_id', v_feedback_id,
        'is_flagged', v_is_flagged
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_feedback(UUID, TEXT, TEXT) TO authenticated;

-- =================================================================
-- FUNCTION: Get Dashboard Statistics (Admin only)
-- =================================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    v_total_users INTEGER;
    v_active_users INTEGER;
    v_total_scans INTEGER;
    v_scans_today INTEGER;
    v_total_feedback INTEGER;
    v_positive_feedback INTEGER;
    v_flagged_count INTEGER;
BEGIN
    -- Total users
    SELECT COUNT(*) INTO v_total_users
    FROM public.users
    WHERE deleted_at IS NULL;

    -- Active users (last 7 days)
    SELECT COUNT(*) INTO v_active_users
    FROM public.users
    WHERE deleted_at IS NULL
    AND last_active >= NOW() - INTERVAL '7 days';

    -- Total scans
    SELECT COUNT(*) INTO v_total_scans
    FROM public.leaf_scans
    WHERE deleted_at IS NULL;

    -- Scans today
    SELECT COUNT(*) INTO v_scans_today
    FROM public.leaf_scans
    WHERE deleted_at IS NULL
    AND created_at >= CURRENT_DATE;

    -- Feedback stats
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE rating = 'thumbs_up')
    INTO v_total_feedback, v_positive_feedback
    FROM public.user_feedback;

    -- Flagged count
    SELECT COUNT(*) INTO v_flagged_count
    FROM public.user_feedback
    WHERE is_flagged = TRUE
    AND reviewed_at IS NULL;

    result := jsonb_build_object(
        'total_users', v_total_users,
        'active_users', v_active_users,
        'total_scans', v_total_scans,
        'scans_today', v_scans_today,
        'total_feedback', v_total_feedback,
        'positive_feedback', v_positive_feedback,
        'accuracy_rate', CASE 
            WHEN v_total_feedback > 0 
            THEN ROUND((v_positive_feedback::DECIMAL / v_total_feedback) * 100, 1)
            ELSE 0 
        END,
        'flagged_count', v_flagged_count
    );

    RETURN result;
END;
$$;

-- =================================================================
-- FUNCTION: Get Scan Analytics by Date Range
-- =================================================================
CREATE OR REPLACE FUNCTION public.get_scan_analytics(
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Scans by day
    WITH daily_scans AS (
        SELECT 
            DATE(created_at) as scan_date,
            COUNT(*) as count
        FROM public.leaf_scans
        WHERE deleted_at IS NULL
        AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY DATE(created_at)
        ORDER BY scan_date
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', scan_date,
            'count', count
        )
    ) INTO result
    FROM daily_scans;

    RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

-- =================================================================
-- FUNCTION: Get Crop Distribution Analytics
-- =================================================================
CREATE OR REPLACE FUNCTION public.get_crop_distribution()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    WITH crop_counts AS (
        SELECT 
            c.name as crop_name,
            c.icon,
            COUNT(ls.id) as count
        FROM public.leaf_scans ls
        LEFT JOIN public.crops c ON ls.crop_id = c.id
        WHERE ls.deleted_at IS NULL
        GROUP BY c.id, c.name, c.icon
    ),
    total AS (
        SELECT SUM(count) as total_count FROM crop_counts
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'crop_name', COALESCE(crop_name, 'Unknown'),
            'icon', COALESCE(icon, '🌿'),
            'count', count,
            'percentage', ROUND((count::DECIMAL / NULLIF(total_count, 0)) * 100, 1)
        )
    ) INTO result
    FROM crop_counts, total;

    RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

-- =================================================================
-- FUNCTION: Get Nutrient Distribution Analytics
-- =================================================================
CREATE OR REPLACE FUNCTION public.get_nutrient_distribution()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'nitrogen', jsonb_build_object(
            'healthy', COUNT(*) FILTER (WHERE n_severity = 'healthy'),
            'mild', COUNT(*) FILTER (WHERE n_severity = 'mild'),
            'moderate', COUNT(*) FILTER (WHERE n_severity = 'moderate'),
            'severe', COUNT(*) FILTER (WHERE n_severity = 'severe')
        ),
        'phosphorus', jsonb_build_object(
            'healthy', COUNT(*) FILTER (WHERE p_severity = 'healthy'),
            'mild', COUNT(*) FILTER (WHERE p_severity = 'mild'),
            'moderate', COUNT(*) FILTER (WHERE p_severity = 'moderate'),
            'severe', COUNT(*) FILTER (WHERE p_severity = 'severe')
        ),
        'potassium', jsonb_build_object(
            'healthy', COUNT(*) FILTER (WHERE k_severity = 'healthy'),
            'mild', COUNT(*) FILTER (WHERE k_severity = 'mild'),
            'moderate', COUNT(*) FILTER (WHERE k_severity = 'moderate'),
            'severe', COUNT(*) FILTER (WHERE k_severity = 'severe')
        ),
        'magnesium', jsonb_build_object(
            'healthy', COUNT(*) FILTER (WHERE mg_severity = 'healthy'),
            'mild', COUNT(*) FILTER (WHERE mg_severity = 'mild'),
            'moderate', COUNT(*) FILTER (WHERE mg_severity = 'moderate'),
            'severe', COUNT(*) FILTER (WHERE mg_severity = 'severe')
        )
    ) INTO result
    FROM public.diagnoses
    WHERE deleted_at IS NULL;

    RETURN result;
END;
$$;

-- =================================================================
-- FUNCTION: Get Flagged Feedback for Review
-- =================================================================
CREATE OR REPLACE FUNCTION public.get_flagged_feedback(
    p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', f.id,
            'scan_id', f.scan_id,
            'user_id', f.user_id,
            'rating', f.rating,
            'ai_confidence', f.ai_confidence,
            'detected_class', f.detected_class,
            'feedback_text', f.feedback_text,
            'created_at', f.created_at,
            'scan_image', ls.image_path,
            'crop_name', c.name
        )
    ) INTO result
    FROM public.user_feedback f
    LEFT JOIN public.leaf_scans ls ON f.scan_id = ls.id
    LEFT JOIN public.crops c ON ls.crop_id = c.id
    WHERE f.is_flagged = TRUE
    AND f.reviewed_at IS NULL
    ORDER BY f.created_at DESC
    LIMIT p_limit;

    RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

-- =================================================================
-- GRANT PERMISSIONS ON NEW FUNCTIONS
-- =================================================================
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scan_analytics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_crop_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nutrient_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_flagged_feedback(INTEGER) TO authenticated;

-- Grant full access to service role for admin operations
GRANT ALL ON public.admin_users TO service_role;
GRANT ALL ON public.user_feedback TO service_role;

-- =================================================================
-- INSERT DEFAULT SUPER ADMIN (Update with real credentials)
-- =================================================================
-- Note: Run this after creating the auth user in Supabase Dashboard
-- INSERT INTO public.admin_users (auth_user_id, email, full_name, role)
-- VALUES ('your-auth-user-uuid', 'admin@fasalvaidya.com', 'Amit Sharma', 'super_admin');
