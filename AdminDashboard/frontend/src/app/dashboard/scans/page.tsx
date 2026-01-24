import { Header } from '@/components/layout/Header';
import { Badge, Card } from '@/components/ui';
import { createAdminClient } from '@/lib/supabase/server';
import { getImageUrl } from '@/lib/utils';
import { Activity, AlertTriangle, ArrowRight, Calendar, Leaf, MapPin, Plus, Search } from 'lucide-react';
import Image from 'next/image';

interface Scan {
  id: string;
  scan_uuid: string;
  user_id: string;
  crop_id: number;
  image_path: string;
  status: string;
  created_at: string;
  user_name?: string;
  user_phone?: string;
  crop_name?: string;
  diagnosis?: {
    id: string;
    n_score: number;
    p_score: number;
    k_score: number;
    overall_status: string;
    detected_class: string;
    heatmap_path?: string;
  };
  feedback?: {
    rating: 'thumbs_up' | 'thumbs_down';
    is_flagged: boolean;
  };
}

async function getScansData() {
  const supabase = await createAdminClient();

  try {
    // Get all scans with user and crop info - limit for performance
    const { data: scans, error: scansError } = await supabase
      .from('leaf_scans')
      .select(`
        id,
        scan_uuid,
        user_id,
        crop_id,
        image_path,
        status,
        created_at,
        users (
          name,
          phone
        ),
        crops (
          name
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50); // Reduced to 50 for faster loading

    if (scansError) {
      console.error('Error fetching scans:', scansError);
      return [];
    }

    if (!scans || scans.length === 0) {
      return [];
    }

    // Get diagnoses for all scans
    const scanIds = scans.map(s => s.id);
    const { data: diagnoses } = await supabase
      .from('diagnoses')
      .select('*')
      .in('scan_id', scanIds)
      .is('deleted_at', null);

    // Get feedback from Flask backend (SQLite) instead of Supabase
    let feedbackMap: Record<string, { rating: 'thumbs_up' | 'thumbs_down'; is_flagged: boolean }> = {};
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/feedback/all`, {
        headers: {
          'X-User-ID': '00000000-0000-0000-0000-000000000000', // Admin view sees all feedback
        },
      });
      
      if (response.ok) {
        const feedbackData = await response.json();
        if (feedbackData.success && Array.isArray(feedbackData.feedback)) {
          // Map feedback by scan_id (most recent per scan)
          feedbackMap = feedbackData.feedback.reduce((acc: any, f: any) => {
            if (!acc[f.scan_id]) {
              acc[f.scan_id] = {
                rating: f.rating,
                is_flagged: f.is_flagged === 1 || f.is_flagged === true,
              };
            }
            return acc;
          }, {});
        }
      }
    } catch (error) {
      console.error('Error fetching feedback from backend:', error);
      // Continue without feedback data
    }

    // Map diagnoses to scans
    const diagnosesMap = (diagnoses || []).reduce((acc: any, d: any) => {
      acc[d.scan_id] = d;
      return acc;
    }, {});

    // Transform data
    return scans.map(scan => ({
      id: scan.id,
      scan_uuid: scan.scan_uuid,
      user_id: scan.user_id,
      crop_id: scan.crop_id,
      image_path: scan.image_path,
      status: scan.status,
      created_at: scan.created_at,
      user_name: (scan as any).users?.name || 'Unknown',
      user_phone: (scan as any).users?.phone || '',
      crop_name: (scan as any).crops?.name || 'Unknown',
      diagnosis: diagnosesMap[scan.id] || null,
      feedback: feedbackMap[scan.id] || null,
    })) as Scan[];
  } catch (error) {
    console.error('Error in getScansData:', error);
    return [];
  }
}

