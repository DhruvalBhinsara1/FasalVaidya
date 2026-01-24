/**
 * Device-Bound User Service for FasalVaidya
 * ==========================================
 * 
 * DEVELOPMENT/HACKATHON MODE
 * ---------------------------
 * Uses device UUID as user identity, bypassing Supabase Auth rate limits.
 * 
 * Features:
 * - Create/update user by device_id
 * - Anti-hijack protection for phone numbers
 * - Profile sync with Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getDeviceId } from '../utils/deviceId';

// =================================================================
// CONFIGURATION
// =================================================================

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// =================================================================
// TYPES
// =================================================================

export interface DeviceUser {
  id: string;           // Server-assigned UUID (from users table)
  device_id: string;    // Client-generated device UUID
  phone?: string;
  name?: string;
  profile_photo?: string;
  created_at: string;
  last_active: string;
}

export interface UpsertUserResult {
  success: boolean;
  user?: DeviceUser;
  isNew?: boolean;
  error?: string;
}

export interface PhoneHijackResult {
  isHijack: boolean;
  error?: string;
}

// =================================================================
// SERVICE CLASS
// =================================================================

class DeviceUserService {
  private client: SupabaseClient | null = null;

  constructor() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false, // No auth needed for device-bound mode
          autoRefreshToken: false,
        },
        global: {
          fetch: (url, options = {}) => {
            // Add timeout to prevent hanging on network issues
            return Promise.race([
              fetch(url, options),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout (10s)')), 10000)
              ),
            ]);
          },
        },
      });
    }
  }

  /**
   * Get Supabase client (for external use)
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Check if Supabase is configured
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Get or create user by device ID
   * Uses anonymous sign-in for RLS bypass, then upserts by device_id
   */
  async getOrCreateUser(
    phone?: string,
    name?: string,
    profilePhoto?: string
  ): Promise<UpsertUserResult> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const deviceId = await getDeviceId();
      console.log('🔐 [DeviceUser] Getting/creating user for device:', deviceId);
      console.log('   Parameters:');
      console.log('     - phone:', phone || '(undefined)');
      console.log('     - name:', name || '(undefined)');
      console.log('     - profilePhoto:', profilePhoto || '(undefined)');

      // Note: No anonymous auth needed - RPC functions are SECURITY DEFINER
      // They bypass RLS policies, so we can call them directly

      // Call the upsert function
      const rpcParams = {
        p_device_id: deviceId,
        p_phone: phone || null,
        p_name: name || null,
        p_profile_photo: profilePhoto || null,
      };
      
      console.log('   RPC parameters:', JSON.stringify(rpcParams, null, 2));
      
      const { data, error } = await this.client.rpc('upsert_device_user', rpcParams);

      if (error) {
        console.error('❌ [DeviceUser] Upsert failed:', error.message);
        console.error('   Error details:', JSON.stringify(error, null, 2));
        
        // If it's a network error, it's non-critical - app can work offline
        if (error.message?.includes('Network') || error.message?.includes('timeout')) {
          console.warn('⚠️ [DeviceUser] Network issue - will retry later');
          return { success: false, error: error.message, canRetry: true };
        }
        
        return { success: false, error: error.message };
      }

      console.log('   RPC response data:', JSON.stringify(data, null, 2));

      if (!data || data.length === 0) {
        return { success: false, error: 'No data returned from upsert' };
      }

      const result = data[0];
      
      // Check for error (like phone hijack)
      if (result.error_message) {
        console.warn('⚠️ [DeviceUser] Upsert rejected:', result.error_message);
        return { success: false, error: result.error_message };
      }

      // Fetch full user profile
      const user = await this.getUserByDeviceId();
      
      console.log('   Final user:', JSON.stringify(user, null, 2));
      
      return {
        success: true,
        user: user || undefined,
        isNew: result.is_new,
      };

    } catch (error: any) {
      console.error('❌ [DeviceUser] Error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Get user by device ID
   */
  async getUserByDeviceId(): Promise<DeviceUser | null> {
    if (!this.client) {
      console.warn('⚠️ [DeviceUser] Supabase not configured');
      return null;
    }

    try {
      const deviceId = await getDeviceId();

      const { data, error } = await this.client.rpc('get_user_by_device_id', {
        p_device_id: deviceId,
      });

      if (error) {
        console.error('❌ [DeviceUser] Get user failed:', error.message);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0] as DeviceUser;

    } catch (error: any) {
      console.error('❌ [DeviceUser] Error:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: {
    phone?: string;
    name?: string;
    profilePhoto?: string;
  }): Promise<UpsertUserResult> {
    return this.getOrCreateUser(
      updates.phone,
      updates.name,
      updates.profilePhoto
    );
  }

  /**
   * Check if phone number would be hijacked
   */
  async checkPhoneHijack(phone: string): Promise<PhoneHijackResult> {
    if (!this.client || !phone) {
      return { isHijack: false };
    }

    try {
      const deviceId = await getDeviceId();

      const { data, error } = await this.client.rpc('check_phone_hijack', {
        p_device_id: deviceId,
        p_phone: phone,
      });

      if (error) {
        console.error('❌ [DeviceUser] Check phone hijack failed:', error.message);
        return { isHijack: false, error: error.message };
      }

      return { isHijack: data === true };

    } catch (error: any) {
      console.error('❌ [DeviceUser] Error:', error);
      return { isHijack: false, error: error.message };
    }
  }

  /**
   * Get user ID for the current device
   * This is the server-side users.id, not the device_id
   */
  async getServerUserId(): Promise<string | null> {
    const user = await this.getUserByDeviceId();
    return user?.id || null;
  }
}

// =================================================================
// SINGLETON INSTANCE
// =================================================================

export const deviceUserService = new DeviceUserService();

// =================================================================
// CONVENIENCE EXPORTS
// =================================================================

export async function syncUserToServer(
  phone?: string,
  name?: string,
  profilePhoto?: string
): Promise<UpsertUserResult> {
  return deviceUserService.getOrCreateUser(phone, name, profilePhoto);
}

export async function getRemoteUser(): Promise<DeviceUser | null> {
  return deviceUserService.getUserByDeviceId();
}

export async function isPhoneAvailable(phone: string): Promise<boolean> {
  const result = await deviceUserService.checkPhoneHijack(phone);
  return !result.isHijack;
}

export default deviceUserService;
