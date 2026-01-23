import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/scans
 * Get paginated scans with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const cropId = searchParams.get('crop_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    const supabase = await createAdminClient();

    let query = supabase
      .from('leaf_scans')
      .select(`
        *,
        crop:crops(*),
        diagnosis:diagnoses(*),
        recommendation:recommendations(*),
        user:users(id, device_fingerprint, last_active)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (cropId) {
      query = query.eq('crop_id', parseInt(cropId));
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: scans, count, error } = await query;

    if (error) {
      console.error('Error fetching scans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scans' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      scans,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Scans API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