async function getScansStats() {
  const supabase = await createAdminClient();

  try {
    // Total scans
    const { count: totalScans } = await supabase
      .from('leaf_scans')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Completed scans
    const { count: completedScans } = await supabase
      .from('leaf_scans')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'completed');

    // Scans today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: scansToday } = await supabase
      .from('leaf_scans')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', today.toISOString());

    // Total diagnoses
    const { count: totalDiagnoses } = await supabase
      .from('diagnoses')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Feedback stats from Flask backend (SQLite)
    let feedbackStats = { thumbsUp: 0, thumbsDown: 0, flagged: 0 };
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/feedback/stats`, {
        headers: {
          'X-User-ID': '00000000-0000-0000-0000-000000000000',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          feedbackStats = {
            thumbsUp: data.stats.thumbs_up || 0,
            thumbsDown: data.stats.thumbs_down || 0,
            flagged: data.stats.flagged || 0,
          };
        }
      }
    } catch (error) {
      console.error('Error fetching feedback stats from backend:', error);
    }

    return {
      total: totalScans || 0,
      completed: completedScans || 0,
      today: scansToday || 0,
      diagnosed: totalDiagnoses || 0,
      feedback: feedbackStats,
    };
  } catch (error) {
    console.error('Error fetching scans stats:', error);
    return {
      total: 0,
      completed: 0,
      today: 0,
      diagnosed: 0,
      feedback: {
        thumbsUp: 0,
        thumbsDown: 0,
        flagged: 0,
      },
    };
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getNutrientStatus(score: number) {
  if (score >= 70) return { label: 'Adequate', color: 'success' };
  if (score >= 40) return { label: 'Moderate', color: 'warning' };
  if (score >= 20) return { label: 'Low', color: 'warning' };
  return { label: 'Severely Low', color: 'error' };
}

function getScoreGradient(score: number) {
  // High scores (70-100) = Green shades
  if (score >= 70) {
    const intensity = Math.round(((score - 70) / 30) * 100);
    return {
      bg: `bg-green-${intensity > 50 ? '100' : '50'}`,
      text: 'text-green-800',
      border: 'border-green-200',
    };
  }
  // Medium scores (40-69) = Yellow/Orange shades
  if (score >= 40) {
    return {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
    };
  }
  // Low scores (20-39) = Orange shades
  if (score >= 20) {
    return {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-200',
    };
  }
  // Very low scores (0-19) = Red shades
  return {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
  };
}

function getRiskLevel(score: number) {
  if (score >= 70) return { label: 'Low Risk', color: 'success' };
  if (score >= 40) return { label: 'Medium Risk', color: 'warning' };
  return { label: 'High Risk', color: 'error' };
}

function getOverallSeverity(nScore: number, pScore: number, kScore: number) {
  const minScore = Math.min(nScore, pScore, kScore);
  if (minScore < 20) return { label: 'Critical', color: 'error' };
  if (minScore < 40) return { label: 'Severe', color: 'error' };
  if (minScore < 70) return { label: 'Moderate', color: 'warning' };
  return { label: 'Mild', color: 'success' };
}

function getCropIcon(cropName: string) {
  const icons: Record<string, string> = {
    'Rice': '🌾',
    'Wheat': '🌾',
    'Maize': '🌽',
    'Corn': '🌽',
    'Tomato': '🍅',
    'Potato': '🥔',
    'Cotton': '☁️',
  };
  return icons[cropName] || '🌱';
}

function getSeverityBadge(score: number) {
  if (score >= 70) return { label: 'Critical', color: 'error' };
  if (score >= 40) return { label: 'Warning', color: 'warning' };
  return { label: 'Good', color: 'success' };
}

export default async function ScansPage() {
  const [scans, stats] = await Promise.all([getScansData(), getScansStats()]);

  return (
    <>
      <Header
        title="Leaf Scans & Diagnoses"
        subtitle="Monitor all leaf scans and their diagnostic results"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <p className="text-sm text-neutral-light">Total Scans</p>
            <p className="mt-2 text-3xl font-bold text-neutral">{stats.total}</p>
            <p className="mt-1 text-xs text-neutral-light">All time</p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-light">Completed</p>
            <p className="mt-2 text-3xl font-bold text-neutral">{stats.completed}</p>
            <p className="mt-1 text-xs text-success">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate
            </p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-light">Today</p>
            <p className="mt-2 text-3xl font-bold text-neutral">{stats.today}</p>
            <p className="mt-1 text-xs text-neutral-light">Scans today</p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-light">Diagnosed</p>
            <p className="mt-2 text-3xl font-bold text-neutral">{stats.diagnosed}</p>
            <p className="mt-1 text-xs text-neutral-light">With diagnosis</p>
          </Card>
        </div>

        {/* Feedback Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <p className="text-sm text-neutral-light">Positive Feedback</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{stats.feedback.thumbsUp}</p>
            <p className="mt-1 text-xs text-neutral-light">👍 Thumbs up</p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-light">Negative Feedback</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{stats.feedback.thumbsDown}</p>
            <p className="mt-1 text-xs text-neutral-light">👎 Thumbs down</p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-light">Flagged for Review</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">{stats.feedback.flagged}</p>
            <p className="mt-1 text-xs text-neutral-light">⚠ Needs attention</p>
          </Card>
        </div>

        {/* Scans List */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-neutral">Recent Scans</h2>
            <p className="text-sm text-neutral-light mt-1">Showing {scans.length} most recent scans</p>
          </div>
          
          {scans.length === 0 ? (
            <div className="text-center py-12 text-neutral-light bg-white rounded-lg border border-gray-200">
              No scans found
            </div>
          ) : (
            <div className="space-y-4">
              {scans.map((scan) => {
                const cropIcon = getCropIcon(scan.crop_name || '');
                const severity = scan.diagnosis 
                  ? getOverallSeverity(
                      scan.diagnosis.n_score || 0,
                      scan.diagnosis.p_score || 0,
                      scan.diagnosis.k_score || 0
                    )
                  : null;
                const worstScore = scan.diagnosis 
                  ? Math.min(
                      scan.diagnosis.n_score || 100,
                      scan.diagnosis.p_score || 100,
                      scan.diagnosis.k_score || 100
                    )
                  : 100;
                const risk = scan.diagnosis ? getRiskLevel(worstScore) : null;

                return (
                  <div 
                    key={scan.id} 
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-gray-300 transition-all"
                  >
                    {/* Header with Health Score Circle */}
                    <div className="flex items-start justify-between mb-4">
                      {/* Health Score Badge */}
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                            worstScore >= 70 ? 'bg-green-600' :
                            worstScore >= 40 ? 'bg-yellow-500' :
                            'bg-red-600'
                          }`}>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-white">{worstScore.toFixed(0)}%</div>
                              <div className="text-[10px] text-white/90 -mt-1">{severity?.label || 'N/A'}</div>
                            </div>
                          </div>
                        </div>
                        <div className="text-xl font-bold text-neutral">Health Score</div>
                      </div>
                      
                      {/* Metadata */}
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5 text-xs text-gray-500 mb-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(scan.created_at)}</span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 text-xs text-gray-500 mb-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{scan.crop_name}</span>
                        </div>
                        <Badge variant={scan.status === 'completed' ? 'success' : 'warning'}>
                          {scan.status === 'completed' ? '✓ Analyzed' : 'Processing'}
                        </Badge>
                        
                        {/* Feedback Badge */}
                        {scan.feedback && (
                          <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${
                            scan.feedback.rating === 'thumbs_up' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          } ${scan.feedback.is_flagged ? 'ring-2 ring-yellow-400' : ''}`}>
                            <span>{scan.feedback.rating === 'thumbs_up' ? '👍' : '👎'}</span>
                            <span>User Feedback</span>
                            {scan.feedback.is_flagged && (
                              <span className="text-yellow-600" title="Flagged for review">⚠</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Diagnosis Section */}
                    {scan.diagnosis ? (
                      <div className="space-y-4">
                        {/* Diagnosis + Images Row */}
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: Diagnosis */}
                          <div className="flex-1">
                            <div className="flex items-start gap-2 mb-3">
                              <AlertTriangle className="h-5 w-5 mt-0.5 text-red-500 flex-shrink-0" />
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">Diagnosis: {scan.diagnosis.detected_class || 'Unknown'}</h4>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Leaf className="h-5 w-5 mt-0.5 text-green-600 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">Recommendation:</span> {worstScore < 40 
                                    ? 'Apply balanced N-P-K fertilizer and monitor moisture levels.'
                                    : 'Continue regular monitoring and maintain current care practices.'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right: Images + Badges */}
                          <div className="flex items-start gap-2">
                            {/* Images */}
                            {getImageUrl(scan.image_path) && (
                              <div className="flex gap-2">
                                <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                                  <Image
                                    src={getImageUrl(scan.image_path)!}
                                    alt="Leaf"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                                {scan.diagnosis?.heatmap_path && getImageUrl(scan.diagnosis.heatmap_path) && (
                                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                                    <Image
                                      src={getImageUrl(scan.diagnosis.heatmap_path)!}
                                      alt="Heatmap"
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                    <div className="absolute bottom-1 right-1 bg-black/50 rounded-full p-1">
                                      <Search className="h-3 w-3 text-white" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Stacked Badges */}
                            <div className="flex flex-col gap-2">
                              {severity && (
                                <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                  severity.color === 'error' ? 'bg-red-100 text-red-700' :
                                  severity.color === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {severity.label}
                                </div>
                              )}
                              {risk && (
                                <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                  risk.color === 'error' ? 'bg-red-100 text-red-700' :
                                  risk.color === 'warning' ? 'bg-orange-100 text-orange-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {risk.label}
                                </div>
                              )}
                              <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                worstScore < 40 ? 'bg-red-100 text-red-700' :
                                worstScore < 70 ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {worstScore < 40 ? 'Severe Damage' : worstScore < 70 ? 'Moderate Damage' : 'Minor Damage'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Nutrient Status - Show all 3 */}
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { name: 'Nitrogen', value: scan.diagnosis.n_score, short: 'N' },
                            { name: 'Phosphorus', value: scan.diagnosis.p_score, short: 'P' },
                            { name: 'Potassium', value: scan.diagnosis.k_score, short: 'K' },
                          ]
                          .map((nutrient) => {
                            const score = nutrient.value || 0;
                            const gradient = getScoreGradient(score);
                            const status = getNutrientStatus(score);
                            return (
                              <div 
                                key={nutrient.name} 
                                className={`rounded-lg p-3 border-0 ${gradient.bg}`}
                              >
                                <div className="mb-2">
                                  <span className="text-sm font-semibold text-gray-700">{nutrient.name} {nutrient.short}</span>
                                </div>
                                <p className={`text-3xl font-bold ${gradient.text} mb-1`}>
                                  {score.toFixed(0)}%
                                </p>
                                <p className="text-sm font-medium text-gray-600">
                                  {status.label}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* View Detailed Report Button */}
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                          <Plus className="h-4 w-4" />
                          <span>View Detailed Report</span>
                          <ArrowRight className="h-4 w-4 ml-auto" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-neutral-light py-4">
                        <Activity className="h-5 w-5" />
                        <p className="text-sm">Diagnosis pending...</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
