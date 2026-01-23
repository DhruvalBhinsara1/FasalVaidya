import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/scans/[id]
 * Get single scan with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createAdminClient();

    const { data: scan, error } = await supabase
      .from('leaf_scans')
      .select(`
        *,
        crop:crops(*),
        diagnosis:diagnoses(*),
        recommendation:recommendations(*),
        user:users(id, device_fingerprint, created_at, last_active),
        feedback:user_feedback(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching scan:', error);
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ scan });
  } catch (error) {
    console.error('Scan GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scans/[id]
 * Soft delete a scan
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createAdminClient();

    // Soft delete the scan
    const { error } = await supabase
      .from('leaf_scans')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting scan:', error);
      return NextResponse.json(
        { error: 'Failed to delete scan' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Scan DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
