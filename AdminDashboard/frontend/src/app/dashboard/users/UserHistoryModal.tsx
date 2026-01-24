'use client';

import { Card } from '@/components/ui';
import { getImageUrl } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import { Activity, Calendar, FileText, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

interface Scan {
  id: string;
  scan_uuid: string;
  crop_id: number;
  image_path: string;
  status: string;
  created_at: string;
  crop_name?: string;
}

interface Diagnosis {
  id: string;
  scan_id: string;
  n_score: number;
  p_score: number;
  k_score: number;
  mg_score: number;
  overall_status: string;
  detected_class: string;
  created_at: string;
}

interface UserHistoryModalProps {
  user: User;
  type: 'scans' | 'diagnoses';
  onClose: () => void;
}

export function UserHistoryModal({ user, type, onClose }: UserHistoryModalProps) {
  const [data, setData] = useState<Scan[] | Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        if (type === 'scans') {
          const { data: scans, error } = await supabase
            .from('leaf_scans')
            .select(`
              id,
              scan_uuid,
              crop_id,
              image_path,
              status,
              created_at,
              crops (
                name
              )
            `)
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) throw error;

          // Transform data to include crop name
          const transformedScans = (scans || []).map(scan => ({
            ...scan,
            crop_name: (scan as any).crops?.name || 'Unknown',
          }));

          setData(transformedScans);
        } else {
          const { data: diagnoses, error } = await supabase
            .from('diagnoses')
            .select('*')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) throw error;
          setData(diagnoses || []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id, type]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSeverityColor = (score: number) => {
    if (score >= 0.7) return 'text-red-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-neutral">
              {type === 'scans' ? 'Scan History' : 'Diagnosis History'}
            </h2>
            <p className="text-sm text-neutral-light mt-1">
              {user.full_name || 'Unnamed User'} • {user.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-neutral-light">Loading...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600">Error: {error}</p>
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-light">No {type} found</p>
            </div>
          )}

          {!loading && !error && data.length > 0 && type === 'scans' && (
            <div className="space-y-4">
              {(data as Scan[]).map((scan) => (
                <Card key={scan.id} className="p-4">
                  <div className="flex items-start gap-4">
                    {getImageUrl(scan.image_path) && (
                      <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                        <Image
                          src={getImageUrl(scan.image_path)!}
                          alt="Leaf scan"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-semibold text-neutral">{scan.crop_name}</p>
                          <p className="text-xs text-neutral-light">
                            ID: {scan.scan_uuid.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-neutral-light">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(scan.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          {scan.status}
                        </span>
                      </div>
                      {scan.status === 'completed' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full inline-block">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!loading && !error && data.length > 0 && type === 'diagnoses' && (
            <div className="space-y-4">
              {(data as Diagnosis[]).map((diagnosis) => (
                <Card key={diagnosis.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-neutral">{diagnosis.detected_class || 'Unknown'}</h4>
                      <span className="text-xs text-neutral-light">
                        {formatDate(diagnosis.created_at)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-neutral-light mb-1">Nitrogen</p>
                        <p className={`font-semibold ${getSeverityColor(diagnosis.n_score / 100)}`}>
                          {diagnosis.n_score.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-light mb-1">Phosphorus</p>
                        <p className={`font-semibold ${getSeverityColor(diagnosis.p_score / 100)}`}>
                          {diagnosis.p_score.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-light mb-1">Potassium</p>
                        <p className={`font-semibold ${getSeverityColor(diagnosis.k_score / 100)}`}>
                          {diagnosis.k_score.toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    {diagnosis.overall_status && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-sm">
                          <span className="text-neutral-light">Status: </span>
                          <span className="font-medium text-neutral">{diagnosis.overall_status}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-between items-center">
          <p className="text-sm text-neutral-light">
            Showing {data.length} {type}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-neutral rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </Card>
    </div>
  );
}
