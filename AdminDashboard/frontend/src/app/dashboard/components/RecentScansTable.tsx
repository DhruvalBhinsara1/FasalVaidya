import { Badge } from '@/components/ui';
import type { LeafScan } from '@/lib/types';
import { formatDateTime, getSeverityColor } from '@/lib/utils';
import Image from 'next/image';

interface RecentScansTableProps {
  scans: LeafScan[];
}

export function RecentScansTable({ scans }: RecentScansTableProps) {
  if (scans.length === 0) {
    return (
      <div className="p-6 text-center text-neutral-light">
        No scans found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase tracking-wider">
              Image
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase tracking-wider">
              Crop
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase tracking-wider">
              Detected
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {scans.map((scan) => (
            <tr key={scan.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-100">
                  {scan.image_path ? (
                    <Image
                      src={scan.image_path}
                      alt="Scan"
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                      N/A
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span>{(scan.crop as unknown as { icon: string })?.icon || '🌿'}</span>
                  <span className="text-sm text-neutral">
                    {(scan.crop as unknown as { name: string })?.name || 'Unknown'}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <Badge
                  variant={
                    scan.status === 'completed'
                      ? 'success'
                      : scan.status === 'pending'
                      ? 'warning'
                      : 'default'
                  }
                >
                  {scan.status}
                </Badge>
              </td>
              <td className="px-6 py-4">
                {scan.diagnosis ? (
                  <span
                    className={`text-sm px-2 py-1 rounded ${getSeverityColor(
                      (scan.diagnosis as unknown as { overall_status: string })?.overall_status
                    )}`}
                  >
                    {(scan.diagnosis as unknown as { detected_class: string })?.detected_class || 'N/A'}
                  </span>
                ) : (
                  <span className="text-sm text-neutral-lighter">Processing...</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-neutral-light">
                {formatDateTime(scan.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
