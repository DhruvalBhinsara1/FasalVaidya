import { Header } from '@/components/layout/Header';
import { Badge, Card, CardHeader } from '@/components/ui';
import { createAdminClient } from '@/lib/supabase/server';

async function getCrops() {
  const supabase = await createAdminClient();

  try {
    const { data: crops, error: cropsError } = await supabase
      .from('crops')
      .select('*')
      .order('id', { ascending: true });

    if (cropsError) {
      console.error('Error fetching crops:', cropsError);
      return [];
    }

    // Get scan counts per crop
    const { data: scanCounts, error: scanError } = await supabase
      .from('leaf_scans')
      .select('crop_id')
      .is('deleted_at', null);

    if (scanError) {
      console.error('Error fetching scan counts:', scanError);
      // Continue with crops but no counts
    }

    const countMap = scanCounts?.reduce((acc, scan) => {
      acc[scan.crop_id] = (acc[scan.crop_id] || 0) + 1;
      return acc;
    }, {} as Record<number, number>) || {};

    return crops?.map((crop) => ({
      ...crop,
      scanCount: countMap[crop.id] || 0,
    })) || [];
  } catch (error) {
    console.error('Error in getCrops:', error);
    return [];
  }
}

export default async function CropsPage() {
  const crops = await getCrops();

  return (
    <>
      <Header
        title="Crops"
        subtitle="Manage supported crop types"
      />

      <div className="p-6">
        <Card padding="none">
          <div className="p-6 pb-0">
            <CardHeader
              title="Supported Crops"
              subtitle="Crops available for disease detection"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Icon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Name (English)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Name (Hindi)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Season
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                    Total Scans
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {crops.map((crop) => (
                  <tr key={crop.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-2xl">
                      {crop.icon || '🌿'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-neutral">
                      {crop.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral">
                      {crop.name_hi || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="info">{crop.season || 'N/A'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-light">
                      {crop.scanCount.toLocaleString()}
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
