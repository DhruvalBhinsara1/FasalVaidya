/**
 * FasalVaidya API Client
 * =======================
 * Axios instance configured for backend communication
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getDeviceId } from '../utils/deviceId';

// Auto-detect API base URL from Expo dev server or env
const getBaseUrl = (): string => {
  const port = process.env.EXPO_PUBLIC_API_PORT?.trim() || '5000';

  // 1. Explicit full URL override (production or custom)
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl) {
    console.log('🌐 Using explicit API URL:', envUrl);
    return envUrl;
  }

  // 2. Explicit host override (only if actually set, not empty)
  const envHost = process.env.EXPO_PUBLIC_API_HOST?.trim();
  if (envHost && envHost.length > 0 && !envHost.startsWith('#')) {
    const url = `http://${envHost}:${port}`;
    console.log('🌐 Using env host API URL:', url);
    return url;
  }

  // 3. Auto-detect from Expo dev server (works on physical devices via LAN)
  // Try multiple sources for the host
  const hostUri = 
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;
  
  if (hostUri) {
    const host = hostUri.split(':')[0]; // strip metro port
    
    // Check if this is a tunnel URL (can't reach local backend via tunnel)
    if (host.includes('.exp.direct') || host.includes('ngrok') || host.includes('tunnel')) {
      console.warn('⚠️ Detected Expo tunnel mode - cannot reach local backend!');
      console.warn('💡 Options:');
      console.warn('   1. Run: npx expo start --lan (recommended)');
      console.warn('   2. Set EXPO_PUBLIC_API_HOST=YOUR_LAN_IP in .env');
      
      // Try Android emulator fallback
      if (Platform.OS === 'android') {
        const url = `http://10.0.2.2:${port}`;
        console.log('🌐 Trying Android emulator localhost:', url);
        return url;
      }
      
      // Fallback to localhost (won't work on physical device with tunnel)
      const fallback = `http://localhost:${port}`;
      console.log('🌐 Fallback (may not work with tunnel):', fallback);
      return fallback;
    }
    
    const url = `http://${host}:${port}`;
    console.log('🌐 Auto-detected API URL from Expo:', url);
    return url;
  }

  // 4. Platform-specific fallbacks
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to reach host machine's localhost
    const url = `http://10.0.2.2:${port}`;
    console.log('🌐 Using Android emulator localhost:', url);
    return url;
  }

  // 5. Fallback for iOS simulator, web, or unknown
  const fallback = `http://localhost:${port}`;
  console.log('🌐 Fallback API URL:', fallback);
  return fallback;
};

// Memoize the base URL so it doesn't recalculate on every import
let _cachedBaseUrl: string | null = null;
const getCachedBaseUrl = (): string => {
  if (!_cachedBaseUrl) {
    _cachedBaseUrl = getBaseUrl();
  }
  return _cachedBaseUrl;
};

export const API_BASE_URL = getCachedBaseUrl();

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 120 seconds timeout for AI chat (Ollama can be slow)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    
    // Attach device ID to every request for multi-tenant isolation
    try {
      const deviceId = await getDeviceId();
      config.headers['X-User-ID'] = deviceId;
      console.log(`🆔 Request with User ID: ${deviceId.substring(0, 8)}...`);
    } catch (error) {
      console.error('❌ Failed to attach User ID to request:', error);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    console.log('🔍 Error Debug:', {
      hasResponse: !!error.response,
      hasRequest: !!error.request,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      responseData: error.response?.data
    });
    
    if (error.response) {
      console.error(`❌ Response error: ${error.response.status}`, error.response.data);
    } else if (error.request) {
      console.error(`❌ Network error: Cannot reach ${API_BASE_URL} - is the backend running?`);
    } else {
      console.error('❌ Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
