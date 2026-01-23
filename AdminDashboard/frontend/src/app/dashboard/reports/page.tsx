import { Header } from '@/components/layout/Header';
import { Badge, Card, CardHeader } from '@/components/ui';
import { createAdminClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils';

async function getReportsData() {
  const supabase = await createAdminClient();

  try {
    // Get scan analytics for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: scans, error: scansError } = await supabase
      .from('leaf_scans')
      .select('created_at, status, crop:crops(name)')
      .is('deleted_at', null)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (scansError) {
      console.error('Error fetching scans:', scansError);
    }

    // Get diagnoses summary
    const { data: diagnoses, error: diagnosesError } = await supabase
      .from('diagnoses')
      .select('overall_status, detected_class, created_at')
      .is('deleted_at', null)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (diagnosesError) {
      console.error('Error fetching diagnoses:', diagnosesError);
    }

    return {
      scans: scans || [],
      diagnoses: diagnoses || [],
      totalScans: scans?.length || 0,
      completedScans: scans?.filter((s) => s.status === 'completed').length || 0,
      healthyCount: diagnoses?.filter((d) => d.overall_status === 'healthy').length || 0,
      issueCount: diagnoses?.filter((d) => d.overall_status !== 'healthy').length || 0,
    };
  } catch (error) {
    console.error('Error in getReportsData:', error);
    return {
      scans: [],
      diagnoses: [],
      totalScans: 0,
      completedScans: 0,
      healthyCount: 0,
      issueCount: 0,
    };
  }
}

export default async function ReportsPage() {
  const data = await getReportsData();

  return (
    <>
      <Header
        title="Reports"
        subtitle="Analytics and performance reports"
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <p className="text-sm text-neutral-light">Total Scans (30d)</p>
            <p className="mt-2 text-3xl font-bold text-neutral">{data.totalScans}</p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-light">Completed</p>
            <p className="mt-2 text-3xl font-bold text-primary">{data.completedScans}</p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-light">Healthy Diagnoses</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{data.healthyCount}</p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-light">Issues Detected</p>
            <p className="mt-2 text-3xl font-bold text-warning">{data.issueCount}</p>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card padding="none">
          <div className="p-6 pb-0">
            <CardHeader
              title="Recent Scan Activity"
              subtitle="Last 30 days"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Crop
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.scans.slice(0, 10).map((scan, index) => (
                  <tr key={index} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm text-neutral">
                      {formatDateTime(scan.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral">
                      {(scan.crop as unknown as { name: string })?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={scan.status === 'completed' ? 'success' : 'warning'}
                      >
                        {scan.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
