/**
 * FasalVaidya API Client
 * =======================
 * Axios instance configured for backend communication
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Platform } from 'react-native';

// API Base URL - use localhost for development
// For Android emulator, use 10.0.2.2 instead of localhost
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  return 'http://localhost:5000';
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000, // 30 seconds timeout for image uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
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
      console.error('❌ Network error: No response received');
    } else {
      console.error('❌ Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Export base URL for direct use
export const API_BASE_URL = getBaseUrl();
