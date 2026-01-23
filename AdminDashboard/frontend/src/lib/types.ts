export type AdminRole = 'super_admin' | 'admin' | 'viewer';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Crop {
  id: number;
  name: string;
  name_hi: string | null;
  season: string | null;
  icon: string | null;
}

export interface User {
  id: string;
  auth_user_id: string | null;
  device_fingerprint: string | null;
  created_at: string;
  updated_at: string;
  last_active: string | null;
  deleted_at: string | null;
}

export interface LeafScan {
  id: string;
  scan_uuid: string;
  user_id: string;
  crop_id: number | null;
  image_path: string;
  image_filename: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields
  crop?: Crop;
  user?: User;
  diagnosis?: Diagnosis;
  recommendation?: Recommendation;
}

export interface Diagnosis {
  id: string;
  scan_id: string;
  user_id: string;
  n_score: number | null;
  p_score: number | null;
  k_score: number | null;
  mg_score: number | null;
  n_confidence: number | null;
  p_confidence: number | null;
  k_confidence: number | null;
  mg_confidence: number | null;
  n_severity: string | null;
  p_severity: string | null;
  k_severity: string | null;
  mg_severity: string | null;
  overall_status: string | null;
  detected_class: string | null;
  heatmap_path: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Recommendation {
  id: string;
  scan_id: string;
  user_id: string;
  n_recommendation: string | null;
  p_recommendation: string | null;
  k_recommendation: string | null;
  mg_recommendation: string | null;
  n_recommendation_hi: string | null;
  p_recommendation_hi: string | null;
  k_recommendation_hi: string | null;
  mg_recommendation_hi: string | null;
  priority: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface UserFeedback {
  id: string;
  scan_id: string;
  user_id: string;
  rating: 'thumbs_up' | 'thumbs_down';
  ai_confidence: number | null;
  detected_class: string | null;
  feedback_text: string | null;
  is_flagged: boolean;
  created_at: string;
}

// Dashboard Statistics
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalScans: number;
  scansToday: number;
  averageAccuracy: number;
  feedbackCount: number;
  criticalAlerts: number;
}

export interface ScansByDay {
  date: string;
  count: number;
}

export interface CropDistribution {
  crop_name: string;
  count: number;
  percentage: number;
}

export interface NutrientDistribution {
  nutrient: string;
  healthy: number;
  deficient: number;
  critical: number;
}
