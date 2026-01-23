import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/feedback/[id]
 * Mark feedback as reviewed
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reviewed_by, resolution_notes } = body;

    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from('user_feedback')
      .update({
        reviewed_at: new Date().toISOString(),
        reviewed_by,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating feedback:', error);
      return NextResponse.json(
        { error: 'Failed to update feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, feedback: data });
  } catch (error) {
    console.error('Feedback PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
