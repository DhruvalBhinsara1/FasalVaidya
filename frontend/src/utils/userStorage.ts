/**
 * User Profile Storage Utility
 * ============================
 * Handles persistence of user profile data using AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_PROFILE_KEY = '@fasalvaidya_user_profile';

export interface UserProfile {
  name: string;
  phone: string;
  profileImage: string | null;
  updatedAt: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  phone: '',
  profileImage: null,
  updatedAt: new Date().toISOString(),
};

/**
 * Get user profile
 */
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const json = await AsyncStorage.getItem(USER_PROFILE_KEY);
    if (!json) return DEFAULT_PROFILE;
    
    return { ...DEFAULT_PROFILE, ...JSON.parse(json) };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return DEFAULT_PROFILE;
  }
};

/**
 * Save user profile
 */
export const saveUserProfile = async (profile: Partial<UserProfile>): Promise<boolean> => {
  try {
    const current = await getUserProfile();
    const updated = {
      ...current,
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Error saving user profile:', error);
    return false;
  }
};

/**
 * Clear user profile
 */
export const clearUserProfile = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(USER_PROFILE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing user profile:', error);
    return false;
  }
};

export default {
  getUserProfile,
  saveUserProfile,
  clearUserProfile,
};
