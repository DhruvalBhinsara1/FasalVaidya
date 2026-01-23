import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Admin registration secret key - change this to your own secret
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'FasalVaidya_Admin_2026_Secret';

/**
 * POST /api/auth/register
 * Register a new admin user
 * Body: { email, password, full_name, secret_key }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, full_name, secret_key } = body;

    // Validate required fields
    if (!email || !password || !full_name || !secret_key) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Verify secret key
    if (secret_key !== ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Invalid admin secret key' },
        { status: 403 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Create Supabase admin client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
      },
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return NextResponse.json(
        { error: authError.message || 'Failed to create user' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 500 }
      );
    }

    // Create admin_users record
    const { error: dbError } = await supabase
      .from('admin_users')
      .insert({
        auth_user_id: authData.user.id,
        email,
        full_name,
        role: 'super_admin', // First user is super admin by default
      });

    if (dbError) {
      console.error('Database error:', dbError);
      
      // Cleanup: delete the auth user if database insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json(
        { error: 'Failed to create admin record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user_id: authData.user.id,
      email,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
