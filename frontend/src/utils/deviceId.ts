/**
 * Device/Guest ID Identity System
 * =================================
 * Implements automatic UUID-based user identification without requiring login.
 * Each device gets a persistent UUID that survives app restarts.
 * 
 * This enables:
 * - Multi-tenant data isolation
 * - User-specific scan history
 * - Future migration to full auth system
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values'; // Required for uuid on React Native
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = '@fasalvaidya_device_id';
const LEGACY_USER_ID = '00000000-0000-0000-0000-000000000000'; // For backend migration

let _cachedDeviceId: string | null = null;

/**
 * Get or create device UUID
 * This UUID persists across app restarts and identifies this device/user
 * 
 * @returns Promise<string> - The device UUID
 */
export const getDeviceId = async (): Promise<string> => {
  // Return cached value if available
  if (_cachedDeviceId) {
    return _cachedDeviceId;
  }

  try {
    // Try to retrieve existing UUID from storage
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    // If no UUID exists, generate a new one
    if (!deviceId) {
      deviceId = uuidv4();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      console.log('🆔 Generated new device ID:', deviceId);
    } else {
      console.log('🆔 Retrieved existing device ID:', deviceId);
    }
    
    // Cache for future calls
    _cachedDeviceId = deviceId;
    return deviceId;
    
  } catch (error) {
    console.error('❌ Error managing device ID:', error);
    
    // Fallback: generate temporary ID (won't persist)
    const tempId = uuidv4();
    console.warn('⚠️ Using temporary device ID (not persisted):', tempId);
    return tempId;
  }
};

/**
 * Clear device ID (useful for testing or "logout")
 * This will cause a new UUID to be generated on next app launch
 */
export const clearDeviceId = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
    _cachedDeviceId = null;
    console.log('🆑 Device ID cleared');
  } catch (error) {
    console.error('❌ Error clearing device ID:', error);
  }
};

/**
 * Initialize device ID on app launch
 * Call this in App.tsx before any API calls
 */
export const initializeDeviceId = async (): Promise<string> => {
  const deviceId = await getDeviceId();
  console.log('✅ Device identity initialized:', deviceId);
  return deviceId;
};

/**
 * Check if this is a legacy user (pre-migration scans)
 */
export const isLegacyUser = (userId: string): boolean => {
  return userId === LEGACY_USER_ID;
};

export default {
  getDeviceId,
  clearDeviceId,
  initializeDeviceId,
  isLegacyUser,
  LEGACY_USER_ID,
};
