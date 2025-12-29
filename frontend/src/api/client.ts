import axios from 'axios';
import { Platform } from 'react-native';

/**
 * Get the API base URL based on platform:
 * - iOS Simulator: localhost works directly
 * - Android Emulator: 10.0.2.2 maps to host's localhost
 * - Real devices: Run `adb reverse tcp:5000 tcp:5000` for Android
 *                 or connect to same WiFi and use computer's IP
 */
function getApiBaseUrl(): string {
  const port = 5000;
  
  if (Platform.OS === 'android') {
    // 10.0.2.2 is Android emulator's alias to host localhost
    // For real devices, run: adb reverse tcp:5000 tcp:5000
    return `http://10.0.2.2:${port}`;
  }
  
  // iOS simulator can use localhost directly
  // For real iOS devices, you'll need to use the computer's IP
  return `http://localhost:${port}`;
}

const API_BASE_URL = getApiBaseUrl();

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export async function getHealth(): Promise<string> {
  const res = await client.get('/api/health');
  return res.data?.message || 'ok';
}

export type Crop = { id: number; name: string; name_hi?: string };

export async function getCrops(): Promise<Crop[]> {
  const res = await client.get('/api/crops');
  return res.data?.crops || [];
}

export type Scan = {
  scan_id: number;
  crop_id: number;
  crop_name?: string;
  image_path?: string;
  created_at: string;
  status: string;
  n_score?: number;
  p_score?: number;
  k_score?: number;
  n_confidence?: number;
  p_confidence?: number;
  k_confidence?: number;
  recommendation?: string;
};

/**
 * Normalize image URI for iOS/Android compatibility
 * iOS can return URIs with ph:// or file:// schemes that need handling
 */
function normalizeImageUri(uri: string): string {
  if (Platform.OS === 'ios') {
    // iOS sometimes returns URIs without the file:// prefix for local files
    // or with ph:// for photos library
    if (uri.startsWith('ph://')) {
      // Photo library URIs should be converted via expo-image-picker already
      // but if not, we keep as-is and let the FormData handle it
      return uri;
    }
    // Ensure file:// prefix for local files on iOS
    if (!uri.startsWith('file://') && !uri.startsWith('http')) {
      return `file://${uri}`;
    }
  }
  return uri;
}

/**
 * Get the file extension and MIME type from URI
 */
function getImageTypeFromUri(uri: string): { extension: string; mimeType: string } {
  const uriLower = uri.toLowerCase();
  if (uriLower.includes('.png')) {
    return { extension: 'png', mimeType: 'image/png' };
  }
  if (uriLower.includes('.gif')) {
    return { extension: 'gif', mimeType: 'image/gif' };
  }
  if (uriLower.includes('.heic') || uriLower.includes('.heif')) {
    // HEIC/HEIF are iOS formats, but we'll treat as JPEG since expo converts them
    return { extension: 'jpg', mimeType: 'image/jpeg' };
  }
  // Default to JPEG
  return { extension: 'jpg', mimeType: 'image/jpeg' };
}

export async function uploadScan(uri: string, cropId: number) {
  const normalizedUri = normalizeImageUri(uri);
  const { extension, mimeType } = getImageTypeFromUri(uri);
  
  // Generate unique filename with timestamp
  const filename = `leaf_${Date.now()}.${extension}`;
  
  const formData = new FormData();
  formData.append('crop_id', String(cropId));
  
  // iOS requires specific FormData format for file uploads
  const imageData: any = {
    uri: normalizedUri,
    name: filename,
    type: mimeType,
  };
  
  formData.append('image', imageData);

  console.log('Uploading image:', { 
    originalUri: uri,
    normalizedUri, 
    filename, 
    mimeType,
    platform: Platform.OS 
  });

  const res = await client.post('/api/scans', formData, {
    headers: { 
      'Content-Type': 'multipart/form-data',
      // Don't set Accept header to allow server to return any format
    },
    // iOS may need longer timeout for large images
    timeout: 60000,
    // Important: Let axios transform the request properly
    transformRequest: (data) => data,
  });
  return res.data;
}

export async function getScans(): Promise<Scan[]> {
  const res = await client.get('/api/scans');
  return res.data?.scans || [];
}

export async function clearHistory(): Promise<{ message: string; deleted_scans: number }> {
  const res = await client.delete('/api/scans');
  return res.data;
}

export { client };
