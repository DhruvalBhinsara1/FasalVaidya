/**
 * FasalVaidya Scans API
 * ======================
 * API functions for leaf scan operations
 */

import apiClient, { API_BASE_URL } from './client';

// Types
export interface Crop {
  id: number;
  name: string;
  name_hi: string;
  season: string;
  icon: string;
}

export interface Recommendation {
  en: string;
  hi: string;
  needed?: boolean;
  urgency?: 'high' | 'medium' | 'low';
}

export interface ScanResult {
  scan_id: number;
  scan_uuid: string;
  status: string;
  
  // Crop info
  crop_id: number;
  crop_name: string;
  crop_name_hi: string;
  crop_icon: string;
  
  // NPK Scores (0-100%)
  n_score: number;
  p_score: number;
  k_score: number;
  
  // Confidence (0-100%)
  n_confidence: number;
  p_confidence: number;
  k_confidence: number;
  
  // Severity levels
  n_severity: 'healthy' | 'attention' | 'critical';
  p_severity: 'healthy' | 'attention' | 'critical';
  k_severity: 'healthy' | 'attention' | 'critical';
  overall_status: 'healthy' | 'attention' | 'critical';
  
  // Detected class
  detected_class: string;
  
  // Recommendations
  recommendations: {
    n: Recommendation;
    p: Recommendation;
    k: Recommendation;
  };
  priority: 'healthy' | 'attention' | 'critical';
  
  // Heatmap
  heatmap?: string;
  
  // Image URL
  image_url?: string;
  
  // Timestamp
  created_at: string;
}

export interface ScanHistoryItem {
  scan_id: number;
  scan_uuid: string;
  crop_id: number;
  crop_name: string;
  crop_name_hi: string;
  crop_icon: string;
  image_url: string;
  status: string;
  n_score: number;
  p_score: number;
  k_score: number;
  n_severity: string;
  p_severity: string;
  k_severity: string;
  overall_status: string;
  detected_class: string;
  created_at: string;
}

/**
 * Get list of supported crops
 */
export const getCrops = async (): Promise<Crop[]> => {
  const response = await apiClient.get('/api/crops');
  return response.data.crops;
};

/**
 * Upload leaf image and get diagnosis
 */
export const uploadScan = async (
  imageUri: string,
  cropId: number
): Promise<ScanResult> => {
  const formData = new FormData();
  
  // Extract filename from URI
  const filename = imageUri.split('/').pop() || 'leaf.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  
  // Append image file
  formData.append('image', {
    uri: imageUri,
    name: filename,
    type,
  } as any);
  
  // Append crop_id
  formData.append('crop_id', cropId.toString());
  
  const response = await apiClient.post('/api/scans', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

/**
 * Get scan history
 */
export const getScans = async (cropId?: number, limit?: number): Promise<ScanHistoryItem[]> => {
  const params: any = {};
  if (cropId) params.crop_id = cropId;
  if (limit) params.limit = limit;
  
  const response = await apiClient.get('/api/scans', { params });
  return response.data.scans;
};

/**
 * Get single scan details
 */
export const getScan = async (scanId: number): Promise<ScanResult> => {
  const response = await apiClient.get(`/api/scans/${scanId}`);
  return response.data;
};

/**
 * Clear all scan history
 */
export const clearScans = async (): Promise<void> => {
  await apiClient.delete('/api/scans');
};

/**
 * Health check
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/api/health');
    return response.data.status === 'ok';
  } catch {
    return false;
  }
};

/**
 * Get full image URL from relative path
 */
export const getImageUrl = (path: string): string => {
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
};
