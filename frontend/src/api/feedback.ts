/**
 * Feedback API
 * =============
 * Submit and retrieve user feedback for scan results
 */

import apiClient from './client';

export interface FeedbackData {
  scan_id: number;
  rating: 'thumbs_up' | 'thumbs_down';
  feedback_text?: string;
}

export interface FeedbackResponse {
  success: boolean;
  feedback_id?: number;
  message?: string;
  is_flagged?: boolean;
  feedback?: {
    id: number;
    rating: string;
    feedback_text: string | null;
    created_at: string;
  } | null;
}

/**
 * Submit feedback for a scan
 */
export async function submitFeedback(data: FeedbackData): Promise<FeedbackResponse> {
  try {
    const response = await apiClient.post<FeedbackResponse>('/api/feedback', data);
    return response.data;
  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to submit feedback',
    };
  }
}

/**
 * Get existing feedback for a scan
 */
export async function getScanFeedback(scanId: number): Promise<FeedbackResponse> {
  try {
    const response = await apiClient.get<FeedbackResponse>(`/api/feedback/${scanId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error getting feedback:', error);
    return {
      success: false,
      feedback: null,
    };
  }
}
