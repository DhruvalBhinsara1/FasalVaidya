/**
 * Device-Bound Authentication Context for FasalVaidya
 * =====================================================
 * 
 * DEVELOPMENT/HACKATHON MODE
 * ---------------------------
 * Uses persistent device ID as user identity to bypass OTP rate limits.
 * 
 * Key Principles:
 * - Device ID = User Identity (generated once, persisted in AsyncStorage)
 * - New user ONLY when app storage is manually cleared
 * - Survives: reloads, restarts, tab closes
 * - Resets: only on manual cache/storage clear
 * 
 * Future Migration Path:
 * - Enable OTP auth when rate limits removed
 * - Map device_id to auth.users.id
 * - Zero data loss migration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { deviceUserService } from '../services/deviceUserService';
import { clearDeviceId, getDeviceId } from '../utils/deviceId';

// =================================================================
// TYPES
// =================================================================

export interface UserProfile {
  id: string;           // Device-bound UUID (primary identity)
  phone?: string;       // Optional phone (user-provided attribute, NOT identity)
  name?: string;        // Display name
  profilePhoto?: string;
  createdAt: string;
  lastActive: string;
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;  // Always true after device ID is loaded
  userId: string | null;     // The device-bound UUID
  profile: UserProfile | null;
}

export interface AuthContextType extends AuthState {
  // Profile management
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  
  // Sync profile to server
  syncToServer: () => Promise<boolean>;
  
  // For testing: clear identity (simulates cache clear)
  resetIdentity: () => Promise<void>;
  
  // Get stable user ID for API calls
  getUserId: () => string | null;
  
  // Get server-side user ID (from Supabase users table)
  getServerUserId: () => Promise<string | null>;
}

// =================================================================
// STORAGE KEYS
// =================================================================

const PROFILE_KEY = '@fasalvaidya:user_profile';

// =================================================================
// CONTEXT
// =================================================================

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// =================================================================
// PROVIDER
// =================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    userId: null,
    profile: null,
  });

  // =================================================================
  // INITIALIZATION
  // =================================================================

  useEffect(() => {
    initializeAuth();
  }, []);

  async function initializeAuth() {
    try {
      console.log('🔐 [DeviceAuth] Initializing device-bound identity...');
      
      // Get or create persistent device ID
      const deviceId = await getDeviceId();
      
      console.log('🆔 [DeviceAuth] Device ID:', deviceId);
      
      // Load or create profile
      let profile = await loadProfile(deviceId);
      
      if (!profile) {
        // First time user - create profile
        profile = {
          id: deviceId,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        };
        await saveProfile(profile);
        console.log('👤 [DeviceAuth] Created new user profile');
      } else {
        // Update last active
        profile.lastActive = new Date().toISOString();
        await saveProfile(profile);
        console.log('👤 [DeviceAuth] Loaded existing user profile');
      }

      setState({
        isLoading: false,
        isAuthenticated: true,  // Device ID = authenticated
        userId: deviceId,
        profile: profile,
      });

      console.log('✅ [DeviceAuth] Authentication complete');
      console.log('   User ID:', deviceId);
      console.log('   Name:', profile.name || '(not set)');
      console.log('   Phone:', profile.phone || '(not set)');

    } catch (error) {
      console.error('❌ [DeviceAuth] Initialization error:', error);
      
      // Even on error, we can use a temporary ID
      const tempId = `temp_${Date.now()}`;
      setState({
        isLoading: false,
        isAuthenticated: true,
        userId: tempId,
        profile: {
          id: tempId,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
      });
    }
  }

  // =================================================================
  // PROFILE MANAGEMENT
  // =================================================================

  async function loadProfile(deviceId: string): Promise<UserProfile | null> {
    try {
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      if (stored) {
        const profile = JSON.parse(stored) as UserProfile;
        // Verify this profile belongs to current device
        if (profile.id === deviceId) {
          return profile;
        }
      }
      return null;
    } catch (error) {
      console.error('❌ [DeviceAuth] Error loading profile:', error);
      return null;
    }
  }

  async function saveProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('❌ [DeviceAuth] Error saving profile:', error);
    }
  }

  async function updateProfile(updates: Partial<UserProfile>): Promise<void> {
    if (!state.profile) return;

    const updatedProfile: UserProfile = {
      ...state.profile,
      ...updates,
      lastActive: new Date().toISOString(),
    };

    await saveProfile(updatedProfile);
    
    setState(prev => ({
      ...prev,
      profile: updatedProfile,
    }));

    console.log('✅ [DeviceAuth] Profile updated:', updates);
    
    // Sync to server in background
    syncToServer();
  }

  // =================================================================
  // SERVER SYNC
  // =================================================================

  async function syncToServer(): Promise<boolean> {
    if (!state.profile) {
      console.warn('⚠️ [DeviceAuth] No profile to sync');
      return false;
    }

    try {
      console.log('☁️ [DeviceAuth] Syncing profile to server...');
      console.log('   → Phone:', state.profile.phone || '(not set)');
      console.log('   → Name:', state.profile.name || '(not set)');
      console.log('   → Photo:', state.profile.profilePhoto ? 'set' : '(not set)');
      
      const result = await deviceUserService.getOrCreateUser(
        state.profile.phone,
        state.profile.name,
        state.profile.profilePhoto
      );

      if (result.success) {
        console.log('✅ [DeviceAuth] Profile synced to server');
        console.log('   → User ID:', result.user?.id);
        console.log('   → Server name:', result.user?.name || '(not set)');
        console.log('   → Server phone:', result.user?.phone || '(not set)');
        if (result.isNew) {
          console.log('   → New user created on server');
        }
        return true;
      } else {
        console.warn('⚠️ [DeviceAuth] Sync failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ [DeviceAuth] Sync error:', error);
      return false;
    }
  }

  async function getServerUserId(): Promise<string | null> {
    return deviceUserService.getServerUserId();
  }

  // =================================================================
  // IDENTITY RESET (for testing)
  // =================================================================

  async function resetIdentity(): Promise<void> {
    console.log('⚠️ [DeviceAuth] Resetting identity...');
    
    // Clear device ID
    await clearDeviceId();
    
    // Clear profile
    await AsyncStorage.removeItem(PROFILE_KEY);
    
    // Reinitialize
    setState({
      isLoading: true,
      isAuthenticated: false,
      userId: null,
      profile: null,
    });

    // Generate new identity
    await initializeAuth();
    
    console.log('✅ [DeviceAuth] Identity reset complete');
  }

  // =================================================================
  // UTILITY
  // =================================================================

  function getUserId(): string | null {
    return state.userId;
  }

  // =================================================================
  // CONTEXT VALUE
  // =================================================================

  const value: AuthContextType = {
    ...state,
    updateProfile,
    syncToServer,
    resetIdentity,
    getUserId,
    getServerUserId,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
