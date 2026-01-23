import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/feedback
 * Receives feedback from mobile app
 * Body: { scan_id: string, rating: 'thumbs_up' | 'thumbs_down', feedback_text?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scan_id, user_id, rating, feedback_text } = body;

    // Validate required fields
    if (!scan_id || !rating) {
      return NextResponse.json(
        { error: 'scan_id and rating are required' },
        { status: 400 }
      );
    }

    if (!['thumbs_up', 'thumbs_down'].includes(rating)) {
      return NextResponse.json(
        { error: 'rating must be thumbs_up or thumbs_down' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Get diagnosis info for this scan to capture AI confidence
    const { data: diagnosis } = await supabase
      .from('diagnoses')
      .select('n_confidence, p_confidence, k_confidence, mg_confidence, detected_class')
      .eq('scan_id', scan_id)
      .single();

    // Calculate max confidence
    const aiConfidence = diagnosis
      ? Math.max(
          diagnosis.n_confidence || 0,
          diagnosis.p_confidence || 0,
          diagnosis.k_confidence || 0,
          diagnosis.mg_confidence || 0
        )
      : null;

    // Flag if high confidence + negative feedback
    const isFlagged = rating === 'thumbs_down' && aiConfidence !== null && aiConfidence > 0.8;

    // Insert feedback
    const { data: feedback, error } = await supabase
      .from('user_feedback')
      .insert({
        scan_id,
        user_id,
        rating,
        ai_confidence: aiConfidence,
        detected_class: diagnosis?.detected_class || null,
        feedback_text: feedback_text || null,
        is_flagged: isFlagged,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting feedback:', error);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback_id: feedback.id,
      is_flagged: isFlagged,
    });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback
 * Get feedback statistics or list (admin only)
 * Query: ?flagged=true to get only flagged feedback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const flaggedOnly = searchParams.get('flagged') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = await createAdminClient();

    let query = supabase
      .from('user_feedback')
      .select(`
        *,
        scan:leaf_scans(
          id,
          image_path,
          crop:crops(name, icon)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (flaggedOnly) {
      query = query.eq('is_flagged', true).is('reviewed_at', null);
    }

    const { data: feedback, error } = await query;

    if (error) {
      console.error('Error fetching feedback:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    // Get stats
    const { count: totalCount } = await supabase
      .from('user_feedback')
      .select('*', { count: 'exact', head: true });

    const { count: positiveCount } = await supabase
      .from('user_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('rating', 'thumbs_up');

    const { count: flaggedCount } = await supabase
      .from('user_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('is_flagged', true)
      .is('reviewed_at', null);

    return NextResponse.json({
      feedback,
      stats: {
        total: totalCount || 0,
        positive: positiveCount || 0,
        negative: (totalCount || 0) - (positiveCount || 0),
        flagged: flaggedCount || 0,
        accuracy: totalCount ? ((positiveCount || 0) / totalCount * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
