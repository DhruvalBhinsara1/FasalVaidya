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
  
  // NPKMg Scores (0-100%)
  n_score: number;
  p_score: number;
  k_score: number;
  mg_score?: number; // Magnesium score (optional for backward compatibility)
  
  // Confidence (0-100%)
  n_confidence: number;
  p_confidence: number;
  k_confidence: number;
  mg_confidence?: number; // Magnesium confidence (optional)
  
  // Severity levels
  n_severity: 'healthy' | 'attention' | 'critical';
  p_severity: 'healthy' | 'attention' | 'critical';
  k_severity: 'healthy' | 'attention' | 'critical';
  mg_severity?: 'healthy' | 'attention' | 'critical'; // Magnesium severity (optional)
  overall_status: 'healthy' | 'attention' | 'critical';
  
  // Detected class
  detected_class: string;
  
  // Recommendations
  recommendations: {
    n: Recommendation;
    p: Recommendation;
    k: Recommendation;
    mg?: Recommendation; // Magnesium recommendation (optional)
  };
  priority: 'healthy' | 'attention' | 'critical';
  
  // Heatmap - can be base64 data URL or relative path
  heatmap?: string;
  heatmap_url?: string; // Alternative heatmap URL field
  
  // Image URL
  image_url?: string;
  original_image_url?: string; // Original image without heatmap overlay
  
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
  mg_score?: number; // Magnesium score (optional)
  n_severity: string;
  p_severity: string;
  k_severity: string;
  mg_severity?: string; // Magnesium severity (optional)
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
 * Handles base64 data URLs, http URLs, and relative paths
 */
export const getImageUrl = (path: string): string => {
  if (!path) return '';
  // Already a data URL (base64)
  if (path.startsWith('data:')) return path;
  // Already an absolute URL
  if (path.startsWith('http')) return path;
  // Relative path - prepend API base URL
  return `${API_BASE_URL}${path}`;
};

// ============================================
// AI CHAT TYPES AND FUNCTIONS
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  image?: string; // Base64 encoded image
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  needs_connection?: boolean;
  message?: string;
  model?: string;
}

export interface ChatStatus {
  available: boolean;
  models?: string[];
  has_vision_model?: boolean;
  error?: string;
  message?: string;
}

/**
 * Check if AI chat service is available
 */
export const checkChatStatus = async (): Promise<ChatStatus> => {
  try {
    const response = await apiClient.get('/api/chat/status');
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 503) {
      return {
        available: false,
        error: error.response?.data?.error || 'AI service unavailable',
        message: error.response?.data?.message || 'Need an active internet connection'
      };
    }
    return {
      available: false,
      error: 'Failed to check AI status'
    };
  }
};

/**
 * Send a chat message to the AI
 */
export const sendChatMessage = async (
  message: string,
  history: ChatMessage[] = [],
  context?: Partial<ScanResult> | null,
  imageBase64?: string
): Promise<ChatResponse> => {
  try {
    const payload = {
      message,
      history: history.map(m => ({ role: m.role, content: m.content })),
      context,
      image: imageBase64
    };
    
    // Debug logging
    console.log('🤖 AI Chat Request Payload:', {
      message,
      historyLength: history.length,
      hasContext: !!context,
      hasImage: !!imageBase64,
      contextDetails: context ? {
        crop_name: context.crop_name,
        n_score: context.n_score,
        p_score: context.p_score,
        k_score: context.k_score,
        n_severity: context.n_severity,
        p_severity: context.p_severity,
        k_severity: context.k_severity,
        overall_status: context.overall_status
      } : null,
      imageSize: imageBase64 ? `${(imageBase64.length / 1024).toFixed(2)} KB` : 'N/A'
    });
    
    const response = await apiClient.post('/api/chat', payload);
    
    console.log('✅ AI Chat Response:', {
      success: response.data.success,
      hasResponse: !!response.data.response,
      model: response.data.model,
      responseLength: response.data.response?.length || 0,
      responsePreview: response.data.response?.substring(0, 100) + '...'
    });
    
    return response.data;
  } catch (error: any) {
    console.error('❌ AI Chat Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      errorData: error.response?.data,
      message: error.message,
      hasResponse: !!error.response
    });
    
    // Handle connection errors
    if (error.response?.status === 503) {
      return {
        success: false,
        needs_connection: true,
        error: error.response?.data?.error || 'AI service unavailable',
        message: error.response?.data?.message || 'Need an active internet connection to use AI analysis.'
      };
    }
    
    // Handle network errors
    if (!error.response) {
      return {
        success: false,
        needs_connection: true,
        error: 'Network error',
        message: 'Need an active internet connection to use AI analysis.'
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Unknown error'
    };
  }
};
