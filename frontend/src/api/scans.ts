/**
 * FasalVaidya Scans API
 * ======================
 * API functions for leaf scan operations
 */

import { saveScanResultLocally } from '../sync/localSync';
import apiClient, { API_BASE_URL } from './client';

// Types
export interface Crop {
  id: number;
  name: string;
  name_hi: string;
  season: string;
  icon: string;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  default: boolean;
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
  console.log('🌾 [getCrops] Starting request...');
  try {
    const response = await apiClient.get('/api/crops');
    console.log('🌾 [getCrops] Response received:', {
      status: response.status,
      dataKeys: Object.keys(response.data),
      cropsCount: response.data.crops?.length,
      crops: response.data.crops
    });
    
    if (!response.data.crops) {
      console.error('🌾 [getCrops] ERROR: No crops array in response:', response.data);
      throw new Error('No crops data in response');
    }
    
    console.log('🌾 [getCrops] SUCCESS: Returning', response.data.crops.length, 'crops');
    return response.data.crops;
  } catch (error: any) {
    console.error('🌾 [getCrops] FAILED:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

/**
 * Get list of available ML models
 */
export const getModels = async (): Promise<Model[]> => {
  const response = await apiClient.get('/api/models');
  return response.data;
};

/**
 * Upload leaf image and get diagnosis
 */
export const uploadScan = async (
  imageUri: string,
  cropId: number,
  modelId: string
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
  
  // Append crop_id and model_id
  formData.append('crop_id', cropId.toString());
  formData.append('model_id', modelId);
  
  const response = await apiClient.post('/api/scans', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  const scanResult = response.data;
  
  // Save scan result to local database for syncing to Supabase
  try {
    await saveScanResultLocally(scanResult);
    console.log('📦 Scan saved locally for sync');
    
    // Trigger sync immediately after saving scan
    try {
      const { performSync } = await import('../sync');
      console.log('🔄 Triggering sync after scan...');
      const syncResult = await performSync();
      if (syncResult.success) {
        console.log('✅ Scan synced to Supabase:', {
          pushed: syncResult.pushedCount,
          pulled: syncResult.pulledCount,
          duration: `${syncResult.duration}ms`
        });
      } else {
        console.warn('⚠️ Sync completed with errors:', syncResult.errors);
      }
    } catch (syncError) {
      console.warn('⚠️ Failed to trigger sync (will retry later):', syncError);
    }
  } catch (error) {
    console.warn('⚠️ Failed to save scan locally (sync may not work):', error);
    // Don't fail the upload if local save fails
  }
  
  return scanResult;
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

// ============================================
// REPORT & EXPORT TYPES AND FUNCTIONS
// ============================================

export interface HealthClassification {
  status: 'healthy' | 'attention' | 'critical';
  label: string;
  color: string;
  background_color: string;
  rescan_date: string;
  rescan_interval_days: number;
}

export interface NutrientRecommendation {
  nutrient: string;
  status: string;
  value: number;
  recommendation: string;
  action: 'increase' | 'decrease' | 'maintain';
  priority: 'high' | 'medium' | 'low';
}

export interface ScanComparison {
  baseline_scan_id: string;
  baseline_date: string;
  changes: {
    n_change: number;
    p_change: number;
    k_change: number;
    overall_change: number;
  };
  trend: 'improving' | 'declining' | 'stable';
  trend_label: string;
}

export interface ChartDataset {
  label: string;
  data: number[];
  color: string;
}

export interface BarChartData {
  type: string;
  labels: string[];
  datasets: ChartDataset[];
  error?: string;
}

export interface RadarChartData {
  type: string;
  labels: string[];
  datasets: ChartDataset[];
  zones?: {
    healthy: { min: number; color: string };
    attention: { min: number; max: number; color: string };
    critical: { max: number; color: string };
  };
  error?: string;
}

export interface GraphData {
  bar_chart: BarChartData;
  radar_chart: RadarChartData;
  has_comparison: boolean;
}

export interface ReportData {
  scan_id: string;
  crop_name: string;
  scan_date: string;
  image_url: string;
  n_score: number;
  p_score: number;
  k_score: number;
  overall_score: number;
  health_classification: HealthClassification;
  comparison?: ScanComparison;
  recommendations: NutrientRecommendation[];
  graph_data?: GraphData;
}

export interface ExportResponse {
  success: boolean;
  download_url?: string;
  filename?: string;
  error?: string;
}

/**
 * Get report preview for a scan
 */
export const getReportPreview = async (scanId: string, includeGraphs: boolean = true): Promise<ReportData> => {
  const response = await apiClient.get(`/api/reports/preview`, {
    params: { scan_id: scanId, include_graphs: includeGraphs }
  });
  return response.data;
};

/**
 * Export reports in specified format
 */
export const exportReports = async (
  scanIds: string[],
  format: 'pdf' | 'excel' | 'csv'
): Promise<Blob> => {
  const response = await apiClient.post('/api/reports/export', {
    scan_ids: scanIds,
    format: format
  }, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Get scan history with trend analysis
 */
export const getScanHistory = async (
  cropName?: string,
  limit: number = 50
): Promise<{
  scans: ScanResult[];
  trend_analysis: {
    overall_trend: 'improving' | 'declining' | 'stable';
    average_improvement: number;
    scans_analyzed: number;
  };
}> => {
  const response = await apiClient.get('/api/scans/history', {
    params: { crop_name: cropName, limit }
  });
  return response.data;
};

/**
 * Get rescan and fertilizer recommendations
 */
export const getRecommendations = async (scanId: string): Promise<{
  rescan: {
    recommended_date: string;
    interval_days: number;
    reason: string;
  };
  fertilizer: NutrientRecommendation[];
}> => {
  const response = await apiClient.get('/api/recommendations', {
    params: { scan_id: scanId }
  });
  return response.data;
};

/**
 * Get health threshold configuration
 */
export const getHealthThresholds = async (): Promise<{
  health_classification: Record<string, { min: number; max: number }>;
  nutrient_thresholds: Record<string, { optimal: { min: number; max: number } }>;
}> => {
  const response = await apiClient.get('/api/config/thresholds');
  return response.data;
};

/**
 * Delete a specific scan
 */
export const deleteScan = async (scanId: string): Promise<void> => {
  await apiClient.delete(`/api/scans/${scanId}`);
};

/**
 * Update a scan (rename crop, etc.)
 */
export const updateScan = async (scanId: string, updates: Partial<ScanResult>): Promise<ScanResult> => {
  const response = await apiClient.patch(`/api/scans/${scanId}`, updates);
  return response.data;
};

// ============================================
// RESULTS API (Crop-Specific Comparison)
// ============================================

export interface NutrientData {
  value: number;
  unit: string;
  severity?: string;
}

export interface ResultsScanData {
  scan_id: string;
  crop_id: number;
  crop_name: string;
  scan_date: string;
  nutrients: {
    nitrogen: NutrientData;
    phosphorus: NutrientData;
    potassium: NutrientData;
    magnesium?: NutrientData;
  };
  overall_status: string;
  confidence: number;
  image_url: string;
}

/**
 * Get latest scan for a specific crop (for Results page)
 */
export const getLatestScan = async (cropId: number): Promise<ResultsScanData> => {
  const response = await apiClient.get('/api/results/latest', {
    params: { crop_id: cropId }
  });
  return response.data;
};

/**
 * Get scan history for a specific crop (for comparison)
 */
export const getScanHistoryForResults = async (
  cropId: number, 
  limit: number = 2
): Promise<{ scans: ResultsScanData[]; total: number }> => {
  const response = await apiClient.get('/api/results/history', {
    params: { crop_id: cropId, limit }
  });
  return response.data;
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
  imageBase64?: string,
  language: 'hi' | 'en' = 'en'
): Promise<ChatResponse> => {
  try {
    // Optimization: Limit history to last 6 messages to reduce token usage and latency
    const recentHistory = history.slice(-6);

    // Enforce language and conciseness
    const systemInstruction = language === 'hi' 
      ? "\n\n(निर्देश: कृपया हिंदी में उत्तर दें और उत्तर संक्षिप्त रखें।)" 
      : "\n\n(Instruction: Please respond in English and keep the answer concise.)";
    
    const payload = {
      message: message + systemInstruction,
      history: recentHistory.map(m => ({ role: m.role, content: m.content })),
      context,
      image: imageBase64,
      // Tell backend the user's selected language code so the server can enforce it
      language
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
