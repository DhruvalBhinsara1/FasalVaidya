import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/stats
 * Get dashboard statistics
 */
export async function GET() {
  try {
    const supabase = await createAdminClient();

    // Get all stats in parallel
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalScans },
      { count: scansToday },
      { count: totalFeedback },
      { count: positiveFeedback },
      { count: flaggedCount },
    ] = await Promise.all([
      // Total users
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null),
      
      // Active users (last 7 days)
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('last_active', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Total scans
      supabase
        .from('leaf_scans')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null),
      
      // Scans today
      supabase
        .from('leaf_scans')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', new Date().toISOString().split('T')[0]),
      
      // Total feedback
      supabase
        .from('user_feedback')
        .select('*', { count: 'exact', head: true }),
      
      // Positive feedback
      supabase
        .from('user_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('rating', 'thumbs_up'),
      
      // Flagged feedback
      supabase
        .from('user_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('is_flagged', true)
        .is('reviewed_at', null),
    ]);

    const accuracyRate = totalFeedback 
      ? ((positiveFeedback || 0) / totalFeedback * 100).toFixed(1) 
      : '0';

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalScans: totalScans || 0,
      scansToday: scansToday || 0,
      totalFeedback: totalFeedback || 0,
      positiveFeedback: positiveFeedback || 0,
      accuracyRate: parseFloat(accuracyRate),
      flaggedCount: flaggedCount || 0,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
