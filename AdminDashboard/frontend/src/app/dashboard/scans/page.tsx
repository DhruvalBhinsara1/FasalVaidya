import { Header } from '@/components/layout/Header';
import { Badge, Card } from '@/components/ui';
import { createAdminClient } from '@/lib/supabase/server';
import { Activity, AlertTriangle, User } from 'lucide-react';

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
  };
}

async function getScansData() {
  const supabase = await createAdminClient();

  try {
    // Get all scans with user and crop info
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
      .limit(100);

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

    return {
      total: totalScans || 0,
      completed: completedScans || 0,
      today: scansToday || 0,
      diagnosed: totalDiagnoses || 0,
    };
  } catch (error) {
    console.error('Error fetching scans stats:', error);
    return {
      total: 0,
      completed: 0,
      today: 0,
      diagnosed: 0,
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
                const cropIcon = getCropIcon(scan.crop_name);
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
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{cropIcon}</span>
                        <div>
                          <h3 className="text-xl font-bold text-neutral">{scan.crop_name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-neutral-light">
                              #{scan.scan_uuid.substring(0, 8).toUpperCase()}
                            </p>
                            <span className="text-xs text-gray-300">•</span>
                            <p className="text-xs text-neutral-light">
                              {formatDate(scan.created_at)}
                            </p>
                            <span className="text-xs text-gray-300">•</span>
                            <span className="flex items-center gap-1.5 text-xs text-neutral-light">
                              <User className="h-3 w-3" />
                              {scan.user_name}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={scan.status === 'completed' ? 'success' : 'warning'}>
                        {scan.status === 'completed' ? '✓ Analyzed' : 'Processing'}
                      </Badge>
                    </div>

                    {/* Diagnosis Section */}
                    {scan.diagnosis ? (
                      <div className="space-y-4">
                        {/* AI Diagnosis */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                              severity?.color === 'error' ? 'text-red-500' :
                              severity?.color === 'warning' ? 'text-yellow-500' :
                              'text-green-500'
                            }`} />
                            <div>
                              <h4 className="font-semibold text-neutral text-sm">AI Diagnosis</h4>
                              <p className="text-sm font-medium text-red-600 mt-0.5">
                                {scan.diagnosis.detected_class || 'Unknown Deficiency'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Severity & Risk Inline */}
                          <div className="flex items-center gap-2">
                            {severity && (
                              <Badge variant={severity.color as any}>
                                {severity.label}
                              </Badge>
                            )}
                            {risk && (
                              <Badge variant={risk.color as any}>
                                {risk.label}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Nutrient Status */}
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { name: 'Nitrogen', value: scan.diagnosis.n_score, short: 'N' },
                            { name: 'Phosphorus', value: scan.diagnosis.p_score, short: 'P' },
                            { name: 'Potassium', value: scan.diagnosis.k_score, short: 'K' },
                          ].map((nutrient) => {
                            const score = nutrient.value || 0;
                            const gradient = getScoreGradient(score);
                            const status = getNutrientStatus(score);
                            return (
                              <div 
                                key={nutrient.name} 
                                className={`rounded-lg p-3 border ${gradient.bg} ${gradient.border} transition-all`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-gray-600">{nutrient.name}</span>
                                </div>
                                <p className={`text-2xl font-bold ${gradient.text}`}>
                                  {score.toFixed(0)}%
                                </p>
                                <p className="text-xs font-medium text-gray-500 mt-0.5">
                                  {status.label}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-neutral-light leading-relaxed pt-2 border-t border-gray-100">
                          {worstScore < 20 
                            ? 'Critical deficiency detected. Immediate intervention required to prevent severe crop damage and yield loss.'
                            : worstScore < 40
                            ? 'Significant nutrient deficiency may reduce grain quality and increase disease susceptibility.'
                            : worstScore < 70
                            ? 'Moderate deficiency detected. Consider appropriate nutrient supplementation.'
                            : 'Nutrient levels are within acceptable range. Continue regular monitoring.'}
                        </p>
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
