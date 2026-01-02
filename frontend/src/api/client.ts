/**
 * FasalVaidya API Client
 * =======================
 * Axios instance configured for backend communication
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import Constants from 'expo-constants';

// Auto-detect API base URL from Expo dev server or env
const getBaseUrl = (): string => {
  const port = process.env.EXPO_PUBLIC_API_PORT?.trim() || '5000';

  // 1. Explicit full URL override (production or custom)
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl) {
    console.log('🌐 Using explicit API URL:', envUrl);
    return envUrl;
  }

  // 2. Explicit host override
  const envHost = process.env.EXPO_PUBLIC_API_HOST?.trim();
  if (envHost) {
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
    const url = `http://${host}:${port}`;
    console.log('🌐 Auto-detected API URL:', url);
    return url;
  }

  // 4. Fallback for web or unknown
  const fallback = `http://localhost:${port}`;
  console.log('🌐 Fallback API URL:', fallback);
  return fallback;
};

const BASE_URL = getBaseUrl();

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds timeout for image uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
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
    if (error.response) {
      console.error(`❌ Response error: ${error.response.status}`, error.response.data);
    } else if (error.request) {
      console.error(`❌ Network error: Cannot reach ${BASE_URL} - is the backend running?`);
    } else {
      console.error('❌ Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Export base URL for direct use
export const API_BASE_URL = getBaseUrl();
